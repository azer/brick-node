module.exports = create;

function create (brick, selector, source, binder) {
  if (typeof selector == 'object') {
    return each(brick, selector);
  }

  if (!brick.bindings) brick.bindings = {};

  if (!source) return;

  var options = source;
  var selectorParts;
  var opt;

  if (Array.isArray(options)) {
    options = attachAll(brick, options);
  }

  if (options.embedsBrick) {
    options = {
      _html: brick.attach(options.brick)
    };
  }

  if (options._html && options._html.embedsBrick) {
    options._html = brick.attach(options._html);
  }

  if (options.returnsTemplateStream) {
    options = {
      _html: source
    };
  }

  if (typeof options == 'function') {
    options = options();
  }

  if (binder && brick.element) {
    binder(brick.element[0], selector, source);
  }

  brick.bindings[selector] = {
    selector: selector,
    source: source,
    binder: binder,
    options: options
  };
}

function attachAll (brick, list) {
  var i = -1;
  var result = list.slice();
  var len = result.length;

  while (++i < len) {
    if (!result[i].embedsBrick) continue;
    brick.attach(result[i]);

    result[i] = {
      ':first': {
        'data-id': result[i].brick.id,
        '_html': result[i].brick
      }
    };
  }

  return result;
}

function each (brick, bindings) {
  var selector;
  for (selector in bindings) {
    create(brick, selector, bindings[selector]);
  }
}
