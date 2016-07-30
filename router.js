
(function( factory ){

  if( typeof module !== 'undefined' && typeof module.exports !== 'undefined' ){
  	let ele = require('electron')
  	let ipc = ele.ipcMain
  	let proc = 1
  	let remote = { BrowserWindow : ele.BrowserWindow }
  	if( !ipc ){
  		proc = 0
  		ipc = ele.ipcRenderer
  		remote = ele.remote
  	}
    module.exports = factory( require('eventemitter3'), ipc, remote, require('lodash'), require('node-uuid'), proc )
  }
  else{
  	throw new Error('This module only works on an Electron environment!!')
  }

})(function( EventEmitter, ipc, remote, lo, uuid, proc_side ){

'use strict';

// Constants
const DUP_RCV_HEAD = 'DUPLEX::RCV'
const DUP_SND_HEAD = 'DUPLEX::SND'
const VERBS  = ['GET', 'POST', 'UPDATE', 'DELETE']
const PROC_SIDES = { 'RENDERER': 0, 'MAIN': 1, TR: { 0: 'RENDERER', 1: 'MAIN' } }
const SIDE_EVTS = {
	0: { GET: 'ROUTER_REND_SET_ROUTES', SET: 'ROUTER_REND_GET_ROUTES' },
	1: { GET: 'ROUTER_MAIN_SET_ROUTES', SET: 'ROUTER_MAIN_GET_ROUTES' }
}
// Utils
const DEBUG = function( fn /*, ... */ ){
	let args = Array.prototype.slice.call( arguments, 0 )
	let debugFn = args[ 0 ]
	if(
		global.DEBUG && typeof global.DEBUG === 'string' &&
		(
			global.DEBUG === '*' ||
			-1 !== global.DEBUG.split('|').map(a => a.toLowerCase()).indexOf( debugFn.toLowerCase() )
		)
	){
		console.log.apply( console, args )
	}
}

function _prepareCache( evtNames, exclude ){
	return JSON.stringify( lo.difference( evtNames, exclude ) )
}

function _extractEvts( evt, allEvts ){

	let ret = []
	// We are on DUPLEX, when a DUPLEX::RCV:: evt is received we cannot go to DUPLEX::RCV,
	// it can create a infinite loop
	if( -1 !== evt.indexOf( DUP_RCV_HEAD ) ){
		allEvts = allEvts.filter( ev => !!ev.indexOf( DUP_SND_HEAD ) )
	}else if( -1 !== evt.indexOf( DUP_SND_HEAD ) ){
		allEvts = allEvts.filter( ev => !!ev.indexOf( DUP_RCV_HEAD ) )
	}

	DEBUG( '_extractEvts', '\n', 1, 'got...', evt, '_allEvts', allEvts )

	if( -1 !== evt.indexOf('*') && evt !== '*' ){
		// It contains a wildcard, check against all events, convert the wildcard to a whatever `.*`
		let regexp = new RegExp(`^${evt.replace(/\*/g,'.*')}$`, 'i')

		ret = ret.concat(allEvts.filter(ev => regexp.test( ev.replace(/\*/g, '') )))
		DEBUG( '_extractEvts', '\n', 2.2, 'regexp', regexp, 'ret', ret )
		regexp = null

	}else if( evt !== '*' ){
		
		ret = [ evt ]
		DEBUG( '_extractEvts', '\n', 3, ret )

	}else{
		
		ret = allEvts
		DEBUG( '_extractEvts', '\n', 4, ret )

	}

	DEBUG( '_extractEvts', '\n', 5, ret )
	// Check events containing wildcards
	ret = ret.concat( allEvts.filter( ev => {
		DEBUG( '_extractEvts', '\n', 6, ev, (new RegExp(`^${ev.replace(/\*/g,'.*')}$`, 'i')).test( evt.replace(/\*/g, '' )) )
		return (new RegExp(`^${ev.replace(/\*/g,'.*')}$`, 'i')).test( evt.replace(/\*/g, '' ))
	}))

	DEBUG( '_extractEvts', '\n', 7, ret, '->', lo.uniq( ret ) )

	return lo.uniq( ret )
}

class Router extends EventEmitter {

	constructor( name, proc ){
	
		super()

		this._cache = []
		this._delayedMsgs = []
		this._procSide = proc
		this._sentCaches = 0
		this._name = name || this._isRenderProcess()
			?'ROUTER_RENDERER'
			:'ROUTER_PROCESS'
		
		this.routes = {
			post: 	(...args) => { this.route.apply( this, ['post'].concat( args) ) 	},
			get: 		(...args) => { this.route.apply( this, ['get'].concat( args) ) 		},
			update: (...args) => { this.route.apply( this, ['update'].concat( args) ) },
			delete: (...args) => { this.route.apply( this, ['delete'].concat( args) )	}
		}
		this._setup()

	}

	_setup(){

		if( this._isRenderProcess() ){
			
			let win = this._getWindow()
			// TODO => Check if this really works,
			// is the close evt triggered on the current window?
			
			win.on('onbeforeunload', this.clean)

		}

		// Here we set the necessary callbacks for retrieving
		// other side events
		//  - FROM other side to our store
		ipc.on( SIDE_EVTS[ this._procSide ].GET, this._handleStoreSet.bind( this ) )

		// - FROM our store to the other side
		ipc.on( SIDE_EVTS[ 1- this._procSide ].SET, this._handleStoreGet.bind( this ) )

		// having _handleStoreSet, _handleStoreGet allows us to unregister clean
		this._requestCache()

	}

	_getWindows(){

		if( remote.getCurrentWindow ){
			
			// We are on renderer process
			let id = remote.getCurrentWindow().id
			return remote.BrowserWindow.getAllWindows().filter( w => w.id !== id )

		}else{

			// We are on main process
			return remote.BrowserWindow.getAllWindows()

		}

	}

	_getWindow(){

		if( remote.getCurrentWindow ){
			
			// We are on renderer process
			return remote.getCurrentWindow()

		}else{

			// We are on main process
			return null

		}

	}

	_isRenderProcess(){

		return remote.hasOwnProperty('getCurrentWindow')
	
	}

	_handleStoreSet( evt, routes ){

		this._storeOnCache( routes )

	}

	_storeOnCache( routes ){

		DEBUG( '_storeOnCache', 'Storing on cache', 'pre', JSON.stringify( this._cache, null, 2 ) )
		DEBUG( '_storeOnCache', 'received', JSON.parse(routes) )
		let route = JSON.parse( routes );
		route = route.filter( r => -1 === this._cache.indexOf( r ) )

		this._cache = this._cache.concat( route )

		if( ipc && ipc.on ){

			// Register to cached evt
			ipc.on( route, () => {

				this.emit.apply( this, arguments )

			})

		}

		DEBUG( '_storeOnCache', 'Storing on cache', 'post', JSON.stringify( this._cache, null, 2 ) )

		route = null

	}

	_handleStoreGet( evt, routes ){

		this._sendCache()

	}

	_sendCache(){

		let evt = SIDE_EVTS[ 1- this._procSide ].GET
		let routes = _prepareCache( super.eventNames(), this._cache )
		let wins = this._getWindows()
		DEBUG( '_sendCache', 'Sending cache...', routes, 'sent', this._sentCaches, 'delayed', this._delayedMsgs )
		// Communicate cache to all windows
		wins.forEach( w => { w.send( evt, routes ) })
		// Communicate cache to ipc, we are on
		ipc && ipc.send && ipc.send( evt, routes );

		// Up to 256 sentCaches, never go down to 0
		if( 0 === this._sentCaches++ ){

			let len = this._delayedMsgs.length
			for( let i = 0; i < len; i++ ){
				let data = this._delayedMsgs.shift()
				DEBUG( '_sendCache', 'Sending delayedMsgs...', data )
				this[ data[ 'method' ] ].apply( this, data.arguments )
			}

		}
		this._sentCaches = (this._sentCaches % 255) +1

		evt = routes = wins = null;

	}

	_requestCache(){

		// If we are on a different process "routes" is going to be empty
		// so no route is going to be fired, as every method registers on 
		// ipc too, we can reconstruct the routes based on ipc channel
		// Reconstruct all routes
		
		let _evt = SIDE_EVTS[ this._procSide ].SET
		let _wins = this._getWindows()
		DEBUG( '_requestCache', 'requesting cache...' )
		// Request cache to all windows
		_wins.forEach( w => { w.send( _evt ) })
		
		// Request cache to ipc
		ipc && ipc.send && ipc.send( _evt );

		_evt = _wins = null;

	}

	_common( argss, verb ){

		var args = Array.prototype.slice.call( argss, 0 );
		
		if( 1 === args.length ){
			throw new Error('Bad arguments, MUST provide a route and a callback')
		}

		let route = args.shift()
		let ctx = args.pop()
		let cb = args.pop()

		if( cb === undefined ){
		 	cb = ctx
			ctx = null
		}

		if( typeof cb !== 'function' ){
			throw new Error('Bad arguments, MUST provide a route and a callback')
		}
		DEBUG( '_common',
			'\n_commonreg', 'on', `${DUP_RCV_HEAD}::${route}::${verb.toUpperCase()}`,
			'\n_commonreg', 'send', `${DUP_SND_HEAD}::${route}::${verb.toUpperCase()}`
		)
		this.on(`${DUP_RCV_HEAD}::${route}::${verb.toUpperCase()}`, (function( callback, router, route, verb ){

			return function( evt ){

				let req = { method: verb, params: Array.prototype.slice.call( evt.data, 0 ) }
				let res = {
					json: function( err, obj ){
						if( arguments.length === 1 ){
							obj = err
							err = null
						}
						DEBUG( '_common', 'On the json end', arguments)
						router.sendDuplexBack.apply( router, [`${DUP_SND_HEAD}::${route}::${verb.toUpperCase()}`, { origEvt: evt.origEvt, count: evt.count, total: evt.total }, err, JSON.parse( JSON.stringify( obj ) )] );
					}
				}

				callback( req, res )
				//callback = router = route = verb = req = res = null

			}

		})( cb, this, route, verb ), ctx)

	}

	on( evt, listener, ctx ){

		// TODO => If event has yet been emitted,
		// do not register => trigger directly, Event Queue
		super.on( evt, listener, ctx )
		if( ipc && ipc.on ){

			ipc.on( evt, function( event ){
			
				let args = Array.prototype.slice.call( arguments, 1 )
				DEBUG('on', 'inside ipc on', evt, args)
				listener.apply( ctx, args )
				args = event = null

			})

		}
		this._sendCache()

	}

	send( evt ){

		if( this._sentCaches ){		

			let _evt = evt.trim()
			let _args = Array.prototype.slice.call( arguments, 1 )
			let _allEvts = super.eventNames().concat( lo.difference( this._cache, super.eventNames() ) )
			let _evts = _extractEvts( _evt, _allEvts )
			let _wins = this._getWindows()
			let _winsLen = _wins.length

			let len = _evts.length
			for( let i = 0; i < len; i++ ){
			
				let msgArr = [ _evts[ i ] ].concat( _args )

				DEBUG( 'send', 'sending...', msgArr, msgArr.length )

				// Emit through eventemitter
				super.emit.apply( this, msgArr )

				// Emit through windows
				for( let j = 0; j < _winsLen; j++ ){
			
					_wins[ j ].send.apply( _wins[ j ], msgArr )

				}

				// Emit through ipc
				ipc && ipc.send && ipc.send.apply( ipc, msgArr );
				
			}

			_evt = _args = _evts = _wins = null
		
		}else {

			this._delayedMsgs.push({ method: 'send', arguments: arguments })

		}

	}

	sendDuplex( evt, data ){

		if( this._sentCaches ){		

			let _evt = evt.trim()
			let _args = Array.prototype.slice.call( data.args, 0 )
			let _origEvt = data.origEvt
			let _allEvts = super.eventNames().concat( lo.difference( this._cache, super.eventNames() ) )
			let _evts = _extractEvts( _evt, _allEvts )
			let _wins = this._getWindows()
			let _winsLen = _wins.length

			let len = _evts.length
			for( let i = 0; i < len; i++ ){
			
				let msgArr = [ _evts[ i ] ].concat({ origEvt: _origEvt, count: i +1, total: len, data: _args })

				DEBUG( 'sendDuplex', 'sending...', msgArr )

				// Emit through eventemitter
				super.emit.apply( this, msgArr )

				// Emit through windows
				for( let j = 0; j < _winsLen; j++ ){
			
					_wins[ j ].send.apply( _wins[ j ], msgArr )

				}

				// Emit through ipc
				ipc && ipc.send && ipc.send.apply( ipc, msgArr );
				
			}

			_evt = _args = _evts = _wins = null
		
		}else {

			this._delayedMsgs.push({ method: 'sendDuplex', arguments: arguments })

		}

	}

	sendDuplexBack( evt, origEvt, err, data ){

		DEBUG( 'sendDuplexBack', '\n', 0, 'raw', arguments )

		let _evt = origEvt.origEvt
		let _iter = origEvt.count
		let _total = origEvt.total
		let _args = Array.prototype.slice.call( arguments, 2 )
		let _wins = this._getWindows()
		let _winsLen = _wins.length

		let msgArr = [ _evt ].concat({ count: _iter, total: _total, data: _args })

		DEBUG( 'sendDuplexBack', 'sending...', msgArr )
		// Emit through eventemitter
		super.emit.apply( this, msgArr )

		// Emit through windows
		for( let j = 0; j < _winsLen; j++ ){
	
			_wins[ j ].send.apply( _wins[ j ], msgArr )

		}

		// Emit through ipc
		ipc && ipc.send && ipc.send.apply( ipc, msgArr );
			
		_evt = _iter = _total = _args = _wins = _winsLen = msgArr = null
		
	}

	// verb, arg1, arg2, arg3..., callback
	route(){

		let args = Array.prototype.slice.call(arguments, 0);
		if( 3 >  args.length ){
			throw new Error('Bad arguments, MUST provide a route, a method and a callback')
		}
		// Extract verb
		let verb = args.shift().toUpperCase()
		// Extract route
		let route = args.shift()
		let transactionId = uuid()
		let params= { origEvt: `${transactionId}`, args: [] }
		
		// Extract arguments
		let len = args.length-1;
		let i 	= 0;
		while( i++ < len ){
			params.args.push( args.shift() );
		}

		// Extract callback
		let cb = args.pop()
		let caller = (function( router, uuid, cb ){

			let results = []
			let fn = function fn( data ){

				DEBUG( 'route', 'back fn', arguments, JSON.stringify( data, null, 2 ), results )
				results.push( data.data[ 1 ] )
				// Data from caller comes like data: { data: [ err, result ] }
				// If one errored finish immediately
				// Or we are on the last callback, clean aux routes
				if( data.data[ 0 ] || data.count === data.total ){

					!(data.data[ 0 ]) || ( results = [ data.data[ 0 ] ] )
					data.data[ 0 ] || ( results = [ null, results.length > 1?results:results[0] ] )
					router.removeListener( `${uuid}`, fn )
					DEBUG( 'route', 'back fn', 'data', data, 'sending', results)
					cb.apply( cb, results )
					
					router = cb = results = null
					clearTimeout( timer )

				}

			}
			// If we are not called back within 200 ms
			// trigger error
			let timer = setTimeout(function() {

				cb.apply( cb, [new Error('Timeout - 200ms elapsed')] )
				router.removeListener( `${uuid}`, fn )
				router = cb = null

			}, 200)

			return fn

		})( this, transactionId, cb )

		this.on(`${transactionId}`, caller)

		DEBUG( 'route', '\non', `${DUP_SND_HEAD}::${route}::${verb}`)
		DEBUG( 'route', '\nsend', `${DUP_RCV_HEAD}::${route}::${verb}`, params)
		this._sendCache()

		this.sendDuplex.apply( this, [`${DUP_RCV_HEAD}::${route}::${verb}`].concat( params ) )

	}

	get(){

		this._common( arguments, 'GET' )

	}

	post(){

		this._common( arguments, 'POST' )

	}

	update(){

		this._common( arguments, 'UPDATE' )
	}

	delete(){

		this._common( arguments, 'DELETE' )

	}

	clean( e ){

		ipc.removeListener( SIDE_EVTS[ this._procSide ].GET, this._handleStoreSet )
		ipc.removeListener( SIDE_EVTS[ 1- this._procSide ].SET, this._handleStoreGet )

		let name = `${this._name.toUpperCase()}::CLOSE`
		DEBUG('clean', 'sending close', name, 'pre', 'events', this.eventNames(), 'cache', this._cache)
		let wins = this._getWindows()
		ipc && ipc.send && ipc.send( name )
		// Communicate we are closing, clear ipc too?
		wins.forEach( w => { w.send( name ) })
		super.removeAllListeners()
		let win = this._getWindow()
		win && win.removeListener('onbeforeunload', this.clean)
		this._cache = this._delayedMsgs = []
		this._sentCaches = 0
		DEBUG('clean', 'sending close', name, 'post', 'events', this.eventNames(), 'cache', this._cache)
		// This ensures we do not interfere in the close process
		e && (e.returnValue = undefined)

	}

}

var _router = null

return ( name ) => {
	// TODO => Think on name and window setup (ie: registerWindow??)
	// TODO => Queue of sent events for late on'ss
	if( !_router ){
		_router = new Router( name, proc_side )
	}

	return _router

}

})