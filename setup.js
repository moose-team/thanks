var thanks = require('./')
var path = require('path')
var Ractive = require('ractive')
var page = require('page')
var fs = require('fs')

// Throw unhandled javascript errors
window.onerror = function errorHandler (message, url, lineNumber) {
  message = message + '\n' + url + ':' + lineNumber
  throwError(message)
}

var templates = {
  main: fs.readFileSync(path.join(__dirname, 'templates/main.html')).toString(),
  view: fs.readFileSync(path.join(__dirname, 'templates/view.html')).toString(),
}

var state = {}

var routes = {
  main: function (ctx, next) {
    ctx.template = templates.main
    ctx.onrender = function () {
      console.log('i am here')
    }
    db.getAll(function (err, wifis) {
      if (err) return throwError(err, next)
      ctx.data = {wifis: data, hasWifis: wifis.length > 0}
      next()
    })
  },
  view: function (ctx, next) {
    ctx.template = templates.view

    db.get(ctx.params.id, function (err, wifi) {
      if (err) return throwError(err, next)
      ctx.data.wifi = wifi
      next()
    }
  }
  // about: function about (ctx, next) {
  //   ctx.template = templates.about
  //   state.about = render(ctx, {})
  // }
}

// set up routes
page('/', routes.main)
page('/view/:id', routes.view)
//page('/about', routes.about)

page('*', render)


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
  var message = error.stack || error.message || JSON.stringify(error)
  console.error(message)
  window.alert(message)
}