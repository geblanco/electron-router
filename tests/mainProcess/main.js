/* global describe, it */

'use strict'

/* eslint-disable no-unused-vars */
const should = require('should')
/* eslint-enable no-unused-vars */
const path = require('path')
const router = require(path.join(__dirname, '/../../router'))('TEST')

describe('Main Process', () => {
  describe('Simplex Communication', () => {
    describe('Data Types', () => {
      it('should receive an string of data', (done) => {
        let data = '5js2q4k'
        router.on('simpleCommTest', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          router.clean()
          done()
        })
        router.send('simpleCommTest', data)
      })
      it('should receive an object of data', (done) => {
        let data = { id: '5js2q4k' }
        router.on('simpleCommTest', (args) => {
          args.should.containDeepOrdered(data)
          router.clean()
          done()
        })
        router.send('simpleCommTest', data)
      })
      it('should receive a nested object of data', (done) => {
        let data = { id: '5js2q4k', data: { user: 'Test', pass: 'ThePass' } }
        router.on('simpleCommTest', (args) => {
          args.should.containDeepOrdered(data)
          router.clean()
          done()
        })
        router.send('simpleCommTest', data)
      })
      it('should receive an array of data', (done) => {
        let data = [ '5js2q4k', '2jdk', '4kwpd' ]
        router.on('simpleCommTest', (args) => {
          args.should.be.a.instanceOf(Array).and.have.lengthOf(data.length)
          args.should.containDeep(data)
          router.clean()
          done()
        })
        router.send('simpleCommTest', data)
      })
    })

    describe('Multiple calls', () => {
      it('should execute the callback for a simple "on event" once for each triggered "send"', (done) => {
        let testCalls = 200
        router.on('alwaysCall', (args) => {
          args.should.have.keys('id')
          args.id.should.be.a.Number()
          if (args.id >= testCalls - 1) { done(); router.clean() }
        })
        for (let i = 0; i < testCalls; i++) {
          router.send('alwaysCall', { id: i })
        }
      })
    })

    describe('Wild Cards', () => {
      it('should send a signal to all routes', (done) => {
        let data = '5js2q4k'
        let intermediate = null

        router.on('wildcardmatch', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          intermediate = 'called'
        })
        router.on('should match', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          should.exist(intermediate)
          intermediate.should.be.a.String().and.be.exactly('called')
          // Done here because is going to be triggered later (last registered)
          router.clean()
          done()
        })
        router.send('*', data)
      })

      it('should reveice a signal from any route', (done) => {
        let data = '5js2q4k'
        let intermediate = null

        router.on('should::match', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          intermediate = 'called'
        })
        router.on('*', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          should.exist(intermediate)
          intermediate.should.be.a.String().and.be.exactly('called')
          // Done here because is going to be triggered later (last registered)
          router.clean()
          done()
        })
        router.send('should::match', data)
      })

      it('should reveice a signal from a matching end of routes', (done) => {
        let data = '5js2q4k'
        let intermediate = null

        router.on('should::match', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          intermediate = 'called'
        })
        router.on('should::*', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          should.not.exist(intermediate)
          // Done here because is going to be triggered later (last registered)
          router.clean()
          done()
        })
        router.send('should::not::match', data)
      })

      it('should reveice a signal from a matching start of routes', (done) => {
        let data = '5js2q4k'
        let intermediate = null

        router.on('should::match', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          intermediate = 'called'
        })
        router.on('*::match', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          should.not.exist(intermediate)
          // Done here because is going to be triggered later (last registered)
          router.clean()
          done()
        })
        router.send('no::match', data)
      })

      it('should reveice a signal from whatever part matching routes', (done) => {
        let data = '5js2q4k'
        let intermediate = []

        router.on('should::match::this', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          intermediate.push('called')
        })
        router.on('should::*', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          intermediate.push('called')
        })
        router.on('*::match::*', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          intermediate.push('called')
        })
        router.on('*::this', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          intermediate.push('called')
        })
        router.on('*', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          should.exist(intermediate)
          intermediate.should.be.a.instanceOf(Array).and.have.lengthOf(4)
          intermediate.should.matchEach(a => a.should.be.exactly('called'))
          // Done here because is going to be triggered later (last registered)
          router.clean()
          done()
        })
        router.send('should::match::this', data)
      })
    })
  })

  describe('Duplex Communication', () => {
    describe('Data Types', () => {
      // VERB: GET
      it('should receive an string of data', (done) => {
        let sent = '5js2q4k'
        let reqResult = 'ok'
        router.get('doubleCommTest', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()
          res.json(reqResult)
        })
        router.route('get', 'doubleCommTest', sent, (err, result) => {
          should.not.exist(err)
          result.should.be.a.String().and.be.exactly(reqResult)
          router.clean()
          done()
        })
      })
      // VERB: POST
      it('should receive an object of data', (done) => {
        let sent = { id: '5js2q4k' }
        let reqResult = 'ok'
        router.post('doubleCommTest', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'POST', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()
          res.json(reqResult)
        })
        router.route('post', 'doubleCommTest', sent, (err, result) => {
          should.not.exist(err)
          result.should.be.a.String().and.be.exactly(reqResult)
          router.clean()
          done()
        })
      })
      // VERB: UPDATE
      it('should receive a nested object of data', (done) => {
        let sent = { id: '5js2q4k', data: { user: 'Test', pass: 'ThePass' } }
        let reqResult = 'ok'
        router.update('doubleCommTest', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'UPDATE', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()
          res.json(reqResult)
        })
        router.route('update', 'doubleCommTest', sent, (err, result) => {
          should.not.exist(err)
          result.should.be.a.String().and.be.exactly(reqResult)
          router.clean()
          done()
        })
      })
      // VERB: DELETE
      it('should receive an array of data', (done) => {
        let sent = [ '5js2q4k', '2jdk', '4kwpd' ]
        let reqResult = 'ok'
        router.delete('doubleCommTest', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'DELETE', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()
          res.json(reqResult)
        })
        router.route('delete', 'doubleCommTest', sent, (err, result) => {
          should.not.exist(err)
          result.should.be.a.String().and.be.exactly(reqResult)
          router.clean()
          done()
        })
      })
    })

    describe('Error', () => {
      it('should stop calling routes on first error ( first one errors )', (done) => {
        let sent = { id: '5js2q4k', data: [ 4, 8, 15, 16, 23, 42 ], name: 'Oceanic' }
        let ERR = 'BAD_REQUEST'
        let firstCall = null
        let secondCall = null
        let reqResult = 'ok'

        router.get('this::will::yes::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          firstCall = 'called'
          res.json(ERR, null)
        })
        router.get('this::will::not::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          secondCall = 'called'
          res.json(reqResult)
        })
        router.route('get', 'this::will::*::be::called', sent, (err, result) => {
          should.exist(err)
          err.should.be.a.String().and.be.exactly(ERR)
          should.not.exist(result)

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          should.not.exist(secondCall)

          router.clean()
          done()
        })
      })

      it('should stop calling routes on first error ( middle one errors )', (done) => {
        let sent = { id: '5js2q4k', data: [ 4, 8, 15, 16, 23, 42 ], name: 'Oceanic' }
        let ERR = 'BAD_REQUEST'
        let reqResult = 'ok'
        let firstCall = null
        let secondCall = null
        let thirdcall = null

        router.get('to::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          firstCall = 'called'
          res.json(reqResult)
        })
        router.get('this::will::yes::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          secondCall = 'called'
          res.json(ERR, null)
        })
        router.get('will::yes::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          thirdcall = 'called'
          res.json(reqResult)
        })
        router.route('get', '*::be::called', sent, (err, result) => {
          should.exist(err)
          err.should.be.a.String().and.be.exactly(ERR)
          should.not.exist(result)

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          should.exist(secondCall)
          secondCall.should.be.a.String().and.be.exactly('called')

          should.not.exist(thirdcall)

          router.clean()
          done()
        })
      })

      it('should stop calling routes when one timeouts', (done) => {
        let sent = { id: '5js2q4k', data: [ 4, 8, 15, 16, 23, 42 ], name: 'Oceanic' }
        let firstCall = null

        router.get('to::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          firstCall = 'called'
          // Do not call - this shall trigger the error
        })
        router.route('get', '*::be::called', sent, (err, result) => {
          should.exist(err)
          err.should.be.a.Error()
          err.message.should.be.a.String().and.be.exactly('Timeout - 200ms elapsed')
          should.not.exist(result)

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          router.clean()
          done()
        })
      })
    })

    describe('Multiple calls', () => {
      it('should execute the callback for a simple "on event" once for each triggered "send"', (done) => {
        let testCalls = 4
        let sent = { id: '5js2q4k' }
        let reqResult = 'ok'

        router.get('doubleCommTest', (req, res) => {
        // console.log('e', req, res)
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()
          res.json(reqResult)
        })

        for (let i = 0; i < testCalls; i++) {
          router.route('get', 'doubleCommTest', sent, (err, result) => {
            should.not.exist(err)
            // result.should.be.a.String().and.be.exactly( reqResult )
            if (i === testCalls - 1) { done(); router.clean() }
          })
        }
      })
    })

    describe('Wild Cards', () => {
      it('should reveice a signal from all routes', (done) => {
        let sent = { id: '5js2q4k', data: [ 4, 8, 15, 16, 23, 42 ], name: 'Oceanic' }
        let reqResult = 'ok'
        let firstCall = null
        let secondCall = null

        router.get('should::match', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          firstCall = 'called'
          res.json(reqResult)
        })
        router.get('*', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          secondCall = 'called'
          res.json(reqResult)
        })
        router.routes.get('should::match', sent, (err, result) => {
          should.not.exist(err)
          result.should.be.a.instanceOf(Array).and.have.lengthOf(2)
          result.should.matchEach(r => r.should.be.a.String().and.be.exactly(reqResult))

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          should.exist(secondCall)
          secondCall.should.be.a.String().and.be.exactly('called')

          router.clean()
          done()
        })
      })

      it('should send a signal to all routes', (done) => {
        let sent = { id: '5js2q4k', data: [ 4, 8, 15, 16, 23, 42 ], name: 'Oceanic' }
        let reqResult = 'ok'
        let firstCall = null
        let secondCall = null

        router.get('this::will::yes::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          firstCall = 'called'
          res.json(reqResult)
        })
        router.get('this::will::not::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          secondCall = 'called'
          res.json(reqResult)
        })
        router.route('get', 'this::will::*::be::called', sent, (err, result) => {
          should.not.exist(err)
          result.should.be.a.instanceOf(Array).and.have.lengthOf(2)
          result.should.matchEach(r => r.should.be.a.String().and.be.exactly(reqResult))

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          should.exist(secondCall)
          secondCall.should.be.a.String().and.be.exactly('called')

          router.clean()
          done()
        })
      })

      it('should reveice a signal from a matching end of routes', (done) => {
        // global.DEBUG = 'sendDuplex|_extractEvts'
        let sent = { id: '5js2q4k', data: [ 4, 8, 15, 16, 23, 42 ], name: 'Oceanic' }
        let reqResult = 'ok'
        let firstCall = null
        let secondCall = null

        router.get('this::will::yes::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          firstCall = 'called'
          res.json(reqResult)
        })
        router.get('this::will::not::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          secondCall = 'called'
          res.json(reqResult)
        })
        router.route('get', 'this::will::yes::be::*', sent, (err, result) => {
          should.not.exist(err)
          result.should.be.a.String().and.be.exactly(reqResult)

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          should.not.exist(secondCall)

          router.clean()
          done()
        })
      })

      it('should reveice a signal from a matching start of routes', (done) => {
        let sent = { id: '5js2q4k', data: [ 4, 8, 15, 16, 23, 42 ], name: 'Oceanic' }
        let reqResult = 'ok'
        let firstCall = null
        let secondCall = null

        router.get('this::will::yes::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          firstCall = 'called'
          res.json(reqResult)
        })
        router.get('this::will::not::be::called', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          secondCall = 'called'
          res.json(reqResult)
        })
        router.route('get', '*::yes::be::called', sent, (err, result) => {
          should.not.exist(err)
          result.should.be.a.String().and.be.exactly(reqResult)

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          should.not.exist(secondCall)

          router.clean()
          done()
        })
      })

      it('should reveice a signal from whatever part matching routes', (done) => {
      // global.DEBUG = 'route'

        let sent = { id: '5js2q4k', data: [ 4, 8, 15, 16, 23, 42 ], name: 'Oceanic' }
        let reqResult = 'ok'
        let intermediate = []

        router.get('should::match::this', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          intermediate.push('called')
          res.json(reqResult)
        })
        router.get('should::*', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          intermediate.push('called')
          res.json(reqResult)
        })
        router.get('*::match::*', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          intermediate.push('called')
          res.json(reqResult)
        })
        router.get('*::this', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          intermediate.push('called')
          res.json(reqResult)
        })
        router.get('*', (req, res) => {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()

          intermediate.push('called')
          res.json(reqResult)
        })
        router.routes.get('should::match::this', sent, (err, result) => {
          should.not.exist(err)
          result.should.be.a.instanceOf(Array).and.have.lengthOf(5)
          result.should.matchEach(r => r.should.be.a.String().and.be.exactly(reqResult))

          intermediate.should.be.a.instanceOf(Array).and.have.lengthOf(5)
          intermediate.should.matchEach(a => a.should.be.exactly('called'))

          router.clean()
          done()
        })
      })
    })
  })
})

