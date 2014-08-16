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
  var defaultTemplateName = options.defaultTemplateName;
  if (!defaultTemplateName && filenames.indexOf('index.html') > -1) defaultTemplateName = 'index';

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

  brick.defaultTemplateName = defaultTemplateName || filenameId(findDefaultTemplateName(brick));
  brick.source = loadAssets(brick);
  brick.templates = {};

  var templateId;
  for (key in brick.source.html) {
    templateId = filenameId(key);
    brick.templates[templateId] = brick.source.html[key];
  }

  return brick;
}

function findDefaultTemplateName (brick) {
  if (brick.assets.html.length > 0) return brick.assets.html[0];
  return 'index.html';
}
