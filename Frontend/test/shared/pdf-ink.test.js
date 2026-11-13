import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";

import { applyPdfInk } from "../../src/shared/pdf/pdfInk.js";

describe("PDF-Freihandmarkierungen", () => {
  it("bettet Linien in die bestehende PDF ein und erhält die Seiten", async () => {
    const source = await PDFDocument.create();
    source.addPage([595, 842]);
    source.addPage([842, 595]);
    const original = await source.save();

    const edited = await applyPdfInk(original, {
      1: [{ color: "#111827", widthNorm: 0.005, points: [{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.6 }] }]
    });
    const result = await PDFDocument.load(edited);

    expect(result.getPageCount()).toBe(2);
    expect(new TextDecoder().decode(edited.slice(0, 5))).toBe("%PDF-");
    expect(edited.byteLength).toBeGreaterThan(original.byteLength);
  });
});
