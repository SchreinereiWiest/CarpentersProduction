import { calculateHourlyRates } from "../../../../../Engine/src/management/calculation/hourlyRates.mjs";
import { defaultConfig } from "../../../../../Engine/src/management/defaults/config.defaults.mjs";
import prisma, { systemPrisma } from "../../../infrastructure/database/prisma.js";
import { getTenantId } from "../../../infrastructure/database/tenant-context.js";
import { requestYear } from "../services/http.js";
import { write } from "../services/persistence.js";
import { invalid, number, textValue, uuid, yearValue } from "../services/validation/values.js";

const goalInclude = { checkpoints: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] } };

const employeeName = user => [user.firstName, user.lastName].filter(Boolean).join(" ") || user.login;
const requiredUuid = (value, label) => {
  const id = uuid(value);
  if (!id) invalid(`${label} fehlt.`);
  return id;
};

const presentGoal = goal => ({
  ...goal,
  targetValue: Number(goal.targetValue),
  actualValue: goal.actualValue === null ? null : Number(goal.actualValue),
  checkpoints: goal.checkpoints.map(item => ({ ...item, value: Number(item.value) }))
});

const isoDate = (value, label) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid(`${label}: gültiges Datum eingeben.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) invalid(`${label}: gültiges Datum eingeben.`);
  return parsed;
};

const instant = (value, label) => {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) invalid(`${label}: gültigen Zeitpunkt eingeben.`);
  return parsed;
};

async function assertProject(db, projectId) {
  const project = await db.project.findFirst({
    where: { id: requiredUuid(projectId, "Projekt"), deletedAt: null, status: { in: ["active", "inactive"] } },
    select: { id: true, title: true }
  });
  if (!project) invalid("Projekt nicht gefunden.", 404);
  return project;
}

async function assertEmployee(userId) {
  const membership = await systemPrisma.tenantMembership.findFirst({
    where: {
      tenantId: getTenantId(), userId: requiredUuid(userId, "Mitarbeiter"), isActive: true,
      user: { deletedAt: null, isActive: true }
    },
    include: { user: { select: { id: true, firstName: true, lastName: true, login: true } } }
  });
  if (!membership) invalid("Mitarbeiter nicht gefunden.", 404);
  return membership.user;
}

/** Liefert den gesamten Management-Arbeitsbereich ohne alte Buchungsdaten. */
export async function getManagementWorkspace(req, res) {
  const year = requestYear(req);
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const nextYearStart = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const [memberships, projects, assignments, projectStages, projectSchedules, employeeProfiles, timeRows, vacationEvents, goals, goalYearRows, period] = await Promise.all([
    systemPrisma.tenantMembership.findMany({
      where: { tenantId: req.tenant.id, user: { deletedAt: null } },
      include: { user: { select: { id: true, firstName: true, lastName: true, login: true, email: true, isActive: true } } },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }]
    }),
    prisma.project.findMany({
      where: { deletedAt: null, status: { in: ["active", "inactive"] } },
      select: {
        id: true, title: true, projectNumber: true, status: true, priority: true,
        startDate: true, installationDate: true,
        customer: { select: { firstName: true, lastName: true, companyName: true } }
      },
      orderBy: [{ priority: "desc" }, { title: "asc" }]
    }),
    prisma.managementAssignment.findMany({
      include: {
        calendarEvent: { select: { id: true, startAt: true, endAt: true, allDay: true } }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.managementProjectStage.findMany({ orderBy: [{ stageId: "asc" }, { position: "asc" }] }),
    prisma.managementProjectSchedule.findMany({
      include: { calendarEvent: { select: { id: true, type: true, startAt: true, endAt: true } } },
      orderBy: [{ plannedStart: "asc" }, { plannedEnd: "asc" }]
    }),
    prisma.managementEmployeeProfile.findMany({ where: { year } }),
    prisma.timeEntry.groupBy({
      by: ["userId", "workType", "customWorkType"],
      where: {
        userId: { not: null }, duration: { gt: 0 },
        OR: [
          { startedAt: { gte: yearStart, lt: nextYearStart } },
          { startedAt: null, createdAt: { gte: yearStart, lt: nextYearStart } }
        ]
      },
      _sum: { duration: true }
    }),
    prisma.calendarEvent.findMany({
      where: { type: { in: ["vacation", "company-closed"] }, startAt: { lt: nextYearStart }, endAt: { gt: yearStart } },
      select: { id: true, ownerUserId: true, type: true, title: true, startAt: true, endAt: true, allDay: true },
      orderBy: { startAt: "asc" }
    }),
    prisma.managementAnnualGoal.findMany({ where: { year }, include: goalInclude, orderBy: [{ targetDate: "asc" }, { title: "asc" }] }),
    prisma.managementAnnualGoal.findMany({ select: { year: true }, distinct: ["year"], orderBy: { year: "desc" } }),
    prisma.managementPeriod.findFirst({ where: { year }, select: { config: true } })
  ]);

  res.json({
    year,
    employees: memberships.map(item => ({
      id: item.user.id,
      name: employeeName(item.user),
      firstName: item.user.firstName,
      lastName: item.user.lastName,
      login: item.user.login,
      email: item.user.email,
      role: item.role,
      isActive: item.isActive && item.user.isActive
    })),
    projects,
    assignments,
    projectStages,
    projectSchedules,
    employeeProfiles: employeeProfiles.map(item => ({
      ...item,
      vacationDays: Number(item.vacationDays),
      annualSalary: Number(item.annualSalary)
    })),
    timeSummary: timeRows.map(item => ({
      userId: item.userId,
      workType: item.workType,
      customWorkType: item.customWorkType,
      minutes: item._sum.duration || 0
    })),
    vacationEvents,
    goals: goals.map(presentGoal),
    goalYears: goalYearRows.map(item => item.year),
    rateCalculation: period?.config?.rateCalculation || null
  });
}

export async function saveAssignment(req, res) {
  const projectId = requiredUuid(req.body?.projectId, "Projekt");
  const assigneeId = requiredUuid(req.body?.assigneeId, "Mitarbeiter");
  const info = textValue(req.body?.info, "Info", false, 4000);
  await assertEmployee(assigneeId);
  const result = await write(req, "assignment.save", async db => {
    await assertProject(db, projectId);
    return db.managementAssignment.upsert({
      where: { tenantId_projectId_assigneeId: { tenantId: getTenantId(), projectId, assigneeId } },
      create: { projectId, assigneeId, createdById: req.user.id, info },
      update: { info }
    });
  });
  res.status(201).json(result);
}

export async function deleteAssignment(req, res) {
  const id = requiredUuid(req.params.id, "Zuweisung");
  const result = await write(req, "assignment.delete", async db => {
    const assignment = await db.managementAssignment.findFirst({ where: { id } });
    if (!assignment) invalid("Zuweisung nicht gefunden.", 404);
    if (assignment.calendarEventId) await db.calendarEvent.deleteMany({ where: { id: assignment.calendarEventId } });
    await db.managementAssignment.delete({ where: { id } });
    return assignment;
  });
  res.json(result);
}

export async function createAssignmentCalendarPeriod(req, res) {
  const id = requiredUuid(req.params.id, "Zuweisung");
  const startAt = instant(req.body?.startAt, "Beginn");
  const endAt = instant(req.body?.endAt, "Ende");
  if (endAt <= startAt) invalid("Das Ende muss nach dem Beginn liegen.");
  const result = await write(req, "assignment.calendar", async db => {
    const assignment = await db.managementAssignment.findFirst({
      where: { id }, include: { project: { select: { id: true, title: true } } }
    });
    if (!assignment) invalid("Zuweisung nicht gefunden.", 404);
    const eventData = {
      ownerUserId: assignment.assigneeId,
      createdById: req.user.id,
      projectId: assignment.projectId,
      scope: "production",
      type: "project",
      title: assignment.project.title,
      description: assignment.info,
      startAt,
      endAt,
      allDay: req.body?.allDay !== false
    };
    const calendarEvent = assignment.calendarEventId
      ? await db.calendarEvent.update({ where: { id: assignment.calendarEventId }, data: eventData })
      : await db.calendarEvent.create({ data: eventData });
    const savedAssignment = await db.managementAssignment.update({ where: { id }, data: { calendarEventId: calendarEvent.id } });
    return { id: savedAssignment.id, assignment: savedAssignment, calendarEvent };
  });
  res.status(201).json(result);
}

const projectScheduleData = body => {
  const rawRows = Array.isArray(body?.rows) ? body.rows : null;
  if (rawRows && rawRows.length > 50) invalid("Ein Projektplan darf höchstens 50 Zeilen enthalten.");
  const rows = rawRows ? rawRows.map((row, rowIndex) => {
    if (!Array.isArray(row?.bars) || row.bars.length > 100) invalid(`Planzeile ${rowIndex + 1} ist ungültig.`);
    return {
      id: textValue(row?.id, "Planzeilen-ID", true, 100),
      label: textValue(row?.label, "Planzeile", true, 200),
      bars: row.bars.map((bar, barIndex) => {
        const start = String(bar?.start || "");
        const end = String(bar?.end || "");
        const parsedStart = isoDate(start, `Beginn in ${row.label || `Zeile ${rowIndex + 1}`}`);
        const parsedEnd = isoDate(end, `Ende in ${row.label || `Zeile ${rowIndex + 1}`}`);
        if (parsedEnd < parsedStart) invalid(`Balken ${barIndex + 1}: Das Ende darf nicht vor dem Beginn liegen.`);
        return { id: textValue(bar?.id, "Balken-ID", true, 100), start, end };
      })
    };
  }) : [{
    id: "legacy-total",
    label: "Gesamtzeitraum",
    bars: [{ id: "legacy-total-bar", start: String(body?.plannedStart || ""), end: String(body?.plannedEnd || "") }]
  }];
  if (new Set(rows.map(row => row.id)).size !== rows.length) invalid("Planzeilen-IDs müssen eindeutig sein.");
  const bars = rows.flatMap(row => row.bars);
  if (!bars.length) invalid("Mindestens ein Planungsbalken ist erforderlich.");
  if (new Set(bars.map(bar => bar.id)).size !== bars.length) invalid("Balken-IDs müssen eindeutig sein.");
  const plannedStartValue = bars.map(bar => bar.start).sort()[0];
  const plannedEndValue = bars.map(bar => bar.end).sort().at(-1);
  const plannedStart = isoDate(plannedStartValue, "Planungsbeginn");
  const plannedEnd = isoDate(plannedEndValue, "Planungsende");
  return { rows, plannedStart, plannedEnd };
};

export async function saveProjectSchedule(req, res) {
  const projectId = requiredUuid(req.params.projectId, "Projekt");
  const { rows, plannedStart, plannedEnd } = projectScheduleData(req.body);
  const result = await write(req, "project-schedule.save", async db => {
    await assertProject(db, projectId);
    return db.managementProjectSchedule.upsert({
      where: { tenantId_projectId: { tenantId: getTenantId(), projectId } },
      create: { projectId, plannedStart, plannedEnd, plan: rows },
      update: { plannedStart, plannedEnd, plan: rows }
    });
  });
  res.json(result);
}

const scheduleCalendarTypes = new Set(["project", "measurement", "planning", "manufacturing", "installation", "appointment"]);
const scheduleCalendarLabels = {
  project: "Projektzeitraum", measurement: "Aufmaß", planning: "Planung",
  manufacturing: "Fertigung", installation: "Montage", appointment: "Termin"
};

export async function transferProjectScheduleToCalendar(req, res) {
  const projectId = requiredUuid(req.params.projectId, "Projekt");
  const { rows, plannedStart, plannedEnd } = projectScheduleData(req.body);
  const calendarType = textValue(req.body?.calendarType, "Kalendertyp", true, 40);
  if (!scheduleCalendarTypes.has(calendarType)) invalid("Der Kalendertyp ist ungültig.");
  const startAt = instant(req.body?.startAt, "Kalenderbeginn");
  const endAt = instant(req.body?.endAt, "Kalenderende");
  if (endAt <= startAt) invalid("Das Kalenderende muss nach dem Beginn liegen.");

  const result = await write(req, "project-schedule.calendar", async db => {
    const project = await assertProject(db, projectId);
    const schedule = await db.managementProjectSchedule.upsert({
      where: { tenantId_projectId: { tenantId: getTenantId(), projectId } },
      create: { projectId, plannedStart, plannedEnd, plan: rows, calendarType },
      update: { plannedStart, plannedEnd, plan: rows, calendarType }
    });
    const eventData = {
      ownerUserId: req.user.id,
      createdById: req.user.id,
      projectId,
      scope: "production",
      type: calendarType,
      title: calendarType === "project" ? project.title : `${project.title} · ${scheduleCalendarLabels[calendarType]}`,
      description: "Aus der Management-Projektzeitplanung übernommen.",
      startAt,
      endAt,
      allDay: true
    };
    const calendarEvent = schedule.calendarEventId
      ? await db.calendarEvent.update({ where: { id: schedule.calendarEventId }, data: eventData })
      : await db.calendarEvent.create({ data: eventData });
    const savedSchedule = await db.managementProjectSchedule.update({
      where: { id: schedule.id },
      data: { calendarEventId: calendarEvent.id, calendarType }
    });
    return { id: savedSchedule.id, schedule: savedSchedule, calendarEvent };
  });
  res.status(201).json(result);
}

export async function deleteProjectSchedule(req, res) {
  const projectId = requiredUuid(req.params.projectId, "Projekt");
  const result = await write(req, "project-schedule.delete", async db => {
    const schedule = await db.managementProjectSchedule.findFirst({ where: { projectId } });
    if (!schedule) invalid("Projektzeitraum nicht gefunden.", 404);
    if (schedule.calendarEventId) await db.calendarEvent.deleteMany({ where: { id: schedule.calendarEventId } });
    await db.managementProjectSchedule.delete({ where: { id: schedule.id } });
    return schedule;
  });
  res.json(result);
}

export async function saveEmployeeProfile(req, res) {
  const userId = requiredUuid(req.params.userId, "Mitarbeiter");
  const year = requestYear(req);
  await assertEmployee(userId);
  const data = {
    vacationDays: number(req.body?.vacationDays ?? 0, "Urlaubstage", 0, 366),
    annualSalary: number(req.body?.annualSalary ?? 0, "Jahresgehalt", 0, 1_000_000_000)
  };
  const result = await write(req, "employee-profile.save", db => db.managementEmployeeProfile.upsert({
    where: { tenantId_userId_year: { tenantId: getTenantId(), userId, year } },
    create: { userId, year, ...data },
    update: data
  }));
  res.json({ ...result, vacationDays: Number(result.vacationDays), annualSalary: Number(result.annualSalary) });
}

export async function saveProjectStage(req, res) {
  const projectId = requiredUuid(req.params.projectId, "Projekt");
  const stageId = textValue(req.body?.stageId, "Management-Status", true, 100);
  const position = Math.max(0, Math.min(100000, Math.round(Number(req.body?.position) || 0)));
  const result = await write(req, "project-stage.save", async db => {
    await assertProject(db, projectId);
    return db.managementProjectStage.upsert({
      where: { tenantId_projectId: { tenantId: getTenantId(), projectId } },
      create: { projectId, stageId, position },
      update: { stageId, position }
    });
  });
  res.json(result);
}

const goalData = (body, fallbackYear) => ({
  year: yearValue(fallbackYear),
  typeId: textValue(body?.typeId, "Zieltyp", true, 100),
  typeLabel: textValue(body?.typeLabel, "Zieltyp", true, 200),
  unit: textValue(body?.unit, "Einheit", true, 30),
  title: textValue(body?.title, "Ziel", true, 300),
  targetValue: number(body?.targetValue, "Sollwert", -1_000_000_000, 1_000_000_000),
  targetDate: isoDate(body?.targetDate, "Stichtag"),
  actualValue: body?.actualValue === null || body?.actualValue === undefined || body?.actualValue === ""
    ? null : number(body.actualValue, "Istwert", -1_000_000_000, 1_000_000_000),
  actualDate: body?.actualDate ? isoDate(body.actualDate, "Ist-Datum") : null,
  note: textValue(body?.note, "Notiz", false, 4000)
});

export async function createGoal(req, res) {
  const data = goalData(req.body, requestYear(req));
  const result = await write(req, "goal.create", db => db.managementAnnualGoal.create({
    data: { ...data, createdById: req.user.id }, include: goalInclude
  }));
  res.status(201).json(presentGoal(result));
}

export async function updateGoal(req, res) {
  const id = requiredUuid(req.params.id, "Jahresziel");
  const data = goalData(req.body, requestYear(req));
  const result = await write(req, "goal.update", async db => {
    if (!await db.managementAnnualGoal.findFirst({ where: { id, year: data.year } })) invalid("Jahresziel nicht gefunden.", 404);
    return db.managementAnnualGoal.update({ where: { id }, data, include: goalInclude });
  });
  res.json(presentGoal(result));
}

export async function deleteGoal(req, res) {
  const id = requiredUuid(req.params.id, "Jahresziel");
  const year = requestYear(req);
  const result = await write(req, "goal.delete", async db => {
    const goal = await db.managementAnnualGoal.findFirst({ where: { id, year } });
    if (!goal) invalid("Jahresziel nicht gefunden.", 404);
    await db.managementAnnualGoal.delete({ where: { id } });
    return goal;
  });
  res.json(result);
}

export async function createGoalCheckpoint(req, res) {
  const goalId = requiredUuid(req.params.id, "Jahresziel");
  const year = requestYear(req);
  const data = {
    date: isoDate(req.body?.date, "Zwischenstand"),
    value: number(req.body?.value, "Zwischenwert", -1_000_000_000, 1_000_000_000),
    note: textValue(req.body?.note, "Notiz", false, 2000)
  };
  const result = await write(req, "goal.checkpoint", async db => {
    if (!await db.managementAnnualGoal.findFirst({ where: { id: goalId, year } })) invalid("Jahresziel nicht gefunden.", 404);
    return db.managementGoalCheckpoint.create({ data: { ...data, goalId } });
  });
  res.status(201).json({ ...result, value: Number(result.value) });
}

export async function deleteGoalCheckpoint(req, res) {
  const goalId = requiredUuid(req.params.id, "Jahresziel");
  const id = requiredUuid(req.params.checkpointId, "Zwischenstand");
  const year = requestYear(req);
  const result = await write(req, "goal.checkpoint-delete", async db => {
    const checkpoint = await db.managementGoalCheckpoint.findFirst({ where: { id, goalId, goal: { year } } });
    if (!checkpoint) invalid("Zwischenstand nicht gefunden.", 404);
    await db.managementGoalCheckpoint.delete({ where: { id } });
    return checkpoint;
  });
  res.json(result);
}

const sanitizeRateInput = body => {
  if (!Array.isArray(body?.activities) || body.activities.length > 100) invalid("Leistungsbereiche sind ungültig.");
  if (!Array.isArray(body?.overheadCosts) || body.overheadCosts.length > 30) invalid("Unternehmenskosten sind ungültig.");
  const input = {
    profitPercent: number(body.profitPercent ?? 0, "Gewinnaufschlag", 0, 1000),
    activities: body.activities.map(item => ({
      id: textValue(item?.id, "Tätigkeit", true, 100),
      name: textValue(item?.name, "Tätigkeit", true, 200),
      productiveHours: number(item?.productiveHours ?? 0, "Produktive Stunden", 0, 1_000_000),
      personnelCosts: number(item?.personnelCosts ?? 0, "Personalkosten", 0, 1_000_000_000),
      otherDirectCosts: number(item?.otherDirectCosts ?? 0, "Direkte Kosten", 0, 1_000_000_000),
      machineCosts: number(item?.machineCosts ?? 0, "Maschinenkosten", 0, 1_000_000_000),
      machineHours: number(item?.machineHours ?? 0, "Maschinenstunden", 0, 1_000_000),
      machineUsagePercent: number(item?.machineUsagePercent ?? 0, "Maschinennutzung", 0, 100)
    })),
    overheadCosts: body.overheadCosts.map(item => ({
      id: textValue(item?.id, "Kostenart", true, 100),
      label: textValue(item?.label, "Kostenart", true, 200),
      amount: number(item?.amount ?? 0, "Unternehmenskosten", 0, 1_000_000_000)
    }))
  };
  if (new Set(input.activities.map(item => item.id)).size !== input.activities.length) invalid("Tätigkeiten dürfen nicht doppelt vorkommen.");
  if (new Set(input.overheadCosts.map(item => item.id)).size !== input.overheadCosts.length) invalid("Kostenarten dürfen nicht doppelt vorkommen.");
  for (const activity of input.activities) {
    if (activity.productiveHours <= 0) invalid(`${activity.name}: produktive Jahresstunden müssen größer als 0 sein.`);
    if (activity.machineCosts > 0 && activity.machineHours <= 0) invalid(`${activity.name}: Für Maschinenkosten werden produktive Maschinenstunden benötigt.`);
  }
  return input;
};

export async function saveRateCalculation(req, res) {
  const year = requestYear(req);
  const calculated = calculateHourlyRates(sanitizeRateInput(req.body));
  if (!calculated.activities.length) invalid("Mindestens eine Tätigkeit ist erforderlich.");
  const missingRate = calculated.rates.find(rate => rate.hourlyRate <= 0);
  if (missingRate) invalid(`${missingRate.name}: Aus den Eingaben ergibt sich noch kein positiver Selbstkostensatz.`);
  const rateCalculation = {
    ...calculated,
    savedAt: new Date().toISOString(),
    savedBy: req.user.id
  };
  await write(req, "rates.save", async db => {
    const existing = await db.managementPeriod.findFirst({ where: { year } });
    const config = { ...(existing?.config || defaultConfig()), rateCalculation };
    return existing
      ? db.managementPeriod.update({ where: { id: existing.id }, data: { config, revision: { increment: 1 } } })
      : db.managementPeriod.create({ data: { year, config, revision: 1 } });
  });
  res.json(rateCalculation);
}

