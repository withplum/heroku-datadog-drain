'use strict';

var urlutil = require('url');
var StatsD = require('node-statsd').StatsD;

var statsd;
if (process.env.STATSD_URL) {
  var parsedUrl = urlutil.parse(process.env.STATSD_URL);
  statsd = new StatsD({
    host: parsedUrl.hostname,
    port: parsedUrl.port,
    prefix: 'playlist_z.'
  });
} else {
  statsd = new StatsD({
    prefix: 'playlist_z.'
  });
}

module.exports = statsd;
