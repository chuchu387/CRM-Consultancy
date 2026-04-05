import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { formatDateOnly, formatDateTime } from "./date";

const formatAmount = (value) => Number(value || 0).toFixed(2);

const sanitizeFilenamePart = (value) =>
  String(value || "invoice")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const buildFilename = (invoice) => {
  const invoiceNumber = sanitizeFilenamePart(invoice?.invoiceNumber || "invoice");
  return `${invoiceNumber || "invoice"}.pdf`;
};

const buildInvoiceDocumentData = ({ invoice, studentName, studentEmail, consultancyName }) => {
  const issuedDate = invoice?.createdAt || new Date().toISOString();

  return {
    invoiceNumber: invoice?.invoiceNumber || "Invoice",
    studentName: studentName || "Student",
    studentEmail: studentEmail || "No email provided",
    consultancyName: consultancyName || "Consultancy CRM",
    dueDate: formatDateTime(invoice?.dueDate, "No due date"),
    issuedDate: formatDateTime(issuedDate),
    notes: (invoice?.notes || "").trim(),
    items: Array.isArray(invoice?.items) ? invoice.items : [],
    payments: Array.isArray(invoice?.payments) ? invoice.payments : [],
    status: invoice?.status || "unpaid",
    subtotal: formatAmount(invoice?.subtotal),
    discount: formatAmount(invoice?.discount),
    total: formatAmount(invoice?.total),
    amountPaid: formatAmount(invoice?.amountPaid),
    balanceDue: formatAmount(invoice?.balanceDue),
  };
};

