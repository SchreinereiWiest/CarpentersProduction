import { GetObjectCommand } from "@aws-sdk/client-s3";
import { summarizeCabinets } from "../../../Engine/calculation/calculation.mjs";
import { combineManagementHourlyRates } from "../../../Engine/calculation/managementRates.mjs";
import prisma from "../config/prisma.js";
import { s3Download } from "../config/s3.js";
import { loadSnapshot, presentSnapshot } from "../services/management/snapshots.js";

const currentBerlinYear = () => Number(new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric"
}).format(new Date()));

async function streamToString(body) {
  if (!body) return "";
  if (typeof body.transformToString === "function") return body.transformToString("utf-8");
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf-8");
}

async function readJsonFile(file) {
  if (!file?.storageObject) return null;
  try {
    const object = await s3Download.send(new GetObjectCommand({
      Bucket: file.storageObject.bucketName,
      Key: file.storageObject.objectKey
    }));
    return JSON.parse(await streamToString(object.Body));
  } catch (error) {
    console.warn(`Kalkulationskontext konnte ${file.fileName} nicht lesen`, error.message);
    return null;
  }
}

const actualHoursByActivity = entries => {
  const values = {};
  for (const entry of entries || []) {
    const activity = entry.customWorkType
      ? `custom:${entry.customWorkType}`
      : entry.workType;
    if (!activity) continue;
    values[activity] = Math.round(((values[activity] || 0) + Number(entry.duration || 0) / 60) * 100) / 100;
  }
  return values;
};

const snapshotDate = value => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeZone: "Europe/Berlin"
  }).format(date);
};

function managementRates(snapshot) {
  const config = snapshot.operationalConfig || snapshot.config;
  const approved = Boolean(snapshot.config?.setup?.approvals?.length);
  const calculated = snapshot.operatingPlan;
  const calculatedCenters = (calculated?.rates || [])
    .filter(center => center.kind !== "support")
    .map(center => ({
      id: center.id,
      name: center.name,
      kind: center.kind,
      activityIds: center.activityIds || [],
      hours: Number(center.hours) || 0,
      hourlyRate: center.fullRate === null ? null : Number(center.fullRate),
      sellingRate: center.sellingRate === null ? null : Number(center.sellingRate)
    }));
  const combination = combineManagementHourlyRates({
    costCenters: calculatedCenters,
    staff: config?.setup?.staff || []
  });
  const costCenters = combination.costCenters;
  const easyRates = (config?.easyRates || []).map(rate => ({
    id: rate.id,
    name: rate.name,
    hourlyRate: Number(rate.rate) || 0,
    activityIds: []
  }));
  const easyHourlyRate = easyRates.length
    ? Math.round((easyRates.reduce((sum, rate) => sum + rate.hourlyRate, 0) / easyRates.length) * 100) / 100
    : 0;
  const fullMode = config?.mode === "full";

  return {
    available: fullMode ? costCenters.length > 0 : easyRates.length > 0,
    approved,
    mode: config?.mode || "easy",
    year: snapshot.year,
    fullHourlyRate: fullMode ? combination.hourlyRate : easyHourlyRate,
    rateSource: fullMode ? combination.source : "easy-average",
    staffCount: combination.staffCount,
    costCenters: fullMode ? costCenters : [],
    easyRates
  };
}

const unavailableManagement = year => ({
  available: false,
  approved: false,
  mode: "easy",
  year,
  fullHourlyRate: 0,
  rateSource: "unavailable",
  staffCount: 0,
  costCenters: [],
  easyRates: []
});

/**
 * Liefert nur die fuer eine Projektkalkulation benoetigten Managementsaetze
 * sowie verdichtete Vergleichsdaten. Interne Jahreskosten bleiben verborgen.
 */
