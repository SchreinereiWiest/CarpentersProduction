import prisma from "../../infrastructure/database/prisma.js";
import { getTenantSecret } from "../attachment-search/tenant-secrets.service.js";

export const PAPERLESS_API_TOKEN_SECRET = "paperless.api-token";
export const PAPERLESS_WEBHOOK_SECRET = "paperless.webhook-secret";
export const PAPERLESS_QR_SIGNING_SECRET = "paperless.qr-signing-secret";

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ERROR_TEXT = 500;

export class PaperlessError extends Error {
  constructor(message, statusCode = 424, code = "PAPERLESS_REQUEST_FAILED") {
    super(message);
    this.name = "PaperlessError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function normalizePaperlessBaseUrl(value) {
  const input = String(value || "").trim();
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new PaperlessError("Bitte eine gültige Paperless-URL eingeben.", 400, "PAPERLESS_URL_INVALID");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new PaperlessError("Die Paperless-URL muss HTTP oder HTTPS ohne Zugangsdaten verwenden.", 400, "PAPERLESS_URL_INVALID");
  }
  if (url.search || url.hash) {
    throw new PaperlessError("Die Paperless-URL darf keinen Query-String oder Anker enthalten.", 400, "PAPERLESS_URL_INVALID");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

export const paperlessApiUrl = (baseUrl, path) => {
  const base = `${normalizePaperlessBaseUrl(baseUrl)}/`;
  return new URL(`api/${String(path).replace(/^\/+/, "")}`, base);
};

export async function getPaperlessConfiguration({ required = true } = {}) {
  const configuration = await prisma.paperlessConfiguration.findFirst({
    include: { folders: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } }
  });
  if (!configuration && required) {
    throw new PaperlessError("Paperless-ngx ist noch nicht eingerichtet.", 409, "PAPERLESS_NOT_CONFIGURED");
  }
  return configuration;
}

async function responseError(response) {
  let detail = "";
  try {
    const data = await response.clone().json();
    detail = String(data?.detail || data?.message || data?.error || "").slice(0, MAX_ERROR_TEXT);
  } catch {
    try { detail = (await response.clone().text()).slice(0, MAX_ERROR_TEXT); } catch { /* empty */ }
  }
  if (response.status === 401) {
    return new PaperlessError("Der Paperless-API-Token wurde abgelehnt.", 424, "PAPERLESS_AUTH_FAILED");
  }
  if (response.status === 403) {
    return new PaperlessError("Der Paperless-API-Benutzer hat für diese Aktion keine Berechtigung.", 424, "PAPERLESS_PERMISSION_DENIED");
  }
  if (response.status === 404) {
    return new PaperlessError("Das Dokument wurde in Paperless nicht gefunden.", 404, "PAPERLESS_DOCUMENT_NOT_FOUND");
  }
  return new PaperlessError(
    `Paperless antwortete mit HTTP ${response.status}${detail ? `: ${detail}` : ""}.`,
    424,
    "PAPERLESS_REQUEST_FAILED"
  );
}

export async function paperlessFetch(path, options = {}) {
  const configuration = options.configuration ?? await getPaperlessConfiguration();
  if (!configuration.enabled && !options.allowDisabled) {
    throw new PaperlessError("Die Paperless-Verknüpfung ist deaktiviert.", 409, "PAPERLESS_DISABLED");
  }
  const token = options.token ?? await getTenantSecret(PAPERLESS_API_TOKEN_SECRET);
  if (!token) {
    throw new PaperlessError("Es ist kein Paperless-API-Token hinterlegt.", 409, "PAPERLESS_TOKEN_MISSING");
  }

  let url = paperlessApiUrl(configuration.baseUrl, path);
  const headers = new Headers(options.headers || {});
  headers.set("authorization", `Token ${token}`);
  if (!headers.has("accept")) headers.set("accept", "application/json");

  const request = async requestUrl => fetch(requestUrl, {
    method: options.method || "GET",
    headers,
    body: options.body,
    redirect: "manual",
    signal: AbortSignal.timeout(options.timeoutMs || REQUEST_TIMEOUT_MS)
  });

  let response;
  try {
    response = await request(url);
    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw await responseError(response);
      const redirected = new URL(location, url);
      if (redirected.origin !== url.origin) {
        throw new PaperlessError("Paperless leitete auf einen anderen Host um; der API-Token wurde nicht weitergegeben.", 424, "PAPERLESS_CROSS_ORIGIN_REDIRECT");
      }
      url = redirected;
      response = await request(url);
    }
  } catch (error) {
    if (error instanceof PaperlessError) throw error;
    throw new PaperlessError(`Paperless ist nicht erreichbar: ${error.message}`, 424, "PAPERLESS_UNREACHABLE");
  }
  if (!response.ok) throw await responseError(response);
  return response;
}

export async function paperlessJson(path, options = {}) {
  const response = await paperlessFetch(path, options);
  try {
    return { data: await response.json(), response };
  } catch {
    throw new PaperlessError("Paperless lieferte keine gültige JSON-Antwort.", 424, "PAPERLESS_RESPONSE_INVALID");
  }
}

