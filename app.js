'use strict';

var logfmt = require('logfmt');
var express = require('express');
var app = express();
app.use(logfmt.bodyParser());

app.post('/', function (req, res) {
  console.log(req.headers);
  console.log(req.body);
  // req.body.split('\n').forEach(console.log);
  res.status(200).end();
});

app.listen(process.env.PORT);
