import crypto from "node:crypto";

import prisma from "../../infrastructure/database/prisma.js";
import { getTenantId } from "../../infrastructure/database/tenant-context.js";
import { pushValkeyJob } from "../../infrastructure/queue/valkey.js";
import { getTenantSecret } from "../attachment-search/tenant-secrets.service.js";
import {
  PAPERLESS_QR_SIGNING_SECRET,
  getPaperlessConfiguration
} from "./paperless.service.js";

export const PAPERLESS_QR_PREFIX = "CPD1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const signatureFor = (encoded, secret) => crypto
  .createHmac("sha256", secret)
  .update(`${PAPERLESS_QR_PREFIX}.${encoded}`)
  .digest("base64url");

export function createPaperlessQrValue(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${PAPERLESS_QR_PREFIX}.${encoded}.${signatureFor(encoded, secret)}`;
}

export function verifyPaperlessQrValue(value, secret, tenantId) {
  const [prefix, encoded, providedSignature, ...rest] = String(value || "").trim().split(".");
  if (prefix !== PAPERLESS_QR_PREFIX || !encoded || !providedSignature || rest.length) return null;
  const expected = signatureFor(encoded, secret);
  const left = Buffer.from(providedSignature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload?.v !== 1 || payload?.tenantId !== tenantId) return null;
    if (payload.projectId && !UUID.test(payload.projectId)) return null;
    if (payload.customerId && !UUID.test(payload.customerId)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function enqueuePaperlessQrInspection(document) {
  const configuration = await getPaperlessConfiguration();
  if (!configuration.autoAssignQr) {
    await prisma.paperlessDocument.update({
      where: { id: document.id },
      data: { status: "inbox", qrStatus: "disabled", qrError: null }
    });
    return false;
  }
  const base = process.env.PAPERLESS_INTERNAL_BASE_URL || "http://carpenters-backend:5000/api/internal/paperless";
  await pushValkeyJob(process.env.MEASUREMENT_OCR_QUEUE || "measurement:ocr:jobs", {
    schemaVersion: 1,
    type: "paperless-document-qr",
    tenantId: getTenantId(),
    documentId: document.id,
    mimeType: document.mimeType,
    downloadUrl: `${base}/content/${document.id}?tenantId=${getTenantId()}`,
    callbackUrl: `${base}/qr-result`
  });
  await prisma.paperlessDocument.update({
    where: { id: document.id },
    data: { status: "processing", qrStatus: "queued", qrError: null }
  });
  return true;
}

async function resolveCpdAssignment(value) {
  const tenantId = getTenantId();
  const secret = await getTenantSecret(PAPERLESS_QR_SIGNING_SECRET);
  if (!secret) return null;
  const payload = verifyPaperlessQrValue(value, secret, tenantId);
  if (!payload) return null;

  if (payload.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: payload.projectId, deletedAt: null },
      select: { id: true, customerId: true }
    });
    if (!project || (payload.customerId && payload.customerId !== project.customerId)) return null;
    return { payload, projectId: project.id, customerId: project.customerId };
  }
  if (payload.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: payload.customerId, deletedAt: null },
      select: { id: true }
    });
    if (!customer) return null;
    return { payload, projectId: null, customerId: customer.id };
  }
  return null;
}

async function resolveMeasurementAssignment(value) {
  if (!String(value).startsWith("CPM1:")) return null;
  const page = await prisma.measurementPrintPage.findFirst({
    where: { identifier: String(value) },
    include: { printRun: { select: { projectId: true } } }
  });
  if (!page) return null;
  const project = await prisma.project.findFirst({
    where: { id: page.printRun.projectId, deletedAt: null },
    select: { id: true, customerId: true }
  });
  return project ? {
    payload: { v: 1, projectId: project.id, customerId: project.customerId, documentType: "Aufmaß" },
    projectId: project.id,
    customerId: project.customerId
  } : null;
}

export async function applyPaperlessQrResult(documentId, body) {
  const document = await prisma.paperlessDocument.findFirst({ where: { id: documentId } });
  if (!document) return { accepted: false, missing: true };
  if (document.status === "dismissed") return { accepted: true, assigned: false, dismissed: true };
  if (body.error) {
    await prisma.paperlessDocument.update({
      where: { id: document.id },
      data: { status: "inbox", qrStatus: "failed", qrError: String(body.error).slice(0, 2000) }
    });
    return { accepted: true, assigned: false };
  }

  const values = Array.isArray(body.values) ? body.values.slice(0, 50) : [];
  let assignment = null;
  for (const entry of values) {
    const value = typeof entry === "string" ? entry : entry?.value;
    assignment = await resolveCpdAssignment(value) || await resolveMeasurementAssignment(value);
    if (assignment) break;
  }

  if (!assignment) {
    await prisma.paperlessDocument.update({
      where: { id: document.id },
      data: {
        status: "inbox",
        qrStatus: values.length ? "invalid" : "none",
        // Fremde QR-Inhalte können Zugangsdaten oder personenbezogene Daten
        // enthalten. Ohne gültige Carpenters-Signatur speichern wir nur die
        // Anzahl, niemals den gelesenen Rohwert.
        qrPayload: values.length ? { detectedCount: values.length } : undefined,
        qrError: null
      }
    });
    return { accepted: true, assigned: false };
  }

  await prisma.$transaction(async transaction => {
    await transaction.paperlessDocument.update({
      where: { id: document.id },
      data: {
        projectId: assignment.projectId,
        customerId: assignment.customerId,
        folderId: null,
        status: "linked",
        qrStatus: "matched",
        qrPayload: assignment.payload,
        qrError: null,
        documentType: assignment.payload.documentType
          ? String(assignment.payload.documentType).slice(0, 120)
          : document.documentType,
        title: assignment.payload.title
          ? String(assignment.payload.title).slice(0, 500)
          : document.title,
        assignmentSource: "qr",
        linkedAt: new Date()
      }
    });
    await transaction.auditLog.create({
      data: {
        action: "paperless.document.auto_link",
        entityType: "PaperlessDocument",
        entityId: document.id,
        metadata: {
          remoteDocumentId: document.remoteDocumentId,
          projectId: assignment.projectId,
          customerId: assignment.customerId,
          documentType: assignment.payload.documentType || null
        }
      }
    });
  });
  return { accepted: true, assigned: true };
}
