const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  actorName: {
    type: String,
    required: true,
    trim: true,
  },
  actorRole: {
    type: String,
    required: true,
    trim: true,
  },
  actionType: {
    type: String,
    required: true,
    trim: true,
  },
  entityType: {
    type: String,
    required: true,
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
  summary: {
    type: String,
    required: true,
    trim: true,
  },
  targetStudentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  targetLeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
    default: null,
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ targetStudentId: 1, createdAt: -1 });
auditLogSchema.index({ targetLeadId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
