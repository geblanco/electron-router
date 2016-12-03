/* eslint-disable padded-blocks */
(function (factory) {
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    try {
      let ele = require('electron')
      let ipc = ele.ipcMain
      let proc = 1
      let remote = { BrowserWindow: ele.BrowserWindow }
      if (!ipc) {
        proc = 0
        ipc = ele.ipcRenderer
        remote = ele.remote
      }
      module.exports = factory(require('eventemitter3'), ipc, remote, require('lodash'), require('uuid'), proc)
    } catch (e) {
      throw new Error('This module only works on an Electron environment!!', e)
    }
  } else {
    throw new Error('This module only works on an Node-Electron environment!!')
  }
})(function (EventEmitter, ipc, remote, lo, uuid, procSide) {

  'use strict'

  // Constants
  const DUP_RCV_HEAD = 'DUPLEX::RCV'
  const DUP_SND_HEAD = 'DUPLEX::SND'
  const defaultCfg = {
    timeoutEnabled: true,
    timeoutTime: 200,
    _mod: false
  }
  // Utils
  const DEBUG = function (fn) {
    let args = Array.prototype.slice.call(arguments, 0)
    let debugFn = args[ 0 ]
    if (
      global.DEBUG && typeof global.DEBUG === 'string' &&
      (
        global.DEBUG === '*' ||
        global.DEBUG.split('|').map(a => a.toLowerCase()).indexOf(debugFn.toLowerCase()) !== -1
      )
    ) {
      console.log.apply(console, args)
    }
  }

  function _extractEvts (evt, allEvts) {

    let ret = []
    // We are on DUPLEX, when a DUPLEX::RCV:: evt is received we cannot go to DUPLEX::RCV,
    // it can create a infinite loop
    if (evt.indexOf(DUP_RCV_HEAD) !== -1) {
      allEvts = allEvts.filter(ev => !!ev.indexOf(DUP_SND_HEAD))
    } else if (evt.indexOf(DUP_SND_HEAD) !== -1) {
      allEvts = allEvts.filter(ev => !!ev.indexOf(DUP_RCV_HEAD))
    }

    DEBUG('_extractEvts', '\n', 1, 'got...', evt, '_allEvts', allEvts)

    if (evt.indexOf('*') !== -1 && evt !== '*') {
      // It contains a wildcard, check against all events, convert the wildcard to a whatever `.*`
      let regexp = new RegExp(`^${evt.replace(/\*/g, '.*')}$`, 'i')

      ret = ret.concat(allEvts.filter(ev => regexp.test(ev.replace(/\*/g, ''))))
      DEBUG('_extractEvts', '\n', 2.2, 'regexp', regexp, 'ret', ret)
      regexp = null

    } else if (evt !== '*') {

      ret = [ evt ]
      DEBUG('_extractEvts', '\n', 3, ret)

    } else {

      ret = allEvts
      DEBUG('_extractEvts', '\n', 4, ret)

    }

    DEBUG('_extractEvts', '\n', 5, ret)
    // Check events containing wildcards
    ret = ret.concat(allEvts.filter(ev => {
      DEBUG('_extractEvts', '\n', 6, ev, (new RegExp(`^${ev.replace(/\*/g, '.*')}$`, 'i')).test(evt.replace(/\*/g, '')))
      return (new RegExp(`^${ev.replace(/\*/g, '.*')}$`, 'i')).test(evt.replace(/\*/g, ''))
    }))

    DEBUG('_extractEvts', '\n', 7, ret, '->', lo.uniq(ret))

    return lo.uniq(ret)
  }

  class Router extends EventEmitter {

    constructor (name, proc, cfg) {
      super()

      this._procSide = proc
      this._name = name || this._isRenderProcess()
        ? 'ROUTER_RENDERER'
        : 'ROUTER_PROCESS'

      this._config = {}
      this.routes = {
        post: (...args) => { this.route.apply(this, ['post'].concat(args)) },
        get: (...args) => { this.route.apply(this, ['get'].concat(args)) },
        update: (...args) => { this.route.apply(this, ['update'].concat(args)) },
        delete: (...args) => { this.route.apply(this, ['delete'].concat(args)) }
      }
      this._setup(true, cfg)
    }

    _setup (firstTime, cfg) {
      firstTime = !!firstTime
      if (firstTime) {
        // Register window close handler
        if (this._isRenderProcess()) {
          let win = this._getWindow()
          // TODO => Check if this really works,
          // is the close evt triggered on the current window?

          win.on('close', this.clean)
        }
      }
      // Parse and setup config
      this._config = lo.pick(lo.merge(this._config, defaultCfg, cfg), Object.keys(defaultCfg))
      this._config._mod = !lo.isEqual(this._config, defaultCfg)
      DEBUG('_setup', 'config', this._config)
    }

    _getWindows () {
      if (remote.getCurrentWindow) {
        // We are on renderer process
        let id = remote.getCurrentWindow().id
        return remote.BrowserWindow.getAllWindows().filter(w => w.id !== id)
      } else {
        // We are on main process
        return remote.BrowserWindow.getAllWindows()
      }
    }

    _getWindow () {
      if (remote.getCurrentWindow) {
        // We are on renderer process
        return remote.getCurrentWindow()
      } else {
        // We are on main process
        return null
      }
    }

    _isRenderProcess () {
      return remote.hasOwnProperty('getCurrentWindow')
    }

    _common (argss, verb) {
      var args = Array.prototype.slice.call(argss, 0)

      if (args.length <= 1) {
        throw new Error('Bad arguments, invalid number of arguments, expecting at least 1, got 0. MUST provide a route, a method and a callback')
      }

      let route = args.shift()
      let ctx = args.pop()
      let cb = args.pop()

      if (cb === undefined) {
        cb = ctx
        ctx = null
      }

      if (typeof cb !== 'function') {
        throw new Error('Bad arguments, callback must be a function, MUST provide a route and a callback')
      }
      DEBUG('_common',
        '\n_commonreg', 'on', `${DUP_RCV_HEAD}::${route}::${verb.toUpperCase()}`,
        '\n_commonreg', 'send', `${DUP_SND_HEAD}::${route}::${verb.toUpperCase()}`
      )
      this.on(`${DUP_RCV_HEAD}::${route}::${verb.toUpperCase()}`, (function (callback, router, route, verb) {
        return function (evt) {
          let req = { method: verb, params: Array.prototype.slice.call(evt.data, 0) }
          let res = {
            json: function (err, obj) {
              if (arguments.length === 1) {
                obj = err
                err = null
              }
              DEBUG('_common', 'On the json end', arguments)
              router.sendDuplexBack(
                `${DUP_SND_HEAD}::${route}::${verb.toUpperCase()}`,
                { origEvt: evt.origEvt, count: evt.count, total: evt.total },
                err,
                obj ? JSON.parse(JSON.stringify(obj)) : undefined
              )
            }
          }

          callback(req, res)
          // callback = router = route = verb = req = res = null
        }
      })(cb, this, route, verb), ctx)
    }

    applyConfig (cfg) {
      cfg && this._setup(false, cfg)
    }

    on (evt, listener, ctx) {
      // TODO => If event has yet been emitted,
      // do not register => trigger directly, Event Queue
      super.on(evt, listener, ctx)
      if (ipc && ipc.on) {
        ipc.on(evt, function (event) {
          let args = Array.prototype.slice.call(arguments, 1)
          DEBUG('on', 'inside ipc on', evt, args)
          listener.apply(ctx, args)
          args = event = null
        })
      }
    }

    send (evt) {
      let _evt = evt.trim()
      let _args = Array.prototype.slice.call(arguments, 1)
      let _allEvts = super.eventNames().concat(lo.difference(this._cache, super.eventNames()))
      let _evts = _extractEvts(_evt, _allEvts)
      let _wins = this._getWindows()
      let _winsLen = _wins.length

      let len = _evts.length
      for (let i = 0; i < len; i++) {
        let msgArr = [ _evts[ i ] ].concat(_args)

        DEBUG('send', 'sending...', msgArr, msgArr.length)

        // Emit through eventemitter
        super.emit.apply(this, msgArr)

        // Emit through windows
        for (let j = 0; j < _winsLen; j++) {
          // we can be overwritten while sending...
          if (this._getWindows().indexOf(_wins[ j ]) !== -1) _wins[ j ].send.apply(_wins[ j ], msgArr)
        }

        // Emit through ipc
        ipc && ipc.send && ipc.send.apply(ipc, msgArr)
      }

      _evt = _args = _evts = _wins = null
    }

    sendDuplex (evt, data) {
      let _evt = evt.trim()
      let _args = Array.prototype.slice.call(data.args, 0)
      let _origEvt = data.origEvt
      let _allEvts = super.eventNames().concat(lo.difference(this._cache, super.eventNames()))
      let _evts = _extractEvts(_evt, _allEvts)
      let _wins = this._getWindows()
      let _winsLen = _wins.length

      let len = _evts.length
      for (let i = 0; i < len; i++) {
        let msgArr = [ _evts[ i ] ].concat({ origEvt: _origEvt, count: i + 1, total: len, data: _args })

        DEBUG('sendDuplex', 'sending...', msgArr)

        // Emit through eventemitter
        super.emit.apply(this, msgArr)

        // Emit through windows
        for (let j = 0; j < _winsLen; j++) {
          // we can be overwritten while sending...
          if (this._getWindows().indexOf(_wins[ j ]) !== -1) _wins[ j ].send.apply(_wins[ j ], msgArr)
        }

        // Emit through ipc
        ipc && ipc.send && ipc.send.apply(ipc, msgArr)
      }

      _evt = _args = _evts = _wins = null
    }

    sendDuplexBack (evt, origEvt, err, data) {
      DEBUG('sendDuplexBack', '\n', 0, 'raw', arguments)

      let _evt = origEvt.origEvt
      let _iter = origEvt.count
      let _total = origEvt.total
      let _args = Array.prototype.slice.call(arguments, 2)
      let _wins = this._getWindows()
      let _winsLen = _wins.length

      let msgArr = [ _evt ].concat({ count: _iter, total: _total, data: _args })

      DEBUG('sendDuplexBack', 'sending...', msgArr)
      // Emit through eventemitter
      super.emit.apply(this, msgArr)

      // Emit through windows
      for (let j = 0; j < _winsLen; j++) {
        // we can be overwritten while sending...
        if (this._getWindows().indexOf(_wins[ j ]) !== -1) _wins[ j ].send.apply(_wins[ j ], msgArr)
      }

      // Emit through ipc
      ipc && ipc.send && ipc.send.apply(ipc, msgArr)

      _evt = _iter = _total = _args = _wins = _winsLen = msgArr = null
    }

    // verb, arg1, arg2, arg3..., callback
    route () {
      let args = Array.prototype.slice.call(arguments, 0)
      if (args.length < 3) {
        throw new Error(`Bad arguments, invalid number of arguments, expecting at least 3, got ${args.length}. MUST provide a route, a method and a callback`)
      }
      // Extract verb
      let verb = args.shift().toUpperCase()
      // Extract route
      let route = args.shift()
      let transactionId = uuid()
      let params = { origEvt: `${transactionId}`, args: [] }

      // Extract arguments
      let len = args.length - 1
      let i = 0
      while (i++ < len) {
        params.args.push(args.shift())
      }

      // Extract callback
      let cb = args.pop()

      if (typeof cb !== 'function') {
        throw new Error('Bad arguments, callback must be a function, MUST provide a route and a callback')
      }

      let caller = (function (router, uuid, cb) {
        let results = []
        let errored = null
        let timer = 0

        let fn = function fn (data) {
          if (!errored) {
            DEBUG('route', 'back fn', arguments, JSON.stringify(data, null, 2), results)
            results.push(data.data[ 1 ])
            // Data from caller comes like data: { data: [ err, result ] }
            // If one errored finish immediately
            // Or we are on the last callback, clean aux routes
            if (data.data[ 0 ] || data.count === data.total) {
              !(data.data[ 0 ]) || (results = [ data.data[ 0 ] ])
              data.data[ 0 ] || (results = [ null, results.length > 1 ? results : results[0] ])
              DEBUG('route', 'back fn', 'data', data, 'sending', results)
              router.removeListener(`${uuid}`, fn)
              cb.apply(cb, results)

              router = cb = results = errored = null
              clearTimeout(timer)
            }
          }
        }
        // If we are not called back within 200 ms
        // trigger error
        if (router._config.timeoutEnabled) {
          timer = setTimeout(function () {
            cb.apply(cb, [new Error(`Timeout - ${router._config.timeoutTime}ms elapsed`)])
            router.removeListener(`${uuid}`, fn)
            errored = true
            router = cb = null
          }, router._config.timeoutTime)
        }

        return fn
      })(this, transactionId, cb)

      this.on(`${transactionId}`, caller)

      DEBUG('route', '\non', `${DUP_SND_HEAD}::${route}::${verb}`)
      DEBUG('route', '\nsend', `${DUP_RCV_HEAD}::${route}::${verb}`, params)

      this.sendDuplex.apply(this, [`${DUP_RCV_HEAD}::${route}::${verb}`].concat(params))
    }

    removeListener (evt, handler, ctx) {
      super.removeListener(evt, handler, ctx)

      if (this._isRenderProcess()) {
        let win = this._getWindow()
        win.removeListener(evt, handler)
      } else {
        ipc.removeListener(evt, handler)
      }
    }

    get () {
      this._common(arguments, 'GET')
    }

    post () {
      this._common(arguments, 'POST')
    }

    update () {
      this._common(arguments, 'UPDATE')
    }

    delete () {
      this._common(arguments, 'DELETE')
    }

    clean (e) {
      let name = `${this._name.toUpperCase()}::CLOSE`
      DEBUG('clean', 'sending close', name, 'pre', 'events', this.eventNames())
      let wins = this._getWindows()
      ipc && ipc.send && ipc.send(name)
      // Communicate we are closing, clear ipc too?
      wins.forEach(w => { w.send(name) })
      super.removeAllListeners()
      let win = this._getWindow()
      win && win.removeListener('close', this.clean)
      DEBUG('clean', 'sending close', name, 'post', 'events', this.eventNames())
      // This ensures we do not interfere in the close process
      e && (e.returnValue = undefined)
      // Reset config
      this._config = defaultCfg
    }
  }

  var _router = null

  // TODO => Think on name and window setup (ie: registerWindow??)
  // TODO => Queue of sent events for late on'ss
  return (name, cfg) => {
    // Little parse
    if (cfg === undefined && typeof name === 'object') {
      cfg = name
      name = null
    }
    if (!_router) {
      _router = new Router(name, procSide, cfg || {})
    } else if (cfg && !_router._config._mod) {
      // Only allow config changes if there were not another config
      _router._setup(false, cfg)
    }

    return _router

  }

})
