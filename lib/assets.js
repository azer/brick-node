var debug = require("local-debug")('assets');

module.exports = {
  css: css,
  template: template
};

function template (brick, name) {
  debug('Finding template "%s" under %s', name, brick.key);

  if (brick.templates[name]) return brick.templates[name];
  if (!brick.mixings) return;

  var i = -1;
  var len = brick.mixings.length;
  var found;
  while (++i < len) {
    found = template(brick.mixings[i], name);

    if (found) return found;
  }
}

function css (brick) {
  debug('Collecting all CSS files under %s', brick.key);

  var all = [];

  var name;
  for (name in brick.source.css) {
    all.push(brick.source.css[name]);
  }

  for (name in brick.attachments) {
    if (css(brick.attachments[name][0]).length) {
      all.push(brick.attachments[name][0].css);
    }
  }

  brick.mixings && brick.mixings.forEach(function (mixin) {
    if (css(mixin).length) all.push(mixin.css);
  });

  return all;
}
