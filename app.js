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
 * Express app
 */
app.post('/', function (req, res) {
  if(req.body !== undefined) {
    req.body.pipe(through(processLine));
  }

  res.send('OK');
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Server listening on port ' + port);
});


/**
 * Rules that specify what lines to process and how to process them
 * {
 *  <rule name>: {
 *    predicate: fn(line) -> bool
 *    process: fn(line) -> undefined
 *  }, ..
 * }
 */
var rules = {
  dynoRuntimeMetrics: {
    predicate: function (line) {
      return hasKeys(line, ['heroku', 'source', 'dyno']);
    },
    process: function (line) {
      var tags = tagsToArr({ dyno: line.source });
      var metrics = _.pick(line, (_, key) => key.startsWith('sample#'));
      _.forEach(metrics, function (value, key) {
        key = key.split('#')[1];
        key = key.replace(/_/g, '.');
        statsd.histogram('heroku.dyno.' + key, value, tags);
      });
    }
  },

  routerResponseMetrics: {
    predicate: function (line) {
      return hasKeys(line, ['heroku', 'router', 'path', 'method', 'dyno', 'status', 'connect', 'service', 'at']);
    },
    process: function (line) {
      var tags = tagsToArr(_.pick(line, ['dyno', 'method', 'status', 'path', 'host', 'code', 'desc', 'at']));
      statsd.histogram('heroku.router.request.connect', line.connect, tags);
      statsd.histogram('heroku.router.request.service', line.service, tags);
      if (line.at === 'error') {
        statsd.increment('heroku.router.error', 1, tags);
      }
    }
  },

  postgresMetrics: {
    predicate: function (line) {
      return hasKeys(line, ['source', 'heroku-postgres']);
    },
    process: function (line) {
      var tags = tagsToArr({ source: line.source });
      var metrics = _.pick(line, (_, key) => key.startsWith('sample#'));
      _.forEach(metrics, function (value, key) {
        key = key.split('#')[1];
        statsd.histogram('heroku.postgres.' + key, value, tags);
      });
    }
  },
};


/**
 * Matches a line against a rule and processes it
 * @param {object} line
 */
function processLine (line) {
  console.log('Processing line:', line);
  _.forEach(rules, function (rule, name) {
    if (rule.predicate(line)) {
      console.log('Line matches %s', name);
      rule.process(line);
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

/**
 * Check if object contains list of keys
 */
function hasKeys (object, keys) {
  return _.every(keys, _.partial(_.has, object));
}
