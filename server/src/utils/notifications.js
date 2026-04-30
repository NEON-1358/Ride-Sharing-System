const Notification = require("../models/Notification");

async function createNotification({ user, type, message, metadata = {} }) {
  if (!user || !message) return null;

  return Notification.create({
    user,
    type,
    message,
    metadata,
  });
}

module.exports = { createNotification };
