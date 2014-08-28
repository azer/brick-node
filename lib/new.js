var debug = require("local-debug")('new');
var path = require("path");
var variableName = require("variable-name");
var slugToTitle = require("slug-to-title");
var pubsub = require("pubsub");
var filenameId = require("filename-id");

var loadAssets = require("./load");
var listBrickFiles = require('./list-brick-files');
var expandFilenames = require("./expand");

var instanceCounter = 1;

module.exports = New;

function New (options) {
  var Brick = require('../');

  options || (options = {});

  var entry = options.entry;
  var dir = path.dirname(entry);
  var manifest = require(path.join(dir, 'package.json'));
  var key = manifest.name;
  var name = variableName(key);
  name = name[0].toUpperCase() + name.slice(1);

  var id = 'brick-' + key + '-' + (instanceCounter++);

  var filenames = listBrickFiles(entry);

  debug('Reading %s', entry);

  var brick = Brick({
    id: id,
    dir: dir,
    entry: path.basename(entry),
    manifest: manifest,
    key: key,
    name: name,
    title: slugToTitle(manifest.name),
    templates: {},
    onError: pubsub(),
    onReady: pubsub(),
    isBrick: true
  });

  brick.parent = options.parent;
  brick.assets = expandFilenames(dir, filenames);
  brick.assetsDir = 'assets/' + brick.key;
  brick.defaultTemplateName = filenameId(findDefaultTemplateName(brick));
  brick.source = loadAssets(brick);
  brick.templates = {};

  var templateId;
  for (key in brick.source.html) {
    templateId = filenameId(key);
    brick.templates[templateId] = brick.source.html[key];
  }

  if (options.mixing) {
    brick.mixing = mix(brick, options.mixing);
  }

  return brick;
}

function findDefaultTemplateName (brick) {
  if (brick.assets.html.indexOf('index.html') || brick.assets.html.length == 0 > -1) {
    return 'index.html';
  }

  return brick.assets.html[0];
}

function mix (brick, mixings, options) {
  if (!brick.bindings) brick.bindings = {};

  brick.mixings = mixings.map(function (Factory) {
    var b = Factory.New(options).brick;
    b.bindings = brick.bindings;
    b.parentMixing = brick;
    return b;
  });
}
