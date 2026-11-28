import { describe, expect, it } from "vitest";
import { isProjectImageFile } from "../../src/features/projects/measurement/views/images/projectImages.js";

describe("Aufmaß-Projektbilder", () => {
  it("erkennt Bilder aus den Projekteinstellungen per MIME-Typ", () => {
    expect(isProjectImageFile({ fileName: "Kueche.bin", mimeType: "image/jpeg" })).toBe(true);
  });

  it("erkennt ältere Bilddateien auch ohne hinterlegten MIME-Typ", () => {
    expect(isProjectImageFile({ fileName: "Wohnzimmer.JPEG", mimeType: "" })).toBe(true);
    expect(isProjectImageFile({ originalName: "Detail.webp" })).toBe(true);
  });

  it("nimmt Nicht-Bilddateien nicht in die Bilderansicht auf", () => {
    expect(isProjectImageFile({ fileName: "Grundriss.pdf", mimeType: "application/pdf" })).toBe(false);
  });
});
