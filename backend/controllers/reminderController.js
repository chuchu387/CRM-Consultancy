const ReminderLog = require("../models/ReminderLog");
const { logAuditEvent } = require("../utils/audit");
const { sendEmailWithResend } = require("../utils/email");

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");
const encode = (value) => encodeURIComponent(String(value || ""));

const normalizePhoneForWhatsApp = (value) => String(value || "").replace(/[^\d]/g, "");

const buildDispatchUrl = ({ recipientPhone, message }) => {
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

    const dispatches = [];
    let sentCount = 0;
    let failedCount = 0;
    let preparedCount = 0;

    for (const reminder of normalizedReminders) {
      const baseLog = {
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
      };

      if (channel === "email") {
        try {
          const resendResponse = await sendEmailWithResend({
            to: reminder.recipientEmail,
            subject: reminder.subject,
            message: reminder.message,
          });

          const reminderLog = await ReminderLog.create({
            ...baseLog,
            deliveryStatus: "sent",
            provider: "resend",
            providerMessageId: resendResponse?.id || "",
            deliveredAt: new Date(),
          });

          sentCount += 1;

          dispatches.push({
            id: reminderLog._id,
            recipientName: reminder.recipientName,
            channel,
            status: "sent",
            provider: "resend",
            providerMessageId: resendResponse?.id || "",
            url: "",
          });

          await logAuditEvent({
            actor: req.user,
            actionType: "reminder_sent",
            entityType: reminder.entityType || "reminder",
            entityId: reminder.entityId || reminderLog._id,
            entityLabel: reminder.entityLabel,
            summary: `Email reminder sent to ${reminder.recipientName}`,
            targetStudentId: reminder.studentId,
            targetLeadId: reminder.leadId,
            metadata: {
              channel,
              reminderType: reminder.reminderType,
              recipientEmail: reminder.recipientEmail,
              subject: reminder.subject,
              provider: "resend",
              providerMessageId: resendResponse?.id || "",
            },
          });
        } catch (emailError) {
          const reminderLog = await ReminderLog.create({
            ...baseLog,
            deliveryStatus: "failed",
            provider: "resend",
            errorMessage: emailError.message,
          });

          failedCount += 1;

          dispatches.push({
            id: reminderLog._id,
            recipientName: reminder.recipientName,
            channel,
            status: "failed",
            provider: "resend",
            errorMessage: emailError.message,
            url: "",
          });

          await logAuditEvent({
            actor: req.user,
            actionType: "reminder_failed",
            entityType: reminder.entityType || "reminder",
            entityId: reminder.entityId || reminderLog._id,
            entityLabel: reminder.entityLabel,
            summary: `Email reminder failed for ${reminder.recipientName}`,
            targetStudentId: reminder.studentId,
            targetLeadId: reminder.leadId,
            metadata: {
              channel,
              reminderType: reminder.reminderType,
              recipientEmail: reminder.recipientEmail,
              subject: reminder.subject,
              provider: "resend",
              errorMessage: emailError.message,
            },
          });
        }

        continue;
      }

      const reminderLog = await ReminderLog.create({
        ...baseLog,
        deliveryStatus: "prepared",
      });

      preparedCount += 1;

      dispatches.push({
        id: reminderLog._id,
        recipientName: reminder.recipientName,
        channel,
        status: "prepared",
        url: buildDispatchUrl({
          recipientPhone: reminder.recipientPhone,
          message: reminder.message,
        }),
      });

      await logAuditEvent({
        actor: req.user,
        actionType: "reminder_prepared",
        entityType: reminder.entityType || "reminder",
        entityId: reminder.entityId || reminderLog._id,
        entityLabel: reminder.entityLabel,
        summary: `WhatsApp reminder prepared for ${reminder.recipientName}`,
        targetStudentId: reminder.studentId,
        targetLeadId: reminder.leadId,
        metadata: {
          channel,
          reminderType: reminder.reminderType,
          recipientPhone: reminder.recipientPhone,
          subject: reminder.subject,
        },
      });
    }

    if (channel === "email" && !sentCount) {
      return res.status(502).json({
        success: false,
        data: {
          dispatches,
          combinedDispatchUrl: "",
          sentCount,
          failedCount,
          preparedCount,
        },
        message:
          dispatches.find((dispatch) => dispatch.errorMessage)?.errorMessage ||
          "Unable to send email reminders",
      });
    }

    const summaryMessage =
      channel === "email"
        ? failedCount
          ? `${sentCount} email reminder${sentCount === 1 ? "" : "s"} sent, ${failedCount} failed`
          : `${sentCount} email reminder${sentCount === 1 ? "" : "s"} sent successfully`
        : `${preparedCount} WhatsApp reminder${preparedCount === 1 ? "" : "s"} prepared`;

    return res.status(201).json({
      success: true,
      data: {
        dispatches,
        combinedDispatchUrl: "",
        sentCount,
        failedCount,
        preparedCount,
      },
      message: summaryMessage,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  dispatchReminders,
};
