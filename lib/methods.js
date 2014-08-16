var New = require('./new');

var serve = require("./serve");
var render = require("./render");
var build = require('./build');
var templates = require("./templates");
var compile = require("./compile");
var bind = require("./bind");
var attach = require("./attach");

module.exports = {
  New: New,
  bind: bind,
  build: build,
  css: compile.css,
  html: compile.html,
  body: compile.body,
  js: compile.js,
  serve: serve,
  attach: attach,
  render: compile.html,
  on: on
};

function on () {}
