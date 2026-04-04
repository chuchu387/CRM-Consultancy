const Notification = require("../models/Notification");
const { sendPushToUser } = require("./pushNotifications");

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

  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    link,
    metadata,
  });

  await sendPushToUser({
    userId,
    notification,
  });

  return notification;
};

module.exports = {
  createNotification,
};
