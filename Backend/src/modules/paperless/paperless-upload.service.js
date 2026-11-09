import path from "node:path";

import prisma from "../../infrastructure/database/prisma.js";
import { enqueuePaperlessQrInspection } from "./paperless-qr.service.js";
import {
  PaperlessError,
  paperlessJson,
  presentPaperlessDocument,
  upsertPaperlessDocument
} from "./paperless.service.js";

const TASK_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TASK_FAILURE_STATES = new Set(["FAILURE", "FAILED", "REVOKED"]);
const TASK_SUCCESS_STATES = new Set(["SUCCESS", "SUCCEEDED"]);
const MAX_TASK_POLLS = 20;
const TASK_POLL_INTERVAL_MS = 750;

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export function paperlessUploadTaskId(data) {
  const candidate = typeof data === "string"
    ? data
    : data?.task_id || data?.taskId || data?.id;
  const normalized = String(candidate || "").replace(/^"|"$/g, "").trim();
  return TASK_ID.test(normalized) ? normalized : null;
}

const taskList = data => Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

export function paperlessTaskDocumentId(task) {
  const directCandidates = [
    task?.related_document,
    task?.relatedDocument,
    task?.result_data?.document_id,
    task?.resultData?.documentId
  ];
  for (const candidate of directCandidates) {
    const documentId = Number(candidate);
    if (Number.isSafeInteger(documentId) && documentId > 0) return documentId;
  }
  if (typeof task?.result === "string") {
    try {
      return paperlessTaskDocumentId({ result_data: JSON.parse(task.result) });
    } catch {
      const match = task.result.match(/(?:document_id|document)\D{0,12}(\d+)/i);
      if (match) return Number(match[1]);
    }
  }
  return null;
}

export function isSupportedPaperlessUpload(file) {
  if (!file?.buffer?.length) return false;
  if (file.mimetype === "application/pdf") {
    return file.buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (file.mimetype === "image/jpeg") {
    return file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  }
  return false;
}

const safeUploadName = value => {
  const baseName = path.basename(String(value || "document"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 240);
  return baseName || "document";
};

async function importConsumedDocument(remoteDocumentId) {
  const existing = await prisma.paperlessDocument.findFirst({
    where: { remoteDocumentId },
    select: { id: true, status: true, qrStatus: true }
  });
  const document = await upsertPaperlessDocument(remoteDocumentId);
  if (!existing && !["linked", "dismissed"].includes(document.status)) {
    try {
      await enqueuePaperlessQrInspection(document);
    } catch (error) {
      await prisma.paperlessDocument.update({
        where: { id: document.id },
        data: { status: "inbox", qrStatus: "failed", qrError: String(error.message || error).slice(0, 2000) }
      });
    }
  }
  return document;
}

export async function uploadPaperlessDocument(file, actor) {
  if (!isSupportedPaperlessUpload(file)) {
    throw new PaperlessError("Bitte eine gültige PDF- oder JPEG-Datei auswählen.", 415, "PAPERLESS_UPLOAD_TYPE_INVALID");
  }

  const fileName = safeUploadName(file.originalname);
  const form = new FormData();
  form.append("document", new Blob([file.buffer], { type: file.mimetype }), fileName);
  const { data } = await paperlessJson("documents/post_document/", {
    method: "POST",
    body: form,
    timeoutMs: 90_000
  });
  const taskId = paperlessUploadTaskId(data);
  if (!taskId) {
    throw new PaperlessError("Paperless hat keine gültige Verarbeitungs-ID zurückgegeben.", 424, "PAPERLESS_UPLOAD_TASK_INVALID");
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "paperless.document.upload_requested",
      entityType: "PaperlessUploadTask",
      metadata: { taskId, fileName, mimeType: file.mimetype, fileSize: file.size }
    }
  });

  for (let attempt = 0; attempt < MAX_TASK_POLLS; attempt += 1) {
    if (attempt > 0) await delay(TASK_POLL_INTERVAL_MS);
    let taskData;
    try {
      ({ data: taskData } = await paperlessJson(`tasks/?task_id=${encodeURIComponent(taskId)}`, { timeoutMs: 5_000 }));
    } catch {
      break;
    }
    const task = taskList(taskData).find(item => String(item.task_id || item.taskId) === taskId);
    if (!task) continue;
    const state = String(task.status || "").toUpperCase();
    if (TASK_FAILURE_STATES.has(state)) {
      throw new PaperlessError("Paperless konnte das Dokument nicht verarbeiten.", 422, "PAPERLESS_CONSUMPTION_FAILED");
    }
    if (!TASK_SUCCESS_STATES.has(state)) continue;
    const remoteDocumentId = paperlessTaskDocumentId(task);
    if (!remoteDocumentId) {
      throw new PaperlessError("Paperless hat keine Dokument-ID für den Upload zurückgegeben.", 424, "PAPERLESS_UPLOAD_DOCUMENT_MISSING");
    }
    const document = await importConsumedDocument(remoteDocumentId);
    await prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "paperless.document.upload_imported",
        entityType: "PaperlessDocument",
        entityId: document.id,
        metadata: { taskId, remoteDocumentId }
      }
    });
    return { status: "imported", taskId, document: presentPaperlessDocument(document) };
  }

  return { status: "processing", taskId, document: null };
}
