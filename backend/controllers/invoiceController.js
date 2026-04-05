const Invoice = require("../models/Invoice");
const User = require("../models/User");
const { logStudentActivity } = require("../utils/activity");
const { createNotification } = require("../utils/notification");

const populateInvoiceQuery = (query) =>
  query
    .populate("studentId", "name email phone")
    .populate("createdBy", "name email");

const calculateInvoiceTotals = ({ items = [], discount = 0, amountPaid = 0, dueDate }) => {
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const total = Math.max(subtotal - Number(discount || 0), 0);
  const balanceDue = Math.max(total - Number(amountPaid || 0), 0);

  let status = "unpaid";
  if (balanceDue <= 0) {
    status = "paid";
  } else if (amountPaid > 0) {
    status = "partial";
  } else if (dueDate && new Date(dueDate) < new Date()) {
    status = "overdue";
  }

  return {
    subtotal,
    total,
    balanceDue,
    status,
  };
};

const normalizeInvoiceItems = (items = []) =>
  items
    .map((item) => ({
      label: (item.label || "").trim(),
      amount: Number(item.amount || 0),
    }))
    .filter((item) => item.label && item.amount >= 0);

const generateInvoiceNumber = () =>
  `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

const getAllInvoices = async (req, res, next) => {
  try {
    const invoices = await populateInvoiceQuery(Invoice.find().sort({ createdAt: -1 }));

    return res.status(200).json({
      success: true,
      data: invoices,
      message: "Invoices retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getInvoicesByStudent = async (req, res, next) => {
  try {
    const invoices = await populateInvoiceQuery(
      Invoice.find({ studentId: req.params.studentId }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      data: invoices,
      message: "Student invoices retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getMyInvoices = async (req, res, next) => {
  try {
    const invoices = await populateInvoiceQuery(
      Invoice.find({ studentId: req.user.id }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      data: invoices,
      message: "Invoices retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const { studentId, items = [], discount = 0, dueDate, notes = "" } = req.body;
    const normalizedItems = normalizeInvoiceItems(items);

    if (!studentId || !normalizedItems.length || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Student, due date, and at least one invoice item are required",
      });
    }

    const student = await User.findOne({ _id: studentId, role: "student" });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const totals = calculateInvoiceTotals({
      items: normalizedItems,
      discount,
      amountPaid: 0,
      dueDate,
    });

    const invoice = await Invoice.create({
      studentId,
      invoiceNumber: generateInvoiceNumber(),
      items: normalizedItems,
      subtotal: totals.subtotal,
      discount: Number(discount || 0),
      total: totals.total,
      amountPaid: 0,
      balanceDue: totals.balanceDue,
      status: totals.status,
      dueDate,
      notes: notes.trim(),
      createdBy: req.user.id,
    });

    await logStudentActivity({
      studentId,
      actor: req.user,
      actionType: "invoice_created",
      entityType: "invoice",
      entityId: invoice._id,
      message: `Created invoice ${invoice.invoiceNumber}`,
      metadata: { total: invoice.total, dueDate: invoice.dueDate },
    });

    await createNotification({
      userId: studentId,
      type: "invoice",
      title: "New invoice issued",
      message: `${invoice.invoiceNumber} for ${invoice.total.toFixed(2)} is now available`,
      link: "/student/invoices",
      metadata: { invoiceId: invoice._id },
    });

    const populatedInvoice = await populateInvoiceQuery(Invoice.findById(invoice._id));

    return res.status(201).json({
      success: true,
      data: populatedInvoice,
      message: "Invoice created successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (req.body.items) {
      const normalizedItems = normalizeInvoiceItems(req.body.items);

      if (!normalizedItems.length) {
        return res.status(400).json({
          success: false,
          message: "Invoice must include at least one line item",
        });
      }

      invoice.items = normalizedItems;
    }

    if (req.body.discount !== undefined) invoice.discount = Number(req.body.discount || 0);
    if (req.body.dueDate !== undefined) invoice.dueDate = req.body.dueDate;
    if (req.body.notes !== undefined) invoice.notes = req.body.notes.trim();

    const totals = calculateInvoiceTotals({
      items: invoice.items,
      discount: invoice.discount,
      amountPaid: invoice.amountPaid,
      dueDate: invoice.dueDate,
    });

    invoice.subtotal = totals.subtotal;
    invoice.total = totals.total;
    invoice.balanceDue = totals.balanceDue;
    invoice.status = totals.status;

    await invoice.save();

    await logStudentActivity({
      studentId: invoice.studentId,
      actor: req.user,
      actionType: "invoice_updated",
      entityType: "invoice",
      entityId: invoice._id,
      message: `Updated invoice ${invoice.invoiceNumber}`,
      metadata: { total: invoice.total, balanceDue: invoice.balanceDue },
    });

    const populatedInvoice = await populateInvoiceQuery(Invoice.findById(invoice._id));

    return res.status(200).json({
      success: true,
      data: populatedInvoice,
      message: "Invoice updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const addInvoicePayment = async (req, res, next) => {
  try {
    const { amount, method, note = "" } = req.body;

    if (!amount || Number(amount) <= 0 || !method) {
      return res.status(400).json({
        success: false,
        message: "Payment amount and method are required",
      });
    }

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    invoice.payments.push({
      amount: Number(amount),
      method: method.trim(),
      note: note.trim(),
      paidAt: new Date(),
    });

    invoice.amountPaid = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    const totals = calculateInvoiceTotals({
      items: invoice.items,
      discount: invoice.discount,
      amountPaid: invoice.amountPaid,
      dueDate: invoice.dueDate,
    });

    invoice.subtotal = totals.subtotal;
    invoice.total = totals.total;
    invoice.balanceDue = totals.balanceDue;
    invoice.status = totals.status;

    await invoice.save();

    await logStudentActivity({
      studentId: invoice.studentId,
      actor: req.user,
      actionType: "invoice_payment_added",
      entityType: "invoice",
      entityId: invoice._id,
      message: `Recorded payment for invoice ${invoice.invoiceNumber}`,
      metadata: { amount: Number(amount), method: method.trim() },
    });

    await createNotification({
      userId: invoice.studentId,
      type: "invoice",
      title: "Invoice payment updated",
      message: `A payment of ${Number(amount).toFixed(2)} was recorded on ${invoice.invoiceNumber}`,
      link: "/student/invoices",
      metadata: { invoiceId: invoice._id },
    });

    const populatedInvoice = await populateInvoiceQuery(Invoice.findById(invoice._id));

    return res.status(200).json({
      success: true,
      data: populatedInvoice,
      message: "Invoice payment recorded successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllInvoices,
  getInvoicesByStudent,
  getMyInvoices,
  createInvoice,
  updateInvoice,
  addInvoicePayment,
};
