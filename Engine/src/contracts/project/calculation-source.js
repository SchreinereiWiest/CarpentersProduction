export const CALCULATION_SOURCES = Object.freeze({
  SERVER: "server",
  CLIENT: "client"
});

export const CALCULATION_SOURCE_HEADER = "X-Calculation-Source";

export function getProjectDocumentCalculationSource(name, exists) {
  if (String(name) !== "nesting") return null;
  return exists
    ? CALCULATION_SOURCES.SERVER
    : CALCULATION_SOURCES.CLIENT;
}

export function isCalculationSource(value) {
  return Object.values(CALCULATION_SOURCES).includes(value);
}
