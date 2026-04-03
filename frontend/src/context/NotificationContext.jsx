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

const buildNotificationTargetUrl = (notification, role) => {
  const fallbackPath = getDefaultNotificationLink(role);
  const rawPath = notification.link || fallbackPath;
  return new URL(rawPath, window.location.origin).toString();
};

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

  const showBrowserNotification = useCallback(
    async (notification) => {
      if (!canUseSystemNotifications() || Notification.permission !== "granted") {
        return;
      }

      const targetUrl = buildNotificationTargetUrl(notification, user?.role || "student");
      const options = {
        body: notification.message,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        tag: `crm-notification-${notification._id}`,
        renotify: false,
        data: {
          url: targetUrl,
        },
      };

      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready;

          if (registration?.showNotification) {
            await registration.showNotification(notification.title, options);
            return;
          }
        }

        const systemNotification = new Notification(notification.title, options);
        systemNotification.onclick = () => {
          window.focus();
          window.location.href = notification.link || getDefaultNotificationLink(user?.role);
        };
      } catch (notificationError) {
        return notificationError;
      }
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

          if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            showBrowserNotification(item).catch(() => undefined);
          }
        });

      freshNotifications.forEach((item) => seenIdsRef.current.add(item._id));
      persistSeenNotificationIds(user.id, Array.from(seenIdsRef.current));
    },
    [showBrowserNotification, showToastNotification, user?.id]
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
      return "unsupported";
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        toast.success("Popup alerts are enabled.");
      } else if (permission === "denied") {
        toast.info("Popup alerts are blocked. Enable them from your browser settings.");
      }

      return permission;
    } catch (permissionError) {
      toast.error("Unable to request notification permission right now.");
      return "denied";
    }
  }, []);

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
      canUseBrowserNotifications: canUseSystemNotifications(),
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
