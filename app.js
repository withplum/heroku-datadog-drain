'use strict';

var logfmt = require('logfmt');
var express = require('express');
var through = require('through');
var app = express();
//app.use(logfmt.bodyParserStream()); // Parses content-type 'application/logplex-1'

app.post('/', function (req, res) {
  req.on('data', function (data) {
    console.log(data.toString());
  });
  req.on('end', function () {
    res.send('OK');
  });
  return;
  if(req.body === undefined) {
    return res.send('OK');
  }

  req.body.pipe(through(processLine));

  res.send('OK');
});

app.listen(process.env.PORT);

function processLine (line) {
  console.log(line);
}
