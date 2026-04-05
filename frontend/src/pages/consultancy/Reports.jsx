import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineBellAlert,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineReceiptPercent,
  HiOutlineUsers,
} from "react-icons/hi2";
import { toast } from "react-toastify";

import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import useApi from "../../hooks/useApi";
import { formatDateTime } from "../../utils/date";
import { downloadCsv, downloadPdf } from "../../utils/export";
import { formatLeadStatus } from "../../utils/lead";
import { dispatchReminderBatch, launchReminderDispatch } from "../../utils/reminders";

const defaultReportData = {
  metrics: {
    conversionsThisMonth: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    overdueInvoices: 0,
    followUpsDue: 0,
    upcomingMeetings: 0,
    remindersSent: 0,
  },
  breakdowns: {
    leadStatuses: [],
    documentStatuses: [],
    invoiceStatuses: [],
    visaStatuses: [],
    universityStatuses: [],
  },
  lists: {
    followUpsDue: [],
    pendingDocuments: [],
    upcomingMeetings: [],
    overdueInvoices: [],
    recentConversions: [],
    recentAuditLogs: [],
    recentReminders: [],
  },
};

const BreakdownCard = ({ title, items, formatter = (value) => value }) => {
  const maximum = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="font-heading text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.status}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-medium text-gray-700">{formatter(item.status)}</p>
                <p className="text-gray-500">{item.count}</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${(item.count / maximum) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
            No data available.
          </div>
        )}
      </div>
    </div>
  );
};

