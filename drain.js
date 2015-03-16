// TODO: Include node-oz-helpers's statsd.
var logfmt = require('logfmt');
var express = require('express');
var bodyParser = require('body-parser');
var _ = require('lodash');
var util = require('util');

var app = express();

/*
 HEROKU HEADERS:

 { host: 'ec2-54-77-170-118.eu-west-1.compute.amazonaws.com:9050',
 'content-type': 'application/logplex-1',
 'logplex-msg-count': '1',
 'logplex-frame-id': '29E4DC52AC72B85FB3CB7D9087D19DD6',
 'logplex-drain-token': 'd.c63ab66f-d67a-468d-af6e-fb4589b75318',
 'user-agent': 'Logplex/v75.1',
 'content-length': '207' }
 */


// Parsing this stuff:
// 300 <45>1 2014-10-29T12:49:59.928087+00:00 host heroku web.2 - <message>
var REGEX_LOGFMT = new RegExp('([^ ]+) ([^ ]+) ([^ ]+) ([^ ]+) ([^ ]+) ([^ ]+) ([^ ]+) (.*)');

app.use(bodyParser.text({ type: 'application/logplex-1' }));

app.get('/', function (req, res) {
  console.log('GET: ' + req.path);
  res.status(200).end();
});

app.post('/', function (req, res) {
  var noOfLines = Number(req.headers['logplex-msg-count']);
  console.log('> handling ' + noOfLines + ' lines!');
  if (noOfLines > 1) {
    // TODO: Get rid of the last line.
    var lines = req.body.split('\n');
    lines.forEach(function (line) {
      handleLine(line);
    });
  } else if (noOfLines === 1) {
    handleLine(req.body);
  } else {
    console.log('what?');
  }

  res.status(200).end();
});

function handleLine(line) {
  var match = line.match(REGEX_LOGFMT);
  if (match !== null) {
    var object = mapToObject(match);
    var json = parseAsJson(object.message);
    if (json !== null) {
      console.log('was json:', json);
    } else {
      var fmt = logfmt.parse(object.message);
      // Is it a request handling log line?
      if (_.has(fmt, 'method') && _.has(fmt, 'status')) {
        var line = util.format('%s=%s', 'method', logfmt.method, 'status', logfmt.status);
        console.log('statsd this line:', line);
      }
      console.log('was logfmt: ', logfmtLine);
    }
  }
}

function parseAsJson(message) {
  try {
    return JSON.parse(message);
  } catch (e) {
    return null;
  }
}

function mapToObject(parsedLine) {
  return {
    time: parsedLine[3],
    source: parsedLine[5],
    dyno: parsedLine[6],
    message: parsedLine[8]
  };
}

app.listen(9050);