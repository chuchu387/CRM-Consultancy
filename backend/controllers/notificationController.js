const Notification = require("../models/Notification");
const {
  getPushPublicKey,
  hasPushConfig,
  normalizeSubscriptionPayload,
  removePushSubscription,
  upsertPushSubscription,
} = require("../utils/pushNotifications");

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: notifications,
      message: "Notifications retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getPushConfig = async (_req, res, next) => {
  try {
    if (!hasPushConfig()) {
      return res.status(503).json({
        success: false,
        message: "Push notifications are not configured",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        publicKey: getPushPublicKey(),
      },
      message: "Push configuration retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const subscribeToPush = async (req, res, next) => {
  try {
    const subscription = normalizeSubscriptionPayload(req.body?.subscription);

    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: "A valid push subscription is required",
      });
    }

    const record = await upsertPushSubscription({
      userId: req.user.id,
      subscription,
      userAgent: req.headers["user-agent"] || "",
    });

    return res.status(201).json({
      success: true,
      data: record,
      message: "Push notifications enabled successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const unsubscribeFromPush = async (req, res, next) => {
  try {
    const endpoint = String(req.body?.endpoint || "").trim();

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: "A push subscription endpoint is required",
      });
    }

    await removePushSubscription({
      userId: req.user.id,
      endpoint,
    });

    return res.status(200).json({
      success: true,
      data: null,
      message: "Push notifications disabled successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      data: notification,
      message: "Notification marked as read",
    });
  } catch (error) {
    return next(error);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });

    return res.status(200).json({
      success: true,
      data: null,
      message: "All notifications marked as read",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyNotifications,
  getPushConfig,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToPush,
  unsubscribeFromPush,
};
