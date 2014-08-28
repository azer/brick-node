var Struct = require("new-struct");
var cli = require('./lib/cli');
var methods = require('./lib/methods');

module.exports = Struct(methods);

module.exports.create = require("./lib/create-class");
module.exports.setup = require("./lib/setup");
module.exports.generateMap = require("./lib/generate-map");
module.exports.cli = cli;
