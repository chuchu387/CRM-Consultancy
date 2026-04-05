const AuditLog = require("../models/AuditLog");
const DocumentRequest = require("../models/DocumentRequest");
const Invoice = require("../models/Invoice");
const Lead = require("../models/Lead");
const Meeting = require("../models/Meeting");
const ReminderLog = require("../models/ReminderLog");
const UniversityApplication = require("../models/UniversityApplication");
const VisaApplication = require("../models/VisaApplication");

const CLOSED_LEAD_STATUSES = ["converted", "lost"];

const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const buildStatusBreakdown = (items, field) => {
  const totals = items.reduce((accumulator, item) => {
    const status = String(item?.[field] || "unknown");
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(totals)
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count);
};

const getReportsOverview = async (req, res, next) => {
  try {
    const monthStart = startOfCurrentMonth();

    const [leads, documents, meetings, invoices, visas, universityApplications, recentAuditLogs, recentReminders] =
      await Promise.all([
        Lead.find()
          .populate("assignedTo", "name email")
          .sort({ updatedAt: -1 }),
        DocumentRequest.find()
          .populate("studentId", "name email phone")
          .sort({ createdAt: -1 }),
        Meeting.find()
          .populate("studentId", "name email phone")
          .sort({ proposedDate: 1 }),
        Invoice.find()
          .populate("studentId", "name email phone")
          .populate("createdBy", "name email")
          .sort({ createdAt: -1 }),
        VisaApplication.find()
          .populate("studentId", "name email")
          .sort({ updatedAt: -1 }),
        UniversityApplication.find()
          .populate("studentId", "name email")
          .sort({ updatedAt: -1 }),
        AuditLog.find()
          .sort({ createdAt: -1 })
          .limit(15),
        ReminderLog.find()
          .populate("createdBy", "name email")
          .sort({ createdAt: -1 })
          .limit(15),
      ]);

    const now = new Date();

    const followUpsDue = leads
      .filter(
        (lead) => lead.followUpDate && !CLOSED_LEAD_STATUSES.includes(lead.status)
      )
      .sort((left, right) => new Date(left.followUpDate) - new Date(right.followUpDate));

    const pendingDocuments = documents.filter((document) =>
      ["pending", "uploaded", "changes_requested", "rejected"].includes(document.status)
    );

    const upcomingMeetings = meetings
      .filter((meeting) => {
        const meetingDate = new Date(meeting.confirmedDate || meeting.proposedDate || 0);
        return (
          !["completed", "rejected"].includes(meeting.status) &&
          !Number.isNaN(meetingDate.getTime()) &&
          meetingDate >= now
        );
      })
      .sort(
        (left, right) =>
          new Date(left.confirmedDate || left.proposedDate || 0).getTime() -
          new Date(right.confirmedDate || right.proposedDate || 0).getTime()
      );

    const overdueInvoices = invoices.filter((invoice) => invoice.status === "overdue");
    const approvedDocuments = documents.filter((document) => document.status === "approved");
    const convertedThisMonth = leads.filter(
      (lead) => lead.status === "converted" && lead.convertedAt && new Date(lead.convertedAt) >= monthStart
    );

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          conversionsThisMonth: convertedThisMonth.length,
          pendingDocuments: pendingDocuments.length,
          approvedDocuments: approvedDocuments.length,
          overdueInvoices: overdueInvoices.length,
          followUpsDue: followUpsDue.length,
          upcomingMeetings: upcomingMeetings.length,
          remindersSent: recentReminders.length,
        },
        breakdowns: {
          leadStatuses: buildStatusBreakdown(leads, "status"),
          documentStatuses: buildStatusBreakdown(documents, "status"),
          invoiceStatuses: buildStatusBreakdown(invoices, "status"),
          visaStatuses: buildStatusBreakdown(visas, "status"),
          universityStatuses: buildStatusBreakdown(universityApplications, "applicationStatus"),
        },
        lists: {
          followUpsDue: followUpsDue.slice(0, 25),
          pendingDocuments: pendingDocuments.slice(0, 25),
          upcomingMeetings: upcomingMeetings.slice(0, 25),
          overdueInvoices: overdueInvoices.slice(0, 25),
          recentConversions: convertedThisMonth
            .sort((left, right) => new Date(right.convertedAt || 0) - new Date(left.convertedAt || 0))
            .slice(0, 20),
          recentAuditLogs,
          recentReminders,
        },
      },
      message: "Reports overview retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getReportsOverview,
};
