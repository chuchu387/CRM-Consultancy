const express = require("express");

const {
  createVisa,
  getAllVisa,
  getMyVisa,
  getVisaById,
  updateStatus,
} = require("../controllers/visaController");
const { protect } = require("../middleware/auth");
const { isConsultancy, isStudent } = require("../middleware/role");

const router = express.Router();

router.post("/", protect, isConsultancy, createVisa);
router.get("/", protect, isConsultancy, getAllVisa);
router.get("/my", protect, isStudent, getMyVisa);
router.get("/:id", protect, getVisaById);
router.patch("/:id/status", protect, isConsultancy, updateStatus);

module.exports = router;
