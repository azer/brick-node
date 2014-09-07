var ATTACHMENTS_KEY = '&';
var MIXINGS_KEY = '#';

var debug = require("local-debug")('render');
var path = require("path");
var concat = require("concat-stream");
var through = require("through");
var format = require("format-text");
var flatten = require("flatten-array");
var assets = require("./assets");
var wrappers = require("./wrappers");

module.exports = {
  container: container,
  css: css,
  body: body
};

function body (brick, templateName, context) {
  debug('Rendering the template "%s" as body', templateName);

  var content = assets.template(brick, templateName);

  return wrappers['body-wrapper.html']({
    'id': brick.id,
    'classes': classesOf(brick).join(' '),
    'content': content ? content() : ''
  });
}

function container (brick, body) {
  var vars = {
    'title': brick.title,
    'name': brick.name,
    'body': body,
    'js': wrappers['js.html'](path.join(brick.assetsDir, 'bundle.js')),
    'css': wrappers['stylesheet.html'](path.join(brick.assetsDir, 'bundle.css')),
    'after': '',
    'global': brick.name.slice(0, 1).toLowerCase() + brick.name.slice(1),
    'instance-map': JSON.stringify(generateInstanceMap(brick))
  };

  return wrappers['main.html'](vars);
}

function css (brick) {
  return through(function (data) {
    var str = data.toString() + '\n';

    if (!brick.parent && !brick.parentMixing) return this.queue(str);

    if (!/url\(([^\)]+)\)/.test(str)) return this.queue(data);

    str = str.replace(/url\(([^\)]+)\)/g, function (match, url) {
      if (/^\w+\:\/\//.test(url)) return match;
      return 'url(' + path.join('../', brick.key, url) + ')';
    });

    this.queue(str);
  });
}

function generateInstanceMap (brick, parentMixing, result) {
  if (arguments.length == 2) {
    result = parentMixing;
    parentMixing = undefined;
  }

  result || (result = {
    key: brick.key,
    id: []
  });

  result.id.push(parentMixing ? parentMixing.id : brick.id);

  var key, len, i;
  for (key in brick.attachments) {
    if (!result[ATTACHMENTS_KEY]) result[ATTACHMENTS_KEY] = {};
    if (!result[ATTACHMENTS_KEY][key]) result[ATTACHMENTS_KEY][key] = {
      key: key,
      id: []
    };

    i = -1;
    len = brick.attachments[key].length;

    while (++i < len) {
      generateInstanceMap(brick.attachments[key][i], result[ATTACHMENTS_KEY][key]);
    }
  }

  if (!brick.mixings) return result;

  brick.mixings.forEach(function (m, ind) {
    if (!result[MIXINGS_KEY]) result[MIXINGS_KEY] = {};
    if (!result[MIXINGS_KEY][key]) result[MIXINGS_KEY][m.key] = {
      key: key,
      id: []
    };

    generateInstanceMap(m, brick, result[MIXINGS_KEY][m.key]);
  });

  return result;
}

function classesOf (brick) {
  var result = ['brick-' + brick.key];

  var i = 0;
  if (brick.mixings) {
    brick.mixings.forEach(function (b) {
      result.push('brick-' + b.key);
    });
  }

  return result;
}
