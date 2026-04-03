const express = require("express");

const {
  createStudentNote,
  deleteStudentNote,
  getStudentNotes,
} = require("../controllers/noteController");
const { protect } = require("../middleware/auth");
const { isConsultancy } = require("../middleware/role");

const router = express.Router();

router.get("/student/:studentId", protect, isConsultancy, getStudentNotes);
router.post("/student/:studentId", protect, isConsultancy, createStudentNote);
router.delete("/:id", protect, isConsultancy, deleteStudentNote);

module.exports = router;
