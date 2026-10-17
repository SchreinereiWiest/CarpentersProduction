import { GetObjectCommand } from "@aws-sdk/client-s3";
import { summarizeCabinets } from "../../../../Engine/src/calculation/calculation.mjs";
import {
  normalizeEstimationSettings,
  scoreProjectSimilarity
} from "../../../../Engine/src/calculation/estimation.mjs";
import {
  buildCalculationSnapshot,
  snapshotToEstimationCandidate,
  summarizePartList
} from "../../../../Engine/src/calculation/snapshots.mjs";
import prisma from "../../infrastructure/database/prisma.js";
import { s3Download } from "../../infrastructure/storage/s3.js";

async function streamToString(body) {
  if (!body) return "";
  if (typeof body.transformToString === "function") return body.transformToString("utf-8");
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf-8");
}

async function readStoredJson(storageObject) {
  if (!storageObject?.objectKey) return null;
  const object = await s3Download.send(new GetObjectCommand({
    Bucket: storageObject.bucketName || process.env.S3_BUCKET,
    Key: storageObject.objectKey
  }));
  return JSON.parse(await streamToString(object.Body));
}

async function readReference(reference) {
  if (!reference?.objectKey) return null;
  try {
    return await readStoredJson(reference);
  } catch (error) {
    console.warn(`Snapshot-Referenz ${reference.objectKey} konnte nicht gelesen werden`, error.message);
    return null;
  }
}

const toObjectReference = file => ({
  fileId: file.id,
  fileName: file.fileName,
  bucketName: file.storageObject.bucketName,
  objectKey: file.storageObject.objectKey,
  etag: file.storageObject.etag || null,
  serverVersion: file.serverVersion,
  updatedAt: file.updatedAt instanceof Date ? file.updatedAt.toISOString() : file.updatedAt
});

export async function loadEstimationSettings() {
  const settingsFile = await prisma.file.findFirst({
    where: { fileName: "settings-company.json", projectId: null, customerId: null, deletedAt: null },
    include: { storageObject: true }
  });
  if (!settingsFile) return normalizeEstimationSettings();
  try {
    const settings = await readStoredJson(settingsFile.storageObject);
    return normalizeEstimationSettings(settings?.estimation);
  } catch (error) {
    console.warn("Stundenschätzungs-Einstellungen konnten nicht gelesen werden", error.message);
    return normalizeEstimationSettings();
  }
}

