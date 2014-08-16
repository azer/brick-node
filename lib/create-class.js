var Struct = require("new-struct");
var failingLine = require("failing-line");
var setup = require("./setup");

module.exports = createClass;

function createClass (embedding, embedded, show, update) {
  var Brick = require('../');
  var Mixed = Struct(Brick, {
    New: New
  });

  Mixed.entry = findEntry(3);
  Mixed.embed = embedded; // required by brick-browserify-plugin
  Mixed.isBrick = true;

  return Mixed;

  function New (options, embeddingObj) {
    options || (options = {});

    options.entry = Mixed.entry;
    embedded && (options.embed = embedded);

    var brick = Mixed.With(Brick.New(options));
    return brick;
  };
}

function findEntry (shift) {
  return failingLine(new Error(''), shift).filename;
}
