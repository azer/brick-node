var debug = require("local-debug")('serve');
var http = require('http');
var fs = require("fs");
var mimeOf = require("mime-of");
var parseUrl = require("url").parse;
var path = require("path");
var concat = require("concat-stream");
var len = require("utf8-length");
var setContentType = require("set-content-type");

module.exports = serve;

function serve (brick, options) {
  options.hostname || (options.hostname = '');
  options.port || (options.port = 8010);

  debug('Publishing the %s brick on %s:%s', brick.name, options.hostname, options.port);

  var server = http.createServer(onRequest).listen(options.port, options.hostname);
  var isReady = false;

  return server;

  function onRequest (req, res) {
    brick.onReady(function () {
      var pathname = parseUrl(req.url).pathname;
      var stream = route(brick, options, pathname);

      if (!stream) {
        res.writeHead(404, { 'Content-type': 'text/html' });
        res.end('404 - Page Not Found.');
        return;
      }

      setContentType(req, res);

      stream.pipe(res);
    });
  }
}

function route (brick, options, pathname) {
  var resource;
  var assetFilename;
  var assetFullPath;
  var targetBrickName;
  var targetBrick;

  if (pathname == '/') return brick.html(options);
  if (pathname == '/' + brick.assetsDir + '/bundle.js') return brick.js(options);
  if (pathname == '/' + brick.assetsDir + '/bundle.css') return brick.css(options);
  if (!resource && pathname.slice(0, 8) != '/assets/') return;

  pathname = pathname.slice(8);
  targetBrickName = pathname.slice(0, pathname.indexOf('/'));
  targetBrick = allAttachments(brick)[targetBrickName];

  if (!targetBrick) return;

  assetFilename = pathname.slice(targetBrickName.length);
  assetFullPath = path.join(targetBrick.dir, assetFilename);

  if (!fs.existsSync(assetFullPath)) return;

  return fs.createReadStream(assetFullPath);
}

function onError (req, res, error) {
  debug('Error: %s', error);
  res.writeHead(500, { 'Content-type': 'text/html' });
  res.end('500 - Internal server error.');
}

function allAttachments (brick, result) {
  result || (result = {});

  result[brick.key] = brick;

  var key;
  for (key in brick.attachments) {
    result[brick.attachments[key][0].key] = brick.attachments[key][0];

    if (brick.attachments[key][0].attachments) allAttachments(brick.attachments[key][0], result);
  }

  brick.mixings && brick.mixings.forEach(function (b) {
    result[b.key] = b;
  });

  return result;
}
