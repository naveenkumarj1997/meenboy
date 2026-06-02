const Notification = require("../models/Notification");

const createNotification = async ({ user, type, title, message, metadata }) => {
  if (!user) return null;
  return Notification.create({
    user,
    type,
    title,
    message,
    metadata
  });
};

module.exports = { createNotification };

