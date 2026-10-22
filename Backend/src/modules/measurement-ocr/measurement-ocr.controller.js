import crypto from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import prisma from "../../infrastructure/database/prisma.js";
import { getTenantId, runWithTenant } from "../../infrastructure/database/tenant-context.js";
import { s3Upload } from "../../infrastructure/storage/s3.js";
import {
  applyMeasurementScan,
  enqueueMeasurementScan,
  normalizeMeasurementValue,
  safeUploadName
} from "./measurement-ocr.service.js";

const scanInclude = {
  file: { select: { id: true, fileName: true, mimeType: true, uploadedAt: true } },
  project: { select: { id: true, title: true, projectNumber: true } },
  printPage: { select: { id: true, label: true, viewId: true, pageNumber: true } },
  items: { orderBy: { createdAt: "asc" } }
};

const presentScan = (scan) => ({
  id: scan.id,
  status: scan.status,
  error: scan.error,
  rawIdentifier: scan.rawIdentifier,
  alignment: scan.alignment,
  createdAt: scan.createdAt,
  completedAt: scan.completedAt,
  appliedAt: scan.appliedAt,
  file: scan.file,
  project: scan.project,
  page: scan.printPage,
  items: scan.items ?? []
});

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));

const validField = (field, page) =>
  field &&
  typeof field === "object" &&
  isUuid(field.id) &&
  String(field.objectId || "").length > 0 &&
  [field.xMm, field.yMm, field.widthMm, field.heightMm].every((value) =>
    Number.isFinite(Number(value))
  ) &&
  Number(field.widthMm) >= 8 &&
  Number(field.heightMm) >= 5 &&
  Number(field.xMm) >= 0 &&
  Number(field.yMm) >= 0 &&
  Number(field.xMm) + Number(field.widthMm) <= Number(page.widthMm) &&
  Number(field.yMm) + Number(field.heightMm) <= Number(page.heightMm);

export async function createPrintRun(req, res) {
  const layout = req.body.layout;
  if (!layout || !isUuid(layout.runId) || String(layout.projectId) !== String(req.body.projectId)) {
    return res.status(400).json({ message: "Ungültige Drucksitzung." });
  }
  if (!Array.isArray(layout.pages) || !layout.pages.length || layout.pages.length > 100) {
    return res.status(400).json({ message: "Die Drucksitzung enthält keine gültigen Seiten." });
  }
  const pageIds = new Set();
  const pageNumbers = new Set();
  for (const page of layout.pages) {
    if (
      !isUuid(page.id) ||
      pageIds.has(page.id) ||
      !Number.isInteger(Number(page.pageNumber)) ||
      Number(page.pageNumber) < 1 ||
      pageNumbers.has(Number(page.pageNumber)) ||
      !Number.isFinite(Number(page.widthMm)) ||
      !Number.isFinite(Number(page.heightMm)) ||
      Number(page.widthMm) < 100 ||
      Number(page.widthMm) > 500 ||
      Number(page.heightMm) < 100 ||
      Number(page.heightMm) > 500 ||
      !String(page.viewId || "").length ||
      String(page.viewId).length > 200 ||
      !String(page.label || "").length ||
      String(page.label).length > 300 ||
      String(page.identifier || "") !== `CPM1:${layout.projectId}:${layout.runId}:${page.id}` ||
      !Array.isArray(page.fields) ||
      page.fields.length > 1000 ||
      page.fields.some((field) => !validField(field, page))
    ) {
      return res.status(400).json({ message: "Ungültige Seiten- oder Feldkoordinaten." });
    }
    pageIds.add(page.id);
    pageNumbers.add(Number(page.pageNumber));
  }

  const source = await prisma.file.findFirst({
    where: { projectId: req.body.projectId, fileName: "aufmas.json", deletedAt: null },
    select: { serverVersion: true }
  });
  const printRun = await prisma.$transaction(async (transaction) => {
    const created = await transaction.measurementPrintRun.create({
      data: {
        id: layout.runId,
        projectId: req.body.projectId,
        createdById: req.user.id,
        schemaVersion: Number(layout.schemaVersion) || 1,
        format: String(layout.format || "A4"),
        orientation: String(layout.orientation || "landscape"),
        sourceVersion: source?.serverVersion ?? null,
        status: "active",
        metadata: {
          pageWidthMm: layout.pageWidthMm,
          pageHeightMm: layout.pageHeightMm,
          drawingFrame: layout.drawingFrame,
          generatedAt: req.body.generatedAt || new Date().toISOString()
        },
        pages: {
          create: layout.pages.map((page) => ({
            id: page.id,
            tenantId: getTenantId(),
            viewId: String(page.viewId),
            pageNumber: Number(page.pageNumber),
            label: String(page.label),
            identifier: String(page.identifier),
            widthMm: Number(page.widthMm),
            heightMm: Number(page.heightMm),
            fields: page.fields,
            metadata: { fieldCount: page.fields.length }
          }))
        }
      },
      include: { pages: true }
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "measurement.print.generate",
        entityType: "MeasurementPrintRun",
        entityId: created.id,
        metadata: {
          projectId: req.body.projectId,
          pages: created.pages.length,
          fields: layout.pages.reduce((sum, page) => sum + page.fields.length, 0)
        },
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null
      }
    });
    return created;
  });
  res.status(201).json({ id: printRun.id, pages: printRun.pages.length });
}

