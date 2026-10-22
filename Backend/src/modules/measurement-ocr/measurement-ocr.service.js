import crypto from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import prisma from "../../infrastructure/database/prisma.js";
import { pushValkeyJob } from "../../infrastructure/queue/valkey.js";
import { s3Upload } from "../../infrastructure/storage/s3.js";
import { getTenantId } from "../../infrastructure/database/tenant-context.js";
import { enqueueStorageDeletions } from "../../infrastructure/storage/storage-deletion.service.js";
import { publishFileChange } from "../files/file-change-events.service.js";
import { assertProjectDocument } from "../../../../Engine/src/contracts/project/project-documents.js";

export const MEASUREMENT_OCR_QUEUE = "measurement:ocr:jobs";

export const normalizeMeasurementValue = (value) => {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return normalized;
};

export const safeUploadName = (value) =>
  String(value || "scan")
    .split(/[\\/]/)
    .pop()
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+\./g, ".")
    .replace(/^[.-]+|[-.]+$/g, "")
    .slice(0, 120) || "scan";

export async function signedInternalDownload(file) {
  return getSignedUrl(
    s3Upload,
    new GetObjectCommand({
      Bucket: file.storageObject.bucketName,
      Key: file.storageObject.objectKey
    }),
    { expiresIn: 30 * 60 }
  );
}

export async function enqueueMeasurementScan(scan) {
  const scanWithFile = scan.file?.storageObject
    ? scan
    : await prisma.measurementScan.findUnique({
        where: { id: scan.id },
        include: { file: { include: { storageObject: true } } }
      });
  if (!scanWithFile) throw new Error("Measurement scan not found");

  const downloadUrl = await signedInternalDownload(scanWithFile.file);
  await pushValkeyJob(MEASUREMENT_OCR_QUEUE, {
    schemaVersion: 1,
    type: "measurement-page",
    tenantId: getTenantId(),
    scanId: scanWithFile.id,
    mimeType: scanWithFile.file.mimeType,
    downloadUrl,
    resolveUrl: process.env.MEASUREMENT_OCR_RESOLVE_URL ||
      "http://backendjs:5000/api/internal/measurement-ocr/resolve",
    callbackUrl: process.env.MEASUREMENT_OCR_CALLBACK_URL ||
      "http://backendjs:5000/api/internal/measurement-ocr/result"
  });
  await prisma.measurementScan.update({
    where: { id: scanWithFile.id },
    data: {
      status: "queued",
      error: null,
      completedAt: null,
      attempts: { increment: 1 }
    }
  });
}

export async function applyMeasurementScan(scanId, actorUserId) {
  const scan = await prisma.measurementScan.findUnique({
    where: { id: scanId },
    include: { items: true, project: true }
  });
  if (!scan?.projectId) {
    const error = new Error("Der Scan ist noch keinem Projekt zugeordnet.");
    error.statusCode = 409;
    throw error;
  }
  if (scan.status !== "review") {
    const error = new Error("Dieser Scan steht nicht zur Übernahme bereit.");
    error.statusCode = 409;
    throw error;
  }

  const accepted = scan.items
    .filter((item) => item.status === "accepted")
    .map((item) => ({ ...item, value: normalizeMeasurementValue(item.acceptedValue) }))
    .filter((item) => item.value != null);
  if (!accepted.length) {
    const error = new Error("Es wurden keine gültigen Maßwerte bestätigt.");
    error.statusCode = 422;
    throw error;
  }

  const generatedFile = await prisma.file.findFirst({
    where: {
      projectId: scan.projectId,
      fileName: "aufmas.json",
      deletedAt: null
    },
    include: { storageObject: true }
  });
  if (!generatedFile) {
    const error = new Error("Für das Projekt wurden noch keine Aufmaßdaten gespeichert.");
    error.statusCode = 404;
    throw error;
  }

  const response = await s3Upload.send(new GetObjectCommand({
    Bucket: generatedFile.storageObject.bucketName,
    Key: generatedFile.storageObject.objectKey
  }));
  const document = JSON.parse(await response.Body.transformToString("utf8"));
  const values = new Map(accepted.map((item) => [String(item.objectId), item.value]));
  let changed = 0;
  document.objects = (document.objects ?? []).map((object) => {
    const value = values.get(String(object.id));
    if (value == null) return object;
    changed += 1;
    return { ...object, value, status: "measured" };
  });
  if (!changed) {
    const error = new Error("Die bestätigten Maßfelder existieren nicht mehr im aktuellen Aufmaß.");
    error.statusCode = 409;
    throw error;
  }
  assertProjectDocument("aufmas", document);

  const nextVersion = generatedFile.serverVersion + 1;
  const objectKey = `tenants/${getTenantId()}/projects/${scan.projectId}/versions/${nextVersion}-${crypto.randomUUID()}-aufmas.json`;
  const body = Buffer.from(JSON.stringify(document), "utf8");
  await s3Upload.send(new PutObjectCommand({
    Bucket: generatedFile.storageObject.bucketName,
    Key: objectKey,
    Body: body,
    ContentType: "application/json"
  }));

  await prisma.$transaction(async (transaction) => {
    const claim = await transaction.file.updateMany({
      where: { id: generatedFile.id, serverVersion: generatedFile.serverVersion },
      data: {
        serverVersion: { increment: 1 },
        fileSize: body.length,
        status: "complete"
      }
    });
    if (claim.count !== 1) {
      const error = new Error("Die Aufmaßdaten wurden zwischenzeitlich geändert. Bitte Scan erneut prüfen.");
      error.statusCode = 409;
      throw error;
    }
    await transaction.s3Object.update({
      where: { id: generatedFile.storageObject.id },
      data: { objectKey }
    });
    await enqueueStorageDeletions(transaction, [{
      bucketName: generatedFile.storageObject.bucketName,
      objectKey: generatedFile.storageObject.objectKey
    }]);
    await transaction.measurementScan.update({
      where: { id: scan.id },
      data: { status: "applied", appliedAt: new Date(), error: null }
    });
    await transaction.auditLog.create({
      data: {
        actorUserId,
        action: "measurement.scan.apply",
        entityType: "MeasurementScan",
        entityId: scan.id,
        metadata: { projectId: scan.projectId, appliedMeasurements: changed }
      }
    });
  });

  publishFileChange({
    tenantId: getTenantId(),
    action: "updated",
    resourceType: "project-json",
    fileId: generatedFile.id,
    projectId: scan.projectId,
    fileName: "aufmas.json",
    serverVersion: nextVersion
  });
  return { appliedMeasurements: changed, version: nextVersion };
}
