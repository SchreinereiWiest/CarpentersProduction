export const EXPOSE_LANDSCAPE_WIDTH = 297;
export const EXPOSE_LANDSCAPE_HEIGHT = 210;

export const COVER_BLOCK_LAYOUTS = {
  logo: { x: 16, y: 14, width: 49, height: 23 },
  eyebrow: { x: 16, y: 68, width: 80, height: 10 },
  leftTitle: { x: 16, y: 82, width: 80, height: 34 },
  subtitle: { x: 16, y: 120, width: 78, height: 30 },
  status: { x: 130, y: 19, width: 145, height: 10 },
  rightTitle: { x: 130, y: 38, width: 145, height: 38 },
  customer: { x: 130, y: 78, width: 145, height: 12 },
  description: { x: 130, y: 100, width: 145, height: 58 },
  meta: { x: 130, y: 174, width: 150, height: 14 }
};

export const VISUAL_BLOCK_LAYOUTS = {
  image: {
    x: 12,
    y: 37,
    width: 205,
    height: 158,
    cropX: 50,
    cropY: 50,
    zoom: 1
  },
  title: { x: 231, y: 58, width: 47, height: 26 },
  body: { x: 231, y: 88, width: 47, height: 76 }
};

export const EXPOSE_TEMPLATE_IDS = {
  INFO: "info",
  INFO_HORIZONTAL: "info-horizontal",
  MINIMAL: "minimal",
  TITLE: "title",
  CABINET_STANDARD: "cabinet-standard"
};

export function normalizeExposeTemplateId(value, fallback = EXPOSE_TEMPLATE_IDS.INFO) {
  const template = value === "standard" ? EXPOSE_TEMPLATE_IDS.INFO : value;
  return Object.values(EXPOSE_TEMPLATE_IDS).includes(template) ? template : fallback;
}

export function getVisualTemplateLayouts(templateId) {
  const template = normalizeExposeTemplateId(templateId);
  if (template === EXPOSE_TEMPLATE_IDS.MINIMAL) {
    return {
      image: { x: 12, y: 32, width: 273, height: 132, cropX: 50, cropY: 50, zoom: 1 },
      title: { x: 12, y: 169, width: 273, height: 10 },
      body: { x: 12, y: 181, width: 273, height: 13 }
    };
  }
  if (template === EXPOSE_TEMPLATE_IDS.INFO_HORIZONTAL) {
    return {
      image: { x: 12, y: 34, width: 273, height: 103, cropX: 50, cropY: 50, zoom: 1 },
      title: { x: 12, y: 146, width: 273, height: 13 },
      body: { x: 12, y: 163, width: 273, height: 29 }
    };
  }
  return VISUAL_BLOCK_LAYOUTS;
}

const finite = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function normalizeExposeBlockLayout(value, fallback) {
  const source = value ?? {};
  return {
    ...fallback,
    ...source,
    x: finite(source.x, fallback.x),
    y: finite(source.y, fallback.y),
    width: Math.max(4, finite(source.width, fallback.width)),
    height: Math.max(4, finite(source.height, fallback.height)),
    ...(fallback.cropX == null && source.cropX == null
      ? {}
      : { cropX: Math.min(100, Math.max(0, finite(source.cropX, fallback.cropX ?? 50))) }),
    ...(fallback.cropY == null && source.cropY == null
      ? {}
      : { cropY: Math.min(100, Math.max(0, finite(source.cropY, fallback.cropY ?? 50))) }),
    ...(fallback.zoom == null && source.zoom == null
      ? {}
      : { zoom: Math.min(4, Math.max(1, finite(source.zoom, fallback.zoom ?? 1))) })
  };
}

export function getExposeBlockLayout(expose, pageId, blockId, fallback) {
  return normalizeExposeBlockLayout(
    expose?.pageLayouts?.[pageId]?.blocks?.[blockId],
    fallback
  );
}

export function isExposePageEnabled(expose, pageId, defaultEnabled = true) {
  const disabled = new Set((expose?.disabledPageIds ?? []).map(String));
  return defaultEnabled && !disabled.has(String(pageId));
}

export function getExposeCoverText(expose, key, fallback = "") {
  const overrides = expose?.coverTextOverrides;
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, key)) {
    return String(overrides[key] ?? "");
  }
  const stored = expose?.cover?.[key];
  return stored == null || stored === "" ? String(fallback ?? "") : String(stored);
}