export async function uploadScan(req, res) {
  if (!req.file) return res.status(400).json({ message: "Keine Scandatei hochgeladen." });
  const fileName = safeUploadName(req.file.originalname || req.body.fileName);
  const objectKey = `tenants/${getTenantId()}/measurement-scans/${crypto.randomUUID()}-${fileName}`;
  await s3Upload.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: objectKey,
    Body: req.file.buffer,
    ContentType: req.file.mimetype
  }));

  const scan = await prisma.$transaction(async (transaction) => {
    const storageObject = await transaction.s3Object.create({
      data: {
        provider: "garage",
        bucketName: process.env.S3_BUCKET,
        objectKey,
        endpoint: process.env.S3_PUBLIC_ENDPOINT
      }
    });
    const file = await transaction.file.create({
      data: {
        storageObjectId: storageObject.id,
        uploadedById: req.user.id,
        fileName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        category: "measurement-scan",
        status: "processing"
      }
    });
    return transaction.measurementScan.create({
      data: { fileId: file.id, uploadedById: req.user.id, status: "queued" },
      include: { file: { include: { storageObject: true } } }
    });
  });

  try {
    await enqueueMeasurementScan(scan);
  } catch (error) {
    await prisma.measurementScan.update({
      where: { id: scan.id },
      data: { status: "queue_failed", error: error.message }
    });
    throw error;
  }
  res.status(202).json({ id: scan.id, status: "queued" });
}

