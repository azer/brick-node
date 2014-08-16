var path = require("path");
var variableName = require("variable-name");

module.exports = generateMap;

function generateMap (arr) {
  if (!arr || !arr.length) return;

  var result;

  var i = arr.length;
  var name;
  var b;

  while (i--) {
    if (!result) result = {};

    b = arr[i];

    name = variableName(require(path.join(path.dirname(b.entry), 'package.json')).name);
    result[name] = arr[i];
  }

  return result;
}