const ReminderSection = ({
  title,
  description,
  records,
  selectedIds,
  onToggle,
  onToggleAll,
  emptyMessage,
  bulkActions,
  renderPrimary,
  renderSecondary,
  renderStatus,
  renderActions,
}) => (
  <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h3 className="font-heading text-xl font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>
      {records.length ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleAll}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            {selectedIds.length === records.length ? "Clear Page" : "Select Page"}
          </button>
          {bulkActions}
        </div>
      ) : null}
    </div>

    <div className="mt-5 space-y-3">
      {records.length ? (
        records.map((record) => (
          <div
            key={record._id}
            className="grid gap-4 rounded-3xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-[auto_1fr_auto]"
          >
            <label className="mt-1 flex items-start">
              <input
                type="checkbox"
                checked={selectedIds.includes(record._id)}
                onChange={() => onToggle(record._id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
            <div className="min-w-0">
              {renderPrimary(record)}
              {renderSecondary(record)}
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              {renderStatus(record)}
              <div className="flex flex-wrap gap-2">{renderActions(record)}</div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
          {emptyMessage}
        </div>
      )}
    </div>
  </section>
);

const Reports = () => {
  const { user } = useAuth();
  const { data, loading, error } = useApi("/reports/overview");
  const [selectedFollowUpIds, setSelectedFollowUpIds] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState([]);
  const [reminderLoading, setReminderLoading] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const reportData = useMemo(
    () => (data?.metrics ? data : defaultReportData),
    [data]
  );
  const consultancyName = user?.name || "Consultancy CRM";

  const toggleSelection = (setter, id) => {
    setter((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]
    );
  };

  const togglePageSelection = (records, selectedIds, setter) => {
    const recordIds = records.map((record) => record._id);
    const allSelected = recordIds.every((recordId) => selectedIds.includes(recordId));

    setter((current) =>
      allSelected
        ? current.filter((recordId) => !recordIds.includes(recordId))
        : Array.from(new Set([...current, ...recordIds]))
    );
  };

  const buildLeadReminder = (lead, generic = false) => ({
    reminderType: "lead_follow_up",
    entityType: "lead",
    entityId: lead._id,
    entityLabel: lead.name,
    leadId: lead._id,
    recipientName: lead.name,
    recipientEmail: lead.email || "",
    recipientPhone: lead.phone || "",
    subject: `Follow-up reminder from ${consultancyName}`,
    message: generic
      ? `Hello,\n\nThis is a follow-up reminder from ${consultancyName}. Please connect with our consultancy team regarding your study inquiry.\n\nThank you.`
      : `Hello ${lead.name},\n\nThis is a reminder from ${consultancyName} regarding your follow-up${
          lead.interestedCourse ? ` for ${lead.interestedCourse}` : ""
        }. Please connect with us${
          lead.followUpDate ? ` by ${formatDateTime(lead.followUpDate)}` : " when convenient"
        }.\n\nThank you.`,
  });

  const buildDocumentReminder = (document, generic = false) => ({
    reminderType: "pending_document",
    entityType: "document_request",
    entityId: document._id,
    entityLabel: document.documentName,
    studentId: document.studentId?._id || document.studentId,
    recipientName: document.studentId?.name || "Student",
    recipientEmail: document.studentId?.email || "",
    recipientPhone: document.studentId?.phone || "",
    subject: `Pending document reminder from ${consultancyName}`,
    message: generic
      ? `Hello,\n\nThis is a reminder from ${consultancyName} to upload your pending required documents in the student portal.\n\nThank you.`
      : `Hello ${document.studentId?.name || "Student"},\n\nThis is a reminder from ${consultancyName} to upload your pending document: ${
          document.documentName
        }. Please submit it through your student portal at your earliest convenience.\n\nThank you.`,
  });

  const buildMeetingReminder = (meeting, generic = false) => ({
    reminderType: "meeting",
    entityType: "meeting",
    entityId: meeting._id,
    entityLabel: meeting.title,
    studentId: meeting.studentId?._id || meeting.studentId,
    recipientName: meeting.studentId?.name || "Student",
    recipientEmail: meeting.studentId?.email || "",
    recipientPhone: meeting.studentId?.phone || "",
    subject: `Meeting reminder from ${consultancyName}`,
    message: generic
      ? `Hello,\n\nThis is a reminder from ${consultancyName} about your scheduled meeting with our team. Please check your portal for the latest meeting details.\n\nThank you.`
      : `Hello ${meeting.studentId?.name || "Student"},\n\nThis is a reminder from ${consultancyName} about your meeting "${
          meeting.title
        }" scheduled for ${formatDateTime(
          meeting.confirmedDate || meeting.proposedDate
        )}. Please be available on time.\n\nThank you.`,
  });

  const sendReminders = async ({ channel, records, builder, generic, loadingKey }) => {
    if (!records.length) {
      toast.info("Select at least one record first");
      return;
    }

    if (channel === "whatsapp" && records.length > 1) {
      toast.info("Bulk WhatsApp is not supported by browsers. Send WhatsApp reminders one by one.");
      return;
    }

    const reminders = records.map((record) => builder(record, generic));
    const missingRecipient = reminders.find((reminder) =>
      channel === "email" ? !reminder.recipientEmail : !reminder.recipientPhone
    );

    if (missingRecipient) {
      toast.error(
        channel === "email"
          ? "One or more selected records do not have an email address"
          : "One or more selected records do not have a phone number"
      );
      return;
    }

    setReminderLoading(loadingKey);

    try {
      const response = await dispatchReminderBatch({
        channel,
        reminders,
      });

      launchReminderDispatch({
        channel,
        dispatches: response.data?.dispatches,
        combinedDispatchUrl: response.data?.combinedDispatchUrl,
      });

      toast.success(
        response.message ||
          `${records.length} reminder${records.length === 1 ? "" : "s"} ${
            channel === "email" ? "sent" : "prepared"
          }`
      );
    } catch (dispatchError) {
      toast.error(dispatchError.response?.data?.message || dispatchError.message || "Unable to prepare reminders");
    } finally {
      setReminderLoading("");
    }
  };

  const handleExport = (format) => {
    const rows = [
      { Section: "Metrics", Label: "Conversions This Month", Value: reportData.metrics.conversionsThisMonth },
      { Section: "Metrics", Label: "Pending Documents", Value: reportData.metrics.pendingDocuments },
      { Section: "Metrics", Label: "Approved Documents", Value: reportData.metrics.approvedDocuments },
      { Section: "Metrics", Label: "Overdue Invoices", Value: reportData.metrics.overdueInvoices },
      { Section: "Metrics", Label: "Follow-Ups Due", Value: reportData.metrics.followUpsDue },
      { Section: "Metrics", Label: "Upcoming Meetings", Value: reportData.metrics.upcomingMeetings },
      { Section: "Metrics", Label: "Recent Reminders", Value: reportData.metrics.remindersSent },
      ...Object.entries(reportData.breakdowns).flatMap(([section, items]) =>
        items.map((item) => ({
          Section: section,
          Label: item.status,
          Value: item.count,
        }))
      ),
    ];

    if (format === "csv") {
      downloadCsv("crm-reports-summary", rows);
      return;
    }

    downloadPdf({
      filename: "crm-reports-summary",
      title: "CRM Reports Summary",
      columns: ["Section", "Label", "Value"],
      rows: rows.map((row) => [row.Section, row.Label, String(row.Value)]),
    });
  };

  const followUpsDue = reportData.lists.followUpsDue || [];
  const pendingDocuments = reportData.lists.pendingDocuments || [];
  const upcomingMeetings = reportData.lists.upcomingMeetings || [];
  const overdueInvoices = reportData.lists.overdueInvoices || [];

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Reporting Desk
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">Reports</h2>
            <p className="mt-2 text-sm text-gray-500">
              Track conversions, pending work, approvals, overdue invoices, and reminder activity.
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            key: "conversionsThisMonth",
            label: "Conversions This Month",
            icon: HiOutlineUsers,
            tone: "text-emerald-700",
          },
          {
            key: "pendingDocuments",
            label: "Pending Documents",
            icon: HiOutlineClipboardDocumentList,
            tone: "text-amber-700",
          },
          {
            key: "overdueInvoices",
            label: "Overdue Invoices",
            icon: HiOutlineReceiptPercent,
            tone: "text-rose-700",
          },
          {
            key: "upcomingMeetings",
            label: "Upcoming Meetings",
            icon: HiOutlineCalendarDays,
            tone: "text-blue-700",
          },
        ].map(({ key, label, icon: Icon, tone }) => (
          <div key={key} className="glass-panel p-5">
            {loading ? (
              <div className="space-y-4">
                <div className="h-10 w-10 animate-pulse rounded-2xl bg-gray-200" />
                <div className="h-8 w-24 animate-pulse rounded-xl bg-gray-200" />
                <div className="h-4 w-36 animate-pulse rounded-xl bg-gray-100" />
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <Icon className="h-6 w-6" />
                </div>
                <p className={`mt-5 text-4xl font-semibold ${tone}`}>
                  {reportData.metrics[key]}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-500">{label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BreakdownCard
          title="Lead Stage Breakdown"
          items={reportData.breakdowns.leadStatuses}
          formatter={formatLeadStatus}
        />
        <BreakdownCard title="Document Status Breakdown" items={reportData.breakdowns.documentStatuses} />
        <BreakdownCard title="Invoice Status Breakdown" items={reportData.breakdowns.invoiceStatuses} />
        <BreakdownCard title="Visa Status Breakdown" items={reportData.breakdowns.visaStatuses} />
      </div>

      <ReminderSection
        title="Follow-Ups Due"
        description="Use email or WhatsApp reminders for leads that need a response."
        records={followUpsDue}
        selectedIds={selectedFollowUpIds}
        onToggle={(id) => toggleSelection(setSelectedFollowUpIds, id)}
        onToggleAll={() =>
          togglePageSelection(followUpsDue, selectedFollowUpIds, setSelectedFollowUpIds)
        }
        emptyMessage="No lead follow-ups are pending right now."
        bulkActions={
          <button
            type="button"
            disabled={reminderLoading === "lead-email"}
            onClick={() =>
              sendReminders({
                channel: "email",
                records: followUpsDue.filter((lead) => selectedFollowUpIds.includes(lead._id)),
                builder: buildLeadReminder,
                generic: true,
                loadingKey: "lead-email",
              })
            }
            className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {reminderLoading === "lead-email" ? "Sending..." : "Email Selected"}
          </button>
        }
        renderPrimary={(lead) => (
          <>
            <p className="font-semibold text-gray-900">{lead.name}</p>
            <p className="mt-1 text-sm text-gray-500">{lead.email || lead.phone}</p>
          </>
        )}
        renderSecondary={(lead) => (
          <div className="mt-2 space-y-1 text-sm text-gray-500">
            <p>{lead.interestedCourse || "Course not added yet"}</p>
            <p>Follow-Up: {formatDateTime(lead.followUpDate, "Not scheduled")}</p>
          </div>
        )}
        renderStatus={(lead) => (
          <StatusBadge status={lead.status} label={formatLeadStatus(lead.status)} />
        )}
        renderActions={(lead) => (
          <>
            <button
              type="button"
              onClick={() =>
                sendReminders({
                  channel: "email",
                  records: [lead],
                  builder: buildLeadReminder,
                  generic: false,
                  loadingKey: `lead-email-${lead._id}`,
                })
              }
              className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Email
            </button>
            <button
              type="button"
              onClick={() =>
                sendReminders({
                  channel: "whatsapp",
                  records: [lead],
                  builder: buildLeadReminder,
                  generic: false,
                  loadingKey: `lead-wa-${lead._id}`,
                })
              }
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              WhatsApp
            </button>
          </>
        )}
      />

      <ReminderSection
        title="Pending Document Reminders"
        description="Remind students to upload or correct pending documents."
        records={pendingDocuments}
        selectedIds={selectedDocumentIds}
        onToggle={(id) => toggleSelection(setSelectedDocumentIds, id)}
        onToggleAll={() =>
          togglePageSelection(pendingDocuments, selectedDocumentIds, setSelectedDocumentIds)
        }
        emptyMessage="No pending student documents need reminders right now."
        bulkActions={
          <button
            type="button"
            disabled={reminderLoading === "document-email"}
            onClick={() =>
              sendReminders({
                channel: "email",
                records: pendingDocuments.filter((document) => selectedDocumentIds.includes(document._id)),
                builder: buildDocumentReminder,
                generic: true,
                loadingKey: "document-email",
              })
            }
            className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {reminderLoading === "document-email" ? "Sending..." : "Email Selected"}
          </button>
        }
        renderPrimary={(document) => (
          <>
            <p className="font-semibold text-gray-900">{document.documentName}</p>
            <p className="mt-1 text-sm text-gray-500">
              {document.studentId?.name || "Student"} • {document.studentId?.email || "No email"}
            </p>
          </>
        )}
        renderSecondary={(document) => (
          <div className="mt-2 space-y-1 text-sm text-gray-500">
            <p>{document.description || "No description provided"}</p>
            <p>Requested {formatDateTime(document.createdAt)}</p>
          </div>
        )}
        renderStatus={(document) => <StatusBadge status={document.status} />}
        renderActions={(document) => (
          <>
            <button
              type="button"
              onClick={() =>
                sendReminders({
                  channel: "email",
                  records: [document],
                  builder: buildDocumentReminder,
                  generic: false,
                  loadingKey: `document-email-${document._id}`,
                })
              }
              className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Email
            </button>
            <button
              type="button"
              onClick={() =>
                sendReminders({
                  channel: "whatsapp",
                  records: [document],
                  builder: buildDocumentReminder,
                  generic: false,
                  loadingKey: `document-wa-${document._id}`,
                })
              }
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              WhatsApp
            </button>
          </>
        )}
      />

      <ReminderSection
        title="Upcoming Meeting Reminders"
        description="Send reminders for upcoming scheduled meetings."
        records={upcomingMeetings}
        selectedIds={selectedMeetingIds}
        onToggle={(id) => toggleSelection(setSelectedMeetingIds, id)}
        onToggleAll={() =>
          togglePageSelection(upcomingMeetings, selectedMeetingIds, setSelectedMeetingIds)
        }
        emptyMessage="No upcoming meetings require reminders right now."
        bulkActions={
          <button
            type="button"
            disabled={reminderLoading === "meeting-email"}
            onClick={() =>
              sendReminders({
                channel: "email",
                records: upcomingMeetings.filter((meeting) => selectedMeetingIds.includes(meeting._id)),
                builder: buildMeetingReminder,
                generic: true,
                loadingKey: "meeting-email",
              })
            }
            className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {reminderLoading === "meeting-email" ? "Sending..." : "Email Selected"}
          </button>
        }
        renderPrimary={(meeting) => (
          <>
            <p className="font-semibold text-gray-900">{meeting.title}</p>
            <p className="mt-1 text-sm text-gray-500">
              {meeting.studentId?.name || "Student"} • {meeting.studentId?.email || "No email"}
            </p>
          </>
        )}
        renderSecondary={(meeting) => (
          <div className="mt-2 space-y-1 text-sm text-gray-500">
            <p>{formatDateTime(meeting.confirmedDate || meeting.proposedDate)}</p>
            <p>{meeting.note || "No meeting note added"}</p>
          </div>
        )}
        renderStatus={(meeting) => <StatusBadge status={meeting.status} />}
        renderActions={(meeting) => (
          <>
            <button
              type="button"
              onClick={() =>
                sendReminders({
                  channel: "email",
                  records: [meeting],
                  builder: buildMeetingReminder,
                  generic: false,
                  loadingKey: `meeting-email-${meeting._id}`,
                })
              }
              className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Email
            </button>
            <button
              type="button"
              onClick={() =>
                sendReminders({
                  channel: "whatsapp",
                  records: [meeting],
                  builder: buildMeetingReminder,
                  generic: false,
                  loadingKey: `meeting-wa-${meeting._id}`,
                })
              }
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              WhatsApp
            </button>
          </>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <HiOutlineReceiptPercent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold text-gray-900">
                Overdue invoices
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Students with overdue balances that need follow-up.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {overdueInvoices.length ? (
              overdueInvoices.map((invoice) => (
                <div key={invoice._id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {invoice.invoiceNumber} • {invoice.studentId?.name || "Student"}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Balance {Number(invoice.balanceDue || 0).toFixed(2)} • Due {formatDateTime(invoice.dueDate)}
                      </p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                No overdue invoices right now.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <HiOutlineBellAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold text-gray-900">
                Recent reminder activity
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Last reminder dispatches processed by the consultancy team.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {reportData.lists.recentReminders.length ? (
              reportData.lists.recentReminders.map((reminder) => (
                <div
                  key={reminder._id}
                  className="rounded-3xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900">{reminder.recipientName}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-600 ring-1 ring-inset ring-gray-200">
                        {reminder.channel}
                      </span>
                      <StatusBadge
                        status={reminder.deliveryStatus || "prepared"}
                        label={reminder.deliveryStatus || "prepared"}
                        compact
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{reminder.entityLabel || reminder.message}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gray-400">
                    {reminder.createdBy?.name || "Consultancy"} • {formatDateTime(reminder.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                Reminder history will appear here once reminders are sent.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Reports;