export async function listScans(_req, res) {
  const scans = await prisma.measurementScan.findMany({
    include: scanInclude,
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json({ scans: scans.map(presentScan) });
}

export async function listProjectScans(req, res) {
  const scans = await prisma.measurementScan.findMany({
    where: { projectId: req.params.projectId },
    include: scanInclude,
    orderBy: { createdAt: "desc" }
  });
  res.json({ scans: scans.map(presentScan) });
}

export async function retryScan(req, res) {
  const scan = await prisma.measurementScan.findUnique({
    where: { id: req.params.scanId },
    include: { file: { include: { storageObject: true } } }
  });
  if (!scan) return res.status(404).json({ message: "Scan nicht gefunden." });
  if (!["failed", "queue_failed", "review"].includes(scan.status)) {
    return res.status(409).json({ message: "Dieser Scan kann aktuell nicht erneut verarbeitet werden." });
  }
  await enqueueMeasurementScan(scan);
  res.status(202).json({ id: scan.id, status: "queued" });
}

export async function authorizeMeasurementScan(req, res, next) {
  const scan = await prisma.measurementScan.findUnique({
    where: { id: req.params.scanId },
    include: { project: { select: { status: true, deletedAt: true } } }
  });
  if (!scan) return res.status(404).json({ message: "Scan nicht gefunden." });
  if (scan.status !== "review") {
    return res.status(409).json({ message: "Dieser Scan steht nicht zur Prüfung bereit." });
  }
  if (
    !["admin", "manager"].includes(req.user?.role) &&
    (!scan.project || scan.project.status !== "active" || scan.project.deletedAt)
  ) {
    return res.status(403).json({ message: "Not authorized" });
  }
  req.authorizedMeasurementScan = scan;
  next();
}

export async function reviewScan(req, res) {
  const updates = Array.isArray(req.body.items) ? req.body.items : [];
  const scan = await prisma.measurementScan.findUnique({
    where: { id: req.params.scanId },
    include: { items: true }
  });
  if (!scan) return res.status(404).json({ message: "Scan nicht gefunden." });
  const allowed = new Map(scan.items.map((item) => [item.id, item]));

  await prisma.$transaction(async (transaction) => {
    for (const update of updates) {
      if (!allowed.has(update.id)) continue;
      const status = update.status === "rejected" ? "rejected" : "accepted";
      const acceptedValue = status === "accepted"
        ? normalizeMeasurementValue(update.acceptedValue)
        : null;
      if (status === "accepted" && acceptedValue == null) {
        const error = new Error("Bestätigte Maße müssen gültige Zahlen sein.");
        error.statusCode = 422;
        throw error;
      }
      await transaction.measurementScanItem.update({
        where: { id: update.id },
        data: { status, acceptedValue }
      });
    }
    await transaction.measurementScan.update({
      where: { id: scan.id },
      data: { status: "review", error: null }
    });
  });
  const updated = await prisma.measurementScan.findUnique({
    where: { id: scan.id },
    include: scanInclude
  });
  res.json({ scan: presentScan(updated) });
}

export async function applyScan(req, res) {
  const result = await applyMeasurementScan(req.params.scanId, req.user.id);
  res.json(result);
}

const safeSecretEqual = (provided) => {
  const expected = process.env.MEASUREMENT_OCR_SECRET;
  if (!expected || typeof provided !== "string") return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export function verifyOcrWorker(req, res, next) {
  if (!safeSecretEqual(req.get("x-measurement-ocr-secret"))) {
    return res.status(401).json({ message: "Invalid OCR worker secret" });
  }
  next();
}

export async function resolvePrintPage(req, res) {
  const tenantId = String(req.body.tenantId || "");
  const identifier = String(req.body.identifier || "");
  if (!isUuid(tenantId) || !identifier.startsWith("CPM1:")) {
    return res.status(400).json({ message: "Invalid identifier request" });
  }
  return runWithTenant({ tenantId, userId: "measurement-ocr" }, async () => {
    const page = await prisma.measurementPrintPage.findFirst({
      where: { identifier },
      include: { printRun: { select: { id: true, projectId: true } } }
    });
    if (!page) return res.status(404).json({ message: "Measurement page not found" });
    return res.json({
      pageId: page.id,
      runId: page.printRun.id,
      projectId: page.printRun.projectId,
      viewId: page.viewId,
      pageNumber: page.pageNumber,
      widthMm: page.widthMm,
      heightMm: page.heightMm,
      fields: page.fields
    });
  });
}

export async function receiveOcrResult(req, res) {
  const tenantId = String(req.body.tenantId || "");
  const scanId = String(req.body.scanId || "");
  if (!isUuid(tenantId) || !isUuid(scanId)) {
    return res.status(400).json({ message: "Invalid OCR result" });
  }
  return runWithTenant({ tenantId, userId: "measurement-ocr" }, async () => {
    const scan = await prisma.measurementScan.findUnique({ where: { id: scanId } });
    if (!scan) return res.status(404).json({ message: "Measurement scan not found" });

    if (req.body.error) {
      await prisma.$transaction(async (transaction) => {
        await transaction.measurementScan.update({
          where: { id: scanId },
          data: {
            status: "failed",
            error: String(req.body.error).slice(0, 2000),
            result: req.body.details ?? undefined,
            completedAt: new Date()
          }
        });
        await transaction.file.update({
          where: { id: scan.fileId },
          data: { status: "failed" }
        });
      });
      return res.json({ accepted: true });
    }

    const submittedPages = Array.isArray(req.body.pages) && req.body.pages.length
      ? req.body.pages
      : [{
          sourcePage: 1,
          identifier: req.body.identifier,
          alignment: req.body.alignment,
          items: req.body.items
        }];
    if (
      submittedPages.length > 100 ||
      submittedPages.some((entry) =>
        !Number.isInteger(Number(entry.sourcePage)) ||
        Number(entry.sourcePage) < 1 ||
        !String(entry.identifier || "").startsWith("CPM1:") ||
        !Array.isArray(entry.items) ||
        entry.items.length > 1000
      )
    ) {
      return res.status(422).json({ message: "Invalid measurement page results" });
    }
    const identifiers = submittedPages.map((entry) => String(entry.identifier));
    if (new Set(identifiers).size !== identifiers.length) {
      return res.status(422).json({ message: "Duplicate measurement page identifier" });
    }
    const printPages = await prisma.measurementPrintPage.findMany({
      where: { identifier: { in: identifiers } },
      include: { printRun: true }
    });
    if (printPages.length !== identifiers.length) {
      return res.status(422).json({ message: "Unknown measurement page identifier" });
    }
    const pageByIdentifier = new Map(
      printPages.map((page) => [page.identifier, page])
    );
    const projectIds = new Set(printPages.map((page) => page.printRun.projectId));
    if (projectIds.size !== 1) {
      return res.status(422).json({
        message: "A multi-page scan must contain pages from one project"
      });
    }
    const runIds = new Set(printPages.map((page) => page.printRunId));
    const items = submittedPages.flatMap((submittedPage) => {
      const page = pageByIdentifier.get(String(submittedPage.identifier));
      const knownFields = new Map(
        (Array.isArray(page.fields) ? page.fields : []).map((field) => [String(field.id), field])
      );
      return submittedPage.items
        .filter((item) => knownFields.has(String(item.fieldId)))
        .map((item) => {
          const field = knownFields.get(String(item.fieldId));
          const predictedValue = normalizeMeasurementValue(item.value);
          const parsedConfidence = item.confidence == null
            ? null
            : Number(item.confidence);
          const fieldLabel = field.label || "Maß";
          const crop = item.crop && typeof item.crop === "object" ? item.crop : {};
          return {
            fieldId: String(field.id),
            objectId: String(field.objectId),
            viewId: page.viewId,
            label: submittedPages.length > 1
              ? `${page.label} · ${fieldLabel}`
              : field.label || null,
            unit: field.unit || null,
            rawText: String(item.rawText || "").slice(0, 200),
            predictedValue,
            acceptedValue: predictedValue,
            confidence: predictedValue != null && Number.isFinite(parsedConfidence)
              ? Math.min(1, Math.max(0, parsedConfidence))
              : null,
            status: predictedValue != null ? "pending" : "unreadable",
            cropMetadata: {
              ...crop,
              sourcePage: Number(submittedPage.sourcePage),
              printPageId: page.id,
              identifier: page.identifier
            }
          };
        });
    });

    const firstPage = pageByIdentifier.get(identifiers[0]);
    const pageErrors = Array.isArray(req.body.details?.pageErrors)
      ? req.body.details.pageErrors
      : [];
    const partialWarning = pageErrors.length
      ? `${pageErrors.length} PDF-Seite${pageErrors.length === 1 ? " konnte" : "n konnten"} nicht verarbeitet werden.`
      : null;
    const alignment = submittedPages.length === 1
      ? submittedPages[0].alignment ?? undefined
      : {
          pages: submittedPages.map((entry) => ({
            sourcePage: Number(entry.sourcePage),
            identifier: String(entry.identifier),
            ...(entry.alignment && typeof entry.alignment === "object"
              ? entry.alignment
              : {})
          }))
        };
    const result = {
      ...(req.body.details && typeof req.body.details === "object"
        ? req.body.details
        : {}),
      itemCount: items.length,
      pageCount: submittedPages.length,
      pages: submittedPages.map((entry) => {
        const page = pageByIdentifier.get(String(entry.identifier));
        return {
          sourcePage: Number(entry.sourcePage),
          printPageId: page.id,
          identifier: page.identifier,
          label: page.label,
          itemCount: entry.items.length
        };
      })
    };

    await prisma.$transaction(async (transaction) => {
      await transaction.measurementScanItem.deleteMany({ where: { scanId } });
      if (items.length) {
        await transaction.measurementScanItem.createMany({ data: items.map((item) => ({ ...item, scanId })) });
      }
      await transaction.measurementScan.update({
        where: { id: scanId },
        data: {
          printRunId: runIds.size === 1 ? firstPage.printRunId : null,
          printPageId: submittedPages.length === 1 ? firstPage.id : null,
          projectId: firstPage.printRun.projectId,
          status: "review",
          rawIdentifier: firstPage.identifier,
          alignment,
          result,
          error: partialWarning,
          completedAt: new Date()
        }
      });
      await transaction.file.update({
        where: { id: scan.fileId },
        data: { projectId: firstPage.printRun.projectId, status: "completed" }
      });
    });
    return res.json({
      accepted: true,
      pages: submittedPages.length,
      items: items.length,
      pageErrors: pageErrors.length
    });
  });
}
