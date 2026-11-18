const TYPES = new Set(["quote", "invoice"]);
const STATUSES = new Set(["draft", "sent", "accepted", "paid", "cancelled"]);

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
    if (!TYPES.has(documentType)) throw new CommercialValidationError("Belegart muss Angebot oder Rechnung sein.");
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
    ...(input?.title === undefined && partial ? {} : { title: text(input?.title, 300, documentType === "invoice" ? "Rechnung" : "Angebot") }),
    ...(input?.documentNumber === undefined && partial ? {} : { documentNumber: text(input?.documentNumber, 120) }),
    ...(input?.introText === undefined && partial ? {} : { introText: text(input?.introText, 10_000) }),
    ...(input?.notes === undefined && partial ? {} : { notes: text(input?.notes, 10_000) }),
    ...(input?.templateId === undefined && partial ? {} : { templateId: text(input?.templateId, 80) }),
    ...(input?.fieldValues === undefined && partial ? {} : { fieldValues: jsonObject(input?.fieldValues || {}, "Die Feldwerte", 500_000) }),
    ...(input?.layout === undefined && partial ? {} : { layout: jsonObject(input?.layout || {}, "Das Beleglayout") }),
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

export const normalizeTemplateAnalysis = value => {
  let input;
  try {
    input = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new CommercialValidationError("Die PDF-Analyse ist ungültig.", "DOCUMENT_TEMPLATE_ANALYSIS_INVALID");
  }
  if (!input || typeof input !== "object" || !Number.isInteger(Number(input.pageCount))) {
    throw new CommercialValidationError("Die PDF-Analyse ist unvollständig.", "DOCUMENT_TEMPLATE_ANALYSIS_INVALID");
  }
  const layout = jsonObject(input.layout || {}, "Das Vorlagenlayout");
  return {
    version: 1,
    pageCount: Math.min(500, Math.max(1, Number(input.pageCount))),
    pageSize: input.pageSize && typeof input.pageSize === "object" ? input.pageSize : null,
    textBlocks: Array.isArray(input.textBlocks) ? input.textBlocks.slice(0, 500).map(block => ({
      text: text(block?.text, 1000, ""),
      page: Math.max(1, Number(block?.page) || 1),
      x: amount(block?.x),
      y: amount(block?.y),
      width: amount(block?.width),
      height: amount(block?.height)
    })) : [],
    fields: Array.isArray(input.fields) ? input.fields.slice(0, 100).map(field => ({
      key: text(field?.key, 100, "field"),
      label: text(field?.label, 300, "Feld"),
      page: Math.max(1, Number(field?.page) || 1),
      anchorText: text(field?.anchorText, 300)
    })) : [],
    imageCount: Math.min(1000, amount(input.imageCount)),
    colors: Array.isArray(input.colors) ? input.colors.slice(0, 20).map(value => text(value, 30)).filter(Boolean) : [],
    layout
  };
};
