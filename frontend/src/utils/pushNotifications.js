import api from "../api/axios";

const canUsePushNotifications = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

export const ensurePushSubscription = async () => {
  if (!canUsePushNotifications() || Notification.permission !== "granted") {
    return { supported: false, subscribed: false };
  }

  const registration = await navigator.serviceWorker.ready;

  if (!registration?.pushManager) {
    return { supported: false, subscribed: false };
  }

  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    await api.post("/notifications/subscribe", {
      subscription: existingSubscription.toJSON(),
    });

    return { supported: true, subscribed: true, subscription: existingSubscription };
  }

  const response = await api.get("/notifications/public-key");
  const publicKey = response.data?.data?.publicKey;

  if (!publicKey) {
    throw new Error("Push notifications are not configured on the server");
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await api.post("/notifications/subscribe", {
    subscription: subscription.toJSON(),
  });

  return { supported: true, subscribed: true, subscription };
};

export const unsubscribePushNotifications = async () => {
  if (!canUsePushNotifications()) {
    return { supported: false, unsubscribed: false };
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration?.pushManager?.getSubscription?.();

  if (!existingSubscription) {
    return { supported: true, unsubscribed: false };
  }

  try {
    await api.delete("/notifications/unsubscribe", {
      data: {
        endpoint: existingSubscription.endpoint,
      },
    });
  } catch (error) {
    // Continue local cleanup even if the server record is already gone or auth has expired.
  }

  await existingSubscription.unsubscribe();

  return { supported: true, unsubscribed: true };
};

export const browserSupportsPushNotifications = canUsePushNotifications;
