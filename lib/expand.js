var path = require("path");
var glob = require("flat-glob").sync;
var categorizeFiles = require("categorize-files");

module.exports = expandFilenames;

function expandFilenames (dir, filenames) {
  filenames = Array.prototype.filter.call(filenames, function (filename) {
    return typeof filename == 'string';
  });

  filenames = filenames.map(function (filename) {
    if (filename.charAt(0) == '/') return filename;
    return path.join(dir, filename);
  });

  filenames = glob(filenames);

  filenames = filenames.map(function (filename) {
    return filename.slice(dir.length + 1);
  });

  filenames = categorizeFiles(filenames, {
    js: [], css: [], html: [], other: []
  });

  return filenames;
}
