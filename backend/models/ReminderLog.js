const mongoose = require("mongoose");

const reminderLogSchema = new mongoose.Schema({
  channel: {
    type: String,
    enum: ["email", "whatsapp"],
    required: true,
  },
  reminderType: {
    type: String,
    enum: ["lead_follow_up", "meeting", "pending_document", "bulk"],
    default: "bulk",
  },
  entityType: {
    type: String,
    default: "",
    trim: true,
  },
  entityId: {
    type: String,
    default: "",
    trim: true,
  },
  entityLabel: {
    type: String,
    default: "",
    trim: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
    default: null,
  },
  recipientName: {
    type: String,
    required: true,
    trim: true,
  },
  recipientEmail: {
    type: String,
    default: "",
    trim: true,
    lowercase: true,
  },
  recipientPhone: {
    type: String,
    default: "",
    trim: true,
  },
  subject: {
    type: String,
    default: "",
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

reminderLogSchema.index({ createdAt: -1 });
reminderLogSchema.index({ reminderType: 1, createdAt: -1 });
reminderLogSchema.index({ studentId: 1, createdAt: -1 });
reminderLogSchema.index({ leadId: 1, createdAt: -1 });

module.exports = mongoose.model("ReminderLog", reminderLogSchema);
