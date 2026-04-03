const express = require("express");

const {
  addInvoicePayment,
  createInvoice,
  getAllInvoices,
  getInvoicesByStudent,
  getMyInvoices,
  updateInvoice,
} = require("../controllers/invoiceController");
const { protect } = require("../middleware/auth");
const { isConsultancy, isStudent } = require("../middleware/role");

const router = express.Router();

router.get("/", protect, isConsultancy, getAllInvoices);
router.get("/student/:studentId", protect, isConsultancy, getInvoicesByStudent);
router.get("/my", protect, isStudent, getMyInvoices);
router.post("/", protect, isConsultancy, createInvoice);
router.patch("/:id", protect, isConsultancy, updateInvoice);
router.post("/:id/payments", protect, isConsultancy, addInvoicePayment);

module.exports = router;
