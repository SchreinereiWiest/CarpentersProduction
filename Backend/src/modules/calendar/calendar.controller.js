import prisma from "../../infrastructure/database/prisma.js";
import {
  CalendarValidationError,
  calendarRange,
  normalizeCalendarEvent
} from "./calendar.validation.js";

const eventInclude = {
  project: {
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true
    }
  }
};

const isAdmin = req => req.user?.role === "admin";

const typeLabels = {
  project: "Projektzeitraum",
  measurement: "Aufmaß",
  planning: "Planung",
  manufacturing: "Fertigung",
  installation: "Montage",
  appointment: "Termin",
  "company-closed": "Betriebsfrei"
};

const forbidden = message => {
  throw new CalendarValidationError(message, 403, "CALENDAR_FORBIDDEN");
};

async function assertProject(projectId) {
  if (!projectId) return null;
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      status: { in: ["active", "inactive"] }
    },
    select: { id: true, title: true, status: true, startDate: true }
  });
  if (!project) {
    throw new CalendarValidationError("Das gewählte Projekt wurde nicht gefunden.", 404, "PROJECT_NOT_FOUND");
  }
  return project;
}

const responseTitle = (normalized, project) => {
  if (normalized.title) return normalized.title;
  if (project) {
    return normalized.type === "project"
      ? project.title
      : `${project.title} · ${typeLabels[normalized.type] ?? "Termin"}`;
  }
  throw new CalendarValidationError("Bitte gib einen Termintitel ein.");
};

export async function listCalendarEvents(req, res) {
  const { from, to } = calendarRange(req.query);
  const events = await prisma.calendarEvent.findMany({
    where: {
      startAt: { lt: to },
      endAt: { gt: from },
      OR: [
        { scope: "production" },
        { scope: "personal", ownerUserId: req.user.id }
      ]
    },
    include: eventInclude,
    orderBy: [{ startAt: "asc" }, { endAt: "asc" }]
  });
  return res.json({ events });
}

export async function listCalendarProjects(req, res) {
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      status: { in: ["active", "inactive"] }
    },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      customer: { select: { firstName: true, lastName: true, companyName: true } }
    },
    orderBy: [{ status: "asc" }, { title: "asc" }]
  });
  return res.json({ projects });
}

export async function syncCompanyDays(req, res) {
  const from = new Date(req.body?.from);
  const to = new Date(req.body?.to);
  const days = Array.isArray(req.body?.days) ? req.body.days : [];
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    throw new CalendarValidationError("Der Kalenderzeitraum ist ungültig.");
  }
  if (to.getTime() - from.getTime() > 370 * 24 * 60 * 60 * 1000 || days.length > 200) {
    throw new CalendarValidationError("Es kann höchstens ein Kalenderjahr synchronisiert werden.");
  }
  const normalized = days.map((day, index) => {
    const startAt = new Date(day?.startAt);
    const endAt = new Date(day?.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt || startAt < from || endAt > to) {
      throw new CalendarValidationError(`Freier Tag ${index + 1} ist ungültig.`);
    }
    const ruleId = String(day?.ruleId || "rule").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    return {
      ownerUserId: req.user.id,
      createdById: req.user.id,
      scope: "production",
      type: "company-closed",
      title: String(day?.label || "Betriebsfrei").trim().slice(0, 200) || "Betriebsfrei",
      description: `[work-schedule:auto:${ruleId}]`,
      startAt,
      endAt,
      allDay: true
    };
  });
  await prisma.$transaction(async db => {
    await db.calendarEvent.deleteMany({
      where: {
        scope: "production", type: "company-closed",
        description: { startsWith: "[work-schedule:auto:" },
        startAt: { gte: from, lt: to }
      }
    });
    if (normalized.length) await db.calendarEvent.createMany({ data: normalized });
  });
  return res.json({ count: normalized.length });
}

export async function createCalendarEvent(req, res) {
  const normalized = normalizeCalendarEvent(req.body ?? {});
  if (normalized.scope === "production" && !isAdmin(req)) {
    forbidden("Nur Administratoren dürfen die Produktionsplanung ändern.");
  }
  const project = await assertProject(normalized.projectId);
  const event = await prisma.calendarEvent.create({
    data: {
      ...normalized,
      title: responseTitle(normalized, project),
      ownerUserId: req.user.id,
      createdById: req.user.id
    },
    include: eventInclude
  });
  return res.status(201).json({ event });
}

export async function updateCalendarEvent(req, res) {
  const current = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
  if (!current) {
    throw new CalendarValidationError("Termin nicht gefunden.", 404, "CALENDAR_EVENT_NOT_FOUND");
  }
  if (current.scope === "production" ? !isAdmin(req) : current.ownerUserId !== req.user.id) {
    forbidden("Du darfst diesen Termin nicht ändern.");
  }

  const normalized = normalizeCalendarEvent(req.body ?? {}, current);
  if (normalized.scope === "production" && !isAdmin(req)) {
    forbidden("Nur Administratoren dürfen die Produktionsplanung ändern.");
  }
  const project = await assertProject(normalized.projectId);
  const event = await prisma.calendarEvent.update({
    where: { id: current.id },
    data: {
      ...normalized,
      title: responseTitle(normalized, project)
    },
    include: eventInclude
  });
  return res.json({ event });
}

export async function deleteCalendarEvent(req, res) {
  const current = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } });
  if (!current) {
    throw new CalendarValidationError("Termin nicht gefunden.", 404, "CALENDAR_EVENT_NOT_FOUND");
  }
  if (current.scope === "production" ? !isAdmin(req) : current.ownerUserId !== req.user.id) {
    forbidden("Du darfst diesen Termin nicht löschen.");
  }
  await prisma.calendarEvent.delete({ where: { id: current.id } });
  return res.status(204).end();
}
