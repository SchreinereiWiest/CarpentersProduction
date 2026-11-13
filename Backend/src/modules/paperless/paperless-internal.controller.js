import { GetObjectCommand } from "@aws-sdk/client-s3";
import { pipeline } from "node:stream/promises";

import prisma from "../../infrastructure/database/prisma.js";
import { runWithTenant } from "../../infrastructure/database/tenant-context.js";
import { s3Download } from "../../infrastructure/storage/s3.js";
import { paperlessFetch } from "./paperless.service.js";
import { applyLocalDocumentQrResult, applyPaperlessQrResult } from "./paperless-qr.service.js";
import { streamPaperlessResponse } from "./paperless-stream.service.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function streamPaperlessDocumentToWorker(req, res) {
  const tenantId = String(req.query.tenantId || "");
  const documentId = String(req.params.documentId || "");
  if (!UUID.test(tenantId) || !UUID.test(documentId)) return res.status(400).json({ message: "Invalid request" });
  return runWithTenant({ tenantId, userId: "paperless-qr-worker" }, async () => {
    const document = await prisma.paperlessDocument.findFirst({ where: { id: documentId } });
    if (!document) return res.status(404).json({ message: "Document not found" });
    // Paperless liefert über preview nach Möglichkeit seine PDF/A-Rendition.
    // Dadurch kann der QR-Worker auch aus Office- oder Bildquellen lesen, ohne
    // dass Carpenters eine eigene Konvertierung oder Dateikopie anlegen muss.
    const response = await paperlessFetch(`documents/${document.remoteDocumentId}/preview/`, {
      headers: { accept: "application/pdf,image/*,*/*" },
      timeoutMs: 90_000
    });
    return streamPaperlessResponse(response, res);
  });
}

export async function streamLocalDocumentToWorker(req, res) {
  const tenantId = String(req.query.tenantId || "");
  const fileId = String(req.params.fileId || "");
  if (!UUID.test(tenantId) || !UUID.test(fileId)) return res.status(400).json({ message: "Invalid request" });
  return runWithTenant({ tenantId, userId: "paperless-qr-worker" }, async () => {
    const file = await prisma.file.findFirst({
      where: { id: fileId, category: "management-document", deletedAt: null },
      include: { storageObject: true }
    });
    if (!file) return res.status(404).json({ message: "Document not found" });
    const response = await s3Download.send(new GetObjectCommand({
      Bucket: file.storageObject.bucketName,
      Key: file.storageObject.objectKey
    }));
    res.setHeader("content-type", file.mimeType || response.ContentType || "application/octet-stream");
    res.setHeader("cache-control", "private, no-store");
    if (!response.Body) return res.status(502).json({ message: "Document content unavailable" });
    await pipeline(response.Body, res);
  });
}

export async function receivePaperlessQrResult(req, res) {
  const tenantId = String(req.body?.tenantId || "");
  const documentId = String(req.body?.documentId || "");
  if (!UUID.test(tenantId) || !UUID.test(documentId)) return res.status(400).json({ message: "Invalid QR result" });
  return runWithTenant({ tenantId, userId: "paperless-qr-worker" }, async () => {
    const result = await applyPaperlessQrResult(documentId, req.body);
    return res.status(result.missing ? 404 : 200).json(result);
  });
}

export async function receiveLocalDocumentQrResult(req, res) {
  const tenantId = String(req.body?.tenantId || "");
  const documentId = String(req.body?.documentId || "");
  if (!UUID.test(tenantId) || !UUID.test(documentId)) return res.status(400).json({ message: "Invalid QR result" });
  return runWithTenant({ tenantId, userId: "paperless-qr-worker" }, async () => {
    const result = await applyLocalDocumentQrResult(documentId, req.body);
    return res.status(result.missing ? 404 : 200).json(result);
  });
}
