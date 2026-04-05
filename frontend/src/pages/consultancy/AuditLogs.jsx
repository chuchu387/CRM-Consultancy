import { useEffect, useMemo, useState } from "react";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { toast } from "react-toastify";

import Pagination from "../../components/Pagination";
import useApi from "../../hooks/useApi";
import usePagination from "../../hooks/usePagination";
import { formatDateTime } from "../../utils/date";
import { downloadCsv, downloadPdf } from "../../utils/export";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const AuditLogs = () => {
  const { data, loading, error } = useApi("/audit");
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return data.filter((log) => {
      const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;
      const matchesSearch =
        !query ||
        [
          log.summary,
          log.actorName,
          log.actionType,
          log.entityType,
          log.entityLabel,
          log.targetStudentId?.name,
          log.targetLeadId?.name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesEntity && matchesSearch;
    });
  }, [data, entityFilter, searchTerm]);

  const entityOptions = useMemo(
    () => Array.from(new Set(data.map((item) => item.entityType).filter(Boolean))).sort(),
    [data]
  );

  const {
    currentPage,
    endItem,
    paginatedItems,
    resetPage,
    rowsPerPage,
    setCurrentPage,
    setRowsPerPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(filteredLogs);

  useEffect(() => {
    resetPage();
  }, [entityFilter, resetPage, searchTerm]);

  const handleExport = (format) => {
    const rows = filteredLogs.map((log) => ({
      Time: formatDateTime(log.createdAt),
      Actor: `${log.actorName} (${log.actorRole})`,
      Entity: log.entityType,
      Action: log.actionType,
      Summary: log.summary,
      Student: log.targetStudentId?.name || "",
      Lead: log.targetLeadId?.name || "",
    }));

    if (!rows.length) {
      toast.info("No audit logs to export");
      return;
    }

    if (format === "csv") {
      downloadCsv("crm-audit-logs", rows);
      return;
    }

    downloadPdf({
      filename: "crm-audit-logs",
      title: "CRM Audit Logs",
      columns: ["Time", "Actor", "Entity", "Action", "Summary", "Student", "Lead"],
      rows: rows.map((row) => [
        row.Time,
        row.Actor,
        row.Entity,
        row.Action,
        row.Summary,
        row.Student,
        row.Lead,
      ]),
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Governance
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              Audit Logs
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Track who changed what and when across leads, documents, meetings, invoices, and more.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search audit logs"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
          <select
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">All entities</option>
            {entityOptions.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!loading && filteredLogs.length ? (
        <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
          <Pagination
            currentPage={currentPage}
            endItem={endItem}
            itemLabel="logs"
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
            rowsPerPage={rowsPerPage}
            startItem={startItem}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        </div>
      ) : null}

      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
            </div>
          ))
        ) : paginatedItems.length ? (
          paginatedItems.map((log) => (
            <div
              key={log._id}
              className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                      {log.entityType}
                    </span>
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-600">
                      {log.actionType}
                    </span>
                  </div>
                  <h3 className="mt-3 font-heading text-lg font-semibold text-gray-900">
                    {log.summary}
                  </h3>
                  <div className="mt-3 grid gap-2 text-sm text-gray-500 md:grid-cols-2">
                    <p>Actor: {log.actorName} ({log.actorRole})</p>
                    <p>When: {formatDateTime(log.createdAt)}</p>
                    <p>Entity Label: {log.entityLabel || "Not set"}</p>
                    <p>Student: {log.targetStudentId?.name || "Not linked"}</p>
                    <p>Lead: {log.targetLeadId?.name || "Not linked"}</p>
                  </div>

                  {Object.keys(log.changes || {}).length ? (
                    <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                        Changes
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {Object.entries(log.changes).map(([key, value]) => (
                          <div key={key} className="rounded-2xl border border-gray-100 bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                              {key}
                            </p>
                            <p className="mt-2 text-sm text-gray-700">{formatValue(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {Object.keys(log.metadata || {}).length ? (
                    <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                        Metadata
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key} className="rounded-2xl border border-gray-100 bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                              {key}
                            </p>
                            <p className="mt-2 text-sm text-gray-700">{formatValue(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineClipboardDocumentList className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No audit logs found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Audit entries will appear here as your team works in the CRM.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
