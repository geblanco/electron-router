'use strict'

// Dependencies
var ipc 	= null;
var VERBS 	= ['GET', 'POST', 'UPDATE', 'DELETE'];

class Router {

	constructor( name, window ) {
	
		this._name = name;
		this._routes = {};
		this._window = window;
		
	}

	_common( argss, verb ){
		
		var args = Array.prototype.slice.call( argss, 0 );
		if( 1 === args.length ){
			throw new Error('Bad arguments, MUST provide a route and a callback')
		}

		var route = args.shift();
		var cb = args.pop();

		if( typeof cb === 'function' ){

			this._setupRoute( route );
			this._routes[ route ][ 'http' ][ verb.toUpperCase() ] = cb;
		
		}

	}

	_setupRoute( route ){

		if( this._routes.hasOwnProperty( route ) ){
			return;
		}

		this._routes[ route ] = {
			std: {
				_senders: [],
				_receivers: [],
			},
			http: {}
		};

	}

	send(){

		var args = Array.prototype.slice.call(arguments, 0);

		if( this._window ){
			this._window.send.apply( this._window, args || [] );
		}

		var routes = [args.shift()];
		if( routes[0] === '*' ){
			routes = routes.concat( Object.keys( this._routes ) );
		}else{
			routes = ['*'].concat( routes );
		}

		routes.forEach(function( route ){

			// Not registered
			if( this._routes.hasOwnProperty( route ) ){
				
				this._routes[ route ][ 'std' ][ '_receivers' ].forEach(function( cb ){
				
					cb.apply( null, args || [] );
				
				})

			}
		}, this)
	}

	on(){

		var args = Array.prototype.slice.call(arguments, 0);
		if( 1 === args.length ){
			throw new Error('Bad arguments, MUST provide a route and a callback')
		}

		var route = args.shift();
		var endCb = args.pop();

		if( typeof endCb === 'function' ){

			this._setupRoute( route );
			this._routes[ route ][ 'std' ][ '_receivers' ].push( endCb );
			
			if( ipc ){

				ipc.on( route, function(){

					var args = Array.prototype.slice.call(arguments, 1);
					endCb.apply( null, args );

				})

			}

		}

	}

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

		// Not registered
		if( !this._routes.hasOwnProperty( route ) ){
			return;
		}

		if( verbs[0] === '*' ){
			verbs = VERBS;
		}

		verbs.forEach(function( verb ){

			if( this._routes[ route ][ 'http' ][verb] &&
				typeof this._routes[ route ][ 'http' ][verb] === 'function'
			){

				this._routes[ route ][ 'http' ][ verb ].apply( null, [{
					method: verb,
					params: JSON.parse( JSON.stringify(params) )
				}, {
					json: function( err, obj ){
						if( arguments.length === 1 ){
							obj = err;
							err = null;
						}
						cb( err, JSON.parse( JSON.stringify( obj ) ) );
					}
				}])

			}//Skip

		}, this);

	}

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
	try{
		ipc = require('electron').ipcMain;
	}catch( e ){
		// Non electron environment
	}
	if( null === _router ){
		_router = new Router( name, window );
	}
	return _router;
}