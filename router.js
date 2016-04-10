'use strict'

var ipc = null;
const VERBS  = ['GET', 'POST', 'UPDATE', 'DELETE'];
var CACHED = { std: [], http: {} };

const PROC_SIDES = { 'RENDERER': 0, 'MAIN': 1, TR: { 0: 'RENDERER', 1: 'MAIN' } };
const SIDE_EVTS = {
	0: { GET: 'ROUTER_REND_SET_ROUTES', SET: 'ROUTER_REND_GET_ROUTES' },
	1: { GET: 'ROUTER_MAIN_SET_ROUTES', SET: 'ROUTER_MAIN_GET_ROUTES' }
}
var PROC_SIDE = 'MAIN';

function _wrap( route ){
	var ret = {};
	Object.keys( route ).forEach( r => {
		ret[r] = {
			http: Object.keys( route[r].http ).map( h => {
				return h;
			})
		};
		if( route[r].std.length ){
			ret[r].std = route[r].std.length
		}
	})
	return JSON.stringify( ret );
}

function _storeOnCache( route ){
	route = JSON.parse( route );
	Object.keys( route ).forEach( r => {
		if( route[r].std && (-1 === CACHED.std.indexOf( r )) ){
			CACHED.std.push( r );
		}
		route[r].http.forEach( h => {
			if( (-1 === CACHED.http[h].indexOf( r )) ){
				CACHED.http[h].push( r );
			}
		})
	})
}

function _hashRoute( verb, route, back, sendOrListen){
	verb  = verb.trim().toUpperCase();
	route = route.trim();
	var base = verb + '::' + route;
	var proc = (sendOrListen === 'LISTEN')?PROC_SIDES.TR[PROC_SIDE]:PROC_SIDES.TR[1-PROC_SIDE];
	var no_p = (sendOrListen === 'LISTEN')?PROC_SIDES.TR[1-PROC_SIDE]:PROC_SIDES.TR[PROC_SIDE];
	var dir  = (sendOrListen === 'LISTEN')?'FORW':'BACK';
	var separator = '::';
	if( verb === 'STD' || undefined === back ){
		base += ( separator + proc );
	}else if( !back ){
		base += ( separator + proc + separator + dir );
	}else{
		base += ( separator + no_p + separator + 'BACK' );
	}
	return base;
}

function _hashRouteListen( verb, route, back ){
	return _hashRoute( verb, route, back, 'LISTEN');
}

function _hashRouteSend( verb, route, back ){
	return _hashRoute( verb, route, back, 'SEND');
}

class Router {

	constructor( name, window ) {

		this._name = name;
		this._routes = {};
		this._windows = [];

		// Prepare CACHE
		VERBS.forEach( verb => {
			CACHED.http[ verb ] = [];
		})

		this._setup( window );
	}

	_setup( window ){
		// Here we set the necessary callbacks for retrieving
		// other side events
		if( ipc ){
			var that = this;
			// Register a handler for retrieving other's side route
			ipc.on(SIDE_EVTS[PROC_SIDE].GET, function( event, routes ){
				_storeOnCache( routes );
			})
			ipc.on(SIDE_EVTS[1-PROC_SIDE].SET, function( event, routes ){
				that._sendCache();
			})
			this._requestCache();
		}
		if( window ){
			this._windows.push( window );
			var idx = this._windows.length -1;
			window.on('closed', function(){ this._cleanWindow( idx ) }.bind(this))
		}
	}

	_requestCache(){

		// If we are on a different process "routes" is going to be empty
		// so no route is going to be fired, as every method registers on 
		// ipc too, we can reconstruct the routes based on ipc channel
		// Reconstruct all routes
		if( this._windows.length ){
			this._windows.forEach( w => { w.send(SIDE_EVTS[PROC_SIDE].SET) }, this);
		}else if( ipc && ipc.send ){
			ipc.send(SIDE_EVTS[PROC_SIDE].SET);
		}

	}

	_sendCache(){

		if( this._windows.length ){
			this._windows.forEach(w => { w.send( SIDE_EVTS[1-PROC_SIDE].GET, _wrap(this._routes) ) }, this);
		}else if( ipc && ipc.send ){
			ipc.send( SIDE_EVTS[1-PROC_SIDE].GET, _wrap(this._routes) );
		}

	}

	_cleanWindow( idx ){

		this._windows.splice( idx, 1 );

	}

	_common( argss, verb ){
		
		var args = Array.prototype.slice.call( argss, 0 );
		if( 1 === args.length ){
			throw new Error('Bad arguments, MUST provide a route and a callback')
		}

		var route = args.shift();
		var cb = args.pop();
		verb = verb.toUpperCase();

		if( typeof cb === 'function' ){

			this._setupRoute( route );
			this._routes[ route ][ 'http' ][ verb ] = cb;

		}

		//console.log('Registering route over http', verb, route, _hashRouteListen( verb, route ));

		var that = this;

		if( ipc ){

			ipc.on( _hashRouteListen( verb, route ), function( event, req ){
				
				req = JSON.parse( req );
				//console.log('Inside receiver cb', req);
				req.push({
					json: function( err, obj ){
						if( arguments.length === 1 ){
							obj = err;
							err = null;
						}
						//console.log('sending to', this._window?'window':'ipc', _hashRouteSend( verb, route, true ));
						if( this._windows.length ){
							this._windows.forEach( w => { w.send.apply(w, [_hashRouteSend( verb, route, true ), err].concat(JSON.parse(JSON.stringify( obj )))) }, this );
						}else if( ipc && ipc.send ){
							ipc.send.apply(ipc, [_hashRouteSend( verb, route, true ), err].concat(JSON.parse(JSON.stringify( obj ))));
						}
					}.bind(that)
				});
				cb.apply( that, req );
			
			});

		}

		this._sendCache();

	}

