import prisma from "../../infrastructure/database/prisma.js";
import { getTenantId } from "../../infrastructure/database/tenant-context.js";
import { getTenantSecret, getTenantSecretStatus } from "../attachment-search/tenant-secrets.service.js";
import {
  PAPERLESS_API_TOKEN_SECRET,
  PAPERLESS_QR_SIGNING_SECRET,
  fetchRemoteDocument,
  getPaperlessConfiguration,
  loadPaperlessTaxonomies,
  normalizeRemoteDocument,
  paperlessDocumentInclude,
  paperlessFetch,
  paperlessJson,
  presentPaperlessDocument,
  upsertPaperlessDocument
} from "./paperless.service.js";
import { createPaperlessQrValue, enqueuePaperlessQrInspection } from "./paperless-qr.service.js";
import { streamPaperlessResponse } from "./paperless-stream.service.js";
import { syncPaperlessDocuments } from "./paperless-sync.service.js";
import { uploadPaperlessDocument as uploadDocument } from "./paperless-upload.service.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getPaperlessStatus(_req, res) {
  const [configuration, tokenStatus] = await Promise.all([
    getPaperlessConfiguration({ required: false }),
    getTenantSecretStatus(PAPERLESS_API_TOKEN_SECRET)
  ]);
  return res.json({
    configured: Boolean(configuration),
    connected: Boolean(configuration?.enabled && tokenStatus.configured),
    baseUrl: configuration?.baseUrl || null,
    folders: configuration?.folders ?? []
  });
}

export async function listPaperlessDocuments(req, res) {
  const where = {};
  if (req.query.status) where.status = String(req.query.status);
  else where.status = { not: "dismissed" };
  if (req.query.folderId && UUID.test(String(req.query.folderId))) where.folderId = String(req.query.folderId);
  const documents = await prisma.paperlessDocument.findMany({
    where,
    include: paperlessDocumentInclude,
    orderBy: [{ receivedAt: "desc" }],
    take: 250
  });
  return res.json({ documents: documents.map(presentPaperlessDocument) });
}

export async function syncPaperlessNow(_req, res) {
  const result = await syncPaperlessDocuments();
  return res.json(result);
}

export async function uploadPaperlessDocument(req, res) {
  if (!req.file) return res.status(400).json({ message: "Bitte eine Belegdatei auswählen." });
  const result = await uploadDocument(req.file, req.user);
  return res.status(result.status === "imported" ? 201 : 202).json(result);
}

export async function getAssignmentOptions(req, res) {
  const search = String(req.query.search || "").trim().slice(0, 120);
  const [projects, customers, configuration] = await Promise.all([
    prisma.project.findMany({
      where: {
        deletedAt: null,
        ...(search ? { OR: [
          { title: { contains: search, mode: "insensitive" } },
          { projectNumber: { contains: search, mode: "insensitive" } }
        ] } : {})
      },
      select: { id: true, title: true, projectNumber: true, customer: { select: { firstName: true, lastName: true, companyName: true } } },
      orderBy: { title: "asc" },
      take: 200
    }),
    prisma.customer.findMany({
      where: {
        deletedAt: null,
        ...(search ? { OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { companyName: { contains: search, mode: "insensitive" } },
          { customerNumber: { contains: search, mode: "insensitive" } }
        ] } : {})
      },
      select: { id: true, firstName: true, lastName: true, companyName: true, customerNumber: true },
      orderBy: [{ companyName: "asc" }, { lastName: "asc" }],
      take: 200
    }),
    getPaperlessConfiguration({ required: false })
  ]);
  return res.json({ projects, customers, folders: configuration?.folders ?? [] });
}

async function resolveAssignment(body) {
  const targetType = String(body?.targetType || "");
  const targetId = String(body?.targetId || "");
  if (!UUID.test(targetId)) {
    const error = new Error("Bitte ein gültiges Zuordnungsziel wählen.");
    error.statusCode = 400;
    throw error;
  }
  if (targetType === "project") {
    const project = await prisma.project.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true, customerId: true } });
    if (!project) throw Object.assign(new Error("Projekt nicht gefunden."), { statusCode: 404 });
    return { projectId: project.id, customerId: project.customerId, folderId: null };
  }
  if (targetType === "customer") {
    const customer = await prisma.customer.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } });
    if (!customer) throw Object.assign(new Error("Kunde nicht gefunden."), { statusCode: 404 });
    return { projectId: null, customerId: customer.id, folderId: null };
  }
  if (targetType === "folder") {
    const folder = await prisma.paperlessFolder.findFirst({ where: { id: targetId }, select: { id: true } });
    if (!folder) throw Object.assign(new Error("Dokumentordner nicht gefunden."), { statusCode: 404 });
    return { projectId: null, customerId: null, folderId: folder.id };
  }
  throw Object.assign(new Error("Unbekanntes Zuordnungsziel."), { statusCode: 400 });
}