export async function getCalculationContext(req, res) {
  const year = Number(req.query.year) || currentBerlinYear();
  const privileged = ["admin", "manager"].includes(req.user?.role);
  const mayUseManagement = req.license?.features?.includes("management");
  const [currentTimeEntries, projects, management] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { projectId: req.params.id, duration: { gt: 0 } },
      select: { workType: true, customWorkType: true, duration: true }
    }),
    prisma.project.findMany({
      where: {
        id: { not: req.params.id },
        deletedAt: null,
        ...(privileged ? {} : { status: "active" })
      },
      select: {
        id: true,
        title: true,
        description: true,
        projectType: true,
        status: true,
        completionDate: true,
        updatedAt: true,
        timeEntries: {
          where: { duration: { gt: 0 } },
          select: { workType: true, customWorkType: true, duration: true }
        },
        files: {
          where: {
            deletedAt: null,
            fileName: { in: ["cabinet.json", "calculation.json"] }
          },
          select: {
            fileName: true,
            updatedAt: true,
            storageObject: {
              select: { bucketName: true, objectKey: true }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 40
    }),
    mayUseManagement
      ? loadSnapshot(year)
        .then(snapshot => managementRates(presentSnapshot(snapshot)))
        .catch(error => {
          console.warn("Managementsaetze konnten nicht geladen werden", error.message);
          return unavailableManagement(year);
        })
      : Promise.resolve(unavailableManagement(year))
  ]);

  const historicalProjects = (await Promise.all(projects.map(async project => {
    const cabinetFile = project.files.find(file => file.fileName === "cabinet.json");
    const calculationFile = project.files.find(file => file.fileName === "calculation.json");
    const [cabinets, calculation] = await Promise.all([
      readJsonFile(cabinetFile),
      readJsonFile(calculationFile)
    ]);
    const hoursByActivity = actualHoursByActivity(project.timeEntries);
    const trackedHours = Object.values(hoursByActivity).reduce((sum, hours) => sum + hours, 0);
    const savedCenterHours = Array.isArray(calculation?.post?.costCenters)
      ? calculation.post.costCenters
      : [];
    const savedHours = savedCenterHours.reduce((sum, row) => {
      const hours = Number(row?.hours);
      return sum + (Number.isFinite(hours) && hours > 0 ? hours : 0);
    }, 0);
    const totalHours = trackedHours || savedHours;
    const candidates = [];
    if (totalHours) {
      candidates.push({
        id: project.id,
        title: project.title,
        description: project.description,
        projectType: project.projectType,
        status: project.status,
        completionDate: project.completionDate,
        updatedAt: project.updatedAt,
        cabinetSummary: summarizeCabinets(cabinets),
        hoursByActivity,
        hoursByCenter: savedCenterHours,
        totalHours: Math.round(totalHours * 100) / 100,
        source: trackedHours ? "time-tracking" : "post-calculation"
      });
    }

    const snapshots = Array.isArray(calculation?.snapshots) ? calculation.snapshots : [];
    for (const snapshot of snapshots.slice(-3)) {
      const snapshotHours = Number(snapshot?.totalHours) || 0;
      if (!snapshotHours || !snapshot?.cabinetSummary) continue;
      const date = snapshotDate(snapshot.createdAt);
      candidates.push({
        id: `${project.id}:snapshot:${snapshot.id || snapshot.createdAt}`,
        title: `${project.title}${date ? ` · Stand ${date}` : ""}`,
        description: snapshot.description || project.description,
        projectType: snapshot.projectType || project.projectType,
        status: project.status,
        completionDate: project.completionDate,
        updatedAt: snapshot.createdAt || project.updatedAt,
        cabinetSummary: snapshot.cabinetSummary,
        hoursByActivity: {},
        hoursByCenter: snapshot.hoursByCenter || [],
        totalHours: Math.round(snapshotHours * 100) / 100,
        source: "project-snapshot"
      });
    }
    return candidates;
  }))).flat().filter(Boolean);

  res.json({
    year,
    management,
    currentTimeEntries,
    historicalProjects
  });
}
