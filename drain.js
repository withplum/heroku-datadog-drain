var net = require('net');
var statsd = require('./statsd');

var PORT = 9050;
var LINE_REGEX = /^([^ ]+) ([^ ]+) ([^ ]+) ([^ ]+) ([^ ]+) ([^ ]+) - - (.+)$/;
var FLIPP_REGEX = /path=\"([^\"]+)\"/;

var server = net.createServer();

server.on('listening', function () {
  console.log('listening on port: ' + PORT);
});

server.on('connection', function (sock) {
  sock.setNoDelay(true);
  sock.setEncoding('ascii');

  sock.on('data', function (data) {
    var lines = data.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var matched = lines[i].match(LINE_REGEX);
      if (matched) {
        console.log(matched[4] + '\t' + matched[6] + '\t' + matched[7]);
        var message = matched[7];
        if (message.indexOf('method=GET') > 0) {
          var flipp = message.match(FLIPP_REGEX);
          if (flipp) {
            console.log(flipp[1]);
            statsd.increment('request', 1.0, ['endpoint:' + flipp[1]]);
          }
        }
      }
    }
  });

  sock.on('end', function (data) {
    try {
      sock.end();
    } catch (err) {
      console.log('on end: ', err);
    }
  });

  sock.on('error', function (err) {
    console.log('error hit: ', err);
  });

  sock.on('close', function (data) {
    try {
      sock.end();
      sock.destroy();
    } catch (err) {
      console.log(err);
    }
  });
});

server.on('error', function (err) {
  console.log('server error hit: ', err)
});

server.on('close', function () {
  console.log('server closed');
});

server.listen(PORT);