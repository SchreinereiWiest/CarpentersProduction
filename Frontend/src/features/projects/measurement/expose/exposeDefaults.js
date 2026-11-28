export const DEFAULT_EXPOSE = {
  version: 2,
  cover: {
    eyebrow: "PROJEKTMAPPE",
    title: "",
    subtitle: "Entwurf, Aufmaß und Fertigungsunterlagen",
    description: "",
    status: "ENTWURF",
    dataDate: "",
    projectNumber: ""
  },
  text: {
    perspectivesHeading: "Perspektiven & Gestaltung",
    perspectivesBody:
      "Visualisierungen und Projektbilder geben einen Überblick über Gestaltung, Proportionen und Materialwirkung.",
    measurementHeading: "Aufmaß & Planung",
    measurementBody:
      "Technische Ansichten aus dem Aufmaß. Verbindlich sind die eingetragenen Maße und die freigegebenen Fertigungsunterlagen.",
    cabinetIntro:
      "Korpusblätter mit Außenmaßen, Material, Konstruktion und Funktionen.",
    nestingIntro:
      "Nesting Verschnittoptimierung",
    footerNote: "Projektunterlagen · nur gültig mit aktuellem Datenstand"
  },
  sections: {
    perspectives: true,
    measurement: true,
    cabinets: true,
    partsList: true,
    cnc: true,
    nesting: true
  },
  selectedImageIds: [],
  selectedViewIds: [],
  disabledPageIds: [],
  assetText: {},
  coverTextOverrides: {},
  customBlocks: {},
  imageOverrides: {},
  pageTemplates: {},
  manualPages: [],
  pageOrder: [],
  cncProgramsPerPage: 4,
  pageLayouts: {}
};

export function normalizeExpose(value) {
  const source = value ?? {};
  return {
    ...DEFAULT_EXPOSE,
    ...source,
    version: 2,
    cover: { ...DEFAULT_EXPOSE.cover, ...(source.cover ?? {}) },
    text: { ...DEFAULT_EXPOSE.text, ...(source.text ?? {}) },
    sections: { ...DEFAULT_EXPOSE.sections, ...(source.sections ?? {}) },
    selectedImageIds: Array.isArray(source.selectedImageIds)
      ? source.selectedImageIds.map(String)
      : [],
    selectedViewIds: Array.isArray(source.selectedViewIds)
      ? source.selectedViewIds.map(String)
      : [],
    disabledPageIds: Array.isArray(source.disabledPageIds)
      ? source.disabledPageIds.map(String)
      : [],
    assetText:
      source.assetText && typeof source.assetText === "object"
        ? source.assetText
        : {},
    coverTextOverrides:
      source.coverTextOverrides && typeof source.coverTextOverrides === "object"
        ? source.coverTextOverrides
        : {},
    customBlocks:
      source.customBlocks && typeof source.customBlocks === "object"
        ? source.customBlocks
        : {},
    imageOverrides:
      source.imageOverrides && typeof source.imageOverrides === "object"
        ? source.imageOverrides
        : {},
    pageTemplates: Object.fromEntries(Object.entries(
      source.pageTemplates && typeof source.pageTemplates === "object" ? source.pageTemplates : {}
    ).map(([pageId, templateId]) => [pageId, templateId === "standard" ? "info" : templateId === "subtitle" ? "title" : templateId])),
    manualPages: Array.isArray(source.manualPages)
      ? source.manualPages.map((page) => ({
          ...page,
          orientation: page?.orientation === "portrait" ? "portrait" : "landscape"
        }))
      : [],
    pageOrder: Array.isArray(source.pageOrder) ? source.pageOrder.map(String) : [],
    cncProgramsPerPage: Math.max(1, Math.min(8, Number(source.cncProgramsPerPage) || 4)),
    pageLayouts:
      source.pageLayouts && typeof source.pageLayouts === "object"
        ? source.pageLayouts
        : {}
  };
}

export function formatExposeDate(value) {
  if (!value) return new Date().toLocaleDateString("de-DE");
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("de-DE");
}
