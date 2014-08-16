var debug = require("local-debug")('list-brick-files');
var lsr = require("lsr").sync;
var path = require('path');
var fs = require("fs");
var exists = fs.existsSync;
var newIgnoreFilter = require("ignore-doc");
var ignoreDocLookup = require("./ignore-doc-lookup");
var ignoreByDefault = [
  '.brignore',
  '.brickignore',
  '.npmignore',
  '.gitignore',
  'node_modules',
  'package.json'
];

module.exports = listBrickFiles;

function readIgnoreDocument (dir) {
  var i = -1;
  var len = ignoreDocLookup.length;
  var filename;

  while (++i < len) {
    filename = path.join(dir, ignoreDocLookup[i]);

    if (exists(filename)) {
      debug('Reading %s', filename);
      return fs.readFileSync(filename);
    }
  }
}

function listBrickFiles (entry) {
  var dir = path.dirname(entry);
  var all = lsr(dir).filter(isNotBuildDir(path.dirname(entry)));
  var ignoreDoc = readIgnoreDocument(dir);
  var filter = ignoreDoc ? newIgnoreFilter(ignoreDoc, ignoreByDefault) : newIgnoreFilter(ignoreByDefault);

  debug('Creating a list of the files at %s', dir);

  var result = all.filter(function (file) {
    if (filter && !filter(file.path.slice(2))) return false;
    if (file.fullPath != entry) return true;
  });

  result = result.map(function (file) {
    return file.path.slice(2);
  });

  return result;
}

function isNotBuildDir () {
  var blacklist = [];
  var ind;

  return function (filename) {
    if ((ind = blacklist.indexOf(filename.path.slice(0, filename.path.indexOf('/', 2)))) != -1) {
      debug('Excluding %s since it\'s under a build directory: %s.', filename.path, blacklist[ind]);
      return false;
    }

    if (!fs.lstatSync(filename.fullPath).isDirectory()) {
      return true;
    }

    var contents = fs.readdirSync(filename.fullPath);

    if (contents.length == 2 && contents.indexOf('assets') > -1 && contents.indexOf('index.html') > -1) {
      debug('"%s" detected as a build destination directory. It\'ll be excluded.', filename.path);
      blacklist.push(filename.path);
      return false;
    }

    return true;
  };
}
