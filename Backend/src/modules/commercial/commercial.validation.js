export const COMMERCIAL_DOCUMENT_TYPES = new Set(["quote", "invoice", "order_confirmation", "partial_invoice"]);
const STATUSES = new Set(["draft", "sent", "accepted", "paid", "cancelled"]);
const TEMPLATE_FIELD_KEYS = new Set(["issuerName", "issuerAddress", "issuerContact", "senderLine", "documentType", "customerName", "customerAddress", "documentNumber", "issuedAt", "dueAt", "customerNumber", "projectTitle", "projectNumber", "commissionTitle", "title", "introText", "positions", "net", "vat", "gross", "notes", "closingText", "footerText"]);

export const commercialDocumentTitle = type => ({
  invoice: "Rechnung",
  order_confirmation: "Auftragsbestätigung",
  partial_invoice: "Abschlagsrechnung"
}[type] || "Angebot");

export class CommercialValidationError extends Error {
  constructor(message, code = "COMMERCIAL_DOCUMENT_INVALID") {
    super(message);
    this.code = code;
    this.statusCode = 400;
  }
}

const text = (value, maxLength, fallback = null) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
};

const amount = value => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? Math.max(0, Math.round(normalized * 100) / 100) : 0;
};

const jsonObject = (value, fieldName, maxBytes = 3_000_000) => {
  if (value === undefined) return undefined;
  if (value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new CommercialValidationError(`${fieldName} ist ungültig.`);
  }
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > maxBytes) {
    throw new CommercialValidationError(`${fieldName} ist zu groß.`);
  }
  return JSON.parse(serialized);
};

export function normalizeCommercialItems(items) {
  if (!Array.isArray(items) || items.length > 500) {
    throw new CommercialValidationError("Bitte höchstens 500 Positionen übergeben.");
  }
  return items.map((item, index) => {
    const description = text(item?.description, 1000);
    if (!description) throw new CommercialValidationError(`Position ${index + 1}: Beschreibung fehlt.`);
    const quantity = amount(item?.quantity);
    if (quantity <= 0) throw new CommercialValidationError(`Position ${index + 1}: Menge muss größer als null sein.`);
    return {
      id: text(item?.id, 100, `item-${index + 1}`),
      position: index + 1,
      description,
      details: text(item?.details, 4000),
      unit: text(item?.unit, 40, "Stk."),
      quantity,
      unitPrice: amount(item?.unitPrice),
      discountPercent: Math.min(99.99, amount(item?.discountPercent)),
      projectId: text(item?.projectId, 80),
      source: text(item?.source, 40, "manual")
    };
  });
}

export function calculateCommercialTotals(items, vatPercent = 19) {
  const normalizedVat = Math.min(100, amount(vatPercent));
  const net = Math.round(items.reduce((sum, item) => {
    const grossLine = item.quantity * item.unitPrice;
    return sum + grossLine * (1 - item.discountPercent / 100);
  }, 0) * 100) / 100;
  const vat = Math.round(net * normalizedVat) / 100;
  return { net, vatPercent: normalizedVat, vat, gross: Math.round((net + vat) * 100) / 100 };
}

export function commercialDocumentData(input, { partial = false } = {}) {
  const documentType = input?.documentType;
  if (!partial || documentType !== undefined) {
    if (!COMMERCIAL_DOCUMENT_TYPES.has(documentType)) throw new CommercialValidationError("Ungültige Belegart.");
  }
  const status = input?.status;
  if (!partial || status !== undefined) {
    if (!STATUSES.has(status || "draft")) throw new CommercialValidationError("Ungültiger Belegstatus.");
  }
  const items = input?.items === undefined && partial ? undefined : normalizeCommercialItems(input?.items || []);
  const totals = items ? calculateCommercialTotals(items, input?.vatPercent ?? input?.totals?.vatPercent ?? 19) : undefined;
  const result = {
    ...(documentType === undefined ? {} : { documentType }),
    ...(status === undefined && partial ? {} : { status: status || "draft" }),
    ...(input?.title === undefined && partial ? {} : { title: text(input?.title, 300, commercialDocumentTitle(documentType)) }),
    ...(input?.documentNumber === undefined && partial ? {} : { documentNumber: text(input?.documentNumber, 120) }),
    ...(input?.introText === undefined && partial ? {} : { introText: text(input?.introText, 10_000) }),
    ...(input?.notes === undefined && partial ? {} : { notes: text(input?.notes, 10_000) }),
    ...(input?.fieldValues === undefined && partial ? {} : { fieldValues: jsonObject(input?.fieldValues || {}, "Die Feldwerte", 500_000) }),
    ...(items === undefined ? {} : { items, totals }),
    ...(input?.issuedAt === undefined && partial ? {} : { issuedAt: input?.issuedAt ? new Date(input.issuedAt) : null }),
    ...(input?.dueAt === undefined && partial ? {} : { dueAt: input?.dueAt ? new Date(input.dueAt) : null })
  };
  for (const field of ["issuedAt", "dueAt"]) {
    if (result[field] && Number.isNaN(result[field].getTime())) throw new CommercialValidationError(`${field} ist kein gültiges Datum.`);
  }
  return result;
}

