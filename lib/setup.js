module.exports = setup;
module.exports.ready = ready;

function setup (brick, embedding) {
  if (!embedding.update && !embedding.show) return ready(brick);

  var callShow = embedding.show && (!brick.parentMixing || !brick.parentMixing.wrapper.show);
  var callUpdate = embedding.update && (!brick.parentMixing || !brick.parentMixing.wrapper.update);

  if (!callUpdate) {
    if (callShow) embedding.show();
    return ready(brick);
  }

  embedding.update(function (error) {
    if (error) return brick.onError.publish(error);

    if (callShow) embedding.show();

    ready(brick);
  });
}

function ready (brick) {
  if (!brick.onReady.publish) return;

  var onReady = brick.onReady;

  brick.onReady = function (fn) {
    fn();
  };

  brick.onReady.subscribe = brick.onReady;

  onReady.publish();
}
