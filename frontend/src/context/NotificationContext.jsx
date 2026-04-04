import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";

import api from "../api/axios";
import {
  browserSupportsPushNotifications,
  ensurePushSubscription,
} from "../utils/pushNotifications";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 45000;
const MAX_STORED_NOTIFICATION_IDS = 200;

const getSeenStorageKey = (userId) => `crm_seen_notification_ids_${userId}`;

const getDefaultNotificationLink = (role) =>
  role === "consultancy" ? "/consultancy/notifications" : "/student/notifications";

const readSeenNotificationIds = (userId) => {
  if (!userId || typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(getSeenStorageKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch (error) {
    return [];
  }
};

const persistSeenNotificationIds = (userId, ids) => {
  if (!userId || typeof window === "undefined") {
    return;
  }

  const normalizedIds = Array.from(new Set(ids)).slice(-MAX_STORED_NOTIFICATION_IDS);
  localStorage.setItem(getSeenStorageKey(userId), JSON.stringify(normalizedIds));
};

const canUseSystemNotifications = () =>
  typeof window !== "undefined" && "Notification" in window;

const NotificationToast = ({ notification }) => (
  <div className="space-y-1">
    <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
    <p className="text-sm text-gray-600">{notification.message}</p>
  </div>
);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notificationPermission, setNotificationPermission] = useState(() =>
    canUseSystemNotifications() ? Notification.permission : "unsupported"
  );
  const [pushEnabled, setPushEnabled] = useState(false);
  const initialLoadCompletedRef = useRef(false);
  const seenIdsRef = useRef(new Set());

  const showToastNotification = useCallback(
    (notification) => {
      toast.info(<NotificationToast notification={notification} />, {
        toastId: `notification-toast-${notification._id}`,
        autoClose: 5000,
        onClick: () => {
          window.location.href =
            notification.link || getDefaultNotificationLink(user?.role || "student");
        },
      });
    },
    [user?.role]
  );

  const processFreshNotifications = useCallback(
    (items) => {
      if (!user?.id || !items.length) {
        return;
      }

      if (!initialLoadCompletedRef.current) {
        items.forEach((item) => seenIdsRef.current.add(item._id));
        persistSeenNotificationIds(user.id, Array.from(seenIdsRef.current));
        initialLoadCompletedRef.current = true;
        return;
      }

      const freshNotifications = items.filter((item) => !seenIdsRef.current.has(item._id));

      if (!freshNotifications.length) {
        return;
      }

      freshNotifications
        .slice()
        .reverse()
        .forEach((item) => {
          showToastNotification(item);
        });

      freshNotifications.forEach((item) => seenIdsRef.current.add(item._id));
      persistSeenNotificationIds(user.id, Array.from(seenIdsRef.current));
    },
    [showToastNotification, user?.id]
  );

  const fetchNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.id || !token) {
        setNotifications([]);
        setLoading(false);
        setError("");
        return [];
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await api.get("/notifications/my");
        const payload = Array.isArray(response.data?.data) ? response.data.data : [];
        setNotifications(payload);
        setError("");
        processFreshNotifications(payload);
        return payload;
      } catch (fetchError) {
        const message =
          fetchError.response?.data?.message || "Unable to fetch notifications right now";
        setError(message);
        return [];
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [processFreshNotifications, token, user?.id]
  );

  useEffect(() => {
    if (!user?.id || !token) {
      initialLoadCompletedRef.current = false;
      seenIdsRef.current = new Set();
      setNotifications([]);
      setLoading(false);
      setError("");
      setPushEnabled(false);
      setNotificationPermission(canUseSystemNotifications() ? Notification.permission : "unsupported");
      return;
    }

    seenIdsRef.current = new Set(readSeenNotificationIds(user.id));
    initialLoadCompletedRef.current = false;

    fetchNotifications().catch(() => undefined);

    const poller = window.setInterval(() => {
      fetchNotifications({ silent: true }).catch(() => undefined);
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications({ silent: true }).catch(() => undefined);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(poller);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications, token, user?.id]);

  useEffect(() => {
    if (!canUseSystemNotifications()) {
      return undefined;
    }

    const syncPermission = () => {
      setNotificationPermission(Notification.permission);
    };

    syncPermission();
    window.addEventListener("focus", syncPermission);

    return () => window.removeEventListener("focus", syncPermission);
  }, []);

  useEffect(() => {
    if (!user?.id || !token) {
      return undefined;
    }

    const handleMessage = (event) => {
      const messageType = event.data?.type;

      if (messageType !== "crm_push_notification") {
        return;
      }

      const payload = event.data?.payload || {};
      const notification = {
        _id: payload.notificationId,
        title: payload.title,
        message: payload.message,
        link: payload.link || getDefaultNotificationLink(user.role),
        type: payload.type || "system",
        metadata: payload.metadata || {},
        createdAt: payload.createdAt || new Date().toISOString(),
        isRead: false,
      };

      if (!notification._id || seenIdsRef.current.has(notification._id)) {
        return;
      }

      seenIdsRef.current.add(notification._id);
      persistSeenNotificationIds(user.id, Array.from(seenIdsRef.current));
      setNotifications((current) => [notification, ...current.filter((item) => item._id !== notification._id)]);
      showToastNotification(notification);
    };

    navigator.serviceWorker?.addEventListener?.("message", handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener?.("message", handleMessage);
    };
  }, [showToastNotification, token, user?.id, user?.role]);

  const syncPushSubscription = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id || !token || Notification.permission !== "granted") {
      setPushEnabled(false);
      return false;
    }

    try {
      const result = await ensurePushSubscription();
      setPushEnabled(Boolean(result?.subscribed));
      return Boolean(result?.subscribed);
    } catch (subscriptionError) {
      setPushEnabled(false);

      if (!silent) {
        toast.error(
          subscriptionError.response?.data?.message ||
            subscriptionError.message ||
            "Unable to enable popup alerts right now."
        );
      }

      return false;
    }
  }, [token, user?.id]);

  useEffect(() => {
    if (!user?.id || !token) {
      return;
    }

    if (notificationPermission === "granted") {
      syncPushSubscription({ silent: true }).catch(() => undefined);
      return;
    }

    setPushEnabled(false);
  }, [notificationPermission, syncPushSubscription, token, user?.id]);

  const markAsRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((current) =>
        current.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
    } catch (markError) {
      toast.error(markError.response?.data?.message || "Unable to mark notification");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (markError) {
      toast.error(markError.response?.data?.message || "Unable to mark notifications");
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!canUseSystemNotifications()) {
      toast.info("This browser does not support popup notifications.");
      return { permission: "unsupported", enabled: false };
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        const subscribed = await syncPushSubscription({ silent: false });
        if (subscribed) {
          toast.success("Popup alerts are enabled.");
        }

        return { permission, enabled: subscribed };
      } else if (permission === "denied") {
        setPushEnabled(false);
        toast.info("Popup alerts are blocked. Enable them from your browser settings.");
        return { permission, enabled: false };
      }

      setPushEnabled(false);
      return { permission, enabled: false };
    } catch (permissionError) {
      toast.error("Unable to request notification permission right now.");
      setPushEnabled(false);
      return { permission: "denied", enabled: false };
    }
  }, [syncPushSubscription]);

  const value = useMemo(
    () => ({
      notifications,
      loading,
      error,
      unreadCount: notifications.filter((item) => !item.isRead).length,
      refetch: fetchNotifications,
      markAsRead,
      markAllAsRead,
      notificationPermission,
      pushEnabled,
      canUseBrowserNotifications: browserSupportsPushNotifications(),
      requestNotificationPermission,
    }),
    [
      error,
      fetchNotifications,
      loading,
      markAllAsRead,
      markAsRead,
      notificationPermission,
      notifications,
      pushEnabled,
      requestNotificationPermission,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotificationsContext = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotificationsContext must be used within a NotificationProvider");
  }

  return context;
};
