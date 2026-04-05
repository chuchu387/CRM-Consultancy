const express = require("express");

const { getReportsOverview } = require("../controllers/reportController");
const { protect } = require("../middleware/auth");
const { isConsultancy } = require("../middleware/role");

const router = express.Router();

router.get("/overview", protect, isConsultancy, getReportsOverview);

module.exports = router;
