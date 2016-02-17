var _ = require('lodash');
var debug = require('debug')('sanji:openapi:mock');
var express = require('express');
var middleware = require('swagger-express-middleware');
var resolve = require('json-refs').resolveRefs;
var YAML = require('js-yaml');
var fs = require('fs');

var app = express();
var PORT = process.env.PORT || 8000;

var createMockServer = function(rootFolderPath, cb) {
  var root = YAML.load(
    fs.readFileSync(rootFolderPath + '/index.yaml').toString());
  var resolveOptions = {
    relativeBase: rootFolderPath,
    loaderOptions: {
      processContent: function (content, cb) {
        return cb(null, YAML.safeLoad(content.text));
      }
    }
  };

  resolve(root, resolveOptions)
    .then(function (results) {
      var obj = {}
      results.resolved.paths.forEach(function(path) {
        _.merge(obj, path);
      });
      results.resolved.paths = obj;

      middleware(results.resolved, app, function(err, middleware) {
        app.use(
          middleware.metadata(),
          middleware.CORS(),
          middleware.parseRequest(),
          middleware.validateRequest(),
          middleware.mock()
        );

        app.listen(PORT, function() {
          debug('Visit http://0.0.0.0:%d', PORT);
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
