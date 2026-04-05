const express = require("express");

const { dispatchReminders } = require("../controllers/reminderController");
const { protect } = require("../middleware/auth");
const { isConsultancy } = require("../middleware/role");

const router = express.Router();

router.post("/dispatch", protect, isConsultancy, dispatchReminders);

module.exports = router;
