'use strict';

var request = require('supertest-as-promised');
var StatsD = require('node-statsd');
var expect = require('chai').expect;
var sinon = require('sinon');
var app = require('../app');

describe('Heroku Datadog Drain', function () {
  beforeEach(function () {
    sinon.spy(StatsD.prototype, 'histogram');
  });

  afterEach(function () {
    StatsD.prototype.histogram.restore();
  });

  it('Sends router response metrics to statsd', function () {
     return request(app)
    .post('/')
    .set('Content-type', 'application/logplex-1')
    .send('255 <158>1 2015-04-02T11:52:34.520012+00:00 host heroku router - at=info method=POST path="/users" host=myapp.com request_id=c1806361-2081-42e7-a8aa-92b6808eac8e fwd="54.76.242.19" dyno=web.1 connect=1ms service=37ms status=201 bytes=828\n' +
          '293 <158>1 2015-04-02T11:52:37.888674+00:00 host heroku router - at=info method=GET path="/users/me/tasks" host=myapp.com request_id=d66b4e46-049f-4592-b0b0-a253dc1b0c62 fwd="54.77.243.44" dyno=web.2 connect=1ms service=64ms status=200 bytes=54414')
    .expect(200)
    .expect('OK')
    .then(function () {
      var args = StatsD.prototype.histogram.args;
      expect(args).to.deep.equal([
        ['heroku.router.request.connect', '1ms', ['dyno:web.1', 'method:POST', 'status:201', 'path:/users', 'host:myapp.com']],
        ['heroku.router.request.service', '37ms', ['dyno:web.1', 'method:POST', 'status:201', 'path:/users', 'host:myapp.com']],
        ['heroku.router.request.connect', '1ms', ['dyno:web.2', 'method:GET', 'status:200', 'path:/users/me/tasks', 'host:myapp.com']],
        ['heroku.router.request.service', '64ms', ['dyno:web.2', 'method:GET', 'status:200', 'path:/users/me/tasks', 'host:myapp.com']],
      ]);
    });

  });

  it('Sends router error metrics to statsd');

  it('Sends dyno runtime metrics to statsd', function () {
    return request(app)
    .post('/')
    .set('Content-type', 'application/logplex-1')
    .send('229 <45>1 2015-04-02T11:48:16.839257+00:00 host heroku web.1 - source=web.1 dyno=heroku.35930502.b9de5fce-44b7-4287-99a7-504519070cba sample#load_avg_1m=0.01 sample#load_avg_5m=0.02 sample#load_avg_15m=0.03\n' +
          '329 <45>1 2015-04-02T11:48:16.839348+00:00 host heroku web.1 - source=web.1 dyno=heroku.35930502.b9de5fce-44b7-4287-99a7-504519070cba sample#memory_total=103.50MB sample#memory_rss=94.70MB sample#memory_cache=0.32MB sample#memory_swap=8.48MB sample#memory_pgpgin=36091pages sample#memory_pgpgout=11765pages')
    .expect(200)
    .expect('OK')
    .then(function () {
      var args = StatsD.prototype.histogram.args;
      expect(args).to.deep.equal([
        ['heroku.dyno.load.avg.1m', '0.01', ['dyno:web.1']],
        ['heroku.dyno.load.avg.5m', '0.02', ['dyno:web.1']],
        ['heroku.dyno.load.avg.15m', '0.03', ['dyno:web.1']],
        ['heroku.dyno.memory.total', '103.50MB', ['dyno:web.1']],
        ['heroku.dyno.memory.rss', '94.70MB', ['dyno:web.1']],
        ['heroku.dyno.memory.cache', '0.32MB', ['dyno:web.1']],
        ['heroku.dyno.memory.swap', '8.48MB', ['dyno:web.1']],
        ['heroku.dyno.memory.pgpgin', '36091pages', ['dyno:web.1']],
        ['heroku.dyno.memory.pgpgout', '11765pages', ['dyno:web.1']]
      ]);
    });
  });
  
  it('Sends postgres metrics to statsd');
});
