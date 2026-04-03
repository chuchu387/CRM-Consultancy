const ActivityLog = require("../models/ActivityLog");

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

  return ActivityLog.create({
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
};

module.exports = {
  logStudentActivity,
};
