import crypto from "node:crypto";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import prisma from "../../infrastructure/database/prisma.js";
import { getTenantId } from "../../infrastructure/database/tenant-context.js";
import { s3Download, s3Upload } from "../../infrastructure/storage/s3.js";
import { loadCommissionWorkspace, sourceItems } from "./commercial.service.js";
import {
  calculateCommercialTotals,
  commercialDocumentData,
  CommercialValidationError,
  commissionData,
  normalizeTemplateAnalysis
} from "./commercial.validation.js";

const sendExpectedError = (res, error) => {
  if (!error.statusCode && !(error instanceof CommercialValidationError)) throw error;
  return res.status(error.statusCode || 400).json({ error: error.code || "COMMERCIAL_INVALID", message: error.message });
};

const commissionInclude = {
  projects: { where: { deletedAt: null }, orderBy: { title: "asc" }, select: { id: true, title: true, projectNumber: true, status: true, startDate: true } },
  _count: { select: { commercialDocuments: true } }
};

export async function listCustomerCommissions(req, res) {
  const commissions = await prisma.commission.findMany({
    where: { customerId: req.params.customerId },
    include: commissionInclude,
    orderBy: { createdAt: "desc" }
  });
  return res.json({ commissions });
}

export async function createCommission(req, res) {
  try {
    const input = commissionData(req.body);
    const customer = await prisma.customer.findFirst({ where: { id: req.params.customerId, deletedAt: null }, select: { id: true } });
    if (!customer) return res.status(404).json({ message: "Kunde nicht gefunden." });
    const projects = await prisma.project.findMany({
      where: { id: { in: input.projectIds }, customerId: customer.id, deletedAt: null },
      select: { id: true, commissionId: true }
    });
    if (projects.length !== input.projectIds.length) throw Object.assign(new Error("Mindestens ein Projekt gehört nicht zu diesem Kunden."), { statusCode: 400 });
    if (projects.some(project => project.commissionId)) throw Object.assign(new Error("Mindestens ein Projekt ist bereits kommissioniert."), { statusCode: 409 });

    const commission = await prisma.$transaction(async transaction => {
      const created = await transaction.commission.create({
        data: { customerId: customer.id, title: input.title, commissionNumber: input.commissionNumber, description: input.description }
      });
      await transaction.project.updateMany({ where: { id: { in: input.projectIds } }, data: { commissionId: created.id } });
      await transaction.auditLog.create({
        data: { actorUserId: req.user.id, action: "commission.create", entityType: "Commission", entityId: created.id, metadata: { customerId: customer.id, projectIds: input.projectIds } }
      });
      return transaction.commission.findUnique({ where: { id: created.id }, include: commissionInclude });
    });
    return res.status(201).json({ commission });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ message: "Diese Kommissionsnummer ist bereits vergeben." });
    return sendExpectedError(res, error);
  }
}

export async function updateCommission(req, res) {
  try {
    const current = await prisma.commission.findFirst({ where: { id: req.params.id }, select: { id: true, customerId: true } });
    if (!current) return res.status(404).json({ message: "Kommission nicht gefunden." });
    const input = commissionData(req.body);
    const projects = await prisma.project.findMany({
      where: { id: { in: input.projectIds }, customerId: current.customerId, deletedAt: null },
      select: { id: true, commissionId: true }
    });
    if (projects.length !== input.projectIds.length) throw Object.assign(new Error("Mindestens ein Projekt gehört nicht zu diesem Kunden."), { statusCode: 400 });
    if (projects.some(project => project.commissionId && project.commissionId !== current.id)) throw Object.assign(new Error("Mindestens ein Projekt gehört bereits zu einer anderen Kommission."), { statusCode: 409 });
    const commission = await prisma.$transaction(async transaction => {
      await transaction.project.updateMany({ where: { commissionId: current.id }, data: { commissionId: null } });
      await transaction.project.updateMany({ where: { id: { in: input.projectIds } }, data: { commissionId: current.id } });
      return transaction.commission.update({
        where: { id: current.id },
        data: { title: input.title, commissionNumber: input.commissionNumber, description: input.description },
        include: commissionInclude
      });
    });
    return res.json({ commission });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ message: "Diese Kommissionsnummer ist bereits vergeben." });
    return sendExpectedError(res, error);
  }
}

export async function deleteCommission(req, res) {
  const commission = await prisma.commission.findFirst({ where: { id: req.params.id }, select: { id: true } });
  if (!commission) return res.status(404).json({ message: "Kommission nicht gefunden." });
  await prisma.$transaction(async transaction => {
    await transaction.project.updateMany({ where: { commissionId: commission.id }, data: { commissionId: null } });
    await transaction.commission.delete({ where: { id: commission.id } });
  });
  return res.status(204).send();
}

export async function getCommissionWorkspace(req, res) {
  try {
    return res.json({ commission: await loadCommissionWorkspace(req.params.id) });
  } catch (error) {
    return sendExpectedError(res, error);
  }
}

export async function saveCommissionCalculation(req, res) {
  const commission = await prisma.commission.findFirst({ where: { id: req.params.id }, select: { id: true } });
  if (!commission) return res.status(404).json({ message: "Kommission nicht gefunden." });
  const calculation = req.body && typeof req.body === "object" ? req.body : {};
  const saved = await prisma.commission.update({ where: { id: commission.id }, data: { calculation } });
  return res.json({ calculation: saved.calculation });
}

