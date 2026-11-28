import { describe, expect, it } from "vitest";

import { createDefaultDocumentLayout, newLayoutObject, normalizeDocumentLayout, snapValue } from "../src/features/commercial/document-layout/documentLayout.js";

describe("Belegvorlagen-Layout", () => {
  it("liefert eine Standardvorlage mit Firmenlogo, statischen Texten und dynamischen Feldern", () => {
    const layout = createDefaultDocumentLayout("#123456");
    expect(layout.version).toBe(2);
    expect(layout.objects.find(item => item.type === "logo")?.id).toBe("company-logo");
    expect(layout.objects.find(item => item.type === "text")?.text).toBeTruthy();
    expect(layout.objects.find(item => item.key === "positions")?.type).toBe("field");
    expect(layout.objects.find(item => item.id === "header-band")?.fill).toBe("#123456");
  });

  it("normalisiert Gestaltung und verwirft ungültige Feldschlüssel", () => {
    const layout = normalizeDocumentLayout({ page: { background: "#abcdef", gridSize: 3 }, objects: [
      { id: "field", type: "field", key: "customerAddress", x: -5, y: 20, width: 80, height: 30, fontSize: 14 },
      { id: "bad", type: "field", key: "not-supported", x: 10, y: 10, width: 10, height: 10 }
    ] });
    expect(layout.page).toMatchObject({ background: "#abcdef", gridSize: 3 });
    expect(layout.objects[0]).toMatchObject({ x: 0, key: "customerAddress", fontSize: 14 });
    expect(layout.objects[1].key).toBe("title");
  });

  it("erzeugt statische und dynamische Elemente und rastet an Hilfslinien ein", () => {
    expect(newLayoutObject("text").type).toBe("text");
    expect(newLayoutObject("field", 20, 20, "positions")).toMatchObject({ type: "field", key: "positions", height: 70 });
    expect(snapValue(13.4, [14], 2, 1.25)).toEqual({ value: 14, guide: 14 });
    expect(snapValue(7.1, [], 2, 1.25)).toEqual({ value: 8, guide: null });
  });
});
