const ReminderLog = require("../models/ReminderLog");
const { logAuditEvent } = require("../utils/audit");

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");
const encode = (value) => encodeURIComponent(String(value || ""));

const normalizePhoneForWhatsApp = (value) => String(value || "").replace(/[^\d]/g, "");

const buildDispatchUrl = ({ channel, recipientEmail, recipientPhone, subject, message }) => {
  if (channel === "email") {
    return `mailto:${encode(recipientEmail)}?subject=${encode(subject)}&body=${encode(message)}`;
  }

  const normalizedPhone = normalizePhoneForWhatsApp(recipientPhone);
  return `https://wa.me/${normalizedPhone}?text=${encode(message)}`;
};

const dispatchReminders = async (req, res, next) => {
  try {
    const channel = normalizeString(req.body.channel).toLowerCase();
    const reminders = Array.isArray(req.body.reminders) ? req.body.reminders : [];

    if (!["email", "whatsapp"].includes(channel)) {
      return res.status(400).json({
        success: false,
        message: "Reminder channel is invalid",
      });
    }

    if (!reminders.length) {
      return res.status(400).json({
        success: false,
        message: "At least one reminder target is required",
      });
    }

    const normalizedReminders = reminders
      .map((reminder) => ({
        reminderType: normalizeString(reminder.reminderType || "bulk"),
        entityType: normalizeString(reminder.entityType),
        entityId: reminder.entityId ? String(reminder.entityId) : "",
        entityLabel: normalizeString(reminder.entityLabel),
        studentId: reminder.studentId || null,
        leadId: reminder.leadId || null,
        recipientName: normalizeString(reminder.recipientName),
        recipientEmail: normalizeString(reminder.recipientEmail).toLowerCase(),
        recipientPhone: normalizeString(reminder.recipientPhone),
        subject: normalizeString(reminder.subject),
        message: normalizeString(reminder.message),
      }))
      .filter((reminder) => reminder.recipientName && reminder.message);

    if (!normalizedReminders.length) {
      return res.status(400).json({
        success: false,
        message: "Reminder recipient name and message are required",
      });
    }

    const invalidRecipient = normalizedReminders.find((reminder) =>
      channel === "email" ? !reminder.recipientEmail : !normalizePhoneForWhatsApp(reminder.recipientPhone)
    );

    if (invalidRecipient) {
      return res.status(400).json({
        success: false,
        message:
          channel === "email"
            ? "Each email reminder needs a valid recipient email"
            : "Each WhatsApp reminder needs a valid recipient phone number",
      });
    }

    const createdLogs = await ReminderLog.insertMany(
      normalizedReminders.map((reminder) => ({
        channel,
        reminderType: reminder.reminderType || "bulk",
        entityType: reminder.entityType,
        entityId: reminder.entityId,
        entityLabel: reminder.entityLabel,
        studentId: reminder.studentId,
        leadId: reminder.leadId,
        recipientName: reminder.recipientName,
        recipientEmail: reminder.recipientEmail,
        recipientPhone: reminder.recipientPhone,
        subject: reminder.subject,
        message: reminder.message,
        createdBy: req.user.id,
      }))
    );

    await Promise.all(
      createdLogs.map((reminderLog, index) =>
        logAuditEvent({
          actor: req.user,
          actionType: "reminder_sent",
          entityType: normalizedReminders[index].entityType || "reminder",
          entityId: normalizedReminders[index].entityId || reminderLog._id,
          entityLabel: normalizedReminders[index].entityLabel,
          summary: `${channel === "email" ? "Email" : "WhatsApp"} reminder sent to ${
            normalizedReminders[index].recipientName
          }`,
          targetStudentId: normalizedReminders[index].studentId,
          targetLeadId: normalizedReminders[index].leadId,
          metadata: {
            channel,
            reminderType: normalizedReminders[index].reminderType,
            recipientEmail: normalizedReminders[index].recipientEmail,
            recipientPhone: normalizedReminders[index].recipientPhone,
            subject: normalizedReminders[index].subject,
          },
        })
      )
    );

    const dispatches = normalizedReminders.map((reminder, index) => ({
      id: createdLogs[index]._id,
      recipientName: reminder.recipientName,
      channel,
      url: buildDispatchUrl({
        channel,
        recipientEmail: reminder.recipientEmail,
        recipientPhone: reminder.recipientPhone,
        subject: reminder.subject,
        message: reminder.message,
      }),
    }));

    const canUseCombinedEmail =
      channel === "email" &&
      dispatches.length > 1 &&
      new Set(normalizedReminders.map((reminder) => `${reminder.subject}||${reminder.message}`)).size === 1;

    const combinedDispatchUrl = canUseCombinedEmail
      ? `mailto:?bcc=${encode(
          normalizedReminders.map((reminder) => reminder.recipientEmail).join(",")
        )}&subject=${encode(normalizedReminders[0].subject)}&body=${encode(
          normalizedReminders[0].message
        )}`
      : "";

    return res.status(201).json({
      success: true,
      data: {
        dispatches,
        combinedDispatchUrl,
      },
      message: `Prepared ${dispatches.length} reminder${dispatches.length === 1 ? "" : "s"}`,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  dispatchReminders,
};