const localDocumentInclude = {
  project: { select: { id: true, title: true, projectNumber: true } },
  customer: { select: { id: true, firstName: true, lastName: true, companyName: true, customerNumber: true } },
  documentFolder: { select: { id: true, name: true } }
};

const localDocumentLinked = file => Boolean(file.projectId || file.customerId || file.documentFolderId);
const localQrStatus = status => ({
  "qr-processing": "queued",
  "qr-linked": "matched",
  "qr-failed": "failed",
  "qr-invalid": "invalid",
  "qr-none": "none",
  "qr-disabled": "disabled"
})[status] || null;

export function presentLocalDocument(file) {
  return {
    id: file.id,
    source: "carpenters",
    title: file.fileName,
    fileName: file.fileName,
    mimeType: file.mimeType,
    documentType: "Carpenters-Beleg",
    correspondent: "Carpenters",
    status: localDocumentLinked(file) ? "linked" : file.status === "dismissed" ? "dismissed" : file.status === "qr-processing" ? "processing" : "inbox",
    qrStatus: localQrStatus(file.status),
    assignmentSource: localDocumentLinked(file) ? file.status === "qr-linked" ? "qr" : "manual" : null,
    project: file.project || null,
    customer: file.customer || null,
    folder: file.documentFolder || null,
    receivedAt: file.uploadedAt,
    linkedAt: localDocumentLinked(file) ? file.updatedAt : null
  };
}

async function findLocalDocument(fileId) {
  return prisma.file.findFirst({
    where: { id: fileId, category: "management-document", deletedAt: null },
    include: localDocumentInclude
  });
}

export async function listLocalDocuments(_req, res) {
  const files = await prisma.file.findMany({
    where: {
      category: "management-document",
      deletedAt: null,
      OR: [{ status: null }, { status: { not: "dismissed" } }]
    },
    include: localDocumentInclude,
    orderBy: { uploadedAt: "desc" },
    take: 250
  });
  return res.json({ documents: files.map(presentLocalDocument) });
}

export async function updateLocalDocumentAssignment(req, res) {
  const file = await findLocalDocument(req.params.fileId);
  if (!file) return res.status(404).json({ message: "Carpenters-Dokument nicht gefunden." });
  const assignment = await resolveAssignment(req.body);
  const updated = await prisma.$transaction(async transaction => {
    const result = await transaction.file.update({
      where: { id: file.id },
      data: {
        projectId: assignment.projectId,
        customerId: assignment.customerId,
        documentFolderId: assignment.folderId,
        status: "completed"
      },
      include: localDocumentInclude
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "management.document.link",
        entityType: "File",
        entityId: file.id,
        metadata: assignment
      }
    });
    return result;
  });
  return res.json({ document: presentLocalDocument(updated) });
}

export async function unlinkLocalDocument(req, res) {
  const file = await findLocalDocument(req.params.fileId);
  if (!file) return res.status(404).json({ message: "Carpenters-Dokument nicht gefunden." });
  const updated = await prisma.$transaction(async transaction => {
    const result = await transaction.file.update({
      where: { id: file.id },
      data: { projectId: null, customerId: null, documentFolderId: null, status: "completed" },
      include: localDocumentInclude
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "management.document.unlink",
        entityType: "File",
        entityId: file.id
      }
    });
    return result;
  });
  return res.json({ document: presentLocalDocument(updated) });
}

export async function dismissLocalDocument(req, res) {
  const file = await findLocalDocument(req.params.fileId);
  if (!file) return res.status(404).json({ message: "Carpenters-Dokument nicht gefunden." });
  if (localDocumentLinked(file)) {
    return res.status(409).json({ message: "Eine bereits zugeordnete Datei muss zuerst gelöst werden." });
  }
  await prisma.$transaction(async transaction => {
    await transaction.file.update({ where: { id: file.id }, data: { status: "dismissed" } });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "management.document.dismiss",
        entityType: "File",
        entityId: file.id
      }
    });
  });
  return res.status(204).end();
}

