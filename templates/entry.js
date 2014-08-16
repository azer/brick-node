module.exports = require('./_brick_index');
module.exports._brick = {
  meta: {
    title: "{title}",
    name: "{name}",
    key: "{key}",
    assetsDir: "{assetsDir}",
    source: {
      html: {html-source}
    }
  }
};

window.{name} = module.exports;
