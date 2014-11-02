var debug = require("local-debug")('build');
var mkdirp = require("mkdirp");
var path = require("path");
var fs = require("fs");
var loop = require("parallel-loop");
var serial = require("serially");
var exec = require("child_process").exec;

module.exports = build;

function build (brick, options, callback) {
  if (typeof options == 'string') {
    options = {
      skip: {},
      buildDir: options
    };
  }

  options.skip || (options.skip = {});

  debug('Building %s into %s', brick.name, options.buildDir);

  if (options.skip[brick.key]) return callback();

  options.skip[brick.key] = true;

  if (!brick.parent && !brick.parentMixing) {
    return buildMainBrick(brick, options, callback);
  }

  var assetsDir = path.join(options.buildDir, 'assets', brick.key);

  serial()
    .then(createDirectories, [brick, assetsDir])
    .then(copyAssets, [brick, assetsDir])
    .then(buildMixings, [brick, options])
    .then(buildAttachments, [brick, options])
    .done(callback);
}

function buildMainBrick (brick, options, callback) {
  var assetsDir = path.join(options.buildDir, 'assets', brick.key);

  debug('Building %s as a main brick that has no parent.', brick.key);

  brick.onReady(function () {
    serial()
      .then(createDirectories, [brick, assetsDir])
      .then(copyAssets, [brick, assetsDir])
      .then(buildMixings, [brick, options])
      .then(buildAttachments, [brick, options])
      .then(saveDefaultHTML, [brick, options])
      .then(saveBundles, [brick, options, assetsDir])
      .done(callback);
  });
}

function buildMixings (brick, options, callback) {
  if (!brick.mixings) return callback();

  debug('Building mixings of %s', brick.key);

  loop(brick.mixings.length, each, callback);

  function each (done, i) {
    build(brick.mixings[i], options, options, done);
  }
}

function buildAttachments (brick, options, callback) {
  if (!brick.attachments) return callback();

  var keys = Object.keys(brick.attachments);

  debug('Building attachments of %s', brick.key);

  loop(keys.length, each, callback);

  function each (done, i) {
    build(brick.attachments[keys[i]][0], options, done);
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

function saveBundles (brick, options, assetsDir, callback) {
  saveCSS(brick, options, assetsDir, function (error) {
    if (error) return callback(error);

    saveJS(brick, options, assetsDir, callback);
  });
}

function saveCSS (brick, options, assetsDir, callback) {
  var filename = path.join(assetsDir, 'bundle.css');

  debug('Saving %s', filename);

  var bundle = brick.css(options);

  if (!bundle) return callback();

  bundle.on('error', callback)
    .on('end', callback)
    .pipe(fs.createWriteStream(filename));
}

function saveJS (brick, options, assetsDir, callback) {
  var filename = path.join(assetsDir, 'bundle.js');

  debug('Saving %s', filename);

  brick.js(options)
    .on('error', callback)
    .on('end', callback)
    .pipe(fs.createWriteStream(filename));
}

function saveDefaultHTML (brick, options, callback) {
  var filename = path.join(options.buildDir, 'index.html');

  debug('Saving %s', filename);

  brick.html(options)
    .on('error', callback)
    .on('end', callback)
    .pipe(fs.createWriteStream(filename));
}
