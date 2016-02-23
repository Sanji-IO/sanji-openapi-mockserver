var _ = require('lodash');
var debug = require('debug')('sanji:openapi:mock');
var express = require('express');
var middleware = require('swagger-express-middleware');
var resolve = require('json-refs').resolveRefs;
var YAML = require('js-yaml');
var fs = require('fs');

var app = express();
var defaultOptions = {
  host: '0.0.0.0',
  port: process.env.PORT || 8000
};

var aggregate = function(data) {
  if (_.isArray(data)) {
    var obj = {}
    data.forEach(function(v) {
      _.merge(obj, v);
    });
    data = obj;
  }
  return data;
}

var createMockServer = function(options, cb) {
  options = _.defaults(options, defaultOptions);
  var doc = YAML.load(
    fs.readFileSync(options.rootFolderPath + '/index.yaml').toString());
  var resolveOptions = {
    relativeBase: options.rootFolderPath,
    loaderOptions: {
      processContent: function (content, cb) {
        return cb(null, YAML.safeLoad(content.text));
      }
    }
  };

  resolve(doc, resolveOptions)
    .then(function (results) {
      results.resolved.paths = aggregate(results.resolved.paths);
      results.resolved.definitions = aggregate(results.resolved.definitions);

      app.get('/favicon.ico', function(req, res, next) {
        res.status(404);
      });

      app.get('/', function(req, res, next) {
        res.json(results.resolved);
      });

      middleware(results.resolved, app, function(err, middleware) {
        app.use(
          middleware.metadata(),
          middleware.CORS(),
          middleware.parseRequest(),
          middleware.validateRequest(),
          middleware.mock()
        );

        app.listen(options.port, function() {
          debug('Visit http://%s:%d', options.host, options.port);
          cb();
        });
      });
    })
    .catch(function(err) {
      debug(err);
      cb(err);
    });
}

module.exports =  createMockServer;
