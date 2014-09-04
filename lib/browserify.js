var browserify = require("browserify");
var path = require("path");
var flatten = require("flatten-array");
var through = require("through");
var format = require("format-text");
var fs = require("fs");
var debug = require("local-debug")('browserify');

var entryModuleTemplate = fs.readFileSync(path.join(__dirname, '../templates/entry.js'));

module.exports = bundle;

function bundle (brick) {
  var entry = path.join(brick.dir, 'index.js');

  debug('Bundling %s', entry);

  var b = browserify();
  b.pipeline.splice(2, 0, savePackageMeta(brick));

  b.add(entry);
  return b.bundle();
}

function savePackageMeta (brick) {
  var allEntries = flatten(findAllEntries(brick));
  var entry;

  return through(function (row) {
    if (allEntries[row.id]) {
      debug('Writing meta information on %s', row.id);
      entry = generateEntryModule(allEntries[row.id], row);
      row.id = entry.deps['./_brick_index'];
      delete row.entry;
      this.queue(entry);
    }

    this.queue(row);
  });
}

function findAllEntries (brick, result) {
  result || (result = {});

  result[path.join(brick.dir, brick.entry)] = brick;

  brick.mixings && brick.mixings.forEach(function (m) {
    findAllEntries(m, result);
  });

  if (!brick.attachments) return result;

  var key;
  for (key in brick.attachments) {
    findAllEntries(brick.attachments[key][0], result);
  }

  return result;
}

function generateEntryModule (brick, rpl) {
  var source = format(entryModuleTemplate, {
    title: brick.title,
    key: brick.key,
    name: brick.name,
    assetsDir: brick.assetsDir,
    'html-source': generateHTMLBundle(brick)
  });

  return {
    id: rpl.id,
    source: source,
    entry: true,
    deps: {
      './_brick_index': path.join(path.dirname(rpl.id), '_brick_index.js')
    }
  };
}

function generateHTMLBundle (brick) {
  var result = {};

  var name;
  var filename;
  for (name in brick.source.html) {
    filename = path.join(brick.dir, name);
    result[name] = rewritePaths(brick, name, fs.readFileSync(filename).toString());
  }

  return JSON.stringify(result, null, '\t');
}

function rewritePaths (brick, filename, html) {
  return html.replace(/ src=([^\s]+)/g, function (match, url) {
    var quote = url.charAt(0);

    if (quote != "'" && quote != '"') {
      quote = '';
    } else {
      url = url.slice(1, -1);
    }

    if (/^\w+:\/\//.test(url)) {
      return ' src=' + quote + url + quote;
    }

    return ' src=' + quote + path.join(brick.assetsDir, path.dirname(filename), url) + quote;
  });
}
