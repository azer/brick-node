var debug = require("local-debug")('build');
var mkdirp = require("mkdirp");
var path = require("path");
var fs = require("fs");
var loop = require("parallel-loop");
var serial = require("serially");
var exec = require("child_process").exec;

module.exports = build;

function build (brick, buildDir, checklist, callback) {
  debug('Building %s into %s', brick.name, buildDir);

  if (arguments.length == 3) {
    callback = checklist;
    checklist = {};
  }

  if (checklist[brick.key]) return callback();

  checklist[brick.key] = true;

  if (!brick.parent && !brick.parentMixing) {
    return buildMainBrick(brick, buildDir, checklist, callback);
  }

  var assetsDir = path.join(buildDir, 'assets', brick.key);

  serial()
    .then(createDirectories, [brick, assetsDir])
    .then(copyAssets, [brick, assetsDir])
    .then(buildMixings, [brick, buildDir, checklist])
    .then(buildAttachments, [brick, buildDir, checklist])
    .done(callback);
}

function buildMainBrick (brick, buildDir, checklist, callback) {
  var assetsDir = path.join(buildDir, 'assets', brick.key);

  debug('Building %s as a main brick that has no parent.', brick.key);

  brick.onReady(function () {
    serial()
      .then(createDirectories, [brick, assetsDir])
      .then(copyAssets, [brick, assetsDir])
      .then(buildMixings, [brick, buildDir, checklist])
      .then(buildAttachments, [brick, buildDir, checklist])
      .then(saveDefaultHTML, [brick, buildDir])
      .then(saveBundles, [brick, assetsDir])
      .done(callback);
  });
}

function buildMixings (brick, buildDir, checklist, callback) {
  if (!brick.mixings) return callback();

  debug('Building mixings of %s', brick.key);

  loop(brick.mixings.length, each, callback);

  function each (done, i) {
    build(brick.mixings[i], buildDir, checklist, done);
  }
}

function buildAttachments (brick, buildDir, checklist, callback) {
  if (!brick.attachments) return callback();

  var keys = Object.keys(brick.attachments);

  debug('Building attachments of %s', brick.key);

  loop(keys.length, each, callback);

  function each (done, i) {
    build(brick.attachments[keys[i]][0], buildDir, checklist, done);
  }
}

function copyAssets (brick, target, callback) {
  debug('Copying assets to %s', target);

  loop(brick.assets.other.length, each, callback);

  function each (done, index) {
    var filename = brick.assets.other[index];
    var from = path.join(brick.dir, filename);
    var to = path.join(target, filename);

    copy(from, to, done);
  }
}

function copy (from, to, callback) {
  debug('Copying %s to %s', from, to);
  var stream;

  fs.lstat(from, function (error, stat) {
    if (error) return callback(error);

    if (stat.isDirectory()) return callback();

    fs.createReadStream(from)
      .on('error', callback)
      .on('end', callback)
      .pipe(fs.createWriteStream(to));
  });
}

function createDirectories (brick, target, callback) {
  var dirs = [target];

  brick.assets.other.forEach(function (filename) {
    if (/\.\w+$/.test(filename)) return;
    dirs.push(path.join(target, filename));
  });

  loop(dirs.length, each, callback);

  function each (done, index) {
    fs.lstat(dirs[index], function (error, stat) {
      if (!error || (stat && stat.isDirectory())) return done();

      debug('Creating %s for %s', dirs[index], brick.name);
      mkdirp(dirs[index], done);
    });
  }
}

function saveBundles (brick, assetsDir, callback) {
  saveCSS(brick, assetsDir, function (error) {
    if (error) return callback(error);

    saveJS(brick, assetsDir, callback);
  });
}

function saveCSS (brick, target, callback) {
  var filename = path.join(target, 'bundle.css');

  debug('Saving %s', filename);

  var bundle = brick.css();

  if (!bundle) return callback();

  bundle.on('error', callback)
    .on('end', callback)
    .pipe(fs.createWriteStream(filename));
}

function saveJS (brick, target, callback) {
  var filename = path.join(target, 'bundle.js');

  debug('Saving %s', filename);

  brick.js()
    .on('error', callback)
    .on('end', callback)
    .pipe(fs.createWriteStream(filename));
}

function saveDefaultHTML (brick, target, callback) {
  var filename = path.join(target, 'index.html');

  debug('Saving %s', filename);

  brick.html()
    .on('error', callback)
    .on('end', callback)
    .pipe(fs.createWriteStream(filename));
}
