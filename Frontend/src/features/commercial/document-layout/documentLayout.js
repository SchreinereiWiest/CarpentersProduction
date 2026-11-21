export const LAYOUT_WIDTH = 210;
export const LAYOUT_HEIGHT = 297;
export const LAYOUT_GRID = 2;

export const DOCUMENT_FIELD_KEYS = [
  { key: "issuerName", label: "Firmenname", example: "Möbeldesign Muster" },
  { key: "issuerAddress", label: "Firmenanschrift", example: "Werkstraße 1\n12345 Musterstadt", multiline: true },
  { key: "issuerContact", label: "Firmenkontakt", example: "Telefon · E-Mail · Internet", multiline: true },
  { key: "senderLine", label: "Absenderzeile", example: "Firma · Straße · Ort" },
  { key: "documentType", label: "Belegart", example: "Angebot" },
  { key: "documentNumber", label: "Belegnummer", example: "ANG-2026-0001" },
  { key: "issuedAt", label: "Belegdatum", example: "21.11.2026" },
  { key: "dueAt", label: "Fälligkeitsdatum", example: "05.12.2026" },
  { key: "customerName", label: "Kundenname", example: "Mustermann GmbH" },
  { key: "customerAddress", label: "Kundenanschrift", example: "Mustermann GmbH\nMusterstraße 1\n12345 Musterstadt", multiline: true },
  { key: "customerNumber", label: "Kundennummer", example: "KD-1001" },
  { key: "projectTitle", label: "Projekt", example: "Innenausbau Erdgeschoss" },
  { key: "projectNumber", label: "Projektnummer", example: "P-1001" },
  { key: "commissionTitle", label: "Kommission", example: "Kommission Musterbau" },
  { key: "title", label: "Betreff / Titel", example: "Angebot Innenausbau" },
  { key: "introText", label: "Einleitung", example: "Vielen Dank für Ihre Anfrage …", multiline: true },
  { key: "positions", label: "Positionen", example: "Positionstabelle", kind: "positions" },
  { key: "net", label: "Nettosumme", example: "1.000,00 €", computed: true },
  { key: "vat", label: "Mehrwertsteuer", example: "190,00 €", computed: true },
  { key: "gross", label: "Gesamtsumme", example: "1.190,00 €", computed: true },
  { key: "notes", label: "Bedingungen / Hinweise", example: "Zahlbar innerhalb von 14 Tagen.", multiline: true },
  { key: "closingText", label: "Abschlusstext", example: "Mit freundlichen Grüßen", multiline: true },
  { key: "footerText", label: "Fußzeile", example: "Bankverbindung · Steuerdaten · Pflichtangaben", multiline: true }
];

export const FIELD_KEY_MAP = Object.fromEntries(DOCUMENT_FIELD_KEYS.map(field => [field.key, field]));
export const documentFieldLabel = key => FIELD_KEY_MAP[key]?.label || key || "Datenfeld";
export const documentFieldExample = key => FIELD_KEY_MAP[key]?.example || documentFieldLabel(key);

