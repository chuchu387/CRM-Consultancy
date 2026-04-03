const Pagination = ({
  compact = false,
  currentPage,
  endItem,
  itemLabel = "items",
  onPageChange,
  onRowsPerPageChange,
  rowsPerPage,
  rowsPerPageLabel = "Rows per page",
  startItem,
  totalItems,
  totalPages,
}) => {
  if (!totalItems) {
    return null;
  }

  const pageNumbers = [];
  const windowStart = Math.max(1, currentPage - 1);
  const windowEnd = Math.min(totalPages, currentPage + 1);

  for (let page = windowStart; page <= windowEnd; page += 1) {
    pageNumbers.push(page);
  }

  const wrapperClassName = compact
    ? "flex flex-col gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between"
    : "flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between";

  const metaTextClassName = compact ? "text-xs text-gray-500" : "text-sm text-gray-500";
  const controlsClassName = compact
    ? "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"
    : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end";
  const labelClassName = compact
    ? "flex items-center gap-1.5 text-xs text-gray-500"
    : "flex items-center gap-2 text-sm text-gray-500";
  const selectClassName = compact
    ? "rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
    : "rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100";
  const buttonGroupClassName = compact ? "flex items-center gap-1.5" : "flex items-center gap-2";
  const secondaryButtonClassName = compact
    ? "rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    : "rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
  const activeButtonClassName = compact
    ? "rounded-xl px-2.5 py-1.5 text-xs font-semibold transition"
    : "rounded-2xl px-3 py-2 text-sm font-semibold transition";
  const ellipsisClassName = compact ? "px-0.5 text-xs text-gray-400" : "px-1 text-sm text-gray-400";

  return (
    <div className={wrapperClassName}>
      <div className={metaTextClassName}>
        Showing <span className="font-semibold text-gray-700">{startItem}</span> to{" "}
        <span className="font-semibold text-gray-700">{endItem}</span> of{" "}
        <span className="font-semibold text-gray-700">{totalItems}</span> {itemLabel}
      </div>

      <div className={controlsClassName}>
        <label className={labelClassName}>
          <span>{rowsPerPageLabel}</span>
          <select
            value={rowsPerPage}
            onChange={(event) => onRowsPerPageChange(event.target.value)}
            className={selectClassName}
          >
            {[5, 10, 20, 50].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className={buttonGroupClassName}>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={secondaryButtonClassName}
          >
            Prev
          </button>

          {windowStart > 1 ? (
            <>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                className={secondaryButtonClassName}
              >
                1
              </button>
              {windowStart > 2 ? <span className={ellipsisClassName}>...</span> : null}
            </>
          ) : null}

          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`${activeButtonClassName} ${
                pageNumber === currentPage
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              {pageNumber}
            </button>
          ))}

          {windowEnd < totalPages ? (
            <>
              {windowEnd < totalPages - 1 ? <span className={ellipsisClassName}>...</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                className={secondaryButtonClassName}
              >
                {totalPages}
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={secondaryButtonClassName}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