const documentInclude = {
  customer: { select: { id: true, firstName: true, lastName: true, companyName: true, customerNumber: true, addresses: { where: { deletedAt: null } } } },
  project: { select: { id: true, title: true, projectNumber: true } },
  commission: { select: { id: true, title: true, commissionNumber: true } },
  template: { select: { id: true, name: true, documentType: true, analysis: true } }
};

export async function listCustomerDocuments(req, res) {
  const documents = await prisma.commercialDocument.findMany({ where: { customerId: req.params.customerId }, include: documentInclude, orderBy: { createdAt: "desc" } });
  return res.json({ documents });
}

export async function getCommercialDocument(req, res) {
  const document = await prisma.commercialDocument.findFirst({ where: { id: req.params.id }, include: documentInclude });
  if (!document) return res.status(404).json({ message: "Beleg nicht gefunden." });
  return res.json({ document });
}

async function nextDocumentNumber(documentType) {
  const year = new Date().getFullYear();
  const prefix = documentType === "invoice" ? "RE" : "ANG";
  const count = await prisma.commercialDocument.count({ where: { documentType, createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) } } });
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

async function assertDocumentTemplate(templateId, documentType) {
  if (!templateId) return;
  const template = await prisma.documentTemplate.findFirst({ where: { id: templateId, status: "active" }, select: { id: true, documentType: true } });
  if (!template || !["universal", documentType].includes(template.documentType)) {
    const error = new Error("Die gewählte PDF-Vorlage ist für diesen Beleg nicht verfügbar.");
    error.statusCode = 400;
    error.code = "DOCUMENT_TEMPLATE_INVALID";
    throw error;
  }
}

export async function createCommercialDocument(req, res) {
  try {
    const customerId = String(req.body?.customerId || "");
    const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null }, select: { id: true } });
    if (!customer) return res.status(404).json({ message: "Kunde nicht gefunden." });
    const projectId = req.body?.projectId || null;
    const commissionId = req.body?.commissionId || null;
    const seededItems = req.body?.items || await sourceItems({ customerId, projectId, commissionId });
    const normalized = commercialDocumentData({ ...req.body, items: seededItems });
    await assertDocumentTemplate(normalized.templateId, normalized.documentType);
    const documentNumber = normalized.documentNumber || await nextDocumentNumber(normalized.documentType);
    const document = await prisma.commercialDocument.create({
      data: { ...normalized, documentNumber, customerId, projectId, commissionId, createdById: req.user.id },
      include: documentInclude
    });
    return res.status(201).json({ document });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ message: "Diese Belegnummer ist bereits vergeben." });
    return sendExpectedError(res, error);
  }
}

export async function updateCommercialDocument(req, res) {
  try {
    const current = await prisma.commercialDocument.findFirst({ where: { id: req.params.id }, select: { id: true, documentType: true } });
    if (!current) return res.status(404).json({ message: "Beleg nicht gefunden." });
    const data = commercialDocumentData(req.body, { partial: true });
    if (data.templateId) {
      await assertDocumentTemplate(data.templateId, data.documentType || current.documentType);
    }
    const document = await prisma.commercialDocument.update({ where: { id: current.id }, data, include: documentInclude });
    return res.json({ document });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ message: "Diese Belegnummer ist bereits vergeben." });
    return sendExpectedError(res, error);
  }
}

export async function listDocumentTemplates(_req, res) {
  const templates = await prisma.documentTemplate.findMany({ where: { status: "active" }, include: { file: { select: { originalName: true, fileSize: true, mimeType: true } } }, orderBy: { createdAt: "desc" } });
  return res.json({ templates });
}

export async function uploadDocumentTemplate(req, res) {
  try {
    if (!req.file || req.file.mimetype !== "application/pdf" || req.file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return res.status(415).json({ message: "Bitte eine gültige PDF-Datei auswählen." });
    }
    const analysis = normalizeTemplateAnalysis(req.body?.analysis);
    const name = String(req.body?.name || req.file.originalname || "Belegvorlage").trim().slice(0, 300);
    const documentType = ["quote", "invoice", "universal"].includes(req.body?.documentType) ? req.body.documentType : "universal";
    const objectKey = `tenants/${getTenantId()}/settings/document-templates/${crypto.randomUUID()}.pdf`;
    await s3Upload.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: objectKey, Body: req.file.buffer, ContentType: "application/pdf" }));
    const template = await prisma.$transaction(async transaction => {
      const storageObject = await transaction.s3Object.create({ data: { provider: "garage", bucketName: process.env.S3_BUCKET, objectKey, endpoint: process.env.S3_PUBLIC_ENDPOINT } });
      const file = await transaction.file.create({
        data: { storageObjectId: storageObject.id, uploadedById: req.user.id, fileName: `${crypto.randomUUID()}.pdf`, originalName: req.file.originalname, mimeType: "application/pdf", fileSize: req.file.size, category: "document-template", status: "completed" }
      });
      return transaction.documentTemplate.create({ data: { fileId: file.id, uploadedById: req.user.id, name, documentType, analysis }, include: { file: { select: { originalName: true, fileSize: true, mimeType: true } } } });
    });
    return res.status(201).json({ template });
  } catch (error) {
    return sendExpectedError(res, error);
  }
}

export async function downloadDocumentTemplate(req, res) {
  const template = await prisma.documentTemplate.findFirst({ where: { id: req.params.id, status: "active" }, include: { file: { include: { storageObject: true } } } });
  if (!template) return res.status(404).json({ message: "Belegvorlage nicht gefunden." });
  const downloadUrl = await getSignedUrl(s3Download, new GetObjectCommand({ Bucket: template.file.storageObject.bucketName, Key: template.file.storageObject.objectKey }), { expiresIn: 300 });
  return res.json({ downloadUrl });
}
