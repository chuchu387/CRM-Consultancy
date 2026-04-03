const express = require("express");

const { getStudentActivity } = require("../controllers/activityController");
const { protect } = require("../middleware/auth");
const { isConsultancy } = require("../middleware/role");

const router = express.Router();

router.get("/student/:studentId", protect, isConsultancy, getStudentActivity);

module.exports = router;