export function commissionData(input) {
  const title = text(input?.title, 300);
  if (!title) {
    const error = new CommercialValidationError("Bitte eine Bezeichnung für die Kommission eingeben.", "COMMISSION_TITLE_REQUIRED");
    throw error;
  }
  const projectIds = [...new Set((Array.isArray(input?.projectIds) ? input.projectIds : []).map(value => text(value, 80)).filter(Boolean))];
  if (projectIds.length < 2) {
    throw new CommercialValidationError("Eine Kommission muss mindestens zwei Projekte enthalten.", "COMMISSION_PROJECTS_REQUIRED");
  }
  return {
    title,
    commissionNumber: text(input?.commissionNumber, 120),
    description: text(input?.description, 4000),
    projectIds
  };
}

const bounded = (value, fallback, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : fallback));
const templateColor = (value, fallback) => value === "transparent" || /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;

export const normalizeTemplateAnalysis = value => {
  let input;
  try {
    input = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new CommercialValidationError("Die Vorlagendaten sind ungültig.", "DOCUMENT_TEMPLATE_ANALYSIS_INVALID");
  }
  if (!input || typeof input !== "object" || Number(input.version) !== 4 || !Array.isArray(input.layout?.objects)) {
    throw new CommercialValidationError("Die Vorlagendaten sind unvollständig.", "DOCUMENT_TEMPLATE_ANALYSIS_INVALID");
  }
  const objects = input.layout.objects.slice(0, 250).map((item, index) => {
    if (!item || typeof item !== "object") return null;
    const type = ["text", "field", "line", "rect", "logo"].includes(item.type) ? item.type : null;
    if (!type) return null;
    const x = bounded(item.x, 14, 0, 210);
    const y = bounded(item.y, 14, 0, 297);
    const key = type === "field" ? text(item.key, 100, "") : null;
    if (type === "field" && !TEMPLATE_FIELD_KEYS.has(key)) return null;
    return {
      id: text(item.id, 120, `layout-${index + 1}`),
      type,
      ...(type === "field" ? { key } : {}),
      ...(type === "text" ? { text: text(item.text, 5000, "Statischer Text") } : {}),
      x,
      y,
      width: bounded(item.width, 40, 1, Math.max(1, 210 - x)),
      height: bounded(item.height, type === "line" ? 0 : 8, 0, Math.max(0, 297 - y)),
      fontFamily: ["sans", "serif", "mono"].includes(item.fontFamily) ? item.fontFamily : "sans",
      fontSize: bounded(item.fontSize, 9, 4, 72),
      lineHeight: bounded(item.lineHeight, 1.35, 0.8, 3),
      fontWeight: Number(item.fontWeight) >= 700 ? 700 : 400,
      color: templateColor(item.color, "#18181b"),
      background: templateColor(item.background, "transparent"),
      fill: templateColor(item.fill, "#ffffff"),
      stroke: templateColor(item.stroke, "#18181b"),
      borderColor: templateColor(item.borderColor, "#bae6fd"),
      borderWidth: bounded(item.borderWidth, 0, 0, 5),
      strokeWidth: bounded(item.strokeWidth, 0.5, 0, 10),
      borderStyle: ["solid", "dashed", "dotted", "none"].includes(item.borderStyle) ? item.borderStyle : "solid",
      borderRadius: bounded(item.borderRadius, 0, 0, 20),
      padding: bounded(item.padding, 0, 0, 20),
      align: ["left", "center", "right"].includes(item.align) ? item.align : "left",
      verticalAlign: ["top", "center", "bottom"].includes(item.verticalAlign) ? item.verticalAlign : "top",
      fit: ["contain", "cover", "fill"].includes(item.fit) ? item.fit : "contain",
      visible: item.visible !== false,
      locked: item.locked === true
    };
  }).filter(Boolean);
  if (!objects.length) throw new CommercialValidationError("Die Vorlage enthält keine Elemente.", "DOCUMENT_TEMPLATE_OBJECTS_REQUIRED");
  return {
    version: 4,
    layout: {
      version: 2,
      page: { width: 210, height: 297, background: templateColor(input.layout.page?.background, "#ffffff"), gridSize: bounded(input.layout.page?.gridSize, 2, 0.5, 20) },
      objects
    }
  };
};
