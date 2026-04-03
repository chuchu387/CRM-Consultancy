const Notification = require("../models/Notification");

const createNotification = async ({
  userId,
  type = "system",
  title,
  message,
  link = "",
  metadata = {},
}) => {
  if (!userId || !title || !message) {
    return null;
  }

  return Notification.create({
    userId,
    type,
    title,
    message,
    link,
    metadata,
  });
};

module.exports = {
  createNotification,
};
