var debug = require("local-debug")('compile');
var path = require("path");
var fs = require("fs");
var concat = require("concat-stream");
var through = require("through");
var flatten = require("flatten-array");
var format = require("format-text");

var browserify = require("./browserify");
var render = require("./render");
var wrappers = require("./wrappers");
var assets = require("./assets");

module.exports = {
  css: css,
  html: html,
  js: js,
  body: body
};

function css (brick) {
  var all = through();
  var streams = assets.css(brick);
  var waiting = streams.length;

  if (!waiting) {
    debug('No CSS found under %s', brick.key);
    return;
  }

  if (!brick.parentMixing && !brick.parent) {
    waiting++;
    streams.splice(0, 0,  wrappers['top-level.css']);
  }

  var i = -1;
  var len = streams.length;
  while (++i < len) {
    streams[i]().pipe(cat());
  }

  return all;

  function cat () {
    return concat(function (doc) {
      waiting--;
      all.queue(doc);
      if (waiting > 0) return;
      all.queue(null);
    });
  }
}

function body (brick) {
  return render.body(brick, brick.defaultTemplate || brick.defaultTemplateName);
}

function html (brick, context) {
  if (brick.parent) return brick.body();
  return render.container(brick, brick.body());
}

function js (brick) {
  return browserify(brick);
}
