import { useMemo, useState } from "react";
import { HiOutlineBellAlert } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";

import useNotifications from "../hooks/useNotifications";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/date";

const NotificationsCenter = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    notificationPermission,
    pushEnabled,
    canUseBrowserNotifications,
    requestNotificationPermission,
  } = useNotifications();
  const [filter, setFilter] = useState("all");

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.isRead);
    }

    return notifications;
  }, [filter, notifications]);

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Alert Center
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              Notifications
            </h2>
            <p className="mt-2 text-sm text-gray-500">{unreadCount} unread notification(s)</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {["all", "unread"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                  filter === option
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {option === "all" ? "All" : "Unread"}
              </button>
            ))}
            <button
              type="button"
              onClick={markAllAsRead}
              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Mark All Read
            </button>
            {canUseBrowserNotifications ? (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  pushEnabled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                {pushEnabled
                  ? "Popup Alerts Enabled"
                  : notificationPermission === "denied"
                    ? "Retry Popup Alerts"
                    : "Enable Popup Alerts"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 h-4 w-64 animate-pulse rounded bg-gray-100" />
            </div>
          ))
        ) : filteredNotifications.length ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`rounded-[1.75rem] border p-5 shadow-sm transition ${
                notification.isRead ? "border-gray-200 bg-white" : "border-blue-100 bg-blue-50/50"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading text-xl font-semibold text-gray-900">
                      {notification.title}
                    </h3>
                    {!notification.isRead ? (
                      <span className="inline-flex rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-gray-600">{notification.message}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-gray-400">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!notification.isRead ? (
                    <button
                      type="button"
                      onClick={() => markAsRead(notification._id)}
                      className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Mark Read
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        notification.link ||
                          (user?.role === "consultancy"
                            ? "/consultancy/dashboard"
                            : "/student/dashboard")
                      )
                    }
                    className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Open
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineBellAlert className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No notifications found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Alerts about documents, meetings, visas, tasks, and invoices will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsCenter;
