/* global describe, it */

'use strict'

/* eslint-disable no-unused-vars */
const should = require('should')
/* eslint-enable no-unused-vars */
const path = require('path')
const router = require(path.join(__dirname, '/../../router'))('TEST')

describe('Bad Params', () => {
  describe('VERB Handlers', () => {
    describe('Number of arguments', () => {
      it('should throw an invalid number of arguments error', (done) => {
        let ex = null
        try {
          router.get()
        } catch (e) {
          ex = e
        } finally {
          ex.should.be.a.Error().and.be.match(/Bad arguments, invalid number of arguments, expecting at least 1, got 0.*/gi)
          done()
        }
      })
    })
    describe('Arguments Types', () => {
      it('should throw a Bad arguments error', (done) => {
        let ex = null
        try {
          router.get('it::will::fail', ['thisIsNotAFunction'])
        } catch (e) {
          ex = e
        } finally {
          ex.should.be.a.Error().and.be.match(/Bad arguments, callback must be a function.*/gi)
          done()
        }
      })
    })
  })
  describe('Route Sender', () => {
    describe('Number of arguments', () => {
      it('should throw an invalid number of arguments error (0 args)', (done) => {
        let called = null
        let ex = null
        router.get('normalEvt', (req, res) => {
          called = true
          res.json('OK')
        })
        try {
          router.route()
        } catch (e) {
          ex = e
        } finally {
          should.not.exist(called)
          ex.should.be.a.Error().and.be.match(/Bad arguments, invalid number of arguments, expecting at least 3, got 0.*/gi)
          done()
        }
      })
      it('should throw an invalid number of arguments error (1 args)', (done) => {
        let called = null
        let ex = null
        router.get('normalEvt', (req, res) => {
          called = true
          res.json('OK')
        })
        try {
          router.route('get')
        } catch (e) {
          ex = e
        } finally {
          should.not.exist(called)
          ex.should.be.a.Error().and.be.match(/Bad arguments, invalid number of arguments, expecting at least 3, got 1.*/gi)
          done()
        }
      })
      it('should throw an invalid number of arguments error (2 args)', (done) => {
        let called = null
        let ex = null
        router.get('normalEvt', (req, res) => {
          called = true
          res.json('OK')
        })
        try {
          router.route('get', 'normalEvt')
        } catch (e) {
          ex = e
        } finally {
          should.not.exist(called)
          ex.should.be.a.Error().and.be.match(/Bad arguments, invalid number of arguments, expecting at least 3, got 2.*/gi)
          done()
        }
      })
    })
    describe('Arguments Types', () => {
      it('should throw a Bad arguments error', (done) => {
        let called = null
        let ex = null
        router.get('normalEvt', (req, res) => {
          called = true
          res.json('OK')
        })
        try {
          router.route('get', 'normalEvt', ['thisIsNotAFunction'])
        } catch (e) {
          ex = e
        } finally {
          should.not.exist(called)
          ex.should.be.a.Error().and.be.match(/Bad arguments, callback must be a function.*/gi)
          done()
        }
      })
    })
  })
})