export async function releaseProjectCalculationSnapshot({ projectId, releasedById }) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      projectNumber: true,
      projectType: true,
      files: {
        where: {
          deletedAt: null,
          fileName: { in: ["calculation.json", "cabinet.json", "list.json"] }
        },
        select: {
          id: true,
          fileName: true,
          serverVersion: true,
          updatedAt: true,
          storageObject: {
            select: { bucketName: true, objectKey: true, etag: true }
          }
        }
      }
    }
  });
  if (!project) {
    const error = new Error("Projekt nicht gefunden");
    error.statusCode = 404;
    throw error;
  }

  const files = Object.fromEntries(project.files.map(file => [file.fileName, file]));
  const requiredFiles = ["calculation.json", "cabinet.json", "list.json"];
  const missing = requiredFiles.filter(fileName => !files[fileName]);
  if (missing.length) {
    const error = new Error(`Für die Freigabe fehlen: ${missing.join(", ")}`);
    error.statusCode = 400;
    error.code = "SNAPSHOT_FILES_MISSING";
    throw error;
  }

  const [calculation, cabinets, partList] = await Promise.all(requiredFiles.map(
    fileName => readStoredJson(files[fileName].storageObject)
  ));
  const objectReferences = {
    calculation: toObjectReference(files["calculation.json"]),
    cabinet: toObjectReference(files["cabinet.json"]),
    list: toObjectReference(files["list.json"])
  };
  const data = buildCalculationSnapshot({
    project,
    calculation,
    cabinets,
    partList,
    objectReferences
  });
  if (data.actualHours <= 0) {
    const error = new Error("Eine Nachkalkulation ohne Iststunden kann nicht freigegeben werden.");
    error.statusCode = 400;
    error.code = "SNAPSHOT_ACTUAL_HOURS_MISSING";
    throw error;
  }

  return prisma.$transaction(async transaction => {
    const sourceVersion = files["calculation.json"].serverVersion;
    const lockKey = `calculation-snapshot:${projectId}:${sourceVersion}`;
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
    `;
    const existing = await transaction.calculationSnapshot.findFirst({
      where: { projectId, sourceVersion }
    });
    if (existing) return { snapshot: existing, created: false };

    const snapshot = await transaction.calculationSnapshot.create({
      data: { projectId, releasedById, sourceVersion, ...data }
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: releasedById,
        action: "calculation.snapshot.release",
        entityType: "calculationSnapshot",
        entityId: snapshot.id,
        metadata: {
          projectId,
          plannedHours: data.plannedHours,
          actualHours: data.actualHours,
          objectReferences
        }
      }
    });
    return { snapshot, created: true };
  });
}

export async function findApprovedSnapshotCandidates({ project, cabinets, partList, excludeProjectId, settings }) {
  const normalizedSettings = normalizeEstimationSettings(settings);
  const current = {
    project,
    cabinetSummary: summarizeCabinets(cabinets),
    listSummary: summarizePartList(partList)
  };
  const indexed = await prisma.calculationSnapshot.findMany({
    where: { projectId: { not: excludeProjectId }, actualHours: { gt: 0 } },
    orderBy: { releasedAt: "desc" },
    take: normalizedSettings.candidatePoolSize
  });
  const narrowed = indexed
    .map(snapshot => ({
      snapshot,
      score: scoreProjectSimilarity(current, {
        title: snapshot.projectTitle,
        description: snapshot.description,
        projectType: snapshot.projectType,
        cabinetSummary: snapshot.cabinetSummary,
        listSummary: snapshot.listSummary
      }, normalizedSettings)
    }))
    .filter(row => row.score >= normalizedSettings.minimumSimilarity)
    .sort((left, right) => right.score - left.score || right.snapshot.actualHours - left.snapshot.actualHours)
    .slice(0, normalizedSettings.maximumMatches);

  // Erst nach der rein indexbasierten Eingrenzung werden die referenzierten
  // Projektdateien der wenigen Treffer zur Detailprüfung geladen.
  return Promise.all(narrowed.map(async ({ snapshot, score }) => {
    const references = snapshot.objectReferences || {};
    const [snapshotCabinets, snapshotPartList] = await Promise.all([
      readReference(references.cabinet),
      readReference(references.list)
    ]);
    const detail = {
      cabinetSummary: Array.isArray(snapshotCabinets)
        ? summarizeCabinets(snapshotCabinets)
        : snapshot.cabinetSummary,
      listSummary: Array.isArray(snapshotPartList)
        ? summarizePartList(snapshotPartList)
        : snapshot.listSummary
    };
    return { ...snapshotToEstimationCandidate(snapshot, detail), score };
  }));
}

export async function listReleasedCalculationSnapshots() {
  return prisma.calculationSnapshot.findMany({
    orderBy: { releasedAt: "desc" },
    take: 250,
    include: {
      releasedBy: { select: { firstName: true, lastName: true, login: true } }
    }
  });
}

export function presentCalculationSnapshot(snapshot) {
  return {
    id: snapshot.id,
    projectId: snapshot.projectId,
    schemaVersion: snapshot.schemaVersion,
    sourceVersion: snapshot.sourceVersion,
    projectTitle: snapshot.projectTitle,
    projectNumber: snapshot.projectNumber,
    projectType: snapshot.projectType,
    description: snapshot.description,
    cabinetCount: snapshot.cabinetCount,
    cabinetTypes: snapshot.cabinetTypes,
    complexity: snapshot.complexity,
    volume: snapshot.volume,
    materialCost: snapshot.materialCost,
    plannedHours: snapshot.plannedHours,
    actualHours: snapshot.actualHours,
    varianceHours: snapshot.varianceHours,
    plan: snapshot.plan,
    actual: snapshot.actual,
    hourlyRates: snapshot.hourlyRates,
    calculationBasis: snapshot.calculationBasis,
    cabinetSummary: snapshot.cabinetSummary,
    listSummary: snapshot.listSummary,
    filterData: snapshot.filterData,
    objectReferences: snapshot.objectReferences,
    releasedAt: snapshot.releasedAt,
    releasedBy: snapshot.releasedBy
      ? [snapshot.releasedBy.firstName, snapshot.releasedBy.lastName].filter(Boolean).join(" ") || snapshot.releasedBy.login
      : null
  };
}
