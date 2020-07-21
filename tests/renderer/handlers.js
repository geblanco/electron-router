/* global describe, it */

'use strict'

/* eslint-disable no-unused-vars */
const should = require('should')
/* eslint-enable no-unused-vars */
const path = require('path')
const router = require(path.join(__dirname, '/../../router'))('TEST')
let ele = require('electron')
let ipc = ele.ipcMain
if (!ipc) {
  ipc = ele.ipcRenderer
}

describe('Renderer Process Handler', () => {
  describe('Simplex Communication', () => {
    describe('Callback removal', () => {
      it('should remove the installed callback', (done) => {
        let data = '5js2q4k'
        let origEventsCount = ipc._eventsCount
        router.on('simpleCommTest', function handler (args) {
          args.should.be.a.String().and.be.exactly(data)
          router.removeListener('simpleCommTest', handler)
          should.equal(router._eventsCount, 0)
          should.equal(ipc._eventsCount, origEventsCount)
          done()
        })
        router.send('simpleCommTest', data)
      })
    })
  })
  describe('Duplex Communication', () => {
    describe('Callback removal', () => {
      // VERB: GET
      it('should remove the installed callback', (done) => {
        let sent = '5js2q4k'
        let reqResult = 'ok'
        let origEventsCount = ipc._eventsCount
        function handler (req, res) {
          should.exist(req)
          req.should.be.a.Object().and.containDeepOrdered({ method: 'GET', params: [] })
          req.params.should.be.a.instanceOf(Array).and.containDeepOrdered([ sent ])

          should.exist(res)
          res.should.be.a.Object().and.have.property('json').which.is.a.Function()
          res.json(reqResult)
        }
        router.get('doubleCommTest', handler)
        router.route('get', 'doubleCommTest', sent, (err, result) => {
          should.not.exist(err)
          result.should.be.a.String().and.be.exactly(reqResult)
          router.removeListener('doubleCommTest', handler)
          should.equal(router._eventsCount, 0)
          should.equal(ipc._eventsCount, origEventsCount)
          done()
        })
      })
    })
  })
})
