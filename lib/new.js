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
  var defaultTemplateName;

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
  brick.parentMixing = options.parentMixing;
  brick.wrapper = options.wrapper;
  brick.assets = expandFilenames(dir, filenames);
  brick.assetsDir = 'assets/' + brick.key;
  brick.defaultTemplate = defaultTemplate;
  brick.source = loadAssets(brick);
  brick.templates = {};

  defaultTemplate(findDefaultTemplate(brick));

  var templateId;
  for (key in brick.source.html) {
    templateId = filenameId(key);
    brick.templates[templateId] = brick.source.html[key];
    brick.templates[templateId].templateName = templateId;
    brick.templates[templateId].returnsTemplateStream = true;
  }

  if (options.mixing) {
    brick.mixing = mix(brick, options.mixing);
  }

  return brick;

  function defaultTemplate (newValue) {
    if (brick.parentMixing) return brick.parentMixing.defaultTemplate(newValue);

    if (newValue) defaultTemplateName = newValue;

    return defaultTemplateName;
  }
}

function findDefaultTemplate (brick) {
  if (brick.assets.html.indexOf('index.html') || brick.assets.html.length == 0 > -1) {
    return 'index';
  }

  return filenameId(brick.assets.html[0]);
}

function mix (brick, mixings, options) {
  if (!brick.bindings) brick.bindings = {};

  if (brick.parentMixing) brick.bindings = brick.parentMixing.bindings;

  if (!options) options = {};

  brick.mixings = mixings.map(function (Factory) {
    options.brick = { parentMixing: brick };
    var b = Factory.New(options).brick;
    b.bindings = brick.bindings;
    return b;
  });
}