export const downloadInvoicePdf = ({
  invoice,
  studentName,
  studentEmail,
  consultancyName,
}) => {
  if (!invoice) {
    return;
  }

  const data = buildInvoiceDocumentData({
    invoice,
    studentName,
    studentEmail,
    consultancyName,
  });

  const documentInstance = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  documentInstance.setFont("helvetica", "bold");
  documentInstance.setFontSize(24);
  documentInstance.text("INVOICE", 40, 48);

  documentInstance.setFont("helvetica", "normal");
  documentInstance.setFontSize(11);
  documentInstance.text(data.consultancyName, 40, 70);
  documentInstance.text(`Invoice No: ${data.invoiceNumber}`, 380, 48, { align: "right" });
  documentInstance.text(`Issued: ${data.issuedDate}`, 380, 66, { align: "right" });
  documentInstance.text(`Due: ${data.dueDate}`, 380, 84, { align: "right" });

  documentInstance.setDrawColor(226, 232, 240);
  documentInstance.line(40, 100, 555, 100);

  documentInstance.setFont("helvetica", "bold");
  documentInstance.setFontSize(12);
  documentInstance.text("Bill To", 40, 126);
  documentInstance.setFont("helvetica", "normal");
  documentInstance.setFontSize(11);
  documentInstance.text(data.studentName, 40, 146);
  documentInstance.text(data.studentEmail, 40, 164);
  documentInstance.text(`Status: ${String(data.status).toUpperCase()}`, 40, 182);

  autoTable(documentInstance, {
    startY: 208,
    head: [["Description", "Amount"]],
    body: data.items.map((item) => [item.label, formatAmount(item.amount)]),
    styles: {
      fontSize: 10,
      cellPadding: 8,
      textColor: [31, 41, 55],
      lineColor: [226, 232, 240],
      lineWidth: 1,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      1: { halign: "right" },
    },
    margin: {
      left: 40,
      right: 40,
    },
  });

  const tableBottomY = documentInstance.lastAutoTable?.finalY || 208;
  const totalsStartY = tableBottomY + 22;

  documentInstance.setFont("helvetica", "normal");
  documentInstance.text(`Subtotal: ${data.subtotal}`, 555, totalsStartY, { align: "right" });
  documentInstance.text(`Discount: ${data.discount}`, 555, totalsStartY + 18, {
    align: "right",
  });
  documentInstance.setFont("helvetica", "bold");
  documentInstance.text(`Total: ${data.total}`, 555, totalsStartY + 42, { align: "right" });
  documentInstance.text(`Paid: ${data.amountPaid}`, 555, totalsStartY + 60, { align: "right" });
  documentInstance.text(`Balance Due: ${data.balanceDue}`, 555, totalsStartY + 78, {
    align: "right",
  });

  let nextSectionY = totalsStartY + 110;

  if (data.notes) {
    documentInstance.setFont("helvetica", "bold");
    documentInstance.text("Notes", 40, nextSectionY);
    documentInstance.setFont("helvetica", "normal");
    const noteLines = documentInstance.splitTextToSize(data.notes, 515);
    documentInstance.text(noteLines, 40, nextSectionY + 18);
    nextSectionY += 18 + noteLines.length * 14 + 16;
  }

  if (data.payments.length) {
    autoTable(documentInstance, {
      startY: nextSectionY,
      head: [["Payment Date", "Method", "Amount", "Note"]],
      body: data.payments.map((payment) => [
        formatDateOnly(payment.paidAt),
        payment.method,
        formatAmount(payment.amount),
        payment.note || "-",
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 7,
        textColor: [31, 41, 55],
        lineColor: [226, 232, 240],
        lineWidth: 1,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        2: { halign: "right" },
      },
      margin: {
        left: 40,
        right: 40,
      },
    });
  }

  documentInstance.save(buildFilename(invoice));
};

export const printInvoiceDocument = ({
  invoice,
  studentName,
  studentEmail,
  consultancyName,
}) => {
  if (!invoice) {
    return;
  }

  const data = buildInvoiceDocumentData({
    invoice,
    studentName,
    studentEmail,
    consultancyName,
  });

  const itemsMarkup = data.items
    .map(
      (item) => `
        <tr>
          <td>${item.label}</td>
          <td class="amount">${formatAmount(item.amount)}</td>
        </tr>
      `
    )
    .join("");

  const paymentsMarkup = data.payments.length
    ? `
      <section class="section">
        <h3>Payment History</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th class="amount">Amount</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${data.payments
              .map(
                (payment) => `
                  <tr>
                    <td>${formatDateOnly(payment.paidAt)}</td>
                    <td>${payment.method}</td>
                    <td class="amount">${formatAmount(payment.amount)}</td>
                    <td>${payment.note || "-"}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </section>
    `
    : "";

  const printWindow = window.open("", "_blank", "width=980,height=900");

  if (!printWindow) {
    throw new Error("Please allow popups to print the invoice.");
  }

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${data.invoiceNumber}</title>
        <style>
          :root {
            color-scheme: light;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            background: #f8fafc;
            color: #0f172a;
            font-family: Arial, sans-serif;
          }
          .page {
            max-width: 860px;
            margin: 0 auto;
            padding: 32px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 18px;
          }
          .title {
            font-size: 30px;
            font-weight: 700;
            letter-spacing: 0.08em;
            margin: 0;
          }
          .subtitle {
            margin-top: 8px;
            color: #475569;
            font-size: 14px;
          }
          .meta {
            text-align: right;
            font-size: 14px;
            line-height: 1.7;
          }
          .section {
            margin-top: 28px;
          }
          .section h3 {
            margin: 0 0 10px;
            font-size: 16px;
          }
          .bill-to {
            font-size: 14px;
            line-height: 1.7;
          }
          .status {
            display: inline-block;
            margin-top: 8px;
            padding: 6px 10px;
            border-radius: 999px;
            background: #dbeafe;
            color: #1d4ed8;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
          }
          .table th,
          .table td {
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            font-size: 14px;
            vertical-align: top;
          }
          .table th {
            background: #eff6ff;
            text-align: left;
          }
          .amount {
            text-align: right;
            white-space: nowrap;
          }
          .totals {
            margin-top: 20px;
            margin-left: auto;
            width: 280px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            padding: 6px 0;
            font-size: 14px;
          }
          .totals-row.total,
          .totals-row.balance {
            font-weight: 700;
          }
          .notes {
            margin-top: 10px;
            padding: 14px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            background: #f8fafc;
            font-size: 14px;
            line-height: 1.7;
            white-space: pre-wrap;
          }
          @media print {
            body {
              background: #ffffff;
            }
            .page {
              max-width: none;
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <header class="header">
            <div>
              <h1 class="title">INVOICE</h1>
              <div class="subtitle">${data.consultancyName}</div>
            </div>
            <div class="meta">
              <div><strong>Invoice:</strong> ${data.invoiceNumber}</div>
              <div><strong>Issued:</strong> ${data.issuedDate}</div>
              <div><strong>Due:</strong> ${data.dueDate}</div>
            </div>
          </header>

          <section class="section">
            <h3>Bill To</h3>
            <div class="bill-to">
              <div>${data.studentName}</div>
              <div>${data.studentEmail}</div>
            </div>
            <div class="status">${data.status}</div>
          </section>

          <section class="section">
            <h3>Invoice Items</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsMarkup}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row"><span>Subtotal</span><span>${data.subtotal}</span></div>
              <div class="totals-row"><span>Discount</span><span>${data.discount}</span></div>
              <div class="totals-row total"><span>Total</span><span>${data.total}</span></div>
              <div class="totals-row"><span>Paid</span><span>${data.amountPaid}</span></div>
              <div class="totals-row balance"><span>Balance Due</span><span>${data.balanceDue}</span></div>
            </div>
          </section>

          ${
            data.notes
              ? `
                <section class="section">
                  <h3>Notes</h3>
                  <div class="notes">${data.notes}</div>
                </section>
              `
              : ""
          }

          ${paymentsMarkup}
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};
