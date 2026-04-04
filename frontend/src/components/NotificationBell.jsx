import { useMemo, useState } from "react";
import { HiOutlineBell, HiOutlineBellAlert } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";

import useNotifications from "../hooks/useNotifications";
import { formatDateTime } from "../utils/date";

const NotificationBell = ({ role }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    notificationPermission,
    pushEnabled,
    canUseBrowserNotifications,
    requestNotificationPermission,
  } = useNotifications();

  const recentNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);

  const handleOpenNotification = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    setIsOpen(false);
    navigate(notification.link || (role === "consultancy" ? "/consultancy/notifications" : "/student/notifications"));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative rounded-2xl border border-gray-200 bg-white p-3 text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >
        <HiOutlineBell className="h-5 w-5" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-20 bg-gray-950/10 backdrop-blur-[1px] sm:hidden"
          />
          <div className="fixed inset-x-4 top-20 z-30 overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-xl sm:absolute sm:right-0 sm:top-full sm:mt-3 sm:w-[22rem] sm:inset-x-auto">
            <div className="border-b border-gray-100 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  <p className="text-xs text-gray-500">{unreadCount} unread</p>
                </div>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600"
                >
                  Mark all read
                </button>
              </div>
            </div>

            <div className="max-h-[min(65vh,30rem)] overflow-y-auto px-4 py-4">
              <div className="space-y-3">
                {canUseBrowserNotifications && !pushEnabled ? (
                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    className="flex w-full items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-800 transition hover:bg-amber-100"
                  >
                    <span className="rounded-xl bg-white/70 p-2 text-amber-600">
                      <HiOutlineBellAlert className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold leading-6">
                      {notificationPermission === "denied"
                        ? "Popup alerts are blocked. Tap to retry after enabling browser notifications."
                        : "Enable popup alerts for new updates"}
                    </span>
                  </button>
                ) : null}

                {recentNotifications.length ? (
                  recentNotifications.map((notification) => (
                    <button
                      key={notification._id}
                      type="button"
                      onClick={() => handleOpenNotification(notification)}
                      className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                        notification.isRead
                          ? "border-gray-100 bg-gray-50"
                          : "border-blue-100 bg-blue-50/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900">{notification.title}</p>
                          <p className="mt-1 break-words text-sm leading-6 text-gray-600">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead ? (
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gray-400">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                    No notifications yet.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 px-4 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate(
                    role === "consultancy"
                      ? "/consultancy/notifications"
                      : "/student/notifications"
                  );
                }}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Open Notification Center
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default NotificationBell;
