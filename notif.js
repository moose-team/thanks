var notify = require('osx-notifier')

exports.notif = function (opts, cb) {
  notify(opts)
}

exports.newNetwork = function (cb) {
  exports.notify({
    type: 'info',
    title: 'New Wi-Fi Network Avaiable',
    subtitle: 'Camp2015',
    message: 'Click here to join the network.',
    group: 'thanks'
  })
}
