import { HiOutlineUserCircle } from "react-icons/hi2";

const toneClasses = {
  default: "text-gray-900",
  blue: "text-blue-700",
  amber: "text-amber-700",
  emerald: "text-emerald-700",
  rose: "text-rose-700",
  teal: "text-teal-700",
};

const gridClassMap = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
};

const StudentSummaryCard = ({
  label = "Student",
  name,
  email,
  meta,
  stats = [],
  updatedText = "",
  actionLabel = "View",
  onAction,
  children,
  compact = false,
}) => {
  const normalizedStats = stats.filter((item) => item?.label);
  const gridClass =
    gridClassMap[Math.min(normalizedStats.length, 4)] || "sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div
      className={`border border-gray-200 bg-white shadow-sm ${
        compact ? "rounded-2xl p-4" : "rounded-[1.75rem] p-5"
      }`}
    >
      <div className={`flex flex-col ${compact ? "gap-3" : "gap-4 lg:flex-row lg:items-start lg:justify-between"}`}>
        <div className="min-w-0 flex-1">
          <div className={`flex items-start ${compact ? "gap-2.5" : "gap-3"}`}>
            <div
              className={`bg-blue-50 text-blue-700 ${
                compact ? "rounded-xl p-2" : "rounded-2xl p-3"
              }`}
            >
              <HiOutlineUserCircle className={compact ? "h-5 w-5" : "h-6 w-6"} />
            </div>
            <div className="min-w-0">
              <p
                className={`font-semibold uppercase tracking-[0.16em] text-blue-600 ${
                  compact ? "text-[10px]" : "text-xs"
                }`}
              >
                {label}
              </p>
              <h3
                className={`truncate font-heading font-semibold text-gray-900 ${
                  compact ? "mt-1 text-base" : "mt-2 text-2xl"
                }`}
              >
                {name || "Student"}
              </h3>
              <p className={`truncate text-gray-600 ${compact ? "mt-1 text-xs" : "mt-2 text-sm"}`}>
                {email || "No email"}
              </p>
              {meta ? (
                <p className={`text-gray-500 ${compact ? "mt-1 text-xs" : "mt-1 text-sm"}`}>{meta}</p>
              ) : null}
            </div>
          </div>

          {normalizedStats.length ? (
            <div className={`grid ${compact ? "mt-3 gap-2" : "mt-4 gap-3"} ${gridClass}`}>
              {normalizedStats.map((stat) => (
                <div
                  key={stat.label}
                  className={`bg-gray-50 ${compact ? "rounded-xl px-3 py-2.5" : "rounded-2xl px-4 py-3"}`}
                >
                  <p
                    className={`font-semibold uppercase tracking-[0.16em] text-gray-400 ${
                      compact ? "text-[10px]" : "text-[11px]"
                    }`}
                  >
                    {stat.label}
                  </p>
                  <p
                    className={`mt-2 text-xl font-semibold ${
                      toneClasses[stat.tone] || toneClasses.default
                    } ${compact ? "text-lg" : "text-xl"}`}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {children ? <div className={compact ? "mt-3" : "mt-4"}>{children}</div> : null}

          {updatedText ? (
            <p
              className={`uppercase tracking-[0.16em] text-gray-400 ${
                compact ? "mt-2 text-[10px]" : "mt-3 text-xs"
              }`}
            >
              {updatedText}
            </p>
          ) : null}
        </div>

        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className={`shrink-0 border border-blue-200 bg-blue-50 font-semibold text-blue-700 transition hover:bg-blue-100 ${
              compact ? "rounded-xl px-3 py-1.5 text-xs" : "rounded-2xl px-3 py-2 text-sm"
            }`}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default StudentSummaryCard;
