'use strict';

var _ = require('lodash');
var logfmt = require('logfmt');
var express = require('express');
var through = require('through');
var urlUtil = require('url');
var StatsD = require('node-statsd');
var statsd = new StatsD(parseStatsdUrl(process.env.STATSD_URL));
var app = module.exports = express();
app.use(logfmt.bodyParserStream());

/**
  * Scratch Pad
  * 1. Get some example data
  * 2. Set up tests that emulate Heroku Logplex
  * 3. Parse router metrics
  * 4. Parse dyno metrics
  * 5. Parse postgres metrics
  * 6. Hardcode prefix & tags per heroku app id
  * 7. Set up basic-auth (hardcode prefixes on auth instead?)
  * [8. Read prefix & tags from logs]
*/

/**
 * Log endpoint
 */
app.post('/', function (req, res) {
  if(req.body === undefined) {
    return res.send('OK');
  }

  req.body.pipe(through(processLine));

  res.send('OK');
});


/**
 * Start server
 */
var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Server listening on port ' + port);
});


/**
 * 
 */
var metricTypes = {
  dynoRuntimeMetrics: {
    predicate: function isDynoRuntimeLine (line) {
      // Contains the keys heroku, source, dyno, sample#*
      return hasKeys(line, ['heroku', 'source', 'dyno']) && _.some(line, (_, key) => key.startsWith('sample#'));
    },
    process: function processDynoRuntimeLine (line) {
      var tags = tagsToArr({ dyno: line.source });
      var metrics = _.pick(line, (_, key) => key.startsWith('sample#'));
      _.forEach(metrics, function (value, key) {
        key = key.split('#')[1];
        key = key.replace(/_/g, '.');
        statsd.histogram('heroku.dyno.' + key, value, tags);
      });
    }
  }
};


/**
 * Helper functions
 */

/**
 * Matches a line against the correct metrics type and processes it accordingly
 */
function processLine (line) {
  console.log('Processing line:', line);
  _.forEach(metricTypes, function (metricType, name) {
    if (metricType.predicate(line)) {
      console.log('Line matches %s', name);
      metricType.process(line);
      return true; // Line is processed, we don't have to keep on matching
    }
  });
}

/**
 * Create properties obj for node-statsd from an statsd url
 * @param {string} [url]
 * @return {string|undefined}
 */
function parseStatsdUrl(url) {
  if (url !== undefined) {
    url = urlUtil.parse(url);
    return {
      host: url.hostname,
      port: url.port
    };
  }

  return undefined; // Explicit is better than implicit :)
}

/**
 * Transform an object to an array of statsd tags
 * @param {object} tags
 * @return {string[]}
 */
function tagsToArr (tags) {
  return _.transform(tags, (arr, value, key) => arr.push(key + ':' + value), []);
}

function hasKeys (object, keys) {
  return _.every(keys, _.partial(_.has, object));
}