const safeDate = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const relatedName = (value, names) => {
  if (value == null) return null;
  return names?.get(Number(value)) || (typeof value === "string" ? value : null);
};

export function normalizeRemoteDocument(document, names = {}) {
  const latestVersion = document?.versions?.find?.(version => version.id === document.latest_version)
    || document?.versions?.at?.(-1)
    || null;
  const title = String(document?.title || document?.original_file_name || `Paperless-Dokument ${document?.id}`).slice(0, 500);
  return {
    remoteDocumentId: Number(document.id),
    remoteVersionId: Number(document.latest_version || latestVersion?.id) || null,
    title,
    originalFileName: String(document.original_file_name || latestVersion?.original_file_name || "").slice(0, 500) || null,
    mimeType: String(document.mime_type || latestVersion?.mime_type || "").slice(0, 200) || null,
    checksum: String(document.checksum || latestVersion?.checksum || "").slice(0, 200) || null,
    documentType: relatedName(document.document_type, names.documentTypes),
    correspondent: relatedName(document.correspondent, names.correspondents),
    remoteCreatedAt: safeDate(document.created),
    remoteAddedAt: safeDate(document.added),
    remoteModifiedAt: safeDate(document.modified),
    remoteMetadata: {
      archiveSerialNumber: document.archive_serial_number ?? null,
      tags: Array.isArray(document.tags) ? document.tags : [],
      storagePath: document.storage_path ?? null,
      pageCount: document.page_count ?? latestVersion?.page_count ?? null
    }
  };
}

async function loadNameMap(path) {
  try {
    const { data } = await paperlessJson(`${path}?page_size=1000`);
    return new Map((data.results || data || []).map(item => [Number(item.id), String(item.name || item.title || item.id)]));
  } catch {
    return new Map();
  }
}

export async function loadPaperlessTaxonomies() {
  const [documentTypes, correspondents] = await Promise.all([
    loadNameMap("document_types/"),
    loadNameMap("correspondents/")
  ]);
  return { documentTypes, correspondents };
}

export async function fetchRemoteDocument(remoteDocumentId, { names } = {}) {
  const remoteId = Number(remoteDocumentId);
  if (!Number.isSafeInteger(remoteId) || remoteId < 1) {
    throw new PaperlessError("Ungültige Paperless-Dokument-ID.", 400, "PAPERLESS_DOCUMENT_ID_INVALID");
  }
  const [{ data }, taxonomies] = await Promise.all([
    paperlessJson(`documents/${remoteId}/`),
    names ? Promise.resolve(names) : loadPaperlessTaxonomies()
  ]);
  return { raw: data, normalized: normalizeRemoteDocument(data, taxonomies) };
}

export async function persistNormalizedPaperlessDocument(normalized, {
  configuration = null,
  qrStatus = "queued"
} = {}) {
  const targetConfiguration = configuration || await getPaperlessConfiguration();
  const existing = await prisma.paperlessDocument.findFirst({
    where: { remoteDocumentId: normalized.remoteDocumentId },
    select: { id: true, status: true, assignmentSource: true }
  });
  const normalizedUpdate = { ...normalized };
  if (existing?.status === "linked" && existing.assignmentSource === "qr") {
    delete normalizedUpdate.title;
    delete normalizedUpdate.documentType;
  }
  const document = existing
    ? await prisma.paperlessDocument.update({
        where: { id: existing.id },
        data: {
          ...normalizedUpdate,
          ...(["linked", "dismissed"].includes(existing.status)
            ? {}
            : { status: "processing", qrStatus, qrError: null })
        }
      })
    : await prisma.paperlessDocument.create({
        data: {
          configurationId: targetConfiguration.id,
          ...normalized,
          status: "processing",
          qrStatus
        }
      });
  return { document, created: !existing };
}

export async function upsertPaperlessDocument(remoteDocumentId, { qrStatus = "queued" } = {}) {
  const configuration = await getPaperlessConfiguration();
  const { normalized } = await fetchRemoteDocument(remoteDocumentId);
  const { document } = await persistNormalizedPaperlessDocument(normalized, { configuration, qrStatus });
  return document;
}

export const paperlessDocumentInclude = {
  project: { select: { id: true, title: true, projectNumber: true } },
  customer: { select: { id: true, firstName: true, lastName: true, companyName: true, customerNumber: true } },
  folder: { select: { id: true, name: true } }
};

export function presentPaperlessDocument(document) {
  return {
    id: document.id,
    remoteDocumentId: document.remoteDocumentId,
    remoteVersionId: document.remoteVersionId,
    title: document.title,
    fileName: document.originalFileName || document.title,
    mimeType: document.mimeType,
    documentType: document.documentType,
    correspondent: document.correspondent,
    status: document.status,
    qrStatus: document.qrStatus,
    qrError: document.qrError,
    assignmentSource: document.assignmentSource,
    project: document.project || null,
    customer: document.customer || null,
    folder: document.folder || null,
    receivedAt: document.receivedAt,
    linkedAt: document.linkedAt,
    remoteCreatedAt: document.remoteCreatedAt,
    remoteAddedAt: document.remoteAddedAt
  };
}
