import { describe, expect, it } from "vitest";

import {
  createDefaultDocumentLayout,
  layoutFromTemplateAnalysis,
  normalizeDocumentLayout
} from "../src/features/commercial/document-layout/documentLayout.js";

describe("Beleglayout", () => {
  it("liefert eine vollständige A4-Vorlage mit ausfüllbarer Positionstabelle", () => {
    const layout = createDefaultDocumentLayout("#123456");
    expect(layout.page).toEqual({ width: 210, height: 297, background: "#ffffff" });
    expect(layout.objects.find(item => item.key === "positions")?.type).toBe("field");
    expect(layout.objects.find(item => item.id === "header-band")?.fill).toBe("#123456");
  });

  it("übernimmt erkannte PDF-Anker als Millimeterpositionen", () => {
    const layout = layoutFromTemplateAnalysis({
      pageSize: { width: 600, height: 900 },
      colors: ["#005544"],
      textBlocks: [{ text: "Rechnungsnummer", page: 1, x: 300, y: 90 }],
      fields: [{ key: "documentNumber", page: 1, anchorText: "Rechnungsnummer" }]
    });
    const number = layout.objects.find(item => item.key === "documentNumber");
    expect(number.x).toBeCloseTo(105);
    expect(number.y).toBeCloseTo(33.7, 1);
  });

  it("begrenzt fehlerhafte Koordinaten auf die A4-Seite", () => {
    const layout = normalizeDocumentLayout({ objects: [{ id: "x", type: "field", key: "issuedAt", x: -50, y: 900, width: 999, height: 8 }] });
    expect(layout.objects[0]).toMatchObject({ x: 0, y: 297, width: 210 });
  });
});
