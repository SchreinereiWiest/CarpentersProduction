export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const DOCUMENT_FIELD_KEYS = [
  { key: "documentType", label: "Belegart", example: "Angebot" },
  { key: "documentNumber", label: "Belegnummer", example: "ANG-2026-0001" },
  { key: "issuedAt", label: "Belegdatum", example: "18.11.2026" },
  { key: "dueAt", label: "Fälligkeitsdatum", example: "02.12.2026" },
  { key: "customerName", label: "Kundenname", example: "Mustermann GmbH" },
  { key: "customerAddress", label: "Kundenanschrift", example: "Musterstraße 1\n12345 Musterstadt", multiline: true },
  { key: "customerNumber", label: "Kundennummer", example: "KD-1001" },
  { key: "projectTitle", label: "Projekt", example: "Innenausbau Erdgeschoss" },
  { key: "commissionTitle", label: "Kommission", example: "Großauftrag Musterbau" },
  { key: "title", label: "Betreff / Titel", example: "Angebot Innenausbau" },
  { key: "introText", label: "Einleitung", example: "Vielen Dank für Ihre Anfrage …", multiline: true },
  { key: "positions", label: "Positionstabelle", example: "Positionen", kind: "positions" },
  { key: "net", label: "Nettosumme", example: "1.000,00 €" },
  { key: "vat", label: "Mehrwertsteuer", example: "190,00 €" },
  { key: "gross", label: "Gesamtsumme", example: "1.190,00 €" },
  { key: "notes", label: "Hinweise / Zahlungskonditionen", example: "Zahlbar innerhalb von 14 Tagen.", multiline: true },
  { key: "pageNumber", label: "Seitennummer", example: "Seite 1" }
];

export const FIELD_KEY_MAP = Object.fromEntries(DOCUMENT_FIELD_KEYS.map(field => [field.key, field]));

const object = (id, type, values) => ({ id, type, visible: true, ...values });

export function createDefaultDocumentLayout(accent = "#166534") {
  return {
    version: 1,
    page: { width: A4_WIDTH_MM, height: A4_HEIGHT_MM, background: "#ffffff" },
    objects: [
      object("header-band", "rect", { x: 0, y: 0, width: 210, height: 18, fill: accent, stroke: accent, strokeWidth: 0 }),
      object("brand", "text", { x: 14, y: 7, width: 120, height: 6, text: "FIRMENNAME", fontSize: 9, fontWeight: 700, color: "#ffffff", align: "left" }),
      object("document-type", "field", { x: 14, y: 25, width: 95, height: 11, key: "documentType", fontSize: 22, fontWeight: 700, color: "#18181b", align: "left" }),
      object("recipient", "field", { x: 14, y: 43, width: 95, height: 25, key: "customerAddress", fontSize: 10, color: "#18181b", multiline: true, align: "left" }),
      object("number-label", "text", { x: 130, y: 30, width: 28, height: 5, text: "Belegnummer", fontSize: 8, color: "#71717a", align: "left" }),
      object("number", "field", { x: 159, y: 29, width: 37, height: 6, key: "documentNumber", fontSize: 9, color: "#18181b", align: "right" }),
      object("date-label", "text", { x: 130, y: 38, width: 28, height: 5, text: "Datum", fontSize: 8, color: "#71717a", align: "left" }),
      object("date", "field", { x: 159, y: 37, width: 37, height: 6, key: "issuedAt", fontSize: 9, color: "#18181b", align: "right" }),
      object("customer-label", "text", { x: 130, y: 46, width: 28, height: 5, text: "Kundennr.", fontSize: 8, color: "#71717a", align: "left" }),
      object("customer-number", "field", { x: 159, y: 45, width: 37, height: 6, key: "customerNumber", fontSize: 9, color: "#18181b", align: "right" }),
      object("divider", "line", { x: 14, y: 76, width: 182, height: 0, stroke: accent, strokeWidth: 0.6 }),
      object("title", "field", { x: 14, y: 82, width: 182, height: 9, key: "title", fontSize: 15, fontWeight: 700, color: "#18181b", align: "left" }),
      object("intro", "field", { x: 14, y: 94, width: 182, height: 16, key: "introText", fontSize: 9, color: "#3f3f46", multiline: true, align: "left" }),
      object("positions", "field", { x: 14, y: 114, width: 182, height: 100, key: "positions", fontSize: 8, color: "#18181b", accent, align: "left" }),
      object("net-label", "text", { x: 135, y: 220, width: 30, height: 5, text: "Netto", fontSize: 9, color: "#52525b", align: "left" }),
      object("net", "field", { x: 166, y: 219, width: 30, height: 6, key: "net", fontSize: 9, color: "#18181b", align: "right" }),
      object("vat-label", "text", { x: 135, y: 228, width: 30, height: 5, text: "MwSt.", fontSize: 9, color: "#52525b", align: "left" }),
      object("vat", "field", { x: 166, y: 227, width: 30, height: 6, key: "vat", fontSize: 9, color: "#18181b", align: "right" }),
      object("total-line", "line", { x: 135, y: 236, width: 61, height: 0, stroke: accent, strokeWidth: 0.5 }),
      object("gross-label", "text", { x: 135, y: 241, width: 30, height: 6, text: "Gesamt", fontSize: 11, fontWeight: 700, color: "#18181b", align: "left" }),
      object("gross", "field", { x: 166, y: 240, width: 30, height: 7, key: "gross", fontSize: 11, fontWeight: 700, color: "#18181b", align: "right" }),
      object("notes", "field", { x: 14, y: 252, width: 120, height: 20, key: "notes", fontSize: 8, color: "#52525b", multiline: true, align: "left" }),
      object("page", "field", { x: 166, y: 284, width: 30, height: 5, key: "pageNumber", fontSize: 7, color: "#71717a", align: "right" })
    ]
  };
}

