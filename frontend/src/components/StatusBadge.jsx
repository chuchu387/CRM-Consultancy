import { getStatusTheme } from "../utils/status";

const StatusBadge = ({ status, label = "", compact = false }) => {
  const theme = getStatusTheme(status);

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ring-1 ring-inset ${theme.badge} ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      {label || status}
    </span>
  );
};

export default StatusBadge;
