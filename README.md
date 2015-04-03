# Heroku Datadog Drain

Funnel metrics from multiple Heroku apps into DataDog using statsd.

## Get Started
```bash
git clone git@github.com:ozinc/heroku-datadog-drain.git
cd heroku-datadog-drain
heroku create
heroku config:set ALLOWED_APPS=<your-app-slug> <YOUR-APP-SLUG>_PASSWORD=topsecret
git push heroku master
heroku ps:scale web=1
heroku drains:add https://<this-log-drain-app-slug>.herokuapp.com/ --app <your-app-slug>
```

## Configuration
```bash
ALLOWED_APPS=my-app,..    # Required. Comma seperated list of app names
<APP-NAME>_PASSWORD=..    # Required. One per allowed app where <APP-NAME> corresponds to an app name from ALLOWED_APPS
<APP-NAME>_TAGS=mytag,..  # Optional. Comma seperated list of default tags for each app
STATSD_URL=..             # Optional. Default: statsd://localhost:8125
```
