import { describe, expect, it } from "vitest";
import { ensureWorkspaceViews } from "../src/features/projects/measurement/config/defaults.js";
import { normalizeExpose } from "../src/features/projects/measurement/expose/exposeDefaults.js";
import { normalizeCompanySettings } from "../src/shared/settings/company-settings.js";
import {
  COVER_BLOCK_LAYOUTS,
  getExposeBlockLayout,
  getVisualTemplateLayouts,
  isExposePageEnabled,
  VISUAL_BLOCK_LAYOUTS
} from "@EngineBrowser/project-pdf/exposeLayout.js";

describe("Projekt-Exposé", () => {
  it("ergänzt bestehende Aufmaßdaten idempotent um den Exposé-Block neben Bilder", () => {
    const legacyViews = [
      { id: "front", type: "elevation" },
      { id: "images", type: "images" }
    ];
    const migrated = ensureWorkspaceViews(legacyViews);

    expect(migrated.map((view) => view.type)).toEqual([
      "elevation",
      "images",
      "expose"
    ]);
    expect(ensureWorkspaceViews(migrated)).toBe(migrated);
  });

  it("behält editierte Texte und ergänzt fehlende Druckbereiche mit Standardwerten", () => {
    const expose = normalizeExpose({
      cover: { title: "Küche Honold" },
      sections: { nesting: false }
    });

    expect(expose.cover.title).toBe("Küche Honold");
    expect(expose.cover.eyebrow).toBe("PROJEKTMAPPE");
    expect(expose.sections.nesting).toBe(false);
    expect(expose.sections.partsList).toBe(true);
    expect(expose.sections.cnc).toBe(true);
    expect(expose.cncProgramsPerPage).toBe(4);
  });

  it("normalisiert explizit leere Titeltexte ohne sie zu verwerfen", () => {
    const expose = normalizeExpose({
      coverTextOverrides: { title: "" },
      assetText: { "photo-1": { title: "", text: "" } }
    });

    expect(expose.coverTextOverrides).toHaveProperty("title", "");
    expect(expose.assetText["photo-1"]).toEqual({ title: "", text: "" });
  });

  it("bewahrt frei platzierte Objekte und Bildersetzungen", () => {
    const block = {
      id: "custom:text-1",
      type: "text",
      text: "Hinweis",
      layout: { x: 10, y: 20, width: 60, height: 25 }
    };
    const expose = normalizeExpose({
      customBlocks: { cover: [block] },
      imageOverrides: { "view:front": "photo-2" },
      pageTemplates: { "view:front": "standard" },
      pageOrder: ["view:front", "cover"]
    });

    expect(expose.customBlocks.cover).toEqual([block]);
    expect(expose.imageOverrides["view:front"]).toBe("photo-2");
    expect(expose.pageTemplates["view:front"]).toBe("info");
    expect(expose.pageOrder).toEqual(["view:front", "cover"]);
  });

  it("bewahrt Seitenwahl, Position und Bildausschnitt des Live-Editors", () => {
    const expose = normalizeExpose({
      disabledPageIds: ["image:foto-2"],
      pageLayouts: {
        "image:foto-1": {
          blocks: {
            image: { x: 18, y: 42, width: 190, height: 140, cropX: 75, cropY: 20, zoom: 1.6 }
          }
        }
      }
    });
    const layout = getExposeBlockLayout(
      expose,
      "image:foto-1",
      "image",
      VISUAL_BLOCK_LAYOUTS.image
    );

    expect(expose.version).toBe(2);
    expect(isExposePageEnabled(expose, "image:foto-1")).toBe(true);
    expect(isExposePageEnabled(expose, "image:foto-2")).toBe(false);
    expect(layout).toMatchObject({
      x: 18,
      y: 42,
      width: 190,
      height: 140,
      cropX: 75,
      cropY: 20,
      zoom: 1.6
    });
  });

  it("ordnet die Standardtexte ohne überlappende Textblöcke an", () => {
    const overlaps = (first, second) =>
      first.x < second.x + second.width &&
      first.x + first.width > second.x &&
      first.y < second.y + second.height &&
      first.y + first.height > second.y;

    expect(overlaps(COVER_BLOCK_LAYOUTS.leftTitle, COVER_BLOCK_LAYOUTS.subtitle)).toBe(false);
    expect(overlaps(COVER_BLOCK_LAYOUTS.rightTitle, COVER_BLOCK_LAYOUTS.customer)).toBe(false);
    expect(overlaps(VISUAL_BLOCK_LAYOUTS.title, VISUAL_BLOCK_LAYOUTS.body)).toBe(false);
  });

  it("positioniert Inhalte abhängig von der gewählten Seitenvorlage", () => {
    const info = getVisualTemplateLayouts("info");
    const horizontal = getVisualTemplateLayouts("info-horizontal");
    const minimal = getVisualTemplateLayouts("minimal");

    expect(info.image.width).toBeLessThan(horizontal.image.width);
    expect(horizontal.image.height).toBeLessThan(minimal.image.height);
    expect(horizontal.body.y).toBeGreaterThan(horizontal.image.y + horizontal.image.height);
  });

  it("übernimmt nur PNG- und JPG-Daten als Unternehmenslogo", () => {
    const png = normalizeCompanySettings({
      branding: {
        logoDataUrl: "data:image/png;base64,AAAA",
        logoFileName: "logo.png",
        logoMimeType: "image/png",
        logoWidth: 400,
        logoHeight: 160
      }
    });
    const svg = normalizeCompanySettings({
      branding: {
        logoDataUrl: "data:image/svg+xml;base64,AAAA",
        logoMimeType: "image/svg+xml"
      }
    });

    expect(png.branding.logoDataUrl).toContain("image/png");
    expect(png.branding.logoWidth).toBe(400);
    expect(svg.branding.logoDataUrl).toBe("");
  });
});
