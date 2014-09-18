var Struct = require("new-struct");
var failingLine = require("failing-line");

module.exports = createClass;

function createClass (embedding, mixing) {
  var Brick = require('../');

  var Mixed = Struct(Brick, {
    New: New
  });

  Mixed.entry = findEntry(3);

  Mixed.isBrick = true;

  return Mixed;

  function New (options) {
    options || (options = {});
    options.entry = Mixed.entry;
    options.mixing = mixing;
    return Brick.New(options);
  };
}

function findEntry (shift) {
  return failingLine(new Error(''), shift).filename;
}
