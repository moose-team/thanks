var keytar = require('keytar')

module.exports = {
  get: get
}

function get (name) {
  var services = {
    'darwin': 'AirPort'
  }
  return keytar.getPassword(services[process.platform], name)
}

