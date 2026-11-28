import crypto from "node:crypto";

import { GetObjectCommand } from "@aws-sdk/client-s3";

import prisma from "../../infrastructure/database/prisma.js";
import { s3Download } from "../../infrastructure/storage/s3.js";

const streamToString = async body => {
  if (!body) return "";
  if (typeof body.transformToString === "function") return body.transformToString("utf-8");
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf-8");
};

const readJson = async file => {
  if (!file?.storageObject?.objectKey) return null;
  try {
    const object = await s3Download.send(new GetObjectCommand({
      Bucket: file.storageObject.bucketName || process.env.S3_BUCKET,
      Key: file.storageObject.objectKey
    }));
    return JSON.parse(await streamToString(object.Body));
  } catch (error) {
    console.warn(`Kommissionsquelle ${file.fileName} konnte nicht gelesen werden`, error.message);
    return null;
  }
};

const money = value => Math.round((Number(value) || 0) * 100) / 100;

const presentShopItem = (item, project) => ({
  id: String(item?.id || `${project.id}-${item?.articleNumber || item?.name || crypto.randomUUID()}`),
  projectId: project.id,
  projectTitle: project.title,
  articleNumber: item?.articleNumber || item?.sku || null,
  name: item?.name || item?.description || "Artikel",
  supplier: item?.supplier || item?.supplierName || null,
  quantity: Math.max(0, Number(item?.quantity) || 0),
  unit: item?.unit || "Stk.",
  netPrice: money(item?.netPrice),
  total: money((Number(item?.quantity) || 0) * (Number(item?.netPrice) || 0))
});

export async function loadProjectsCommercialData(projects) {
  return Promise.all(projects.map(async project => {
    const files = Object.fromEntries((project.files || []).map(file => [file.fileName, file]));
    const [calculation, procurement] = await Promise.all([
      readJson(files["calculation.json"]),
      readJson(files["procurement.json"])
    ]);
    const preferred = calculation?.preMode === "full"
      ? calculation?.results?.full
      : calculation?.results?.quick || calculation?.results?.full;
    const shopItems = (Array.isArray(procurement) ? procurement : procurement?.items || [])
      .map(item => presentShopItem(item, project));
    const materialCost = money(shopItems.reduce((sum, item) => sum + item.total, 0));
    return {
      id: project.id,
      title: project.title,
      projectNumber: project.projectNumber,
      status: project.status,
      calculationMode: calculation?.preMode || null,
      calculationAvailable: Boolean(preferred),
      materialCost: money(preferred?.materialBase ?? materialCost),
      netSellingPrice: money(preferred?.netSellingPrice),
      grossSellingPrice: money(preferred?.grossSellingPrice),
      hours: money(preferred?.hours ?? preferred?.costCenters?.reduce((sum, row) => sum + (Number(row?.hours) || 0), 0)),
      shopItems
    };
  }));
}

export async function loadCommissionWorkspace(id) {
  const commission = await prisma.commission.findFirst({
    where: { id },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, companyName: true, customerNumber: true, addresses: { where: { deletedAt: null } } } },
      projects: {
        where: { deletedAt: null },
        orderBy: { title: "asc" },
        include: {
          files: {
            where: { deletedAt: null, fileName: { in: ["calculation.json", "procurement.json"] } },
            include: { storageObject: true }
          }
        }
      }
    }
  });
  if (!commission) {
    const error = new Error("Kommission nicht gefunden.");
    error.statusCode = 404;
    error.code = "COMMISSION_NOT_FOUND";
    throw error;
  }
  const projects = await loadProjectsCommercialData(commission.projects);
  return {
    ...commission,
    projects,
    summary: {
      projectCount: projects.length,
      articleCount: projects.reduce((sum, project) => sum + project.shopItems.length, 0),
      materialCost: money(projects.reduce((sum, project) => sum + project.materialCost, 0)),
      netSellingPrice: money(projects.reduce((sum, project) => sum + project.netSellingPrice, 0)),
      grossSellingPrice: money(projects.reduce((sum, project) => sum + project.grossSellingPrice, 0)),
      hours: money(projects.reduce((sum, project) => sum + project.hours, 0))
    }
  };
}

export async function sourceItems({ customerId, projectId, commissionId }) {
  if (projectId && commissionId) {
    const error = new Error("Ein Beleg kann entweder einem Projekt oder einer Kommission zugeordnet werden.");
    error.statusCode = 400;
    throw error;
  }
  if (commissionId) {
    const workspace = await loadCommissionWorkspace(commissionId);
    if (workspace.customerId !== customerId) {
      const error = new Error("Die Kommission gehört nicht zu diesem Kunden.");
      error.statusCode = 400;
      throw error;
    }
    const savedPrices = workspace.calculation?.projectPrices || {};
    const sourcePrices = workspace.projects.map(project => money(savedPrices[project.id] ?? project.netSellingPrice));
    const sourceTotal = money(sourcePrices.reduce((sum, value) => sum + value, 0));
    const calculatedNet = money(workspace.calculation?.result?.net);
    const targetTotal = calculatedNet > 0 ? calculatedNet : sourceTotal;
    const factor = sourceTotal > 0 ? targetTotal / sourceTotal : 1;
    return workspace.projects.map((project, index) => ({
      id: `project-${project.id}`,
      position: index + 1,
      description: project.title,
      details: project.projectNumber ? `Projekt ${project.projectNumber} · Anteil aus Großkalkulation` : "Teilprojekt · Anteil aus Großkalkulation",
      unit: "pauschal",
      quantity: 1,
      unitPrice: money(sourcePrices[index] * factor),
      discountPercent: 0,
      projectId: project.id,
      source: "commission-project"
    }));
  }
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, customerId, deletedAt: null },
      include: { files: { where: { deletedAt: null, fileName: { in: ["calculation.json", "procurement.json"] } }, include: { storageObject: true } } }
    });
    if (!project) {
      const error = new Error("Projekt nicht gefunden oder einem anderen Kunden zugeordnet.");
      error.statusCode = 400;
      throw error;
    }
    const [data] = await loadProjectsCommercialData([project]);
    return [{
      id: `project-${project.id}`,
      position: 1,
      description: project.title,
      details: project.projectNumber ? `Projekt ${project.projectNumber}` : "Projektleistung",
      unit: "pauschal",
      quantity: 1,
      unitPrice: data.netSellingPrice,
      discountPercent: 0,
      projectId: project.id,
      source: "project"
    }];
  }
  return [];
}
