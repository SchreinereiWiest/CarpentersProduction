import { GetObjectCommand } from "@aws-sdk/client-s3";
import { combineManagementHourlyRates } from "../../../../Engine/src/calculation/managementRates.mjs";
import prisma from "../../infrastructure/database/prisma.js";
import { s3Download } from "../../infrastructure/storage/s3.js";
import {
  findApprovedSnapshotCandidates,
  loadEstimationSettings
} from "./calculation-snapshots.service.js";
import { loadSnapshot, presentSnapshot } from "../management/services/snapshots.js";

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
  const mayUseManagement = req.license?.features?.includes("management");
  const [currentTimeEntries, project, management, estimationSettings] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { projectId: req.params.id, duration: { gt: 0 } },
      select: { workType: true, customWorkType: true, duration: true }
    }),
    prisma.project.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        projectType: true,
        files: {
          where: {
            deletedAt: null,
            fileName: { in: ["cabinet.json", "list.json"] }
          },
          select: {
            fileName: true,
            storageObject: {
              select: { bucketName: true, objectKey: true }
            }
          }
        }
      }
    }),
    mayUseManagement
      ? loadSnapshot(year)
        .then(snapshot => managementRates(presentSnapshot(snapshot)))
        .catch(error => {
          console.warn("Managementsaetze konnten nicht geladen werden", error.message);
          return unavailableManagement(year);
        })
      : Promise.resolve(unavailableManagement(year)),
    loadEstimationSettings()
  ]);
  const cabinetFile = project?.files?.find(file => file.fileName === "cabinet.json");
  const listFile = project?.files?.find(file => file.fileName === "list.json");
  const [cabinets, partList] = await Promise.all([
    readJsonFile(cabinetFile),
    readJsonFile(listFile)
  ]);
  const historicalProjects = project
    ? await findApprovedSnapshotCandidates({
      project,
      cabinets: Array.isArray(cabinets) ? cabinets : [],
      partList: Array.isArray(partList) ? partList : [],
      excludeProjectId: req.params.id,
      settings: estimationSettings
    })
    : [];

  res.json({
    year,
    management,
    currentTimeEntries,
    historicalProjects,
    estimationSettings
  });
}
