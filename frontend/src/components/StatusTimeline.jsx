import { useMemo } from "react";

import { formatDateTime } from "../utils/date";
import { getStatusTheme } from "../utils/status";

const StatusTimeline = ({ history = [] }) => {
  const sortedHistory = useMemo(
    () =>
      [...history].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
    [history]
  );

  if (!sortedHistory.length) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
        No status updates are available yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sortedHistory.map((item, index) => {
        const theme = getStatusTheme(item.status);

        return (
          <div key={`${item.status}-${item.updatedAt}-${index}`} className="relative flex gap-4">
            <div className="flex w-6 flex-col items-center">
              <span className={`mt-1 h-3.5 w-3.5 rounded-full ${theme.dot}`} />
              {index !== sortedHistory.length - 1 ? (
                <span className="mt-2 h-full w-px bg-gray-200" />
              ) : null}
            </div>
            <div className="flex-1 rounded-3xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-gray-900">{item.status}</h4>
                <span className="text-xs font-medium uppercase tracking-[0.24em] text-gray-400">
                  {formatDateTime(item.updatedAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {item.note || "No additional note was recorded for this update."}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatusTimeline;
