const ActivityLog = require("../models/ActivityLog");
const { logAuditEvent } = require("./audit");

const logStudentActivity = async ({
  studentId,
  actor,
  actionType,
  entityType,
  entityId = "",
  message,
  metadata = {},
}) => {
  if (!studentId || !actor?.id || !message) {
    return null;
  }

  const activity = await ActivityLog.create({
    studentId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    actionType,
    entityType,
    entityId: entityId ? String(entityId) : "",
    message,
    metadata,
  });

  await logAuditEvent({
    actor,
    actionType,
    entityType,
    entityId,
    entityLabel: message,
    summary: message,
    targetStudentId: studentId,
    metadata,
  });

  return activity;
};

module.exports = {
  logStudentActivity,
};
