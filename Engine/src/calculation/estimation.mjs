import { nonNegativeNumber, roundMoney, summarizeCabinets } from "./calculation.mjs";
import { summarizePartList } from "./snapshots.mjs";

export const DEFAULT_ESTIMATION_SETTINGS = Object.freeze({
  schemaVersion: 1,
  candidatePoolSize: 50,
  maximumMatches: 5,
  minimumSimilarity: 0,
  weights: Object.freeze({
    text: 20,
    projectType: 10,
    cabinetCount: 20,
    complexity: 20,
    volume: 10,
    partCount: 10,
    materials: 10
  })
});

const boundedInteger = (value, fallback, minimum, maximum) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, Math.round(number)))
    : fallback;
};

export function normalizeEstimationSettings(settings = {}) {
  const weights = Object.fromEntries(Object.entries(DEFAULT_ESTIMATION_SETTINGS.weights).map(([key, fallback]) => [
    key,
    boundedInteger(settings?.weights?.[key], fallback, 0, 100)
  ]));
  if (Object.values(weights).every(value => value === 0)) {
    Object.assign(weights, DEFAULT_ESTIMATION_SETTINGS.weights);
  }
  return {
    schemaVersion: 1,
    candidatePoolSize: boundedInteger(settings.candidatePoolSize, 50, 5, 500),
    maximumMatches: boundedInteger(settings.maximumMatches, 5, 1, 20),
    minimumSimilarity: boundedInteger(settings.minimumSimilarity, 0, 0, 100),
    weights
  };
}

const tokenize = value => new Set(
  String(value || "")
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9äöüß]+/gi, " ")
    .split(/\s+/)
    .filter(word => word.length > 2)
);