const createId = () => globalThis.crypto?.randomUUID?.() || `layout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const object = (id, type, values) => ({ id, type, visible: true, locked: false, ...values });
const fieldTheme = { fontFamily: "sans", fontSize: 9, lineHeight: 1.35, fontWeight: 400, color: "#18181b", background: "transparent", borderColor: "#bae6fd", borderWidth: 0, borderStyle: "none", borderRadius: 2, padding: 2, align: "left", verticalAlign: "top" };

export function createDefaultDocumentLayout(accent = "#047857") {
  return {
    version: 2,
    page: { width: LAYOUT_WIDTH, height: LAYOUT_HEIGHT, background: "#ffffff", gridSize: LAYOUT_GRID },
    objects: [
      object("header-band", "rect", { x: 0, y: 0, width: 210, height: 7, fill: accent, stroke: accent, strokeWidth: 0 }),
      object("company-logo", "logo", { x: 14, y: 13, width: 42, height: 18, fit: "contain" }),
      object("issuer-name", "field", { ...fieldTheme, x: 65, y: 13, width: 62, height: 8, key: "issuerName", fontSize: 13, fontWeight: 700 }),
      object("issuer-contact", "field", { ...fieldTheme, x: 65, y: 23, width: 62, height: 16, key: "issuerContact", fontSize: 8 }),
      object("document-type", "field", { ...fieldTheme, x: 139, y: 13, width: 57, height: 12, key: "documentType", fontSize: 20, fontWeight: 700, color: accent, align: "right" }),
      object("document-number-label", "text", { x: 139, y: 29, width: 25, height: 5, text: "Belegnummer", fontFamily: "sans", fontSize: 8, fontWeight: 400, lineHeight: 1.2, color: "#71717a", align: "left", background: "transparent", padding: 0 }),
      object("document-number", "field", { ...fieldTheme, x: 165, y: 27, width: 31, height: 7, key: "documentNumber", align: "right" }),
      object("issued-label", "text", { x: 139, y: 37, width: 25, height: 5, text: "Datum", fontFamily: "sans", fontSize: 8, color: "#71717a", align: "left", background: "transparent", padding: 0 }),
      object("issued", "field", { ...fieldTheme, x: 165, y: 35, width: 31, height: 7, key: "issuedAt", align: "right" }),
      object("sender-line", "field", { ...fieldTheme, x: 14, y: 48, width: 102, height: 6, key: "senderLine", fontSize: 7, color: "#71717a" }),
      object("recipient", "field", { ...fieldTheme, x: 14, y: 57, width: 92, height: 30, key: "customerAddress", fontSize: 10 }),
      object("customer-number-label", "text", { x: 126, y: 57, width: 31, height: 5, text: "Kundennummer", fontFamily: "sans", fontSize: 8, color: "#71717a", align: "left", background: "transparent", padding: 0 }),
      object("customer-number", "field", { ...fieldTheme, x: 159, y: 55, width: 37, height: 7, key: "customerNumber", align: "right" }),
      object("project-label", "text", { x: 126, y: 66, width: 31, height: 5, text: "Projekt", fontFamily: "sans", fontSize: 8, color: "#71717a", align: "left", background: "transparent", padding: 0 }),
      object("project", "field", { ...fieldTheme, x: 159, y: 64, width: 37, height: 7, key: "projectTitle", align: "right" }),
      object("divider", "line", { x: 14, y: 94, width: 182, height: 0, stroke: accent, strokeWidth: 0.8 }),
      object("title", "field", { ...fieldTheme, x: 14, y: 100, width: 182, height: 11, key: "title", fontSize: 16, fontWeight: 700 }),
      object("intro", "field", { ...fieldTheme, x: 14, y: 114, width: 182, height: 19, key: "introText", fontSize: 10 }),
      object("positions", "field", { ...fieldTheme, x: 14, y: 137, width: 182, height: 82, key: "positions", fontSize: 9, accent }),
      object("net-label", "text", { x: 133, y: 224, width: 31, height: 6, text: "Netto", fontFamily: "sans", fontSize: 9, color: "#52525b", align: "left", background: "transparent", padding: 0 }),
      object("net", "field", { ...fieldTheme, x: 165, y: 222, width: 31, height: 7, key: "net", align: "right" }),
      object("vat-label", "text", { x: 133, y: 233, width: 31, height: 6, text: "MwSt.", fontFamily: "sans", fontSize: 9, color: "#52525b", align: "left", background: "transparent", padding: 0 }),
      object("vat", "field", { ...fieldTheme, x: 165, y: 231, width: 31, height: 7, key: "vat", align: "right" }),
      object("total-line", "line", { x: 133, y: 241, width: 63, height: 0, stroke: accent, strokeWidth: 0.6 }),
      object("gross-label", "text", { x: 133, y: 245, width: 31, height: 7, text: "Gesamt", fontFamily: "sans", fontSize: 11, fontWeight: 700, color: "#18181b", align: "left", background: "transparent", padding: 0 }),
      object("gross", "field", { ...fieldTheme, x: 165, y: 243, width: 31, height: 8, key: "gross", fontSize: 11, fontWeight: 700, align: "right" }),
      object("notes", "field", { ...fieldTheme, x: 14, y: 228, width: 108, height: 25, key: "notes", fontSize: 8 }),
      object("closing", "field", { ...fieldTheme, x: 14, y: 258, width: 108, height: 16, key: "closingText", fontSize: 9 }),
      object("footer-line", "line", { x: 14, y: 278, width: 182, height: 0, stroke: "#d4d4d8", strokeWidth: 0.4 }),
      object("footer", "field", { ...fieldTheme, x: 14, y: 282, width: 182, height: 10, key: "footerText", fontSize: 7, color: "#71717a", align: "center" })
    ]
  };
}

const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const color = (value, fallback) => value === "transparent" || /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;

export function normalizeDocumentLayout(value) {
  const fallback = createDefaultDocumentLayout();
  if (!value || typeof value !== "object" || !Array.isArray(value.objects)) return fallback;
  return {
    version: 2,
    page: {
      width: LAYOUT_WIDTH,
      height: LAYOUT_HEIGHT,
      background: color(value.page?.background, "#ffffff"),
      gridSize: clamp(number(value.page?.gridSize, LAYOUT_GRID), 0.5, 20)
    },
    objects: value.objects.slice(0, 250).filter(item => item && typeof item === "object").map((item, index) => {
      const type = ["text", "field", "line", "rect", "logo"].includes(item.type) ? item.type : "text";
      const x = clamp(number(item.x, 14), 0, LAYOUT_WIDTH);
      const y = clamp(number(item.y, 14), 0, LAYOUT_HEIGHT);
      return {
        ...item,
        id: String(item.id || `layout-${index}`),
        type,
        key: type === "field" && FIELD_KEY_MAP[item.key] ? item.key : type === "field" ? "title" : undefined,
        text: type === "text" ? String(item.text || "Statischer Text").slice(0, 5000) : undefined,
        x,
        y,
        width: clamp(number(item.width, 40), 1, LAYOUT_WIDTH - x || 1),
        height: clamp(number(item.height, type === "line" ? 0 : 8), 0, LAYOUT_HEIGHT - y),
        fontFamily: ["sans", "serif", "mono"].includes(item.fontFamily) ? item.fontFamily : "sans",
        fontSize: clamp(number(item.fontSize, 9), 4, 72),
        lineHeight: clamp(number(item.lineHeight, 1.35), 0.8, 3),
        fontWeight: Number(item.fontWeight) >= 700 ? 700 : 400,
        color: color(item.color, "#18181b"),
        background: color(item.background, "transparent"),
        fill: color(item.fill, "#ffffff"),
        stroke: color(item.stroke, "#18181b"),
        borderColor: color(item.borderColor, "#bae6fd"),
        borderWidth: clamp(number(item.borderWidth, 0), 0, 5),
        strokeWidth: clamp(number(item.strokeWidth, 0.5), 0, 10),
        borderStyle: ["solid", "dashed", "dotted", "none"].includes(item.borderStyle) ? item.borderStyle : "solid",
        borderRadius: clamp(number(item.borderRadius, 0), 0, 20),
        padding: clamp(number(item.padding, 0), 0, 20),
        align: ["left", "center", "right"].includes(item.align) ? item.align : "left",
        verticalAlign: ["top", "center", "bottom"].includes(item.verticalAlign) ? item.verticalAlign : "top",
        fit: ["contain", "cover", "fill"].includes(item.fit) ? item.fit : "contain",
        visible: item.visible !== false,
        locked: item.locked === true
      };
    })
  };
}

export function newLayoutObject(type, x = 20, y = 20, key = "title") {
  const id = createId();
  if (type === "line") return object(id, type, { x, y, width: 60, height: 0, stroke: "#18181b", strokeWidth: 0.5 });
  if (type === "rect") return object(id, type, { x, y, width: 60, height: 22, fill: "#f4f4f5", stroke: "#d4d4d8", strokeWidth: 0.4 });
  if (type === "logo") return object(id, type, { x, y, width: 45, height: 20, fit: "contain" });
  if (type === "field") return object(id, type, { ...fieldTheme, x, y, width: key === "positions" ? 170 : 60, height: key === "positions" ? 70 : 10, key });
  return object(id, "text", { x, y, width: 70, height: 10, text: "Statischer Text", fontFamily: "sans", fontSize: 10, lineHeight: 1.35, fontWeight: 400, color: "#18181b", background: "transparent", align: "left", verticalAlign: "top", padding: 0 });
}

export const layoutObjectPosition = item => ({
  left: `${item.x / LAYOUT_WIDTH * 100}%`,
  top: `${item.y / LAYOUT_HEIGHT * 100}%`,
  width: `${item.width / LAYOUT_WIDTH * 100}%`,
  height: `${Math.max(item.height, 0.35) / LAYOUT_HEIGHT * 100}%`
});

export const fontFamilyValue = family => family === "serif" ? "Georgia, serif" : family === "mono" ? "ui-monospace, monospace" : "Inter, ui-sans-serif, system-ui, sans-serif";

export function snapValue(value, candidates, gridSize = LAYOUT_GRID, threshold = 1.25) {
  const gridValue = Math.round(value / gridSize) * gridSize;
  let result = { value: gridValue, guide: null };
  let distance = Math.abs(value - gridValue);
  for (const candidate of candidates) {
    const candidateDistance = Math.abs(value - candidate);
    if (candidateDistance <= threshold && candidateDistance < distance + 0.001) result = { value: candidate, guide: candidate };
  }
  return result;
}