	_setupRoute( route ){

		if( this._routes.hasOwnProperty( route ) ){
			return;
		}

		this._routes[ route ] = {
			std: [],
			http: {}
		};

	}

	// SENDER - One direction
	send(){

		var that = this;
		var fnArgs = arguments;

		// Ensure
		process.nextTick(function(){

			var args = Array.prototype.slice.call(fnArgs, 0);
			if( that._windows.length ){
				that._windows.forEach( w => { w.send.apply( w, args || [] ) }, that );
			}

			var routes = [args.shift()];
			if( routes[0] === '*' ){
				routes = routes.concat( Object.keys( that._routes ) );
			}else{
				routes = ['*'].concat( routes );
			}
			routes.forEach(function( route ){

				if( ipc && (-1 !== CACHED.std.indexOf(route) )){

					if( that._windows.length ){
						that._windows.forEach( w => { w.send.apply(w, [_hashRouteSend( 'STD', route )].concat( JSON.stringify(args || []) )) }, that );
					}else if( ipc && ipc.send ){
						ipc.send.apply(ipc, [_hashRouteSend( 'STD', route )].concat( JSON.stringify(args || []) ));
					}

				}
				// Not registered
				if( that._routes.hasOwnProperty( route ) ){
					
					that._routes[ route ][ 'std' ].forEach(function( cb ){
					
						cb.apply( null, args || [] );
					
					})

				}

			}, that)

		});

	}
	
	// RECEIVER
	on(){

		var args = Array.prototype.slice.call(arguments, 0);
		if( 1 === args.length ){
			throw new Error('Bad arguments, MUST provide a route and a callback')
		}

		var route = args.shift();
		var endCb = args.pop();

		if( typeof endCb === 'function' ){

			this._setupRoute( route );
			this._routes[ route ][ 'std' ].push( endCb );
			
			if( ipc ){

				ipc.on( _hashRouteListen( 'STD', route ), function(){

					args = Array.prototype.slice.call(arguments, 1);
					endCb.apply( null, JSON.parse(args) );

				})

			}

		}

		this._sendCache();

	}

	// SENDER - Duplex
	route(){
		
		var args = Array.prototype.slice.call(arguments, 0);
		if( 3 >  args.length ){
			throw new Error('Bad arguments, MUST provide a route, a method and a callback')
		}
		var route = args.shift();
		var verbs = [args.shift().toUpperCase()];
		var params= [];
		
		var len = args.length-1;
		var i 	= 0;
		while( i++ < len ){
			params.push( args.shift() );
		}

		var cb = args.pop();

		// Re-Cache, just in case...
		this._requestCache();

		var that = this;
		setTimeout(function() {

			if( verbs[0] === '*' ){
				verbs = VERBS;
			}

			verbs.forEach(function( verb ){
				
				var fnArgs = [{
					method: verb,
					params: JSON.parse( JSON.stringify(params) )
				}];

				//console.log('Routing', verb, route, _hashRouteSend( verb, route ), fnArgs);

				if( ipc && (-1 !== CACHED.http[verb].indexOf(route) )){

					ipc.once(_hashRouteListen( verb, route, true ), function(){
						var args = Array.prototype.slice.call( arguments, 1 );
						cb( args.splice(0, 1)[0], JSON.parse( JSON.stringify( args ) ) );
					})
					//console.log('send', 'registered back on', _hashRouteListen( verb, route, true ));
					if( that._windows.length ){
						that._windows.forEach( w => { w.send.apply(w, [_hashRouteSend( verb, route )].concat( JSON.stringify(fnArgs || []) )) }, this );
					}else if( ipc && ipc.send ){
						ipc.send.apply(ipc, [_hashRouteSend( verb, route )].concat( JSON.stringify(fnArgs || []) ));
					}

				}
				if(
					that._routes.hasOwnProperty( route ) &&
					that._routes[ route ][ 'http' ][verb] &&
					typeof that._routes[ route ][ 'http' ][verb] === 'function'
				){

					fnArgs = fnArgs.concat({
						json: function( err, obj ){
							console.log('inner json route', err, obj, arguments);
							if( arguments.length === 1 ){
								obj = err;
								err = null;
							}
							cb( err, JSON.parse( JSON.stringify( obj ) ) );
						}
					})
					that._routes[ route ][ 'http' ][ verb ].apply( null, fnArgs );

				}// Not registered, skip on std router

			}, that);

		}, 10);

	}

	// RECEIVERS
	post(){

		this._common( arguments, 'POST' );

	}

	get(){

		this._common( arguments, 'GET' );

	}

	update(){

		this._common( arguments, 'UPDATE' );
	}

	delete(){

		this._common( arguments, 'DELETE' );

	}

}

//module.exports = Router;
var _router = null;
module.exports = function( name, window ){

	if( null === ipc ){
		try{

			ipc = require('electron').ipcMain;

			if( ipc !== undefined ){
				// We are on main process
				PROC_SIDE = PROC_SIDES.MAIN;
			}else{
				ipc = require('electron').ipcRenderer;
				PROC_SIDE = PROC_SIDES.RENDERER;
			}

		}catch( e ){
			// Non electron environment
		}
	}

	if( null === _router ){
		_router = new Router( name, window );
	}else if( undefined !== name || undefined !== window ){
		_router._name = _router._name || name;
		_router._setup( window );
	}
	return _router;
}
