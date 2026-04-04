import { HiOutlineArrowDownTray, HiOutlineBellAlert, HiOutlineXMark } from "react-icons/hi2";

import { useAuth } from "../context/AuthContext";
import useNotifications from "../hooks/useNotifications";
import usePwaInstall from "../hooks/usePwaInstall";

const MobileAppPrompt = () => {
  const { user } = useAuth();
  const {
    canUseBrowserNotifications,
    notificationPermission,
    pushEnabled,
    requestNotificationPermission,
  } = useNotifications();
  const { canInstall, promptInstall, isInstalled, isIosInstallable, dismissed, dismissPrompt } =
    usePwaInstall();

  if (!user || dismissed) {
    return null;
  }

  const needsInstall = !isInstalled && (canInstall || isIosInstallable);
  const needsAlerts = canUseBrowserNotifications && !pushEnabled;

  if (!needsInstall && !needsAlerts) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-30 md:left-auto md:max-w-md">
      <div className="pointer-events-auto overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white/95 shadow-2xl shadow-blue-200/40 backdrop-blur">
        <div className="flex items-start justify-between gap-3 border-b border-blue-100 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              Mobile Experience
            </p>
            <h3 className="mt-1 font-heading text-lg font-semibold text-gray-900">
              Use CRM like an app
            </h3>
          </div>
          <button
            type="button"
            onClick={dismissPrompt}
            className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
            aria-label="Dismiss mobile prompt"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          {needsInstall ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-white p-2 text-blue-600 shadow-sm">
                  <HiOutlineArrowDownTray className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">Install the app</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {canInstall
                      ? "Add Consultancy CRM to your home screen for a faster mobile experience."
                      : "On iPhone, tap Share and choose Add to Home Screen to install this app."}
                  </p>
                  {canInstall ? (
                    <button
                      type="button"
                      onClick={promptInstall}
                      className="mt-3 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Install App
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {needsAlerts ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-white p-2 text-amber-600 shadow-sm">
                  <HiOutlineBellAlert className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">Enable popup alerts</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Get instant updates for document reviews, visa progress, meetings, and invoices.
                  </p>
                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    className="mt-3 rounded-2xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    {notificationPermission === "denied" ? "Retry Alerts" : "Enable Alerts"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MobileAppPrompt;
