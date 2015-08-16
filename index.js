var events = require('events')
var hyperlog = require('hyperlog')
var collect = require('stream-collector')
var lexint = require('lexicographic-integer')
var pump = require('pump')
var protobuf = require('protocol-buffers')
var prefixer = require('sublevel-prefixer')
var subleveldown = require('subleveldown')
var through = require('through2')
var fs = require('fs')

var messages = protobuf(fs.readFileSync(__dirname + '/schema.proto', 'utf-8'))
var prefix = prefixer()

module.exports = function (db) {
  var that = new events.EventEmitter()

  var essids = subleveldown(db, 'essid')
  var meta = subleveldown(db, 'meta')

  var log = hyperlog(subleveldown(db, 'log'), {
    valueEncoding: messages.Wifi
  })

  meta.get('change', function (_, change) {
    change = parseInt(change || 0, 10)
    pump(log.createReadStream({since: change, live: true}), through.obj(write), onerror)

    function onerror (err) {
      that.emit('error', err || new Error('Change feed closed'))
    }

    function write (data, enc, cb) {
      var batch = [{
        type: 'put',
        key: prefix('essid', data.value.essid + '!' + lexint.pack(data.change, 'hex')),
        value: data.value.password
      }, {
        type: 'put',
        key: prefix('meta', 'change'),
        value: '' + data.change
      }]

      db.batch(batch, function (err) {
        if (err) return cb(err)
        that.emit('add')
        cb()
      })
    }
  })

  that.createReadStream = function (opts) {
    return log.createReadStream(opts)
  }

  that.get = function (essid, cb) {
    var rs = essids.createValueStream({
      gt: essid + '!',
      lt: essid + '!~',
      valueEncoding: 'utf-8'
    })

    return collect(rs, cb)
  }

  that.add = function (essid, password, cb) {
    log.append({essid: essid, password: password}, cb)
  }

  that.replicate = function (opts) {
    return log.replicate({live: true})
  }

  return that
}

if (require.main !== module) return

var db = module.exports(require('memdb')())

db.add('an-essid', 'secure')

db.once('add', function () {
  db.get('an-essid', console.log)
})