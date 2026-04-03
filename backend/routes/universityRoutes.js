const express = require("express");

const {
  createUniversityApplication,
  getAllUniversityApplications,
  getMyUniversityApplications,
  getUniversityApplicationsByStudent,
  updateUniversityApplication,
} = require("../controllers/universityController");
const { protect } = require("../middleware/auth");
const { isConsultancy, isStudent } = require("../middleware/role");

const router = express.Router();

router.get("/", protect, isConsultancy, getAllUniversityApplications);
router.get("/student/:studentId", protect, isConsultancy, getUniversityApplicationsByStudent);
router.get("/my", protect, isStudent, getMyUniversityApplications);
router.post("/", protect, isConsultancy, createUniversityApplication);
router.patch("/:id", protect, isConsultancy, updateUniversityApplication);

module.exports = router;