async function assignDocument(document, assignment, actor) {
  return prisma.$transaction(async transaction => {
    const updated = await transaction.paperlessDocument.update({
      where: { id: document.id },
      data: {
        ...assignment,
        status: "linked",
        assignmentSource: "manual",
        linkedById: actor.id,
        linkedAt: new Date()
      },
      include: paperlessDocumentInclude
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "paperless.document.link",
        entityType: "PaperlessDocument",
        entityId: document.id,
        metadata: { remoteDocumentId: document.remoteDocumentId, ...assignment }
      }
    });
    return updated;
  });
}

export async function updatePaperlessAssignment(req, res) {
  const document = await prisma.paperlessDocument.findFirst({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ message: "Dokument nicht gefunden." });
  const updated = await assignDocument(document, await resolveAssignment(req.body), req.user);
  return res.json({ document: presentPaperlessDocument(updated) });
}

export async function unlinkPaperlessDocument(req, res) {
  const document = await prisma.paperlessDocument.findFirst({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ message: "Dokument nicht gefunden." });
  const updated = await prisma.$transaction(async transaction => {
    const result = await transaction.paperlessDocument.update({
      where: { id: document.id },
      data: {
        projectId: null,
        customerId: null,
        folderId: null,
        status: "inbox",
        assignmentSource: null,
        linkedById: null,
        linkedAt: null
      },
      include: paperlessDocumentInclude
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "paperless.document.unlink",
        entityType: "PaperlessDocument",
        entityId: document.id,
        metadata: { remoteDocumentId: document.remoteDocumentId }
      }
    });
    return result;
  });
  return res.json({ document: presentPaperlessDocument(updated) });
}

export async function dismissPaperlessDocument(req, res) {
  const document = await prisma.paperlessDocument.findFirst({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ message: "Dokument nicht gefunden." });
  if (document.status === "linked") {
    return res.status(409).json({ message: "Eine bereits zugeordnete Datei muss zuerst gelöst werden." });
  }
  await prisma.$transaction(async transaction => {
    await transaction.paperlessDocument.update({
      where: { id: document.id },
      data: {
        status: "dismissed",
        projectId: null,
        customerId: null,
        folderId: null,
        assignmentSource: null,
        linkedById: null,
        linkedAt: null
      }
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "paperless.document.dismiss",
        entityType: "PaperlessDocument",
        entityId: document.id,
        metadata: { remoteDocumentId: document.remoteDocumentId }
      }
    });
  });
  return res.status(204).end();
}

export async function deletePaperlessDocument(req, res) {
  const document = await prisma.paperlessDocument.findFirst({ where: { id: req.params.documentId } });
  if (!document) return res.status(404).json({ message: "Dokument nicht gefunden." });
  if (document.status === "linked") {
    return res.status(409).json({ message: "Eine bereits zugeordnete Datei muss zuerst gelöst werden." });
  }

  let alreadyMissing = false;
  try {
    await paperlessFetch(`documents/${document.remoteDocumentId}/`, {
      method: "DELETE",
      headers: { accept: "application/json" },
      timeoutMs: 90_000
    });
  } catch (error) {
    if (error?.code !== "PAPERLESS_DOCUMENT_NOT_FOUND") throw error;
    alreadyMissing = true;
  }

  await prisma.$transaction(async transaction => {
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "paperless.document.delete_remote",
        entityType: "PaperlessDocument",
        entityId: document.id,
        metadata: { remoteDocumentId: document.remoteDocumentId, alreadyMissing }
      }
    });
    await transaction.paperlessDocument.delete({ where: { id: document.id } });
  });
  return res.status(204).end();
}

export async function searchPaperlessLibrary(req, res) {
  const query = String(req.query.query || "").trim().slice(0, 500);
  const page = Math.max(1, Math.min(10_000, Number(req.query.page) || 1));
  const params = new URLSearchParams({ page: String(page), page_size: "24", ordering: "-added" });
  if (query) params.set("query", query);
  const [{ data }, names] = await Promise.all([
    paperlessJson(`documents/?${params}`),
    loadPaperlessTaxonomies()
  ]);
  const results = Array.isArray(data.results) ? data.results : [];
  const ids = results.map(document => Number(document.id)).filter(Number.isSafeInteger);
  const links = ids.length ? await prisma.paperlessDocument.findMany({
    where: { remoteDocumentId: { in: ids } },
    include: paperlessDocumentInclude
  }) : [];
  const byRemoteId = new Map(links.map(link => [link.remoteDocumentId, link]));
  return res.json({
    count: Number(data.count) || results.length,
    next: Boolean(data.next),
    previous: Boolean(data.previous),
    page,
    results: results.map(document => {
      const normalized = normalizeRemoteDocument(document, names);
      const linked = byRemoteId.get(normalized.remoteDocumentId);
      return {
        remoteDocumentId: normalized.remoteDocumentId,
        title: normalized.title,
        fileName: normalized.originalFileName || normalized.title,
        documentType: normalized.documentType,
        correspondent: normalized.correspondent,
        createdAt: normalized.remoteCreatedAt,
        addedAt: normalized.remoteAddedAt,
        linked: linked ? presentPaperlessDocument(linked) : null
      };
    })
  });
}

