var newCommand = require('new-command');
var command = newCommand({
  p: 'port',
  n: 'hostname',
  e: 'verbose',
  s: 'silent'
});

if (/\/bin\/brick$/.test(command._[0])) { // node debug
  command._ = command._.splice(1);
}

var task = command._.splice(0,1)[0];

require('default-debug')(verbosity());

var debug = require("local-debug")('cli');
var path = require("path");
var fs = require("fs");
var readJSON = require("read-json");
var style = require("style-format");
var format = require("format-text");
var loop = require("parallel-loop");

var tasks = {
  build: build,
  serve: serve,
  version: newCommand.version,
  help: newCommand.help
};

module.exports = run;

function run () {
  if (tasks[task]) return tasks[task]();
  if (task == undefined) return intro();

  get(task, function (error, brick) {
    if (!error && brick) return introMessage(brick);

    fail('invalid-command', {
      command: task
    });
  });
}

function build () {
  find(function (error, brick) {
    if (command._.length == 0) {
      fail('missing-target-directory');
      return;
    }

    if (!brick) {
      fail('missing-package');
      return;
    }

    brick.build(command._[0] || '', function (error) {
      if (error) {
        debug('Failed: %s', error.message);
        return;
      }

      debug('Done.');
    });
  });
}

function serve () {
  find(function (error, brick) {
    if (!brick) {
      fail('missing-package');
      return;
    }

    brick.serve(command.port, command.hostname);
  });
}

function get (dir, callback) {
  dir = path.join(process.cwd(), dir);
  var filename = path.join(dir, 'package.json');

  debug('Reading %s', filename);

  readJSON(filename, function (error, manifest) {
    if (error) return callback(error);

    createPackageIndex(dir, manifest, function (error) {
      if (error) return callback(error);

      var modulePath = path.join(dir, manifest.main || 'index');

      debug('Looking at %s for a brick', modulePath);

      var Factory = require(modulePath);

      if (Factory.embedsBrick) {
        return callback(undefined, Factory.New().brick);
      }

      if (!Factory.isBrick) return callback();

      callback(undefined, Factory.New());

    });
  });
}

function find (callback) {
  get(command._[0] || '', function (error, brick, dir) {
    if (!error && brick) {
      command._.splice(0, 1);
      return callback(undefined, brick, dir);
    }

    if (command._.length == 0) {
      return callback();
    }

    get('', function (error, brick, dir) {
      if (!error && brick) {
        return callback(undefined, brick);
      }

      callback();
    });
  });
}

function createPackageIndex (dir, manifest, callback) {
  if (path.basename(dir) == "brick") return callback();

  fs.readdir(dir, function (error, files) {
    if (error) return callback();

    if (manifest.main || (manifest.main && !/\.css/.test(manifest.main)) || files.indexOf('index.js') > -1) return createDependencyIndexes(dir, callback);

    fs.writeFile(path.join(dir, 'index.js'), 'module.exports = require("brick")();', function (error) {
      if (error) return callback(error);

      debug('Created %s for you', path.join(dir, 'index.js'));

      createDependencyIndexes(dir, callback);
    });
  });
}

function createDependencyIndexes (dir, callback) {
  fs.readdir(path.join(dir, 'node_modules'), function (error, deps) {
    if (error) return callback();

    loop(deps.length, each, callback);

    function each (done, i) {
      var ddir = path.join(dir, 'node_modules', deps[i]);
      readJSON(path.join(ddir, 'package.json'), function (error, manifest) {
        if (error) return done();
        createPackageIndex(ddir, manifest, done);
      });
    }
  });
}


function intro () {
  find(function (brick) {
    if (!brick) return newCommand.help();

    introMessage(brick);
  });
}

function introMessage (brick) {
  var template = fs.readFileSync(path.join(__dirname, '../templates/intro.txt')).toString();

  console.log(style(format(template, {
    name: brick.name,
    path: brick.dir,
    version: brick.manifest.version
  })));
}

function message (type, context, out) {
  var template = fs.readFileSync(path.join(__dirname, '../templates/' + type + '.txt')).toString();
  (out || console.log)(style(format(template, context)));
}

function fail (type, context) {
  message(type, context, console.error);
}

function verbosity () {
  if (command.verbose) return '*';
  if (command.silent) return '';

  if (task == 'build' || task == 'serve') return 'brick-node:cli,brick-node:build,brick-node:serve,brick-node:from,brick-node:new';

  return '';
}
