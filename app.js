'use strict';

let _ = require('lodash');
let assert = require('assert');
let logfmt = require('logfmt');
let express = require('express');
let through = require('through');
let urlUtil = require('url');
let StatsD = require('node-statsd');
let basicAuth = require('basic-auth');
let statsd = new StatsD(parseStatsdUrl(process.env.STATSD_URL));
let app = module.exports = express();
app.use(logfmt.bodyParserStream());

let allowedApps = loadAllowedAppsFromEnv();

/**
 * Express app
 */

app.use(function authenticate (req, res, next) {
  let auth = basicAuth(req) || {};
  let app = allowedApps[auth.name];
  if (app !== undefined && app.password === auth.pass) {
    req.defaultTags = app.tags;
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
});

app.post('/', function (req, res) {
  if(req.body !== undefined) {
    req.body.pipe(through(line => processLine(line, req.defaultTags)));
  }

  res.send('OK');
});

let port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Server listening on port ' + port);
});


/**
 * Matches a line against a rule and processes it
 * @param {object} line
 */
function processLine (line, defaultTags) {
  // Dyno metrics
  if (hasKeys(line, ['heroku', 'source', 'dyno'])) {
    let tags = tagsToArr({ dyno: line.source });
    tags = _.union(tags, defaultTags);
    let metrics = _.pick(line, (_, key) => key.startsWith('sample#'));
    _.forEach(metrics, function (value, key) {
      key = key.split('#')[1];
      key = key.replace(/_/g, '.');
      statsd.histogram('heroku.dyno.' + key, value, tags);
    });
  }

  // Router metrics
  else if (hasKeys(line, ['heroku', 'router', 'path', 'method', 'dyno', 'status', 'connect', 'service', 'at'])) {
    let tags = tagsToArr(_.pick(line, ['dyno', 'method', 'status', 'path', 'host', 'code', 'desc', 'at']));
    tags = _.union(tags, defaultTags);
    statsd.histogram('heroku.router.request.connect', line.connect, tags);
    statsd.histogram('heroku.router.request.service', line.service, tags);
    if (line.at === 'error') {
      statsd.increment('heroku.router.error', 1, tags);
    }
  }

  // Postgres metrics
  else if (hasKeys(line, ['source', 'heroku-postgres'])) {
    let tags = tagsToArr({ source: line.source });
    tags = _.union(tags, defaultTags);
    let metrics = _.pick(line, (_, key) => key.startsWith('sample#'));
    _.forEach(metrics, function (value, key) {
      key = key.split('#')[1];
      statsd.histogram('heroku.postgres.' + key, value, tags);
      // TODO: Use statsd counters or gauges for some postgres metrics (db size, table count, ..)
    });
  }
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

/**
 * Construct allowed apps object from the environment vars containing
 * names, passwords and default tags for apps that may use the drain
 */
function loadAllowedAppsFromEnv () {
  assert(process.env.ALLOWED_APPS, 'Environment variable ALLOWED_APPS required');
  let appNames = process.env.ALLOWED_APPS.split(',');
  let apps = appNames.map(function (name) {
    var passwordEnvName = name.toUpperCase() + '_PASSWORD';
    assert(process.env[passwordEnvName], 'Environment variable ' + passwordEnvName + ' required');
    return [name, {
      password: process.env[passwordEnvName],
      tags: (process.env[name.toUpperCase() + '_TAGS'] || '').split(',')
    }];
  });
  return _.object(apps);
}

