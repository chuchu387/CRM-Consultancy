import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineArrowDownTray,
  HiOutlinePrinter,
  HiOutlineReceiptPercent,
} from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../../api/axios";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import StudentSummaryCard from "../../components/StudentSummaryCard";
import { useAuth } from "../../context/AuthContext";
import useApi from "../../hooks/useApi";
import usePagination from "../../hooks/usePagination";
import { formatDateTime } from "../../utils/date";
import { downloadInvoicePdf, printInvoiceDocument } from "../../utils/invoiceDocument";

const initialInvoiceForm = {
  studentId: "",
  dueDate: "",
  discount: 0,
  notes: "",
  items: [{ label: "", amount: "" }],
};

const initialPaymentForm = {
  amount: "",
  method: "Bank Transfer",
  note: "",
};

const Invoices = () => {
  const { user } = useAuth();
  const { data: invoices, loading, error, refetch } = useApi("/invoices");
  const { data: students } = useApi("/users/students");
  const [statusFilter, setStatusFilter] = useState("all");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [invoiceForm, setInvoiceForm] = useState(initialInvoiceForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filteredInvoices = useMemo(() => {
    if (statusFilter === "all") {
      return invoices;
    }
    return invoices.filter((invoice) => invoice.status === statusFilter);
  }, [invoices, statusFilter]);

  const studentGroups = useMemo(() => {
    const groups = filteredInvoices.reduce((collection, invoice) => {
      const studentId = invoice.studentId?._id || invoice.studentId || "unknown";

      if (!collection[studentId]) {
        collection[studentId] = {
          studentId,
          studentName: invoice.studentId?.name || "Student",
          studentEmail: invoice.studentId?.email || "",
          invoices: [],
        };
      }

      collection[studentId].invoices.push(invoice);
      return collection;
    }, {});

    return Object.values(groups)
      .map((group) => {
        const sortedInvoices = [...group.invoices].sort(
          (a, b) => new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime()
        );

        return {
          ...group,
          invoices: sortedInvoices,
          totalInvoices: sortedInvoices.length,
          totalBilled: sortedInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
          totalPaid: sortedInvoices.reduce(
            (sum, invoice) => sum + Number(invoice.amountPaid || 0),
            0
          ),
          totalBalance: sortedInvoices.reduce(
            (sum, invoice) => sum + Number(invoice.balanceDue || 0),
            0
          ),
          overdueCount: sortedInvoices.filter((invoice) => invoice.status === "overdue").length,
          latestDueDate: sortedInvoices[0]?.dueDate || null,
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredInvoices]);

  const selectedStudentGroup = useMemo(
    () => studentGroups.find((group) => group.studentId === selectedStudentId) || null,
    [selectedStudentId, studentGroups]
  );

  const {
    currentPage,
    endItem,
    paginatedItems: paginatedStudentGroups,
    resetPage,
    rowsPerPage,
    setCurrentPage,
    setRowsPerPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(studentGroups);

  useEffect(() => {
    resetPage();
  }, [resetPage, statusFilter]);

  const handleDownloadInvoice = useCallback(
    (invoice, group) => {
      downloadInvoicePdf({
        invoice,
        studentName: group?.studentName,
        studentEmail: group?.studentEmail,
        consultancyName: invoice?.createdBy?.name || user?.name || "Consultancy CRM",
      });
    },
    [user?.name]
  );

  const handlePrintInvoice = useCallback(
    (invoice, group) => {
      try {
        printInvoiceDocument({
          invoice,
          studentName: group?.studentName,
          studentEmail: group?.studentEmail,
          consultancyName: invoice?.createdBy?.name || user?.name || "Consultancy CRM",
        });
      } catch (printError) {
        toast.error(printError.message || "Unable to open the print dialog");
      }
    },
    [user?.name]
  );

  const resetInvoiceForm = () => {
    setInvoiceForm(initialInvoiceForm);
    setValidationErrors({});
  };

  const updateLineItem = (index, field, value) => {
    setInvoiceForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addLineItem = () => {
    setInvoiceForm((current) => ({
      ...current,
      items: [...current.items, { label: "", amount: "" }],
    }));
  };

  const removeLineItem = (index) => {
    setInvoiceForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleCreateInvoice = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!invoiceForm.studentId) nextErrors.studentId = "Student is required";
    if (!invoiceForm.dueDate) nextErrors.dueDate = "Due date is required";
    invoiceForm.items.forEach((item, index) => {
      if (!item.label.trim()) nextErrors[`label-${index}`] = "Label is required";
      if (!item.amount || Number(item.amount) < 0) nextErrors[`amount-${index}`] = "Amount is required";
    });

    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting("invoice");

    try {
      await api.post("/invoices", {
        studentId: invoiceForm.studentId,
        dueDate: invoiceForm.dueDate,
        discount: Number(invoiceForm.discount || 0),
        notes: invoiceForm.notes.trim(),
        items: invoiceForm.items.map((item) => ({
          label: item.label.trim(),
          amount: Number(item.amount),
        })),
      });
      toast.success("Invoice created");
      setInvoiceModalOpen(false);
      resetInvoiceForm();
      refetch();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to create invoice");
    } finally {
      setSubmitting("");
    }
  };

  const handleAddPayment = async (event) => {
    event.preventDefault();

    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setValidationErrors({ paymentAmount: "Valid amount is required" });
      return;
    }

    setSubmitting("payment");

    try {
      await api.post(`/invoices/${selectedInvoice._id}/payments`, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        note: paymentForm.note.trim(),
      });
      toast.success("Payment recorded");
      setPaymentModalOpen(false);
      setSelectedInvoice(null);
      setPaymentForm(initialPaymentForm);
      setValidationErrors({});
      refetch();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to record payment");
    } finally {
      setSubmitting("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Billing Desk
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">Invoices</h2>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <button
              type="button"
              onClick={() => setInvoiceModalOpen(true)}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + New Invoice
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {!loading && filteredInvoices.length ? (
          <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
            <Pagination
              currentPage={currentPage}
              endItem={endItem}
              itemLabel="students"
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
              rowsPerPage={rowsPerPage}
              startItem={startItem}
              totalItems={totalItems}
              totalPages={totalPages}
            />
          </div>
        ) : null}

        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-4 w-44 animate-pulse rounded bg-gray-200" />
            </div>
          ))
        ) : studentGroups.length ? (
          paginatedStudentGroups.map((group) => (
            <StudentSummaryCard
              key={group.studentId}
              name={group.studentName}
              email={group.studentEmail}
              meta={`Next due ${formatDateTime(group.latestDueDate, "No due date")}`}
              stats={[
                { label: "Invoices", value: group.totalInvoices },
                { label: "Total", value: group.totalBilled.toFixed(2), tone: "blue" },
                { label: "Paid", value: group.totalPaid.toFixed(2), tone: "emerald" },
                { label: "Balance", value: group.totalBalance.toFixed(2), tone: "rose" },
              ]}
              updatedText={`Overdue ${group.overdueCount}`}
              onAction={() => setSelectedStudentId(group.studentId)}
            >
              {group.overdueCount ? <StatusBadge status="overdue" compact /> : null}
            </StudentSummaryCard>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineReceiptPercent className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No invoices found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Issue invoices, record payments, and monitor balances from one place.
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedStudentGroup)}
        onClose={() => setSelectedStudentId("")}
        title="Student Invoices"
        size="lg"
      >
        {selectedStudentGroup ? (
          <div className="space-y-5">
            <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Student
                  </p>
                  <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
                    {selectedStudentGroup.studentName}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedStudentGroup.studentEmail || "No email"}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Invoices
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {selectedStudentGroup.totalInvoices}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Total
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-blue-700">
                      {selectedStudentGroup.totalBilled.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Paid
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-700">
                      {selectedStudentGroup.totalPaid.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Balance
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-rose-700">
                      {selectedStudentGroup.totalBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {selectedStudentGroup.invoices.map((invoice) => (
                <div
                  key={invoice._id}
                  className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-heading text-xl font-semibold text-gray-900">
                          {invoice.invoiceNumber}
                        </h4>
                        <StatusBadge status={invoice.status} />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        Due {formatDateTime(invoice.dueDate)}
                      </p>
                      <div className="mt-4 grid gap-2 text-sm text-gray-500 md:grid-cols-3">
                        <p>Total: {Number(invoice.total || 0).toFixed(2)}</p>
                        <p>Paid: {Number(invoice.amountPaid || 0).toFixed(2)}</p>
                        <p>Balance: {Number(invoice.balanceDue || 0).toFixed(2)}</p>
                      </div>
                      <div className="mt-4 space-y-2">
                        {invoice.items.map((item, index) => (
                          <div
                            key={`${invoice._id}-${index}`}
                            className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-600"
                          >
                            {item.label} • {Number(item.amount).toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(invoice, selectedStudentGroup)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <HiOutlineArrowDownTray className="h-4 w-4" />
                        Download PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintInvoice(invoice, selectedStudentGroup)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <HiOutlinePrinter className="h-4 w-4" />
                        Print
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentId("");
                          setSelectedInvoice(invoice);
                          setValidationErrors({});
                          setPaymentModalOpen(true);
                        }}
                        className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Add Payment
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          resetInvoiceForm();
        }}
        title="Create Invoice"
        size="lg"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Student</label>
              <select
                value={invoiceForm.studentId}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, studentId: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name}
                  </option>
                ))}
              </select>
              {validationErrors.studentId ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.studentId}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Due Date</label>
              <input
                type="datetime-local"
                value={invoiceForm.dueDate}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {validationErrors.dueDate ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.dueDate}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-xl font-semibold text-gray-900">Line Items</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                + Add Item
              </button>
            </div>

            {invoiceForm.items.map((item, index) => (
              <div key={`invoice-item-${index}`} className="grid gap-4 rounded-3xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-[1fr_180px_auto]">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Label</label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(event) => updateLineItem(index, "label", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                  {validationErrors[`label-${index}`] ? (
                    <p className="mt-2 text-sm text-rose-600">
                      {validationErrors[`label-${index}`]}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(event) => updateLineItem(index, "amount", event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                  {validationErrors[`amount-${index}`] ? (
                    <p className="mt-2 text-sm text-rose-600">
                      {validationErrors[`amount-${index}`]}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-end">
                  {invoiceForm.items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="rounded-2xl bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Discount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={invoiceForm.discount}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, discount: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Notes</label>
              <textarea
                rows="3"
                value={invoiceForm.notes}
                onChange={(event) =>
                  setInvoiceForm((current) => ({ ...current, notes: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting === "invoice"}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting === "invoice" ? "Creating..." : "Create Invoice"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedInvoice(null);
          setPaymentForm(initialPaymentForm);
          setValidationErrors({});
        }}
        title="Record Payment"
      >
        <form onSubmit={handleAddPayment} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentForm.amount}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, amount: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {validationErrors.paymentAmount ? (
              <p className="mt-2 text-sm text-rose-600">{validationErrors.paymentAmount}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Method</label>
            <select
              value={paymentForm.method}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, method: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Online Payment">Online Payment</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Note</label>
            <textarea
              rows="3"
              value={paymentForm.note}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, note: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <button
            type="submit"
            disabled={submitting === "payment"}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting === "payment" ? "Saving..." : "Record Payment"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Invoices;
