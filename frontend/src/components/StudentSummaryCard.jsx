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
}) => {
  const normalizedStats = stats.filter((item) => item?.label);
  const gridClass =
    gridClassMap[Math.min(normalizedStats.length, 4)] || "sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <HiOutlineUserCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {label}
              </p>
              <h3 className="mt-2 truncate font-heading text-2xl font-semibold text-gray-900">
                {name || "Student"}
              </h3>
              <p className="mt-2 truncate text-sm text-gray-600">{email || "No email"}</p>
              {meta ? <p className="mt-1 text-sm text-gray-500">{meta}</p> : null}
            </div>
          </div>

          {normalizedStats.length ? (
            <div className={`mt-4 grid gap-3 ${gridClass}`}>
              {normalizedStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                    {stat.label}
                  </p>
                  <p
                    className={`mt-2 text-xl font-semibold ${
                      toneClasses[stat.tone] || toneClasses.default
                    }`}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {children ? <div className="mt-4">{children}</div> : null}

          {updatedText ? (
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-gray-400">{updatedText}</p>
          ) : null}
        </div>

        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default StudentSummaryCard;
