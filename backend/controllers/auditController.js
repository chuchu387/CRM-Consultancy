const AuditLog = require("../models/AuditLog");

const getAuditLogs = async (req, res, next) => {
  try {
    const filters = {};
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 500);

    if (req.query.entityType) {
      filters.entityType = req.query.entityType;
    }

    if (req.query.actionType) {
      filters.actionType = req.query.actionType;
    }

    if (req.query.actorId) {
      filters.actorId = req.query.actorId;
    }

    if (req.query.studentId) {
      filters.targetStudentId = req.query.studentId;
    }

    if (req.query.leadId) {
      filters.targetLeadId = req.query.leadId;
    }

    if (search) {
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filters.$or = [
        { summary: pattern },
        { entityLabel: pattern },
        { actorName: pattern },
        { actionType: pattern },
        { entityType: pattern },
      ];
    }

    const auditLogs = await AuditLog.find(filters)
      .populate("targetStudentId", "name email phone")
      .populate("targetLeadId", "name email phone status")
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: auditLogs,
      message: "Audit logs retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAuditLogs,
};
