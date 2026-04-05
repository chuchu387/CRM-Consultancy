const express = require("express");

const { getAuditLogs } = require("../controllers/auditController");
const { protect } = require("../middleware/auth");
const { isConsultancy } = require("../middleware/role");

const router = express.Router();

router.get("/", protect, isConsultancy, getAuditLogs);

module.exports = router;
