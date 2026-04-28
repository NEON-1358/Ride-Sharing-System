const Notification = require("../models/Notification");
const { toNotification } = require("../utils/serializers");

exports.listNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  return res.json(notifications.map(toNotification));
};

exports.markAllRead = async (req, res) => {
  const now = new Date();
  await Notification.updateMany(
    { user: req.user._id, readAt: null },
    { $set: { readAt: now } }
  );

  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  return res.json(notifications.map(toNotification));
};
