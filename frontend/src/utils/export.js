import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const escapeCsvValue = (value) => {
  const normalized = value ?? "";
  const stringValue = String(normalized).replace(/"/g, '""');
  return `"${stringValue}"`;
};

export const downloadCsv = (filename, rows) => {
  if (!rows.length) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const downloadPdf = ({ filename, title, columns, rows }) => {
  if (!rows.length) {
    return;
  }

  const documentInstance = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  documentInstance.setFontSize(16);
  documentInstance.text(title, 40, 40);

  autoTable(documentInstance, {
    startY: 60,
    head: [columns],
    body: rows,
    styles: {
      fontSize: 9,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [37, 99, 235],
    },
  });

  documentInstance.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
};
