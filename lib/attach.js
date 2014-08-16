var debug = require("local-debug")('attach');

module.exports = attach;

function attach (brick, attachment) {
  if (attachment.embedsBrick) attachment = attachment.brick;
  if (!brick.attachments) brick.attachments = {};
  if (!brick.attachments[attachment.key]) brick.attachments[attachment.key] = [];

  attachment.parent = brick;
  brick.attachments[attachment.key].push(attachment);

  return attachment;
}
