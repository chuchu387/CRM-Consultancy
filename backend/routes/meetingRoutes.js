const express = require("express");

const {
  createMeeting,
  deleteMeeting,
  getAllMeetings,
  getMyMeetings,
  studentReschedule,
  updateMeetingStatus,
} = require("../controllers/meetingController");
const { protect } = require("../middleware/auth");
const { isConsultancy, isStudent } = require("../middleware/role");

const router = express.Router();

router.post("/", protect, createMeeting);
router.get("/", protect, isConsultancy, getAllMeetings);
router.get("/my", protect, isStudent, getMyMeetings);
router.patch("/:id/status", protect, isConsultancy, updateMeetingStatus);
router.delete("/:id", protect, isConsultancy, deleteMeeting);
router.patch("/:id/reschedule", protect, isStudent, studentReschedule);

module.exports = router;