const jaccard = (left, right) => {
  const a = tokenize(left);
  const b = tokenize(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter(value => b.has(value)).length;
  return intersection / new Set([...a, ...b]).size;
};

const proximity = (left, right) => {
  const maximum = Math.max(nonNegativeNumber(left), nonNegativeNumber(right), 1);
  return Math.max(0, 1 - Math.abs(nonNegativeNumber(left) - nonNegativeNumber(right)) / maximum);
};

export function scoreProjectSimilarity({ project = {}, cabinetSummary = {}, listSummary = null } = {}, candidate = {}, settings = {}) {
  const normalized = normalizeEstimationSettings(settings);
  const weights = normalized.weights;
  const textScore = jaccard(
    `${project.title || ""} ${project.description || ""}`,
    `${candidate.title || candidate.projectTitle || ""} ${candidate.description || ""}`
  );
  const typeScore = project.projectType && candidate.projectType
    ? Number(project.projectType === candidate.projectType)
    : 0;
  const summary = candidate.cabinetSummary || {};
  const components = [
    [textScore, weights.text],
    [typeScore, weights.projectType],
    [proximity(cabinetSummary.cabinetCount, summary.cabinetCount), weights.cabinetCount],
    [proximity(cabinetSummary.complexity, summary.complexity), weights.complexity],
    [proximity(cabinetSummary.volume, summary.volume), weights.volume]
  ];
  if (listSummary && candidate.listSummary) {
    const leftMaterials = (listSummary.materialIds || []).join(" ");
    const rightMaterials = (candidate.listSummary.materialIds || []).join(" ");
    components.push(
      [proximity(listSummary.partCount, candidate.listSummary.partCount), weights.partCount],
      [leftMaterials || rightMaterials ? jaccard(leftMaterials, rightMaterials) : 1, weights.materials]
    );
  }
  const weightTotal = Math.max(1, components.reduce((sum, [, weight]) => sum + weight, 0));
  return Math.round(components.reduce((sum, [score, weight]) => sum + score * weight, 0) / weightTotal * 100);
}

function hoursFromCandidate(candidate, costCenters) {
  if (Array.isArray(candidate?.hoursByCenter) && candidate.hoursByCenter.length) {
    return candidate.hoursByCenter.map(row => ({
      id: String(row.id),
      name: row.name || costCenters.find(center => String(center.id) === String(row.id))?.name || "Kostenstelle",
      hours: nonNegativeNumber(row.hours)
    }));
  }

  const mapping = new Map();
  for (const center of costCenters) {
    for (const activity of center.activityIds || []) mapping.set(activity, String(center.id));
  }
  const totals = new Map(costCenters.map(center => [String(center.id), 0]));
  for (const [activity, hours] of Object.entries(candidate?.hoursByActivity || {})) {
    const centerId = mapping.get(activity);
    if (centerId) totals.set(centerId, (totals.get(centerId) || 0) + nonNegativeNumber(hours));
  }
  return costCenters.map(center => ({
    id: String(center.id),
    name: center.name,
    hours: roundMoney(totals.get(String(center.id)) || 0)
  }));
}

/**
 * Ermittelt innerhalb freigegebener Nachkalkulations-Snapshots ähnliche
 * Projekte und erzeugt aus deren Iststunden eine gewichtete Schätzung. Diese
 * deterministische Bewertung bleibt der Fallback für die spätere Embedding-
 * und Erklärpipeline.
 */
export function estimateProjectHours({ project = {}, cabinets = [], partList = [], candidates = [], costCenters = [], settings = {} } = {}) {
  const normalizedSettings = normalizeEstimationSettings(settings);
  const current = summarizeCabinets(cabinets);
  const currentList = summarizePartList(partList);
  const matches = (Array.isArray(candidates) ? candidates : [])
    .map(candidate => {
      const summary = candidate.cabinetSummary && typeof candidate.cabinetSummary === "object"
        ? candidate.cabinetSummary
        : summarizeCabinets(candidate.cabinets);
      const score = scoreProjectSimilarity(
        { project, cabinetSummary: current, listSummary: currentList },
        { ...candidate, cabinetSummary: summary },
        normalizedSettings
      );
      const hoursByCenter = hoursFromCandidate(candidate, costCenters);
      const centerHours = hoursByCenter.reduce((sum, row) => sum + row.hours, 0);
      const totalHours = nonNegativeNumber(candidate.totalHours || centerHours);
      return { ...candidate, cabinetSummary: summary, hoursByCenter, totalHours, score };
    })
    .filter(candidate => candidate.totalHours > 0 && candidate.score >= normalizedSettings.minimumSimilarity)
    .sort((a, b) => b.score - a.score || b.totalHours - a.totalHours)
    .slice(0, normalizedSettings.maximumMatches);

  if (!matches.length) {
    return {
      matches: [],
      totalHours: 0,
      hoursByCenter: costCenters.map(center => ({ id: String(center.id), name: center.name, hours: 0 })),
      confidence: "none",
      explanation: "Es liegen noch keine freigegebenen Nachkalkulationen als Vergleichsbasis vor."
    };
  }

  const weighted = matches.map(match => ({ ...match, weight: Math.max(0.1, match.score / 100) }));
  const totalWeight = weighted.reduce((sum, match) => sum + match.weight, 0);
  const currentComplexity = Math.max(current.complexity, 1);
  const estimatedTotal = weighted.reduce((sum, match) => {
    const candidateComplexity = Math.max(match.cabinetSummary.complexity, 1);
    const scale = Math.min(2.5, Math.max(0.4, currentComplexity / candidateComplexity));
    return sum + match.totalHours * scale * match.weight;
  }, 0) / totalWeight;

  const hoursByCenter = costCenters.map(center => {
    const hours = weighted.reduce((sum, match) => {
      const candidateComplexity = Math.max(match.cabinetSummary.complexity, 1);
      const scale = Math.min(2.5, Math.max(0.4, currentComplexity / candidateComplexity));
      const row = match.hoursByCenter.find(item => String(item.id) === String(center.id));
      return sum + nonNegativeNumber(row?.hours) * scale * match.weight;
    }, 0) / totalWeight;
    return { id: String(center.id), name: center.name, hours: roundMoney(hours) };
  });

  const allocated = hoursByCenter.reduce((sum, row) => sum + row.hours, 0);
  if (allocated > 0 && estimatedTotal > 0) {
    const scale = estimatedTotal / allocated;
    for (const row of hoursByCenter) row.hours = roundMoney(row.hours * scale);
  } else if (hoursByCenter.length && estimatedTotal > 0) {
    const share = estimatedTotal / hoursByCenter.length;
    for (const row of hoursByCenter) row.hours = roundMoney(share);
    const difference = roundMoney(estimatedTotal - hoursByCenter.reduce((sum, row) => sum + row.hours, 0));
    hoursByCenter[0].hours = roundMoney(hoursByCenter[0].hours + difference);
  }

  const best = matches[0];
  const confidence = matches.length >= 3 && best.score >= 65
    ? "high"
    : matches.length >= 2 && best.score >= 40
      ? "medium"
      : "low";
  return {
    matches,
    totalHours: roundMoney(estimatedTotal),
    hoursByCenter,
    confidence,
    explanation: buildEstimationExplanation({ current, matches, totalHours: estimatedTotal, confidence })
  };
}

export function buildEstimationExplanation({ current, matches, totalHours, confidence }) {
  if (!matches?.length) return "Keine belastbare Vergleichsbasis vorhanden.";
  const best = matches[0];
  const confidenceLabels = { high: "hoch", medium: "mittel", low: "niedrig" };
  return `Die Schätzung von ${roundMoney(totalHours)} Stunden basiert auf ${matches.length} Vergleichsprojekt${matches.length === 1 ? "" : "en"}. Am ähnlichsten ist „${best.title}“ (${best.score} %). Berücksichtigt wurden Korpusanzahl, Abmessungsvolumen, konstruktive Komplexität, Projektart und Beschreibung. Die Datenbasis ist ${confidenceLabels[confidence] || "nicht bestimmbar"}; der Wert sollte vor der Übernahme fachlich geprüft werden. Das aktuelle Projekt umfasst ${current.cabinetCount} Korpusse.`;
}
