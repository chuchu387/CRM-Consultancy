const webpush = require("web-push");

const PushSubscription = require("../models/PushSubscription");

let isConfigured = false;

const hasPushConfig = () =>
  Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );

const configurePushNotifications = () => {
  if (!hasPushConfig() || isConfigured) {
    return hasPushConfig();
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  isConfigured = true;

  return true;
};

const getPushPublicKey = () => process.env.VAPID_PUBLIC_KEY || "";

const normalizeSubscriptionPayload = (subscription = {}) => {
  const endpoint = String(subscription.endpoint || "").trim();
  const p256dh = String(subscription.keys?.p256dh || "").trim();
  const auth = String(subscription.keys?.auth || "").trim();

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  const expirationTime =
    typeof subscription.expirationTime === "number"
      ? new Date(subscription.expirationTime)
      : null;

  return {
    endpoint,
    expirationTime:
      expirationTime instanceof Date && !Number.isNaN(expirationTime.getTime())
        ? expirationTime
        : null,
    keys: {
      p256dh,
      auth,
    },
  };
};

const upsertPushSubscription = async ({ userId, subscription, userAgent = "" }) => {
  const normalizedSubscription = normalizeSubscriptionPayload(subscription);

  if (!userId || !normalizedSubscription) {
    return null;
  }

  return PushSubscription.findOneAndUpdate(
    { endpoint: normalizedSubscription.endpoint },
    {
      userId,
      endpoint: normalizedSubscription.endpoint,
      expirationTime: normalizedSubscription.expirationTime,
      keys: normalizedSubscription.keys,
      userAgent: String(userAgent || "").trim(),
      lastUsedAt: new Date(),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

const removePushSubscription = async ({ userId, endpoint }) => {
  const normalizedEndpoint = String(endpoint || "").trim();

  if (!userId || !normalizedEndpoint) {
    return 0;
  }

  const result = await PushSubscription.deleteOne({
    userId,
    endpoint: normalizedEndpoint,
  });

  return result.deletedCount || 0;
};

const sendPushToUser = async ({ userId, notification }) => {
  if (!userId || !notification || !configurePushNotifications()) {
    return { sent: 0, removed: 0 };
  }

  const subscriptions = await PushSubscription.find({ userId });

  if (!subscriptions.length) {
    return { sent: 0, removed: 0 };
  }

  const payload = JSON.stringify({
    title: notification.title,
    message: notification.message,
    link: notification.link || "",
    notificationId: notification._id?.toString?.() || "",
    type: notification.type || "system",
    createdAt: notification.createdAt || new Date().toISOString(),
    metadata: notification.metadata || {},
  });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (subscriptionRecord) => {
      const subscription = {
        endpoint: subscriptionRecord.endpoint,
        expirationTime: subscriptionRecord.expirationTime
          ? new Date(subscriptionRecord.expirationTime).getTime()
          : null,
        keys: subscriptionRecord.keys,
      };

      try {
        await webpush.sendNotification(subscription, payload);
        sent += 1;
      } catch (error) {
        if ([404, 410].includes(error.statusCode)) {
          await PushSubscription.deleteOne({ _id: subscriptionRecord._id });
          removed += 1;
          return;
        }

        console.error("Push notification delivery failed:", error.message);
      }
    })
  );

  return { sent, removed };
};

module.exports = {
  configurePushNotifications,
  getPushPublicKey,
  hasPushConfig,
  normalizeSubscriptionPayload,
  upsertPushSubscription,
  removePushSubscription,
  sendPushToUser,
};
