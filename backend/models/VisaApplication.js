const mongoose = require("mongoose");

const visaApplicationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  visaType: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: [
      "Application Received",
      "Documents Pending",
      "Documents Under Review",
      "Submitted to Embassy",
      "Interview Scheduled",
      "Approved",
      "Rejected",
      "On Hold",
    ],
    default: "Application Received",
  },
  statusHistory: [
    {
      status: String,
      note: String,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  note: {
    type: String,
    default: "",
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

visaApplicationSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("VisaApplication", visaApplicationSchema);
