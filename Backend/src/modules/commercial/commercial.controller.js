import prisma from "../../infrastructure/database/prisma.js";
import { loadCommissionWorkspace, sourceItems } from "./commercial.service.js";
import {
  COMMERCIAL_DOCUMENT_TYPES,
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
  template: { select: { id: true, name: true, documentType: true, isDefault: true, analysis: true } }
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
  const prefix = { invoice: "RE", order_confirmation: "AB", partial_invoice: "AZ" }[documentType] || "ANG";
  const count = await prisma.commercialDocument.count({ where: { documentType, createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) } } });
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
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
    const defaultTemplate = await prisma.documentTemplate.findFirst({
      where: { documentType: normalized.documentType, status: "active", isDefault: true },
      select: { id: true, analysis: true }
    });
    const documentNumber = normalized.documentNumber || await nextDocumentNumber(normalized.documentType);
    const document = await prisma.commercialDocument.create({
      data: {
        ...normalized,
        documentNumber,
        customerId,
        projectId,
        commissionId,
        templateId: defaultTemplate?.analysis?.version === 4 ? defaultTemplate.id : null,
        createdById: req.user.id
      },
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
    const current = await prisma.commercialDocument.findFirst({ where: { id: req.params.id }, select: { id: true } });
    if (!current) return res.status(404).json({ message: "Beleg nicht gefunden." });
    const data = commercialDocumentData(req.body, { partial: true });
    if (data.documentType) {
      const defaultTemplate = await prisma.documentTemplate.findFirst({ where: { documentType: data.documentType, status: "active", isDefault: true }, select: { id: true, analysis: true } });
      data.templateId = defaultTemplate?.analysis?.version === 4 ? defaultTemplate.id : null;
    }
    const document = await prisma.commercialDocument.update({ where: { id: current.id }, data, include: documentInclude });
    return res.json({ document });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ message: "Diese Belegnummer ist bereits vergeben." });
    return sendExpectedError(res, error);
  }
}

export async function listDocumentTemplates(_req, res) {
  const templates = await prisma.documentTemplate.findMany({
    where: { status: "active" },
    orderBy: [{ documentType: "asc" }, { createdAt: "desc" }]
  });
  return res.json({ templates });
}

const documentTemplateInput = body => {
  const analysis = normalizeTemplateAnalysis(body?.analysis);
  const name = String(body?.name || "Belegvorlage").trim().slice(0, 300);
  if (!name) throw new CommercialValidationError("Bitte einen Vorlagennamen eingeben.");
  const documentType = String(body?.documentType || "");
  if (!COMMERCIAL_DOCUMENT_TYPES.has(documentType)) throw new CommercialValidationError("Ungültige Belegart für die Vorlage.");
  return { analysis, name, documentType, isDefault: body?.setAsDefault === true || String(body?.setAsDefault) === "true" };
};

export async function createDocumentTemplate(req, res) {
  try {
    const input = documentTemplateInput(req.body);
    const template = await prisma.$transaction(async transaction => {
      if (input.isDefault) await transaction.documentTemplate.updateMany({ where: { documentType: input.documentType, isDefault: true }, data: { isDefault: false } });
      return transaction.documentTemplate.create({ data: { uploadedById: req.user.id, ...input } });
    });
    return res.status(201).json({ template });
  } catch (error) {
    return sendExpectedError(res, error);
  }
}

export async function updateDocumentTemplate(req, res) {
  try {
    const existing = await prisma.documentTemplate.findFirst({ where: { id: req.params.id, status: "active" }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Belegvorlage nicht gefunden." });
    const input = documentTemplateInput(req.body);
    const template = await prisma.$transaction(async transaction => {
      if (input.isDefault) await transaction.documentTemplate.updateMany({ where: { documentType: input.documentType, isDefault: true, id: { not: existing.id } }, data: { isDefault: false } });
      return transaction.documentTemplate.update({ where: { id: existing.id }, data: input });
    });
    return res.json({ template });
  } catch (error) {
    return sendExpectedError(res, error);
  }
}

export async function deleteDocumentTemplate(req, res) {
  const template = await prisma.documentTemplate.findFirst({ where: { id: req.params.id, status: "active" }, select: { id: true } });
  if (!template) return res.status(404).json({ message: "Belegvorlage nicht gefunden." });
  await prisma.documentTemplate.update({ where: { id: template.id }, data: { status: "archived", isDefault: false } });
  return res.status(204).send();
}

export async function setDocumentTemplateDefault(req, res) {
  const template = await prisma.documentTemplate.findFirst({ where: { id: req.params.id, status: "active" }, select: { id: true, documentType: true, analysis: true } });
  if (!template) return res.status(404).json({ message: "Belegvorlage nicht gefunden." });
  if (template.analysis?.version !== 4 || !Array.isArray(template.analysis?.layout?.objects) || !template.analysis.layout.objects.length) return res.status(400).json({ message: "Nur Vorlagen aus dem Layouteditor können als Standard verwendet werden." });
  const updated = await prisma.$transaction(async transaction => {
    await transaction.documentTemplate.updateMany({ where: { documentType: template.documentType, isDefault: true }, data: { isDefault: false } });
    return transaction.documentTemplate.update({ where: { id: template.id }, data: { isDefault: true } });
  });
  return res.json({ template: updated });
}

export async function clearDocumentTemplateDefault(req, res) {
  const documentType = String(req.params.documentType || "");
  if (!COMMERCIAL_DOCUMENT_TYPES.has(documentType)) return res.status(400).json({ message: "Ungültige Belegart." });
  await prisma.documentTemplate.updateMany({ where: { documentType, isDefault: true }, data: { isDefault: false } });
  return res.status(204).send();
}
