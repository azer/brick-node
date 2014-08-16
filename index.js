var Struct = require("new-struct");
var methods = require('./lib/methods');

module.exports = Struct(methods);

module.exports.create = require("./lib/create-class");
module.exports.setup = require("./lib/setup");
module.exports.generateMap = require("./lib/generate-map");
