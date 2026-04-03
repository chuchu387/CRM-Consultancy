const mongoose = require("mongoose");

const documentRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  visaApplicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VisaApplication",
    default: null,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  documentName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "uploaded", "approved", "changes_requested", "rejected"],
    default: "pending",
  },
  studentAcceptanceStatus: {
    type: String,
    enum: ["pending", "accepted"],
    default: "pending",
  },
  acceptedAt: {
    type: Date,
    default: null,
  },
  requestBatchId: {
    type: String,
    default: "",
  },
  fileUrl: {
    type: String,
    default: "",
  },
  filePublicId: {
    type: String,
    default: "",
  },
  fileResourceType: {
    type: String,
    default: "",
  },
  fileName: {
    type: String,
    default: "",
  },
  fileMimeType: {
    type: String,
    default: "",
  },
  uploadedAt: {
    type: Date,
  },
  reviewNote: {
    type: String,
    default: "",
  },
  correctionItems: {
    type: [String],
    default: [],
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewedByName: {
    type: String,
    default: "",
  },
  uploadHistory: [
    {
      fileUrl: {
        type: String,
        default: "",
      },
      filePublicId: {
        type: String,
        default: "",
      },
      fileResourceType: {
        type: String,
        default: "",
      },
      fileName: {
        type: String,
        default: "",
      },
      fileMimeType: {
        type: String,
        default: "",
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      reviewStatus: {
        type: String,
        enum: ["uploaded", "approved", "changes_requested", "rejected"],
        default: "uploaded",
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      reviewNote: {
        type: String,
        default: "",
      },
      correctionItems: {
        type: [String],
        default: [],
      },
      reviewedByName: {
        type: String,
        default: "",
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("DocumentRequest", documentRequestSchema);
