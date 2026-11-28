import { normalizeEticketData } from "@Engine/eticket/index.js";

const value = input => String(input ?? "").trim();
const dimension = input => {
  const number = Number(String(input ?? "").replace(",", "."));
  return Number.isFinite(number) ? new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(number) : value(input);
};

export function createNestingEticketData({ projectId, project, customer, plate, productionPath }) {
  const part = plate?.original ?? {};
  const edgeEntries = [
    ["U", part.EBID ?? plate?.EdgeB],
    ["O", part.ETID ?? plate?.EdgeT],
    ["L", part.ELID ?? plate?.EdgeL],
    ["R", part.ERID ?? plate?.EdgeR]
  ].filter(([, edge]) => value(edge) && !["nein", "standardmaterial"].includes(value(edge).toLowerCase()));
  const pid = value(part.PID);
  const hasCnc = (part.CNC?.operations?.length ?? 0) > 0
    || (part.CNC?.machiningVariants ?? []).some(variant => (variant?.cnc?.operations?.length ?? 0) > 0);

  return normalizeEticketData({
    projectId,
    pid,
    instanceId: plate?.id,
    project: project?.title ?? project?.name ?? project?.projectName ?? projectId,
    customer: customer?.companyName ?? customer?.name ?? [customer?.firstName, customer?.lastName].filter(Boolean).join(" "),
    partName: part.Objektname ?? part.name,
    cabinet: part.cabinetName ?? part.korpusName ?? part.CabinetName ?? part.parentName,
    dimensions: `${dimension(part.L ?? plate?.originalHeight)} × ${dimension(part.B ?? plate?.originalWidth)} × ${dimension(part.T ?? plate?.thickness)} mm`,
    material: part.MID ?? plate?.material,
    edges: edgeEntries.map(([side, edge]) => `${side}: ${edge}`).join(" · "),
    cncProgram: hasCnc ? pid : "",
    scanBaseUrl: globalThis.location?.origin ?? "",
    productionPath
  });
}
