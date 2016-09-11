/* global describe, it */

'use strict'

/* eslint-disable no-unused-vars */
const should = require('should')
/* eslint-enable no-unused-vars */
const path = require('path')
const requireNC = require('require-no-cache')

describe('Config', () => {
  describe('Default', () => {
    let router = requireNC(path.join(__dirname, '/../../router'))('TEST')
    describe('Variables', () => {
      it('should have default variables on config internal var', () => {
        router._config.should.be.a.Object
        router._config.should.deepEqual({timeoutEnabled: true, timeoutTime: 200, _mod: false})
      })
    })
    describe('Behaviour', () => {
      it('should Error with 200 ms timeout', (done) => {
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
  })
  describe('Default, reject on second init', () => {
    let Router = requireNC(path.join(__dirname, '/../../router'))
    let router = Router('TEST', {timeoutTime: 300})
    router = Router('TEST', {timeoutTime: 400})
    describe('Variables', () => {
      it('should have default variables on config internal var', () => {
        router._config.should.be.a.Object
        router._config.should.deepEqual({timeoutEnabled: true, timeoutTime: 300, _mod: true})
      })
    })
    describe('Behaviour', () => {
      it('should Error with 300 ms timeout', (done) => {
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
          err.message.should.be.a.String().and.be.exactly('Timeout - 300ms elapsed')
          should.not.exist(result)

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          router.clean()
          done()
        })
      })
    })
  })
  describe('Custom on init', () => {
    const config = {timeoutEnabled: true, timeoutTime: 100, _mod: true}
    let router = requireNC(path.join(__dirname, '/../../router'))('TEST', config)
    describe('Variables', () => {
      it('should have provided variables on config internal var', () => {
        router._config.should.be.a.Object
        router._config.should.deepEqual(config)
      })
    })
    describe('Behaviour', () => {
      it('should Error with 100 ms timeout', (done) => {
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
          err.message.should.be.a.String().and.be.exactly('Timeout - 100ms elapsed')
          should.not.exist(result)

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          router.clean()
          done()
        })
      })
    })
  })
  describe('Custom by method', () => {
    const config = {timeoutEnabled: true, timeoutTime: 100, _mod: true}
    let router = requireNC(path.join(__dirname, '/../../router'))('TEST')
    router.applyConfig(config)
    describe('Variables', () => {
      it('should have provided variables on config internal var', () => {
        router._config.should.be.a.Object
        router._config.should.deepEqual(config)
      })
    })
    describe('Behaviour', () => {
      it('should Error with 100 ms timeout', (done) => {
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
          err.message.should.be.a.String().and.be.exactly('Timeout - 100ms elapsed')
          should.not.exist(result)

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          router.clean()
          done()
        })
      })
    })
  })
  describe('Custom only param on init', () => {
    const config = {timeoutEnabled: true, timeoutTime: 100, _mod: true}
    let router = requireNC(path.join(__dirname, '/../../router'))(config)
    describe('Variables', () => {
      it('should have provided variables on config internal var', () => {
        router._config.should.be.a.Object
        router._config.should.deepEqual(config)
      })
    })
    describe('Behaviour', () => {
      it('should Error with 100 ms timeout', (done) => {
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
          err.message.should.be.a.String().and.be.exactly('Timeout - 100ms elapsed')
          should.not.exist(result)

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          router.clean()
          done()
        })
      })
    })
  })
  describe('Custom overwrite default after init', () => {
    const config = {timeoutEnabled: true, timeoutTime: 100, _mod: true}
    let router = requireNC(path.join(__dirname, '/../../router'))('TEST')
    router = require(path.join(__dirname, '/../../router'))(config)
    describe('Variables', () => {
      it('should have provided variables on config internal var', () => {
        router._config.should.be.a.Object
        router._config.should.deepEqual(config)
      })
    })
    describe('Behaviour', () => {
      it('should Error with 100 ms timeout', (done) => {
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
          err.message.should.be.a.String().and.be.exactly('Timeout - 100ms elapsed')
          should.not.exist(result)

          should.exist(firstCall)
          firstCall.should.be.a.String().and.be.exactly('called')

          router.clean()
          done()
        })
      })
    })
  })
})

