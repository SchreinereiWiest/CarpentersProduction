import { PDFDocument, rgb } from "pdf-lib";

const colorFromHex = value => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(value || ""));
  if (!match) return rgb(0.06, 0.09, 0.16);
  const number = Number.parseInt(match[1], 16);
  return rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255);
};

const normalizedPointToPdf = (point, width, height, rotation) => {
  const x = Math.max(0, Math.min(1, Number(point.x) || 0));
  const y = Math.max(0, Math.min(1, Number(point.y) || 0));
  if (rotation === 90) return { x: y * width, y: x * height };
  if (rotation === 180) return { x: (1 - x) * width, y: y * height };
  if (rotation === 270) return { x: (1 - y) * width, y: (1 - x) * height };
  return { x: x * width, y: (1 - y) * height };
};

export async function applyPdfInk(pdfBytes, annotationsByPage) {
  const document = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  const pages = document.getPages();
  for (const [pageKey, strokes] of Object.entries(annotationsByPage || {})) {
    const pageIndex = Number.parseInt(pageKey, 10) - 1;
    const page = pages[pageIndex];
    if (!page || !Array.isArray(strokes)) continue;
    const { width, height } = page.getSize();
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const displayWidth = rotation === 90 || rotation === 270 ? height : width;
    for (const stroke of strokes) {
      if (!Array.isArray(stroke.points) || stroke.points.length === 0) continue;
      const color = colorFromHex(stroke.color);
      const thickness = Math.max(0.5, Math.min(30, (Number(stroke.widthNorm) || 0.004) * displayWidth));
      if (stroke.points.length === 1) {
        page.drawCircle({
          ...normalizedPointToPdf(stroke.points[0], width, height, rotation),
          size: thickness / 2,
          color
        });
        continue;
      }
      for (let index = 1; index < stroke.points.length; index += 1) {
        page.drawLine({
          start: normalizedPointToPdf(stroke.points[index - 1], width, height, rotation),
          end: normalizedPointToPdf(stroke.points[index], width, height, rotation),
          thickness,
          color
        });
      }
    }
  }
  document.setModificationDate(new Date());
  return document.save();
}
