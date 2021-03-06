var thanks = require('./')
var path = require('path')
var level = require('level')
var Ractive = require('ractive')
var copyPaste = require('copy-paste')
var wifiPassword = require('wifi-password')
var wifiName = require('wifi-name')
var page = require('page')
var fs = require('fs')
var ipc = require('ipc')
var signalhub = require('signalhub')
var webrtcSwarm = require('webrtc-swarm')

var wifiList = require('./lib/wifis.js')
var db = thanks(require('memdb')())

var hub = signalhub('thanks', [
  'https://instant.io:8080'
])

var sw = webrtcSwarm(hub)

sw.on('peer', function (peer, id) {
  console.log('connected to a new peer: ' + id)
  console.log('total peers: ' + sw.peers.length)
  peer.on('close', function () {
    console.log('peer close ' + id)
  })
  var s = db.replicate()
  s.pipe(peer).pipe(s)
  s.on('end', function () {
    console.log('replication with ' + id + ' ended')
  })
})

// Throw unhandled javascript errors
window.onerror = function errorHandler (message, url, lineNumber) {
  message = message + '\n' + url + ':' + lineNumber
  throwError(message)
}

var templates = {
  main: fs.readFileSync(path.join(__dirname, 'templates/main.html')).toString(),
  view: fs.readFileSync(path.join(__dirname, 'templates/view.html')).toString(),
  about: fs.readFileSync(path.join(__dirname, 'templates/about.html')).toString()
}

var events = {
  share: function () {
    var ractive = this
    wifiName(function (err, name) {
      if (err) return throwError(err)
      wifiPassword(function (err, password) {
        if (err) {
          if (err.message === 'Your network doesn\'t have a password') return alert(err.message)
          return throwError(err)
        }
        db.add(name, password, function (err) {
          if (err) return throwError(err)
        })
      })
    })
  },
  quit: function () {
    ipc.send('terminate')
  },
  copy: function (event, password) {
    copyPaste(password, function () {
      alert('Copied password ' + password + ' to clipboard.')
    })
  }
}

var routes = {
  main: function (ctx, next) {
    ctx.template = templates.main
    ctx.data = {loading: true}
    render(ctx)
    wifiList(db, function (err, wifis) {
      if (err) return throwError(err)
      ctx.data = {wifis: wifis}
      console.log(wifis)
      render(ctx)
    })
  },
  view: function (ctx, next) {
    ctx.template = templates.view
    db.get(ctx.params.essid, function (err, passwords) {
      if (err) return throwError(err, next)
      var wifi = {
        essid: ctx.params.essid,
        passwords: passwords,
        hasOnePassword: passwords.length === 1
      }
      ctx.data = {wifi: wifi}
      render(ctx)
    })
  },
  about: function (ctx, next) {
    ctx.template = templates.about
    render(ctx)
  }
}

// set up routes
page('/', routes.main)
page('/view/:essid', routes.view)
page('/about', routes.about)

// initialize
page.start()
page('/')

function render (ctx) {
  var ract = new Ractive({
    el: '#container',
    template: ctx.template,
    data: ctx.data,
    onrender: ctx.onrender
  })

  ract.on(events)
  return ract
}

function throwError (error) {
  var message = error.message || JSON.stringify(error)
  console.error(message)
  window.alert(message)
}
