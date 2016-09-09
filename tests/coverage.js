'use strict'

// Largely cribbed from
// https://raw.githubusercontent.com/tropy/tropy/master/test/support/coverage.js
// and
// https://github.com/dougluce/scanner/commit/a440915ed0e026c0b0266bbeddd6fc250850a21b

const glob = require('glob')
const { readFileSync: read, realpathSync } = require('fs')
const { Reporter, Instrumenter, Collector, hook } = require('istanbul')
const { keys } = Object

function isRenderProcess () {
  let ret = false
  try {
    let ele = require('electron')
    let ipc = ele.ipcMain
    let remote = { BrowserWindow: ele.BrowserWindow }
    if (!ipc) {
      ipc = ele.ipcRenderer
      remote = ele.remote
    }
    ret = remote.hasOwnProperty('getCurrentWindow')
  } catch (ex) {}
  return ret
}

function match () {
  const map = {}
  const fn = function (file) { return map[file] }
  fn.files = []
  for (let file of glob.sync(pattern, { root, realpath: true })) {
    let fullpath = realpathSync(file)
    fn.files.push(fullpath)
    map[fullpath] = true
  }
  return fn
}

function report (evt, coverage) {
  const cov = global.__coverage__ || coverage
  for (let file of matched.files) {
    if (!cov[file]) {
      // Add uncovered files to the report.
      transformer(read(file, 'utf-8'), file)
      for (let key of keys(instrumenter.coverState.s)) {
        instrumenter.coverState.s[key] = 0
      }
      cov[file] = instrumenter.coverState
    }
  }

  const collector = new Collector()
  collector.add(cov)

  // const cfg = null, dir = isRenderProcess()?'./coverage_renderer':null
  // const reporter = new Reporter( cfg, dir )
  const reporter = new Reporter()
  reporter.addAll(['text-summary', 'json'])
  reporter.write(collector, true, () => {})
}

// The source files to cover.  Avoid node_modules/, coverage/, and
// */coverage.js (supposed to be test/coverage.js)
const root = require('path').resolve(__dirname, '..', '..')
const pattern = 'router.js'
// '{!(node_modules|coverage|test)/**,tests/**.js}/!(coverage).js'
// '{!(node_modules|coverage)/**,.}/!(coverage).js'
const matched = match()

const instrumenter = new Instrumenter()
const transformer = instrumenter.instrumentSync.bind(instrumenter)

hook.hookRequire(matched, transformer, {})

if (isRenderProcess()) window.emitter.on('mocha-cover', report)
else process.on('exit', report)