const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeDocumentLayout(value) {
  const fallback = createDefaultDocumentLayout();
  if (!value || typeof value !== "object" || !Array.isArray(value.objects)) return fallback;
  return {
    version: 1,
    page: {
      width: A4_WIDTH_MM,
      height: A4_HEIGHT_MM,
      background: /^#[0-9a-f]{6}$/i.test(value.page?.background || "") ? value.page.background : "#ffffff"
    },
    objects: value.objects.slice(0, 250).filter(item => item && typeof item === "object").map((item, index) => ({
      ...item,
      id: String(item.id || `layout-${index}`),
      type: ["text", "field", "line", "rect", "image"].includes(item.type) ? item.type : "text",
      x: clamp(number(item.x, 14), 0, A4_WIDTH_MM),
      y: clamp(number(item.y, 14), 0, A4_HEIGHT_MM),
      width: clamp(number(item.width, 30), 0.1, A4_WIDTH_MM),
      height: clamp(number(item.height, item.type === "line" ? 0 : 8), 0, A4_HEIGHT_MM),
      fontSize: clamp(number(item.fontSize, 9), 4, 72),
      strokeWidth: clamp(number(item.strokeWidth, 0.4), 0, 10),
      visible: item.visible !== false
    }))
  };
}

export function layoutFromTemplateAnalysis(analysis) {
  const accent = analysis?.colors?.find(color => /^#[0-9a-f]{6}$/i.test(color)) || "#166534";
  const layout = createDefaultDocumentLayout(accent);
  const width = number(analysis?.pageSize?.width, 595.28);
  const height = number(analysis?.pageSize?.height, 841.89);
  const blocks = Array.isArray(analysis?.textBlocks) ? analysis.textBlocks : [];
  const aliases = { recipient: "customerAddress", items: "positions" };
  for (const detected of analysis?.fields || []) {
    const key = aliases[detected.key] || detected.key;
    const target = layout.objects.find(item => item.type === "field" && item.key === key);
    const anchor = blocks.find(block => block.page === detected.page && block.text === detected.anchorText);
    if (!target || !anchor || detected.page !== 1) continue;
    target.x = clamp((number(anchor.x, 0) / width) * A4_WIDTH_MM, 4, 195);
    target.y = clamp((number(anchor.y, 0) / height) * A4_HEIGHT_MM + 4, 4, 285);
  }
  return layout;
}

export function newLayoutObject(type, x = 20, y = 20, key = "issuedAt") {
  const id = globalThis.crypto?.randomUUID?.() || `layout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  if (type === "line") return object(id, type, { x, y, width: 50, height: 0, stroke: "#18181b", strokeWidth: 0.5 });
  if (type === "rect") return object(id, type, { x, y, width: 50, height: 20, fill: "#ffffff", stroke: "#18181b", strokeWidth: 0.5 });
  if (type === "field") return object(id, type, { x, y, width: 50, height: 8, key, fontSize: 9, color: "#18181b", align: "left" });
  if (type === "image") return object(id, type, { x, y, width: 45, height: 20, src: "", fit: "contain" });
  return object(id, "text", { x, y, width: 60, height: 8, text: "Neuer Text", fontSize: 9, color: "#18181b", align: "left" });
}

export const documentFieldLabel = key => FIELD_KEY_MAP[key]?.label || key || "Datenfeld";
