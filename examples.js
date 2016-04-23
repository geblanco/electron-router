'use strict'

var Router = require('./router');

var r1 = new Router('main');
var r2 = new Router();

r1.on('*', function(){
	// Register to all events
	console.log('* route', arguments);
})

r1.on('/index', function(){
	console.log('/index route', arguments);
})

r2.send('/index', 'TEST 1', 'TEST 2')

console.log('\n');

r2.get('*', function( req, res ){
	// Register to all get routes
	console.log('GET', req.params);
	res.json( null, ['GET RETURN PARAM 1', 'GET RETURN PARAM 2']);
})

r2.get('/index', function( req, res ){
	console.log('GET', req.params);
	res.json( null, ['GET RETURN PARAM 1', 'GET RETURN PARAM 2']);
})

r2.post('/index', function( req, res ){
	console.log('POST', req.params);
	res.json( null, ['POST 1', 'POST 2']);
})

r2.update('/index', function( req, res ){
	console.log('UPDATE', req.params);
	res.json( null, ['UPDATE 1', 'UPDATE 2']);
})

r2.delete('/index', function( req, res ){
	console.log('DELETE', req.params);
	res.json( 'DELETE ERROR' );
})

r1.route('*', '*', {id: '5dfb23kj'}, function( err, results ){
	// GET|POST|UPDATE|DELETE to all routes
	console.log('route * with *', err?err:results);
})

r1.route('*', 'GET', {id: '5dfb23kj'}, function( err, results ){
	// GET to all routes
	console.log('route * with GET', err?err:results);
})

r1.route('/index', '*', {id: '5dfb23kj'}, function( err, results ){
	// GET|POST|UPDATE|DELETE to index
	console.log('route /index with *', err?err:results);
})

r1.route('/index', 'GET', function( err, results ){
	console.log('route /index with GET', err?err:results);
})

console.log('\n');