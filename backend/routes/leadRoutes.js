const express = require("express");

const {
  addLeadNote,
  convertLeadToStudent,
  createLead,
  getLeadById,
  getLeads,
  logLeadContact,
  updateLead,
} = require("../controllers/leadController");
const { protect } = require("../middleware/auth");
const { isConsultancy } = require("../middleware/role");

const router = express.Router();

router.get("/", protect, isConsultancy, getLeads);
router.get("/:id", protect, isConsultancy, getLeadById);
router.post("/", protect, isConsultancy, createLead);
router.patch("/:id", protect, isConsultancy, updateLead);
router.post("/:id/notes", protect, isConsultancy, addLeadNote);
router.post("/:id/contact-log", protect, isConsultancy, logLeadContact);
router.post("/:id/convert", protect, isConsultancy, convertLeadToStudent);

module.exports = router;
