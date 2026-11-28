import { describe, expect, it } from "vitest";
import {
  attachmentsForCabinet,
  cabinetIdsForAttachment,
  isProjectAttachmentFile,
  normalizeAttachmentLinks
} from "../../src/features/projects/attachments/attachmentLinks.js";

describe("Projektanlagen-Verknüpfungen", () => {
  it("zeigt nur projektweite PDFs und JPGs als Anlagen", () => {
    expect(isProjectAttachmentFile({ fileName: "Plan.PDF", mimeType: "" })).toBe(true);
    expect(isProjectAttachmentFile({ fileName: "Detail.jpeg", mimeType: "image/jpeg" })).toBe(true);
    expect(isProjectAttachmentFile({ fileName: "Rendering.png", mimeType: "image/png" })).toBe(false);
    expect(isProjectAttachmentFile({ fileName: "Modell.glb", mimeType: "model/gltf-binary" })).toBe(false);
  });

  it("normalisiert Mehrfachverknüpfungen und filtert Anlagen für den aktiven Korpus", () => {
    const links = normalizeAttachmentLinks({
      links: {
        "file-1": ["cabinet-1", "cabinet-1", "cabinet-2"],
        "file-2": ["cabinet-2"],
        "file-empty": []
      }
    });
    const attachments = [
      { id: "file-1", fileName: "Plan.pdf" },
      { id: "file-2", fileName: "Detail.jpg" }
    ];

    expect(cabinetIdsForAttachment(links, "file-1")).toEqual(["cabinet-1", "cabinet-2"]);
    expect(attachmentsForCabinet(attachments, links, "cabinet-1")).toEqual([attachments[0]]);
    expect(links.links).not.toHaveProperty("file-empty");
  });
});
