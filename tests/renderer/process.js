'use strict'

/* eslint-disable no-unused-vars */
const should = require('should')
/* eslint-enable no-unused-vars */
const path = require('path')
const router = require(path.join(__dirname, '/../../router'))('TEST')
const async = require('async')
const reqResult = 'ok'
const baseData = '5js2q4k'
const data = [
  baseData,
  { id: '5js2q4k' },
  { id: '5js2q4k', data: { user: 'Test', pass: 'ThePass' } },
  [ '5js2q4k', '2jdk', '4kwpd' ]
]
const duplexMethods = [
  'get',
  'post',
  'update',
  'delete'
]

// global.DEBUG = 'route'

let prepareSimpleCommTests = (done) => {
  for (let i = 0; i < data.length; i++) {
    router.clean()
    router.on(`simplex-communication-data-types-${i}`, () => {
      router.send(`simpleCommTest-${i}`, data[ i ])
      if (i === data.length - 1) done()
    })
  }
}

let prepareMultipleCallsTest = (done) => {
  router.on('multiple-calls-start', (numTests) => {
    for (let i = 0; i < numTests; i++) {
      router.send('alwaysCall', { id: i })
    }
    done()
  })
}

let prepareDuplexCommTests = (done) => {
  for (let i = 0; i < data.length; i++) {
    router.clean()
    router.on(`doubleCommTest-${i}`, () => {
      router.route(duplexMethods[ i ], 'doubleCommTest', data[ i ], (err, result) => {
        should.not.exist(err)
        result.should.be.a.String().and.be.exactly(reqResult)
        router.send(`doubleCommTest-${i}-end`)
        if (i === data.length - 1) done()
      })
    })
  }
}

let prepareDuplexCommMultipleCallsTests = (done) => {
  router.on('doubleCommTest-multiple-calls', (testCalls) => {
    router.clean()
    for (let i = 0; i < testCalls; i++) {
      router.route('get', 'doubleComm-multiple-calls', { id: '5js2q4k' }, (err, result) => {
        should.not.exist(err)
        result.should.be.a.String().and.be.exactly(reqResult)
        if (i === testCalls - 1) { router.send('doubleCommTest-multiple-calls-end'); done() }
      })
    }
  })
}

router.on('tests-start', () => {
  async.waterfall([
    (callback) => {
      router.on('simplex-communication-data-types', prepareSimpleCommTests.bind(this, callback))
    },
    (callback) => {
      router.clean()
      prepareMultipleCallsTest(callback)
    },
    (callback) => {
      router.clean()
      prepareDuplexCommTests(callback)
    },
    (callback) => {
      router.clean()
      prepareDuplexCommMultipleCallsTests(callback)
    }
  ])
})

