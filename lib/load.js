var debug = require("local-debug")('load');
var fs = require("fs");
var path = require("path");
var through = require("through");
var format = require("stream-format");
var hyperglue = require("hyperglue");
var concat = require("concat-stream");
var loop = require("parallel-loop");
var pubsub = require("pubsub");
var filenameId = require("filename-id");

module.exports = loadAssets;

function loadAssets (brick) {
  debug('Loading assets of %s', brick.key);

  return {
    html: loadAssetSet(brick, brick.assets.html, mapHtml),
    css: loadAssetSet(brick, brick.assets.css, mapCSS)
  };
}

function loadAssetSet (brick, set, map) {
  var result = {};

  var i = set.length;
  var filename;

  while (i--) {
    filename = set[i];
    result[filename] = map(brick, filename);
  }

  return result;
}

function mapHtml (brick, name) {
  template.returnsTemplateStream = true;

  return template;

  function template () {
    debug('Rendering %s\'s %s', brick.key, name);

    var filename = path.join(brick.dir, name);
    var isDefaultTemplate = brick.defaultTemplateName == filenameId(name);
    var raw = fs.createReadStream(filename);

    var html = through();

    raw.pipe(concat(function (template) {
      var str = rewritePaths(brick, name, template.toString());

      if (!isDefaultTemplate || !brick.bindings) {
        html.queue(str);
        html.queue(null);
        return;
      }

      loadBindings(brick, function (error, bindings) {
        if (error) return brick.onError.publish(error);
        html.queue(hyperglue(str, bindings).innerHTML);
        html.queue(null);
      });
    }));

    return html;
  };
}

function mapCSS (brick, filename) {
  return function () {
    return fs.createReadStream(path.join(brick.dir, filename));
  };
}

function loadBindings (brick, callback) {
  debug('Making sure all binding resources are loaded for rendering %s', brick.key);

  var result = {};
  var streams = [];
  var queue = [];
  var options = {};

  var key;
  for (key in brick.bindings) {
    options[key] = brick.bindings[key].options;
  }

  walk(options, result);

  if (queue.length == 0) return callback(undefined, result);

  debug('%d streams need to be loaded before rendering %s...', queue.length, brick.key);

  loop(queue.length, each, function (error) {
    if (error) return callback(error);
    debug('Bindings of the brick "%s" is loaded', brick.key);
    callback(undefined, result);
  });

  function walk (read, write) {
    var key;
    var i;

    if (Array.isArray(read)) {
      i = read.length;

      while (i--) {
        add(i, read, write);
      }

      return;
    }

    for (key in read) {
      add(key, read, write);
    }
  }

  function add (key, read, write) {
    var value = read[key];

    if (value == undefined) {
      return;
    }

    if (typeof value == 'function') {
      value = value();
    }

    if (!value) return;

    if (value.pipe) {
      queue.push([key, value, read, write]);
      return;
    }

    if (value.isBrick) {
      queue.push([key, value.render(), read, write]);
      return;
    }

    if (Array.isArray(value)) {
      write[key] = [];
      walk(value, write[key]);
      return;
    }

    if (typeof value == 'object') {
      write[key] = {};
      walk(value, write[key]);
      return;
    }

    write[key] = value;
  }


  function each (done, i) {
    var el = queue[i];
    var key = el[0];

    debug('Loading %s binding', key);

    el[1].pipe(concat(function (bf) {
      debug('Binding %s loaded', key);
      el[3][key] = bf.toString();
      done();
    }));
  }

}

function rewritePaths (brick, filename, html) {
  return html.replace(/ src=([^\s]+)/g, function (match, url) {
    var quote = url.charAt(0);

    if (quote != "'" && quote != '"') {
      quote = '';
    } else {
      url = url.slice(1, -1);
    }

    if (/^\w+:\/\//.test(url)) {
      return ' src=' + quote + url + quote;
    }

    return ' src=' + quote + path.join(brick.assetsDir, path.dirname(filename), url) + quote;
  });
}
