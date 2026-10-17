import { nonNegativeNumber, roundMoney, summarizeCabinets } from "./calculation.mjs";

const compactCabinetSummary = cabinets => {
  const { rows: _rows, ...summary } = summarizeCabinets(cabinets);
  return summary;
};

const asArray = value => Array.isArray(value) ? value : [];

export function summarizePartList(partList) {
  const objects = asArray(partList);
  const parts = objects.flatMap(object => {
    const children = asArray(object?.Children);
    return children.length ? children : [object];
  });
  const materialIds = [...new Set(parts.map(part => part?.MID ?? part?.materialId).filter(Boolean).map(String))];
  const partCount = parts.reduce((sum, part) => sum + Math.max(1, nonNegativeNumber(part?.Anzahl) || 1), 0);
  const totalAreaM2 = parts.reduce((sum, part) => {
    const quantity = Math.max(1, nonNegativeNumber(part?.Anzahl) || 1);
    return sum + nonNegativeNumber(part?.L) * nonNegativeNumber(part?.B) * quantity / 1_000_000;
  }, 0);
  return {
    objectCount: objects.length,
    partCount: roundMoney(partCount),
    materialCount: materialIds.length,
    materialIds: materialIds.slice(0, 50),
    totalAreaM2: roundMoney(totalAreaM2)
  };
}

const centerRows = rows => asArray(rows).map(row => ({
  id: String(row?.id || ""),
  name: String(row?.name || "Kostenstelle"),
  hours: roundMoney(nonNegativeNumber(row?.hours)),
  hourlyRate: roundMoney(nonNegativeNumber(row?.hourlyRate))
}));

const totalHours = rows => roundMoney(rows.reduce((sum, row) => sum + row.hours, 0));

export function buildCalculationSnapshot({
  project = {},
  calculation = {},
  cabinets = [],
  partList = [],
  objectReferences = {}
} = {}) {
  const cabinetSummary = compactCabinetSummary(cabinets);
  const listSummary = summarizePartList(partList);
  const planMode = calculation.preMode === "quick" ? "quick" : "full";
  const plannedCenters = planMode === "full" ? centerRows(calculation.full?.costCenters) : [];
  const actualCenters = centerRows(calculation.post?.costCenters);
  const plannedHours = planMode === "quick"
    ? roundMoney(nonNegativeNumber(calculation.quick?.hours))
    : totalHours(plannedCenters);
  const actualHours = totalHours(actualCenters);
  const materialCost = roundMoney(nonNegativeNumber(
    calculation.results?.post?.materialBase
    ?? calculation.results?.full?.materialBase
    ?? calculation.results?.quick?.materialBase
  ));
  const title = String(project.title || "Projekt");
  const description = String(project.description || "");
  const projectType = project.projectType ? String(project.projectType) : null;
  const filterText = [
    title,
    description,
    projectType,
    ...listSummary.materialIds,
    ...asArray(cabinets).map(cabinet => cabinet?.name)
  ].filter(Boolean).join(" ").slice(0, 4000);
  const plan = {
    mode: planMode,
    hours: plannedHours,
    costCenters: plannedCenters,
    fullHourlyRate: roundMoney(nonNegativeNumber(calculation.quick?.hourlyRate))
  };
  const actual = { hours: actualHours, costCenters: actualCenters };
  const hourlyRates = {
    plan: plannedCenters.map(({ id, name, hourlyRate }) => ({ id, name, hourlyRate })),
    actual: actualCenters.map(({ id, name, hourlyRate }) => ({ id, name, hourlyRate })),
    fullHourlyRate: plan.fullHourlyRate
  };
  const calculationBasis = {
    materialCost,
    quick: calculation.results?.quick || null,
    full: calculation.results?.full || null,
    post: calculation.results?.post || null
  };
  const filterData = {
    projectType,
    cabinet: cabinetSummary,
    list: listSummary,
    materialCost,
    plannedHours,
    actualHours,
    filterText
  };

  return {
    schemaVersion: 1,
    projectTitle: title,
    projectNumber: project.projectNumber ? String(project.projectNumber) : null,
    projectType,
    description: description || null,
    filterText,
    cabinetCount: cabinetSummary.cabinetCount,
    cabinetTypes: cabinetSummary.cabinetTypes,
    complexity: cabinetSummary.complexity,
    volume: cabinetSummary.volume,
    materialCost,
    plannedHours,
    actualHours,
    varianceHours: roundMoney(actualHours - plannedHours),
    plan,
    actual,
    hourlyRates,
    calculationBasis,
    cabinetSummary,
    listSummary,
    filterData,
    objectReferences
  };
}

export function snapshotToEstimationCandidate(snapshot, detail = {}) {
  const actual = snapshot.actual || {};
  return {
    id: snapshot.id,
    snapshotId: snapshot.id,
    projectId: snapshot.projectId,
    title: snapshot.projectTitle,
    description: snapshot.description,
    projectType: snapshot.projectType,
    updatedAt: snapshot.releasedAt,
    releasedAt: snapshot.releasedAt,
    cabinetSummary: detail.cabinetSummary || snapshot.cabinetSummary,
    listSummary: detail.listSummary || snapshot.listSummary,
    hoursByCenter: actual.costCenters || [],
    totalHours: nonNegativeNumber(snapshot.actualHours || actual.hours),
    source: "approved-snapshot"
  };
}