export async function linkLibraryDocument(req, res) {
  const document = await upsertPaperlessDocument(req.params.remoteDocumentId, { qrStatus: "manual" });
  const updated = await assignDocument(document, await resolveAssignment(req.body), req.user);
  return res.status(201).json({ document: presentPaperlessDocument(updated) });
}

export async function importLibraryDocument(req, res) {
  const document = await upsertPaperlessDocument(req.params.remoteDocumentId);
  try {
    await enqueuePaperlessQrInspection(document);
  } catch (error) {
    await prisma.paperlessDocument.update({
      where: { id: document.id },
      data: { status: "inbox", qrStatus: "failed", qrError: error.message.slice(0, 2000) }
    });
  }
  return res.status(202).json({ id: document.id });
}

export async function authorizePaperlessDocument(req, res, next) {
  const document = await prisma.paperlessDocument.findFirst({
    where: { id: req.params.documentId },
    include: { project: { select: { status: true, deletedAt: true, createdById: true } } }
  });
  if (!document) return res.status(404).json({ message: "Dokument nicht gefunden." });
  if (!["admin", "manager"].includes(req.user.role)) {
    const canViewProject = document.project
      && !document.project.deletedAt
      && (document.project.status === "active" || document.project.createdById === req.user.id);
    if (!req.license?.features.includes("work-preparation") || !canViewProject) {
      return res.status(403).json({ message: "Not authorized" });
    }
  }
  req.paperlessDocument = document;
  next();
}

export async function proxyLinkedDocument(req, res) {
  const action = req.params.action === "thumbnail" ? "thumb" : "preview";
  const response = await paperlessFetch(`documents/${req.paperlessDocument.remoteDocumentId}/${action}/`, {
    // Der Paperless-Thumbnail-Renderer liefert WebP, lehnt aber konkrete
    // Bild-Accept-Header per Content-Negotiation mit 406 ab.
    headers: { accept: action === "thumb" ? "*/*" : "application/pdf,image/*,*/*" },
    timeoutMs: 90_000
  });
  return streamPaperlessResponse(response, res, { inline: true });
}

export async function proxyLibraryDocument(req, res) {
  const remoteId = Number(req.params.remoteDocumentId);
  if (!Number.isSafeInteger(remoteId) || remoteId < 1) return res.status(400).json({ message: "Ungültige Dokument-ID." });
  const action = req.params.action === "thumbnail" ? "thumb" : "preview";
  const response = await paperlessFetch(`documents/${remoteId}/${action}/`, {
    headers: { accept: action === "thumb" ? "*/*" : "application/pdf,image/*,*/*" },
    timeoutMs: 90_000
  });
  return streamPaperlessResponse(response, res, { inline: true });
}

export async function createAssignmentQr(req, res) {
  const documentType = String(req.body?.documentType || "Dokument").trim().slice(0, 120) || "Dokument";
  const title = String(req.body?.title || "").trim().slice(0, 300) || null;
  const assignment = await resolveAssignment(req.body);
  if (assignment.folderId) return res.status(400).json({ message: "QR-Codes können nur Kunden oder Projekten zugeordnet werden." });
  const secret = await getTenantSecret(PAPERLESS_QR_SIGNING_SECRET);
  if (!secret) return res.status(409).json({ message: "Bitte die Paperless-Einstellungen zuerst speichern." });
  const payload = {
    v: 1,
    tenantId: getTenantId(),
    customerId: assignment.customerId,
    projectId: assignment.projectId,
    documentType,
    title,
    issuedAt: new Date().toISOString()
  };
  return res.json({ value: createPaperlessQrValue(payload, secret), payload });
}

export async function remoteDocumentMetadata(req, res) {
  const { normalized } = await fetchRemoteDocument(req.params.remoteDocumentId);
  return res.json(normalized);
}
