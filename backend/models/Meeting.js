const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  consultancyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requestedBy: {
    type: String,
    enum: ["student", "consultancy"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  proposedDate: {
    type: Date,
    required: true,
  },
  confirmedDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rescheduled", "rejected", "completed"],
    default: "pending",
  },
  note: {
    type: String,
    default: "",
  },
  rescheduledNote: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Meeting", meetingSchema);
