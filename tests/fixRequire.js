'use strict'

// This module comes with node,
// no need to explicitly install it
const path = require( 'path' )
// Save the ref
const _req = require
const isRelative = ( mod ) => mod.indexOf('./') === 0
// glob comes in the form
// path:path:path..., prepare it
const glob = process.env.NODE_PATH.split(':')
const local = path.join( process.cwd() + '/node_modules/' )

require = ( _mod ) => {

	let ret = null
	let errored = null
	// If its relative...
	if( isRelative( _mod) ){
		ret = _req( _mod )
	}else{
		
		// First locally
		try{ ret = _req(path.join( local + _mod ))}
		catch( e ){ errored = e }

		if( !ret ){
			// Later globally
			let tries = glob.map( g => path.join( g, _mod ) )
			for( let i = 0; i < tries.length && ret === null; i++ ){

				try{ ret = _req( path.join( glob, _mod ) ) }
				catch( e ){ errored = e }

			}

		}

	}
	if( errored ) throw errored
	else return ret

}
