# ElectronRouter

[![codecov](https://codecov.io/gh/m0n0l0c0/electron-router/branch/master/graph/badge.svg)](https://codecov.io/gh/m0n0l0c0/electron-router)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

Router solving Electron shell callback passing, helpfull for MVC

# Contents
- [Motivation](#motivation) 
- [Features](#features)
- [API](#api)
- [Examples](#examples)
- [Contributing](#contributing)
- [Future](#future)
- [Notes](#notes)

## Installation

```
// Install:
npm install electron-router

// Test:
npm test
```

## Motivation
### The problem
When making an electron app I usually come down to the same problem: message passing; if you want to send a message to a window you have to keep a reference to it, whatever the module you're sending the message from, which leaves two possible solutions:
* Pass the wanted window object to every module that needs to send a message to that window.

or

* Somehow send the message to the owner of the window reference (usually implies callback passing).

On the other hand, when you want to receive a message from the window you have to listen to ipc which is usually great, but forces you to have perfect tune of the variables that the callback is going to access; this does not present a problem by itself, but as the application grows it may become one.

One example of this is when you have a database and want to query it from the window renderer process, either the database is listening on the ipc and aware of the window (keeps a reference to it) for querying/retrieving data or both the window and the database route their data through the main script, becoming some sort of dummy proxy.

After some brainstorming, the solution I came to was designing the Router, it gives similar options to [express](http://expressjs.com/). I've made a diagram to help visualize all this.

![problem solution](router.png)

### The solution
The router just triggers the functions you register on by sending events and parameters. Allowing easy message/data passing and respecting the event/callback Electron architecture.

## Features

### Wildcards
Every sent/listened message can use wildcards
```
router.on('loading::start', () => { console.log('start loading...') }
router.on('loading::continue', () => { console.log('continue loading...') }
router.on('loading::end', () => { console.log('end loading...') }

...

router.send('loading::start', ...) // logs "start loading"
router.send('loading::*', ...) // logs "start loading", "continue loading", "end loading"

```

#### Simple, plain communication
You can send messages unidirectionally from the main process to the renderer process and viceversa (analogous to electron's ipc) (Previous example)

#### Duplex communication with channels

```
router.get('config::*')
router.post('config', ( req, res ) => {
	// req.params contain sent parameters
	// res.json sends data back
})
...

router.route('get', 'config::start', ( err, result ) => {
	console.log('got config', result)
})
```

## API

The router is just a static object, there will be one router in the main process and another one on the renderer. Just 'require' it and start listening/sending events/data. What this object does is route callbacks from one side to another passing parameters, triggered by different events.
It can listen to ipc events and send window events too.
HTTP Verbs are used just as different channels and for completness (equality to express)
For every route/event it is possible register wildcard ('*')

#### Instance
```
// Constructs the object setting its name
let Router = require('electron-router')

// Returns the static instance
let router = Router( name )
```

#### Simple communication
```
// Triggers/Sends a message on the given event name passing provided messages.
router.send( event, msg1, msg2... )

// Register a listener on the given event, triggering the callback when the event is sent.
// Callback receives the messages sent on the other side
router.on( event, ( msg1, msg2... ) => {})
```

#### Duplex communication
```
// Triggers/Sends a message to the given route on the given method (channel, HTTP Verbs)
// passing the given messages to that channel/route handler. 
// Callback is called with err/result when the handler calls res.json()
// if the handler does not call the return function, callback is invoked with Err: Timeout

router.route( method, route, msg1, msg2..., ( err, result ) => {})

// Similar to router.routes.method( route, msg1, msg2..., ( err, result ) => {})

// All handlers on all channels are called with
// 	req { parameters: [], method: channel }
// 	res { json: [Function] } - function to call with (err, result), triggers the route back

// Registers handler on GET channel at the given route.
router.get( route, ( req, res ) => {}) // must call res.json( err, result )

// Registers handler on POST channel at the given route.
router.post( route, ( req, res ) => {}) // must call res.json( err, result )

// Registers handler on UPDATE channel at the given route.
router.update( route, ( req, res ) => {}) // must call res.json( err, result )

// Registers handler on DELETE channel at the given route.
router.delete( route, ( req, res ) => {}) // must call res.json( err, result )

```

## Examples

```
// On every module that uses the router
// Import it
let Router = require('electron-router')

// Main script

cons electron = require('electron')
const BrowserWindow = electron.BrowserWindow
const app = electron.app
const Router = require('electron-router')
let router = Router('MAIN')
let mainWindow = null

...

app.on('ready', () => {

	// Create window
	... 

  // Setup DB and modules
  ...

	// Do the rest on ready event (triggered from window, which is usaully the slowest component)
	router.on('ready', () => {
		router.on('quit', () => {
			// Close DB
			// Handle quit code
			...
		})
	})
})

...

// Window script

const $ = require('jquery')
const Router = require('electron-router')
let router = Router('WINDOW')

// On window ready
$(() => {
  // Send ready event to all registered handlers
  router.send('ready')
  ...

  $('#updates').on('click', () => {
  	router.route('POST', '/DB', $('#userData').data())
  })
})

...

// DB script

const Router = require('electron-router')
let router = Router('DB')

...

router.on('ready', () => { ... })

// Register trigger for every route on method GET
route.get('*', ( req, res ) => {
	db.find({ id: req.params }, ( err, results ) => {
		res.json( err, results )
	})
})

// Receive data on post method, route /DB
router.post('/DB', ( req, res ) => {
	console.log('Received', req.params)
	// Save data on db
	db.save( req.params, ( err, result ) => {
		// Send save result to the triggerer
		res.json( err, result )
	})
})

```

## Contributing
Any help is welcome, just send a pull request (please document a little what you want to do), with any ideas/code

## Future
In the future it could be great to support:
* MVC frameworks integration (Backbone...) (Should not be too difficult, overwrite sync method on Collections)
* Template rendering (i.e.: ```res.render(data)```)

## Notes
The diagram was made with [gliffy](https://www.gliffy.com/)
