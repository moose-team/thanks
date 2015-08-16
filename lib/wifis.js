var wifi = require('wifi-list')
var after = require('after-all')

module.exports = function (thanks, cb) {
  var results = []

  wifi(function (err, list) {
    if (err) return cb(err)

    var next = after(function (err) {
      if (err) return cb(err)
      cb(null, results)
    })

    list.forEach(function (network, i) {
      var cb = next()
      thanks.get(network.name, function (err, passwords) {
        if (err) return cb(err)
        network.passwords = passwords
        if (passwords.length) results.push(network)
        cb()
      })
    })
  })
}
