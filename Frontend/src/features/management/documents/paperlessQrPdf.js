import { jsPDF } from "jspdf";

export const PAPERLESS_QR_PAPER_FORMATS = [
  { value: "a3", label: "A3", qrSize: 45, margin: 12 },
  { value: "a4", label: "A4", qrSize: 38, margin: 12 },
  { value: "a5", label: "A5", qrSize: 32, margin: 10 },
  { value: "a6", label: "A6", qrSize: 28, margin: 8 }
];

const safeText = (value, fallback) => String(value || fallback).trim().slice(0, 80);

export function createPaperlessQrPdf({ dataUrl, paperFormat = "a4", orientation = "portrait", documentType, title }) {
  const format = PAPERLESS_QR_PAPER_FORMATS.find(item => item.value === paperFormat) || PAPERLESS_QR_PAPER_FORMATS[1];
  const pageOrientation = orientation === "landscape" ? "landscape" : "portrait";
  const documentTitle = safeText(title, documentType || "Internes Dokument");
  const typeLabel = safeText(documentType, "Internes Dokument");
  const pdf = new jsPDF({ orientation: pageOrientation, unit: "mm", format: format.value, compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const x = pageWidth - format.margin - format.qrSize;
  const y = format.margin;

  pdf.setProperties({
    title: documentTitle,
    subject: `Carpenters QR-Zuordnung · ${typeLabel}`,
    creator: "Carpenters Production"
  });
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x - 2, y - 2, format.qrSize + 4, format.qrSize + 9, "F");
  pdf.addImage(dataUrl, "PNG", x, y, format.qrSize, format.qrSize, undefined, "FAST");
  pdf.setTextColor(50, 50, 50);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(`Carpenters · ${typeLabel}`, pageWidth - format.margin, y + format.qrSize + 4, { align: "right" });

  return pdf.output("blob");
}
