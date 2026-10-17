import { nonNegativeNumber, roundMoney, summarizeCabinets } from "./calculation.mjs";

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
 * Ermittelt aehnliche Projekte und erzeugt aus deren Iststunden eine gewichtete
 * Schaetzung. Die Funktion ist die deterministische Uebergangsloesung, bis
 * Projektbaum-Snapshots ueber Ollama-Embeddings gesucht und von einem lokalen
 * generativen Ollama-Modell erklaert werden.
 */
export function estimateProjectHours({ project = {}, cabinets = [], candidates = [], costCenters = [] } = {}) {
  const current = summarizeCabinets(cabinets);
  const currentText = `${project.title || ""} ${project.description || ""}`;
  const matches = (Array.isArray(candidates) ? candidates : [])
    .map(candidate => {
      const summary = candidate.cabinetSummary?.rows
        ? candidate.cabinetSummary
        : summarizeCabinets(candidate.cabinets);
      const textScore = jaccard(currentText, `${candidate.title || ""} ${candidate.description || ""}`);
      const typeScore = project.projectType && candidate.projectType
        ? Number(project.projectType === candidate.projectType)
        : 0;
      const cabinetScore = proximity(current.cabinetCount, summary.cabinetCount);
      const complexityScore = proximity(current.complexity, summary.complexity);
      const volumeScore = proximity(current.volume, summary.volume);
      const score = Math.round((
        textScore * 0.3
        + typeScore * 0.15
        + cabinetScore * 0.2
        + complexityScore * 0.2
        + volumeScore * 0.15
      ) * 100);
      const hoursByCenter = hoursFromCandidate(candidate, costCenters);
      const centerHours = hoursByCenter.reduce((sum, row) => sum + row.hours, 0);
      const totalHours = nonNegativeNumber(candidate.totalHours || centerHours);
      return { ...candidate, cabinetSummary: summary, hoursByCenter, totalHours, score };
    })
    .filter(candidate => candidate.totalHours > 0)
    .sort((a, b) => b.score - a.score || b.totalHours - a.totalHours)
    .slice(0, 5);

  if (!matches.length) {
    return {
      matches: [],
      totalHours: 0,
      hoursByCenter: costCenters.map(center => ({ id: String(center.id), name: center.name, hours: 0 })),
      confidence: "none",
      explanation: "Es liegen noch keine abgeschlossenen Vergleichsprojekte mit erfassten Stunden vor."
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
