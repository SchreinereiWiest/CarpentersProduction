import { GetObjectCommand } from "@aws-sdk/client-s3";

import { normalizeHomePreferences } from "../../../../Engine/src/dashboard/home.mjs";
import prisma, { systemPrisma } from "../../infrastructure/database/prisma.js";
import { s3Upload } from "../../infrastructure/storage/s3.js";
import { calendarVisibilityWhere } from "../calendar/calendar.validation.js";

const berlinDateKey = value => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit"
}).format(value);

const addDateKey = (value, amount) => {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const currentWeek = () => {
  const today = berlinDateKey(new Date());
  const weekday = new Date(`${today}T12:00:00.000Z`).getUTCDay() || 7;
  const start = addDateKey(today, 1 - weekday);
  const end = addDateKey(start, 6);
  return {
    start,
    end,
    queryStart: new Date(`${addDateKey(start, -1)}T00:00:00.000Z`),
    queryEnd: new Date(`${addDateKey(end, 2)}T00:00:00.000Z`)
  };
};

const userName = user => [user.firstName, user.lastName].filter(Boolean).join(" ") || user.login;

const documentSummary = document => ({
  id: document.id,
  remoteDocumentId: document.remoteDocumentId,
  title: document.title,
  documentType: document.documentType,
  correspondent: document.correspondent,
  tags: Array.isArray(document.remoteMetadata?.tags) ? document.remoteMetadata.tags.map(String) : [],
  status: document.status,
  receivedAt: document.receivedAt,
  project: document.project || null,
  assignedTo: document.assignedTo ? { id: document.assignedTo.id, name: userName(document.assignedTo) } : null
});

const paperlessInclude = {
  project: { select: { id: true, title: true, projectNumber: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, login: true } }
};

const purchaseSummary = (item, project = null) => ({
  id: String(item.id || item.sourceKey),
  sourceKey: String(item.sourceKey || `non-project:${item.id}`),
  name: String(item.name || "Artikel"),
  quantity: Number(item.quantity || 0),
  unit: String(item.unit || "Stk."),
  netPrice: item.netPrice == null ? null : Number(item.netPrice),
  supplierName: String(item.supplierName || item.supplier?.name || "Ohne Lieferant"),
  purchasedAt: item.purchasedAt || null,
  project
});

async function loadProjectProcurement() {
  const files = await prisma.file.findMany({
    where: { fileName: "procurement.json", deletedAt: null },
    include: {
      storageObject: true,
      project: { select: { id: true, title: true, projectNumber: true } }
    }
  });
  const loaded = await Promise.allSettled(files.map(async file => {
    const response = await s3Upload.send(new GetObjectCommand({
      Bucket: file.storageObject.bucketName,
      Key: file.storageObject.objectKey
    }));
    const text = await response.Body.transformToString();
    const data = JSON.parse(text);
    return (Array.isArray(data?.items) ? data.items : []).map(item => ({ item, project: file.project }));
  }));
  return loaded.flatMap(result => result.status === "fulfilled" ? result.value : []);
}

const isOrderConfirmation = document => {
  const values = [document.documentType, ...(Array.isArray(document.remoteMetadata?.tags) ? document.remoteMetadata.tags : [])];
  return values.some(value => String(value || "").trim().toLocaleLowerCase("de-DE") === "auftragsbestätigung");
};

export async function getDashboard(req, res) {
  const role = req.user.role;
  const features = new Set(req.license?.features || []);
  const week = currentWeek();
  const membershipPromise = systemPrisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: req.tenant.id, userId: req.user.id } },
    select: { preferences: true }
  });

  const assignmentsPromise = features.has("business-management")
    ? prisma.managementAssignment.findMany({
        where: { assigneeId: req.user.id, project: { deletedAt: null, status: { in: ["active", "inactive"] } } },
        include: {
          project: { select: { id: true, title: true, projectNumber: true, status: true, priority: true } },
          calendarEvent: { select: { id: true, startAt: true, endAt: true, allDay: true } }
        },
        orderBy: { updatedAt: "desc" }
      })
    : Promise.resolve([]);

  const eventsPromise = features.has("work-preparation")
    ? prisma.calendarEvent.findMany({
        where: {
          startAt: { lt: week.queryEnd }, endAt: { gt: week.queryStart },
          ...calendarVisibilityWhere(req.user.id)
        },
        include: { project: { select: { id: true, title: true, projectNumber: true } } },
        orderBy: [{ startAt: "asc" }, { endAt: "asc" }]
      })
    : Promise.resolve([]);

  const canUseDocuments = features.has("business-management") && ["manager", "admin"].includes(role);
  const assignedDocumentsPromise = canUseDocuments && role === "manager"
    ? prisma.paperlessDocument.findMany({
        where: { assignedToId: req.user.id, status: { not: "dismissed" } },
        include: paperlessInclude,
        orderBy: [{ receivedAt: "desc" }],
        take: 50
      })
    : Promise.resolve([]);
  const inboxDocumentsPromise = canUseDocuments && role === "admin"
    ? prisma.paperlessDocument.findMany({
        where: { status: { in: ["inbox", "processing"] } },
        include: paperlessInclude,
        orderBy: [{ receivedAt: "desc" }],
        take: 100
      })
    : Promise.resolve([]);

  let releasedPurchases = [];
  let openDeliveries = [];
  if (role === "admin" && features.has("shop")) {
    const [projectRows, nonProjectReleased, confirmations] = await Promise.all([
      loadProjectProcurement(),
      prisma.nonProjectPurchase.findMany({ where: { status: "released" }, include: { supplier: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      canUseDocuments ? prisma.paperlessDocument.findMany({
        where: { status: "linked", projectId: { not: null } },
        include: paperlessInclude,
        orderBy: { receivedAt: "desc" }
      }) : Promise.resolve([])
    ]);
    releasedPurchases = [
      ...projectRows.filter(({ item }) => item.released && !item.purchased).map(({ item, project }) => purchaseSummary(item, project)),
      ...nonProjectReleased.map(item => purchaseSummary(item))
    ].slice(0, 100);

    const confirmationByProject = new Map();
    confirmations.filter(isOrderConfirmation).forEach(document => {
      if (!confirmationByProject.has(document.projectId)) confirmationByProject.set(document.projectId, document);
    });
    const grouped = new Map();
    projectRows.filter(({ item, project }) => item.purchased && !item.delivered && project).forEach(({ item, project }) => {
      const confirmation = confirmationByProject.get(project.id);
      if (!confirmation) return;
      if (!grouped.has(project.id)) grouped.set(project.id, { project, confirmation: documentSummary(confirmation), items: [] });
      grouped.get(project.id).items.push(purchaseSummary(item, project));
    });
    openDeliveries = [...grouped.values()];
  }

  const [membership, assignments, events, assignedDocuments, inboxDocuments] = await Promise.all([
    membershipPromise, assignmentsPromise, eventsPromise, assignedDocumentsPromise, inboxDocumentsPromise
  ]);
  const rawPreferences = membership?.preferences && typeof membership.preferences === "object" && !Array.isArray(membership.preferences)
    ? membership.preferences : {};
  return res.json({
    role,
    week: { start: week.start, end: week.end },
    preferences: { ...rawPreferences, home: normalizeHomePreferences(rawPreferences.home, role) },
    assignments,
    events,
    assignedDocuments: assignedDocuments.map(documentSummary),
    inboxDocuments: inboxDocuments.map(documentSummary),
    releasedPurchases,
    openDeliveries
  });
}
