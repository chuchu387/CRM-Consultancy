const mongoose = require("mongoose");

const universityApplicationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  universityName: {
    type: String,
    required: true,
    trim: true,
  },
  programName: {
    type: String,
    required: true,
    trim: true,
  },
  intake: {
    type: String,
    required: true,
    trim: true,
  },
  applicationStatus: {
    type: String,
    enum: ["draft", "applied", "offer_received", "offer_rejected", "visa_filed", "completed", "closed"],
    default: "draft",
  },
  offerLetterStatus: {
    type: String,
    enum: ["pending", "received", "rejected"],
    default: "pending",
  },
  tuitionDepositStatus: {
    type: String,
    enum: ["pending", "paid", "not_required"],
    default: "pending",
  },
  enrollmentDocumentType: {
    type: String,
    default: "I-20",
    trim: true,
  },
  enrollmentDocumentStatus: {
    type: String,
    enum: ["pending", "received", "not_applicable"],
    default: "pending",
  },
  note: {
    type: String,
    default: "",
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

universityApplicationSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("UniversityApplication", universityApplicationSchema);
