import crypto from "node:crypto";

import prisma, { systemPrisma } from "../../infrastructure/database/prisma.js";
import { runWithTenant } from "../../infrastructure/database/tenant-context.js";
import { getTenantSecret } from "../attachment-search/tenant-secrets.service.js";
import {
  PAPERLESS_WEBHOOK_SECRET,
  getPaperlessConfiguration,
  upsertPaperlessDocument
} from "./paperless.service.js";
import { enqueuePaperlessQrInspection } from "./paperless-qr.service.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const secretEqual = (expected, provided) => {
  if (!expected || !provided) return false;
  const left = Buffer.from(String(expected));
  const right = Buffer.from(String(provided));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const documentIdFromBody = body => {
  const candidates = [
    body?.document_id,
    body?.doc_id,
    body?.documentId,
    body?.document?.id,
    body?.document?.document_id
  ];
  for (const candidate of candidates) {
    const direct = Number(candidate);
    if (Number.isSafeInteger(direct) && direct > 0) return direct;
  }
  const match = String(body?.doc_url || body?.document_url || "").match(/\/documents\/(\d+)/);
  return match ? Number(match[1]) : null;
};

export async function receivePaperlessWebhook(req, res) {
  const tenantId = String(req.params.tenantId || "");
  const remoteDocumentId = documentIdFromBody(req.body);
  if (!UUID.test(tenantId) || !remoteDocumentId) {
    return res.status(400).json({ message: "Ungültiger Paperless-Webhook." });
  }
  const tenant = await systemPrisma.tenant.findFirst({ where: { id: tenantId, status: "active" }, select: { id: true } });
  if (!tenant) return res.status(404).json({ message: "Tenant not found" });

  return runWithTenant({ tenantId, userId: "paperless-webhook" }, async () => {
    const configuration = await getPaperlessConfiguration({ required: false });
    const expected = await getTenantSecret(PAPERLESS_WEBHOOK_SECRET);
    if (!configuration?.enabled || !secretEqual(expected, req.get("x-carpenters-paperless-secret"))) {
      return res.status(401).json({ message: "Ungültiges Webhook-Secret." });
    }
    const document = await upsertPaperlessDocument(remoteDocumentId);
    if (document.status === "linked") {
      return res.status(202).json({ accepted: true, duplicate: true, id: document.id });
    }
    try {
      await enqueuePaperlessQrInspection(document);
    } catch (error) {
      await prisma.paperlessDocument.update({
        where: { id: document.id },
        data: { status: "inbox", qrStatus: "failed", qrError: error.message.slice(0, 2000) }
      });
    }
    return res.status(202).json({ accepted: true, id: document.id });
  });
}
