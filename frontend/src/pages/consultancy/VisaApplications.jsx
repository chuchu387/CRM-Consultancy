import { useEffect, useMemo, useState } from "react";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../../api/axios";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import StatusTimeline from "../../components/StatusTimeline";
import useApi from "../../hooks/useApi";
import usePagination from "../../hooks/usePagination";
import { formatDateTime } from "../../utils/date";
import { downloadCsv, downloadPdf } from "../../utils/export";
import { VISA_STATUS_OPTIONS } from "../../utils/status";

const VisaApplications = () => {
  const { data: visas, loading, error, refetch } = useApi("/visa");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVisa, setSelectedVisa] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: "", note: "" });
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filteredVisas = useMemo(() => {
    if (statusFilter === "all") {
      return visas;
    }

    return visas.filter((visa) => visa.status === statusFilter);
  }, [statusFilter, visas]);

  const {
    currentPage,
    endItem,
    paginatedItems: paginatedVisas,
    resetPage,
    rowsPerPage,
    setCurrentPage,
    setRowsPerPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(filteredVisas);

  useEffect(() => {
    resetPage();
  }, [resetPage, statusFilter]);

  const openDetailModal = (visa) => {
    setSelectedVisa(visa);
    setStatusForm({ status: visa.status, note: "" });
    setValidationErrors({});
  };

  const handleExport = (type) => {
    if (!filteredVisas.length) {
      toast.info("No visa records to export");
      return;
    }

    const rows = filteredVisas.map((visa) => ({
      Student: visa.studentId?.name || "",
      Email: visa.studentId?.email || "",
      Country: visa.country,
      VisaType: visa.visaType,
      Status: visa.status,
      Updated: formatDateTime(visa.updatedAt),
    }));

    if (type === "csv") {
      downloadCsv("visa-applications", rows);
      return;
    }

    downloadPdf({
      filename: "visa-applications",
      title: "Visa Applications",
      columns: ["Student", "Email", "Country", "Visa Type", "Status", "Updated"],
      rows: rows.map((visa) => [
        visa.Student,
        visa.Email,
        visa.Country,
        visa.VisaType,
        visa.Status,
        visa.Updated,
      ]),
    });
  };

  const handleUpdateStatus = async (event) => {
    event.preventDefault();

    if (!statusForm.status) {
      setValidationErrors({ status: "Please choose a status" });
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.patch(`/visa/${selectedVisa._id}/status`, {
        status: statusForm.status,
        note: statusForm.note.trim(),
      });
      toast.success(response.data.message || "Visa status updated");
      setSelectedVisa(response.data.data);
      setStatusForm((current) => ({ ...current, note: "" }));
      refetch();
    } catch (updateError) {
      toast.error(updateError.response?.data?.message || "Unable to update visa status");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Global Visa Queue
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              All visa applications
            </h2>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 lg:w-64"
            >
              <option value="all">All statuses</option>
              {VISA_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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

      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        {!loading && filteredVisas.length ? (
          <Pagination
            currentPage={currentPage}
            endItem={endItem}
            itemLabel="visa applications"
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
            rowsPerPage={rowsPerPage}
            startItem={startItem}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Student Name", "Country", "Visa Type", "Current Status", "Last Updated"].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-gray-500"
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 5 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-5">
                        <div className="h-4 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredVisas.length ? (
                paginatedVisas.map((visa) => (
                  <tr
                    key={visa._id}
                    onClick={() => openDetailModal(visa)}
                    className="cursor-pointer transition hover:bg-blue-50/50"
                  >
                    <td className="px-6 py-5 font-semibold text-gray-900">
                      {visa.studentId?.name || "Student"}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">{visa.country}</td>
                    <td className="px-6 py-5 text-sm text-gray-600">{visa.visaType}</td>
                    <td className="px-6 py-5">
                      <StatusBadge status={visa.status} />
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">
                      {formatDateTime(visa.updatedAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="rounded-3xl bg-blue-50 p-4 text-blue-600">
                        <HiOutlineClipboardDocumentList className="h-8 w-8" />
                      </div>
                      <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
                        No visa applications found
                      </h3>
                      <p className="mt-2 max-w-md text-sm text-gray-500">
                        No records matched the current filter. Try a different status or create a
                        new application from the student detail page.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      <Modal
        isOpen={Boolean(selectedVisa)}
        onClose={() => setSelectedVisa(null)}
        title="Visa Application Details"
        size="lg"
      >
        {selectedVisa ? (
          <div className="space-y-8">
            <div className="grid gap-4 rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Student
                </p>
                <p className="mt-2 font-semibold text-gray-900">{selectedVisa.studentId?.name}</p>
                <p className="mt-1 text-sm text-gray-500">{selectedVisa.studentId?.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Application
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  {selectedVisa.country} • {selectedVisa.visaType}
                </p>
                <div className="mt-3">
                  <StatusBadge status={selectedVisa.status} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-heading text-xl font-semibold text-gray-900">Status timeline</h3>
              <div className="mt-4">
                <StatusTimeline history={selectedVisa.statusHistory || []} />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5">
              <h3 className="font-heading text-xl font-semibold text-gray-900">Update status</h3>
              <form onSubmit={handleUpdateStatus} className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Status</label>
                  <select
                    value={statusForm.status}
                    onChange={(event) =>
                      setStatusForm((current) => ({ ...current, status: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  >
                    {VISA_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {validationErrors.status ? (
                    <p className="mt-2 text-sm text-rose-600">{validationErrors.status}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Note</label>
                  <textarea
                    rows="4"
                    value={statusForm.note}
                    onChange={(event) =>
                      setStatusForm((current) => ({ ...current, note: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {submitting ? "Saving..." : "Update Status"}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default VisaApplications;
