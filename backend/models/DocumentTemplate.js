const mongoose = require("mongoose");

const documentTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  visaType: {
    type: String,
    required: true,
    trim: true,
  },
  documents: [
    {
      documentName: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        default: "",
        trim: true,
      },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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

documentTemplateSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("DocumentTemplate", documentTemplateSchema);
