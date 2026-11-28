import { expandCncMachiningVariants } from "../cnc/machiningVariants.js";

const key = id => String(id ?? "");

/**
 * Migriert gespeicherte Nestings aus der Zeit vor physischen CNC-Varianten.
 * Serialisierte Nestingdaten enthalten dasselbe Bauteil an mehreren Stellen;
 * deshalb wird die Variante zuerst je physischer Instanz-ID festgelegt und
 * anschließend in jeder Darstellung identisch ersetzt.
 */
export function migrateNestingPartIdentities(nesting = []) {
  const physicalParts = new Map();
  const visit = value => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    if (value.original?.PID != null && value.id != null && !physicalParts.has(key(value.id))) {
      physicalParts.set(key(value.id), value);
    }
    Object.values(value).forEach(visit);
  };
  visit(nesting);

  const byBasePid = new Map();
  physicalParts.forEach(part => {
    const original = part.original;
    if (original?._cncBasePid || (original?.CNC?.machiningVariants?.length ?? 0) <= 1) return;
    const pid = key(original.PID);
    if (!byBasePid.has(pid)) byBasePid.set(pid, []);
    byBasePid.get(pid).push(part);
  });

  const replacementByInstance = new Map();
  byBasePid.forEach(parts => {
    const variants = expandCncMachiningVariants(parts[0].original);
    const sequence = variants.flatMap(variant => Array.from(
      { length: Math.max(0, Number(variant.Anzahl) || 0) },
      () => variant
    ));
    parts.sort((left, right) => Number(left.id) - Number(right.id) || key(left.id).localeCompare(key(right.id)));
    parts.forEach((part, index) => {
      if (sequence[index]) replacementByInstance.set(key(part.id), sequence[index]);
    });
  });

  if (!replacementByInstance.size) return nesting;
  const replace = value => {
    if (Array.isArray(value)) return value.map(replace);
    if (!value || typeof value !== "object") return value;
    const result = Object.fromEntries(Object.entries(value).map(([name, child]) => [name, replace(child)]));
    const replacement = value.original && replacementByInstance.get(key(value.id));
    return replacement ? { ...result, original: replacement } : result;
  };
  return replace(nesting);
}
