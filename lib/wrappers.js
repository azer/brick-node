var fs = require("fs");
var path = require("path");
var format = require("stream-format");
var through = require("through");
var debug = require("local-debug")('wrappers');

module.exports = {};

template('main.html');
template('stylesheet.html');
template('js.html');
template('index.js');
template('templates.js');
template('body-wrapper.html');
template('entry.js');
template('top-level.css');

function template (name) {
  var filename = path.join(__filename, '../../templates/' + name);

  module.exports[name] = function (vars) {
    var raw = fs.createReadStream(filename);
    var ts = format(vars);

    debug('Rendering %s', name);

    raw.pipe(ts);
    return ts;
  };
}
