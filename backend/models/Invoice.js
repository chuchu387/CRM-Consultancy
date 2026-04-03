const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  items: [
    {
      label: {
        type: String,
        required: true,
        trim: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  subtotal: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  balanceDue: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["unpaid", "partial", "paid", "overdue"],
    default: "unpaid",
  },
  dueDate: {
    type: Date,
    required: true,
  },
  notes: {
    type: String,
    default: "",
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  payments: [
    {
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      method: {
        type: String,
        required: true,
        trim: true,
      },
      note: {
        type: String,
        default: "",
        trim: true,
      },
      paidAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

invoiceSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Invoice", invoiceSchema);
