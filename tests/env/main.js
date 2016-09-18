/* global describe, it */

'use strict'

/* eslint-disable no-unused-vars */
const should = require('should')
/* eslint-enable no-unused-vars */
const path = require('path')

describe('Electron Environment', () => {
  it('should throw an Error', () => {
    let router = null
    try {
      router = require(path.join(__dirname, '/../../router'))('TEST')
    } catch (e) {
      router = e
    } finally {
      router.should.be.a.Error().and.be.match(/This module only works on an Electron environment.*/gi)
    }
  })
})
