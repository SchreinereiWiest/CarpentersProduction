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

const boundedNumber = (value, { maximum = 1_000_000, integer = false } = {}) => {
  const normalized = Math.min(maximum, nonNegativeNumber(value));
  return integer ? Math.round(normalized) : roundMoney(normalized);
};

const cleanText = (value, maximum = 500) => String(value || "").trim().slice(0, maximum);

const manualSnapshotError = (code, message) => Object.assign(new Error(message), { code });

const normalizeManualCostCenters = rows => {
  const seen = new Set();
  return asArray(rows).map((row, index) => {
    const name = cleanText(row?.name, 120);
    if (!name) return null;
    const baseId = cleanText(row?.id, 120) || `manual-center-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (seen.has(id)) id = `${baseId}-${suffix++}`;
    seen.add(id);
    return {
      id,
      name,
      hours: boundedNumber(row?.hours, { maximum: 100_000 }),
      hourlyRate: boundedNumber(row?.hourlyRate, { maximum: 1_000_000 })
    };
  }).filter(Boolean);
};

const normalizeMaterialIds = value => [...new Set(
  (Array.isArray(value) ? value : String(value || "").split(/[;,\n]/))
    .map(item => cleanText(item, 120))
    .filter(Boolean)
)].slice(0, 50);

export function summarizeManualCabinetDimensions(rows = []) {
  const cabinetDimensions = asArray(rows).map((row, index) => {
    const type = cleanText(row?.type, 120);
    const width = boundedNumber(row?.width, { maximum: 100_000 });
    const height = boundedNumber(row?.height, { maximum: 100_000 });
    const depth = boundedNumber(row?.depth, { maximum: 100_000 });
    const sections = boundedNumber(row?.sections, { maximum: 100_000, integer: true });
    const fronts = boundedNumber(row?.fronts, { maximum: 100_000, integer: true });
    const functions = boundedNumber(row?.functions, { maximum: 100_000, integer: true });
    const hasData = type || width || height || depth || sections || fronts || functions;
    if (!hasData) return null;
    const quantity = Math.max(1, boundedNumber(row?.quantity, { maximum: 100_000, integer: true }));
    return {
      id: cleanText(row?.id, 120) || `manual-cabinet-${index + 1}`,
      type: type || `Korpustyp ${index + 1}`,
      quantity,
      width,
      height,
      depth,
      sections,
      fronts,
      functions,
      volume: roundMoney(width * height * depth * quantity / 1_000_000_000),
      complexity: roundMoney(quantity * (1 + sections * 0.18 + fronts * 0.28 + functions * 0.35))
    };
  }).filter(Boolean);

  return {
    cabinetDimensions,
    cabinetTypes: cabinetDimensions.length,
    cabinetCount: cabinetDimensions.reduce((sum, row) => sum + row.quantity, 0),
    sections: cabinetDimensions.reduce((sum, row) => sum + row.sections * row.quantity, 0),
    fronts: cabinetDimensions.reduce((sum, row) => sum + row.fronts * row.quantity, 0),
    functions: cabinetDimensions.reduce((sum, row) => sum + row.functions * row.quantity, 0),
    volume: roundMoney(cabinetDimensions.reduce((sum, row) => sum + row.volume, 0)),
    complexity: roundMoney(cabinetDimensions.reduce((sum, row) => sum + row.complexity, 0))
  };
}

/**
 * Baut einen freigegebenen Vergleichsdatensatz aus einer manuellen
 * Nachkalkulation. Das Format entspricht absichtlich einem Projekt-Snapshot,
 * damit Suche und Stundenschätzung beide Quellen identisch behandeln.
 */
export function buildManualCalculationSnapshot(input = {}) {
  const projectTitle = cleanText(input.projectTitle, 200);
  if (!projectTitle) throw manualSnapshotError("MANUAL_SNAPSHOT_TITLE_REQUIRED", "Eine Projektbezeichnung ist erforderlich.");

  const actualCenters = normalizeManualCostCenters(input.costCenters);
  const actualHours = totalHours(actualCenters);
  if (actualHours <= 0) throw manualSnapshotError("MANUAL_SNAPSHOT_ACTUAL_HOURS_REQUIRED", "Mindestens eine Kostenstelle benötigt Iststunden.");

  const projectNumber = cleanText(input.projectNumber, 80) || null;
  const projectType = cleanText(input.projectType, 120) || null;
  const description = cleanText(input.description, 4000) || null;
  const dimensionSummary = summarizeManualCabinetDimensions(input.cabinetDimensions);
  const usesDimensions = input.structureMode === "dimensions" && dimensionSummary.cabinetDimensions.length > 0;
  const cabinetCount = usesDimensions
    ? dimensionSummary.cabinetCount
    : boundedNumber(input.cabinetCount, { maximum: 100_000, integer: true });
  const cabinetTypes = usesDimensions
    ? dimensionSummary.cabinetTypes
    : boundedNumber(input.cabinetTypes, { maximum: 100_000, integer: true });
  const sections = usesDimensions
    ? dimensionSummary.sections
    : boundedNumber(input.sections, { maximum: 1_000_000, integer: true });
  const fronts = usesDimensions
    ? dimensionSummary.fronts
    : boundedNumber(input.fronts, { maximum: 1_000_000, integer: true });
  const functions = usesDimensions
    ? dimensionSummary.functions
    : boundedNumber(input.functions, { maximum: 1_000_000, integer: true });
  const complexity = usesDimensions
    ? dimensionSummary.complexity
    : boundedNumber(input.complexity, { maximum: 10_000_000 });
  const volume = usesDimensions
    ? dimensionSummary.volume
    : boundedNumber(input.volume, { maximum: 10_000_000 });
  const partCount = boundedNumber(input.partCount, { maximum: 10_000_000, integer: true });
  const totalAreaM2 = boundedNumber(input.totalAreaM2, { maximum: 10_000_000 });
  const materialIds = normalizeMaterialIds(input.materialIds);
  const materialCost = boundedNumber(input.materialCost, { maximum: 1_000_000_000 });
  const plannedHours = boundedNumber(input.plannedHours, { maximum: 100_000 });
  const cabinetSummary = {
    entryMode: usesDimensions ? "dimensions" : "aggregate",
    cabinetTypes,
    cabinetCount,
    sections,
    fronts,
    functions,
    volume,
    complexity,
    cabinetDimensions: usesDimensions ? dimensionSummary.cabinetDimensions : []
  };
  const listSummary = {
    objectCount: cabinetTypes,
    partCount,
    materialCount: materialIds.length,
    materialIds,
    totalAreaM2
  };
  const filterText = [projectTitle, description, projectType, ...materialIds]
    .filter(Boolean)
    .join(" ")
    .slice(0, 4000);
  const plan = {
    mode: "manual",
    hours: plannedHours,
    costCenters: [],
    fullHourlyRate: 0
  };
  const actual = { hours: actualHours, costCenters: actualCenters };
  const hourlyRates = {
    plan: [],
    actual: actualCenters.map(({ id, name, hourlyRate }) => ({ id, name, hourlyRate })),
    fullHourlyRate: 0
  };
  const calculationBasis = {
    source: "manual-post-calculation",
    materialCost,
    quick: null,
    full: null,
    post: null
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
    sourceVersion: 1,
    projectTitle,
    projectNumber,
    projectType,
    description,
    filterText,
    cabinetCount,
    cabinetTypes,
    complexity,
    volume,
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
    objectReferences: {}
  };
}

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
