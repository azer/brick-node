var debug = require("local-debug")('compile');
var path = require("path");
var fs = require("fs");
var concat = require("concat-stream");
var through = require("through");
var flatten = require("flatten-array");
var format = require("format-text");

var browserify = require("./browserify");

var render = require("./render");
var templates = require("./templates");

module.exports = {
  css: css,
  html: html,
  js: js,
  body: body
};

function css (brick) {
  var all = through();
  var waiting = 0;

  var filename;
  for (filename in brick.source.css) {
    waiting++;

    if (waiting == 1) {
      waiting++;
      templates['top-level.css']().pipe(cat());
    }

    brick.source.css[filename]().pipe(render.css(brick)).pipe(cat());
  }

  var name, child, css;
  for (name in brick.attachments) {
    waiting++;

    if (waiting == 1) {
      waiting++;
      templates['top-level.css']().pipe(cat());
    }

    child = brick.attachments[name];

    if (Array.isArray(child)) {
      child = child[0];
    }

    css = child.css();
    if (css) {
      css.pipe(cat());
    } else {
      waiting--;
      debug('%s doesnt have any CSS source.', name);
    }
  }

  if (waiting == 0) {
    return;
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
  return render.body(brick, brick.defaultTemplateName);
}

function html (brick, context) {
  if (brick.parent) return brick.body();
  return render.container(brick, brick.body());
}

function js (brick) {
  return browserify(brick);
}
