const AuditLog = require("../models/AuditLog");

const sanitizeValue = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      if (["password", "__v"].includes(key)) {
        return accumulator;
      }

      const sanitizedNestedValue = sanitizeValue(nestedValue);

      if (sanitizedNestedValue !== undefined) {
        accumulator[key] = sanitizedNestedValue;
      }

      return accumulator;
    }, {});
  }

  return value;
};

const logAuditEvent = async ({
  actor,
  actionType,
  entityType,
  entityId = "",
  entityLabel = "",
  summary,
  targetStudentId = null,
  targetLeadId = null,
  changes = {},
  metadata = {},
}) => {
  if (!actor?.id || !actionType || !entityType || !summary) {
    return null;
  }

  return AuditLog.create({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    actionType,
    entityType,
    entityId: entityId ? String(entityId) : "",
    entityLabel,
    summary,
    targetStudentId: targetStudentId || null,
    targetLeadId: targetLeadId || null,
    changes: sanitizeValue(changes),
    metadata: sanitizeValue(metadata),
  });
};

module.exports = {
  logAuditEvent,
  sanitizeValue,
};
