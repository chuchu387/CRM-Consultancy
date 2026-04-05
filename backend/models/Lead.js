const mongoose = require("mongoose");

const leadNoteSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const leadActivitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "",
      trim: true,
    },
    interestedCourse: {
      type: String,
      default: "",
      trim: true,
    },
    interestedIntake: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      enum: ["walk_in", "website", "facebook", "instagram", "referral", "call", "whatsapp", "other"],
      default: "walk_in",
    },
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "counseling",
        "documents_pending",
        "application_in_progress",
        "converted",
        "lost",
      ],
      default: "new",
    },
    nextAction: {
      type: String,
      default: "",
      trim: true,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    lastContactedAt: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    convertedStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    convertedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: [leadNoteSchema],
      default: [],
    },
    activityLog: {
      type: [leadActivitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({
  name: "text",
  email: "text",
  phone: "text",
  country: "text",
  interestedCourse: "text",
  interestedIntake: "text",
});

module.exports = mongoose.model("Lead", leadSchema);
