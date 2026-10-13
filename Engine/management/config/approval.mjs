/** Prüft die fachlichen Freigabebedingungen; Easy benötigt einen positiven Satz, Vollkosten zusätzlich eine vollständige Kosten- und Stundenverteilung. */
export function setupChecks(config, calculation) {
  const easy = config.mode === "easy";
  const errors = [];
  if (!config.setup.companyName.trim()) errors.push("Betriebsname fehlt.");
  if (easy) {
    if (!config.easyRates.some((rate) => Number(rate.rate) > 0))
      errors.push("Mindestens einen Easy-Stundensatz eingeben.");
  } else {
    if (!config.costCenters.some((center) => center.kind !== "support"))
      errors.push("Mindestens eine Hauptkostenstelle anlegen.");
    if (calculation.totalCosts <= 0)
      errors.push("Jährliche Kosten oder Anlagenkosten erfassen.");
    errors.push(...calculation.warnings);
    for (const staff of config.setup.staff)
      if (
        Math.abs(
          staff.allocations.reduce(
            (sum, item) => sum + Number(item.percent),
            0
          ) - 100
        ) > 0.01
      )
        errors.push(`${staff.name}: Tätigkeitsverteilung muss 100 % ergeben.`);
    const assigned = new Set();
    for (const center of config.costCenters)
      for (const id of center.activityIds || []) {
        if (assigned.has(id))
          errors.push(`Tätigkeit ${id} ist mehreren Kostenstellen zugeordnet.`);
        assigned.add(id);
      }
  }
  if (
    config.setup.annualCosts.filter((cost) => cost.source === "staff").length >
    1
  )
    errors.push(
      "Personalkosten aus Mitarbeiterdaten dürfen nur einmal übernommen werden."
    );
  return [...new Set(errors)];
}

/** Liest die zuletzt freigegebenen Eingaben; ohne Freigabe wird null zurückgegeben. */
export function approvedConfig(config) {
  return config.setup?.approvals?.at(-1)?.config || null;
}
