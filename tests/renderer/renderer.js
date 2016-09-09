/* global describe, it */

'use strict'

/* eslint-disable no-unused-vars */
const should = require('should')
/* eslint-enable no-unused-vars */
const path = require('path')
const router = require(path.join(__dirname, '/../../router'))('TEST')

// global.DEBUG = '_common'
router.send('tests-start')

describe('Renderer Process Complex', () => {
  describe('Simplex Communication', () => {
    describe('Data Types', () => {
      router.send('simplex-communication-data-types')

      it('should receive an string of data', (done) => {
        let data = '5js2q4k'
        router.on('simpleCommTest-0', (args) => {
          args.should.be.a.String().and.be.exactly(data)
          router.clean()
          done()
        })

        router.send('simplex-communication-data-types-0')
      })
      it('should receive an object of data', (done) => {
        let data = { id: '5js2q4k' }
        router.on('simpleCommTest-1', (args) => {
          args.should.containDeepOrdered(data)
          router.clean()
          done()
        })

        router.send('simplex-communication-data-types-1')
      })
      it('should receive a nested object of data', (done) => {
        let data = { id: '5js2q4k', data: { user: 'Test', pass: 'ThePass' } }
        router.on('simpleCommTest-2', (args) => {
          args.should.containDeepOrdered(data)
          router.clean()
          done()
        })

        router.send('simplex-communication-data-types-2')
      })
      it('should receive an array of data', (done) => {
        let data = [ '5js2q4k', '2jdk', '4kwpd' ]
        router.on('simpleCommTest-3', (args) => {
          args.should.be.a.instanceOf(Array).and.have.lengthOf(data.length)
          args.should.containDeep(data)
          router.clean()
          done()
        })

        router.send('simplex-communication-data-types-3')
      })
    })

    describe('Multiple calls', () => {
      router.send('multiple-calls')

      it('should execute the callback for a simple "on event" once for each triggered "send"', (done) => {
        let testCalls = 200
        router.on('alwaysCall', (args) => {
          args.should.have.keys('id')
          args.id.should.be.a.Number()
          if (args.id >= testCalls - 1) { done(); router.clean() }
        })

        router.send('multiple-calls-start', testCalls)
      })
    })
  })

  // TODO => impl and test timeout function with test,
  // if one side of the pipe is not called within 200ms
  // call it with err: ETimeOut
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

        router.send('doubleCommTest-0')
        router.on('doubleCommTest-0-end', done)
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

        router.send('doubleCommTest-1')
        router.on('doubleCommTest-1-end', done)
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

        router.send('doubleCommTest-2')
        router.on('doubleCommTest-2-end', done)
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

        router.send('doubleCommTest-3')
        router.on('doubleCommTest-3-end', done)
      })
    })

    describe('Multiple calls', () => {
      it('should execute the callback for a simple "on event" once for each triggered "send"', (done) => {
        let testCalls = 4
        let sent = { id: '5js2q4k' }
        let reqResult = 'ok'

        router.get('doubleComm-multiple-calls', (req, res) => {
          // console.log('e', req, res)
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()
          res.json(reqResult)
        })

        router.send('doubleCommTest-multiple-calls', testCalls)
        router.on('doubleCommTest-multiple-calls-end', done)
      })
    })
  })
})

