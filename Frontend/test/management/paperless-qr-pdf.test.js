import { describe, expect, it } from "vitest";
import QRCode from "qrcode";

import { createPaperlessQrPdf } from "../../src/features/management/documents/paperlessQrPdf.js";

describe("Paperless QR-PDF", () => {
  it("erzeugt eine druckbare PDF in gewähltem Papierformat und Ausrichtung", async () => {
    const dataUrl = await QRCode.toDataURL("CPD1.test", { margin: 2, width: 256 });
    const blob = createPaperlessQrPdf({
      dataUrl,
      paperFormat: "a4",
      orientation: "landscape",
      documentType: "Aufmaß",
      title: "Aufmaß Baustelle"
    });

    expect(blob.type).toBe("application/pdf");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2_000);
  });
});
