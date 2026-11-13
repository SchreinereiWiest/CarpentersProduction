const PRECISION = 100;

export const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * PRECISION) / PRECISION;

export const nonNegativeNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const percentageAmount = (base, percent) => roundMoney(
  nonNegativeNumber(base) * nonNegativeNumber(percent) / 100
);

const deductionPercent = value => Math.min(99.99, nonNegativeNumber(value));

const grossUp = (base, percent) => roundMoney(
  nonNegativeNumber(base) / (1 - deductionPercent(percent) / 100)
);

/**
 * Klassische Rueckwaertskalkulation: Der Barverkaufspreis ist die Kostenbasis.
 * Skonto und Rabatt sind Abzuege vom jeweils hoeheren Preis und werden deshalb
 * durch Division durch den verbleibenden Prozentanteil hochgerechnet.
 */
export function calculateSellingPrice({
  cashSellingPrice = 0,
  cashDiscountPercent = 0,
  customerDiscountPercent = 0,
  vatPercent = 19
} = {}) {
  const cash = roundMoney(nonNegativeNumber(cashSellingPrice));
  const normalizedCashDiscount = deductionPercent(cashDiscountPercent);
  const normalizedCustomerDiscount = deductionPercent(customerDiscountPercent);
  const targetSellingPrice = grossUp(cash, normalizedCashDiscount);
  const cashDiscountAmount = roundMoney(targetSellingPrice - cash);
  const netSellingPrice = grossUp(targetSellingPrice, normalizedCustomerDiscount);
  const customerDiscountAmount = roundMoney(netSellingPrice - targetSellingPrice);
  const vatAmount = percentageAmount(netSellingPrice, vatPercent);

  return {
    cashSellingPrice: cash,
    cashDiscountPercent: normalizedCashDiscount,
    cashDiscountAmount,
    targetSellingPrice,
    customerDiscountPercent: normalizedCustomerDiscount,
    customerDiscountAmount,
    netSellingPrice,
    vatPercent: nonNegativeNumber(vatPercent),
    vatAmount,
    grossSellingPrice: roundMoney(netSellingPrice + vatAmount)
  };
}

/** Summiert die im Projekteinkauf hinterlegten Netto-Einstandspreise. */
export function purchasingMaterialCost(procurement) {
  const items = Array.isArray(procurement) ? procurement : procurement?.items;
  if (!Array.isArray(items)) return 0;

  return roundMoney(items.reduce((total, item) => {
    const quantity = nonNegativeNumber(item?.quantity);
    const price = Number(item?.netPrice);
    return total + (Number.isFinite(price) ? quantity * Math.max(0, price) : 0);
  }, 0));
}

/** Schnellkalkulation aus Material, Materialzuschlag und einem Vollstundensatz. */
export function calculateQuick(input = {}) {
  const materialBase = roundMoney(nonNegativeNumber(input.materialCost));
  const materialSurchargeAmount = percentageAmount(materialBase, input.materialSurchargePercent);
  const materialCosts = roundMoney(materialBase + materialSurchargeAmount);
  const hours = nonNegativeNumber(input.hours);
  const hourlyRate = nonNegativeNumber(input.hourlyRate);
  const laborCosts = roundMoney(hours * hourlyRate);
  const profitPercent = nonNegativeNumber(input.profitPercent);
  const profitAmount = percentageAmount(materialCosts + laborCosts, profitPercent);
  const selling = calculateSellingPrice({
    cashSellingPrice: materialCosts + laborCosts + profitAmount,
    cashDiscountPercent: input.cashDiscountPercent,
    customerDiscountPercent: input.customerDiscountPercent,
    vatPercent: input.vatPercent
  });

  return {
    materialBase,
    materialSurchargePercent: nonNegativeNumber(input.materialSurchargePercent),
    materialSurchargeAmount,
    materialCosts,
    hours,
    hourlyRate,
    laborCosts,
    profitPercent,
    profitAmount,
    ...selling
  };
}

export function normalizeCostCenters(costCenters = []) {
  return (Array.isArray(costCenters) ? costCenters : []).map((center, index) => {
    const hours = nonNegativeNumber(center?.hours);
    const hourlyRate = nonNegativeNumber(center?.hourlyRate ?? center?.rate);
    return {
      id: String(center?.id ?? `cost-center-${index + 1}`),
      name: String(center?.name || `Kostenstelle ${index + 1}`),
      hours,
      hourlyRate,
      costs: roundMoney(hours * hourlyRate)
    };
  });
}

/** Vollkalkulation mit Materialeinzelkosten und Fertigung je Kostenstelle. */
export function calculateFull(input = {}) {
  const materialBase = roundMoney(nonNegativeNumber(input.materialCost));
  const materialDirectCosts = roundMoney(nonNegativeNumber(input.materialDirectCosts));
  const materialCosts = roundMoney(materialBase + materialDirectCosts);
  const costCenters = normalizeCostCenters(input.costCenters);
  const productionLaborCosts = roundMoney(
    costCenters.reduce((sum, center) => sum + center.costs, 0)
  );
  const productionCosts = roundMoney(materialCosts + productionLaborCosts);
  const administrationOverheadPercent = nonNegativeNumber(input.administrationOverheadPercent);
  const administrationOverheadAmount = percentageAmount(
    productionCosts,
    administrationOverheadPercent
  );
  const manufacturingCosts = roundMoney(productionCosts + administrationOverheadAmount);
  const profitPercent = nonNegativeNumber(input.profitPercent);
  const profitAmount = percentageAmount(manufacturingCosts, profitPercent);
  const selling = calculateSellingPrice({
    cashSellingPrice: manufacturingCosts + profitAmount,
    cashDiscountPercent: input.cashDiscountPercent,
    customerDiscountPercent: input.customerDiscountPercent,
    vatPercent: input.vatPercent
  });

  return {
    materialBase,
    materialDirectCosts,
    materialCosts,
    costCenters,
    productionLaborCosts,
    productionCosts,
    administrationOverheadPercent,
    administrationOverheadAmount,
    manufacturingCosts,
    profitPercent,
    profitAmount,
    ...selling
  };
}

/** Verdichtet cabinet.json fuer die Kalkulationsansicht und den Aehnlichkeitsvergleich. */
export function summarizeCabinets(cabinets) {
  const rows = (Array.isArray(cabinets) ? cabinets : []).map((cabinet, index) => {
    const quantity = Math.max(1, Math.floor(nonNegativeNumber(cabinet?.quantity) || 1));
    const sections = countNested(cabinet?.sections);
    const fronts = countNested(cabinet?.fronts);
    const functions = countFunctions(cabinet?.sections);
    const width = nonNegativeNumber(cabinet?.width);
    const height = nonNegativeNumber(cabinet?.height);
    const depth = nonNegativeNumber(cabinet?.depth);

    return {
      id: String(cabinet?.id ?? `cabinet-${index + 1}`),
      name: String(cabinet?.name || `Korpus ${index + 1}`),
      quantity,
      width,
      height,
      depth,
      sections,
      fronts,
      functions,
      complexity: roundMoney(quantity * (1 + sections * 0.18 + fronts * 0.28 + functions * 0.35))
    };
  });

  return {
    rows,
    cabinetTypes: rows.length,
    cabinetCount: rows.reduce((sum, row) => sum + row.quantity, 0),
    sections: rows.reduce((sum, row) => sum + row.sections * row.quantity, 0),
    fronts: rows.reduce((sum, row) => sum + row.fronts * row.quantity, 0),
    functions: rows.reduce((sum, row) => sum + row.functions * row.quantity, 0),
    volume: roundMoney(rows.reduce(
      (sum, row) => sum + row.width * row.height * row.depth * row.quantity / 1_000_000_000,
      0
    )),
    complexity: roundMoney(rows.reduce((sum, row) => sum + row.complexity, 0))
  };
}

/**
 * Summiert manuell geschätzte Stunden je Korpus und Kostenstelle. Die Eingaben
 * gelten pro Stück; Korpusmengen werden automatisch berücksichtigt. Alte
 * numerische Korpuswerte werden der ersten Kostenstelle zugeordnet.
 */
export function calculateCabinetHourEstimate(summary, values = {}, costCenters = []) {
  const centers = (Array.isArray(costCenters) && costCenters.length
    ? costCenters
    : [{ id: "general", name: "Gesamt" }]
  ).map(center => ({ id: String(center.id), name: String(center.name || "Kostenstelle") }));
  const centerTotals = Object.fromEntries(centers.map(center => [center.id, 0]));
  const rows = (summary?.rows || []).map(row => {
    const saved = values?.[row.id];
    const legacyHours = typeof saved === "number" || typeof saved === "string"
      ? nonNegativeNumber(saved)
      : null;
    const estimates = centers.map((center, index) => {
      const hoursPerPiece = legacyHours !== null
        ? index === 0 ? legacyHours : 0
        : nonNegativeNumber(saved?.[center.id]);
      const hours = hoursPerPiece * nonNegativeNumber(row.quantity);
      centerTotals[center.id] += hours;
      return {
        id: center.id,
        name: center.name,
        hoursPerPiece,
        hours: roundMoney(hours)
      };
    });
    return {
      ...row,
      estimates,
      hours: roundMoney(estimates.reduce((sum, estimate) => sum + estimate.hours, 0))
    };
  });
  const totalsByCenter = centers.map(center => ({
    ...center,
    hours: roundMoney(centerTotals[center.id])
  }));

  return {
    rows,
    totalsByCenter,
    totalHours: roundMoney(totalsByCenter.reduce((sum, center) => sum + center.hours, 0))
  };
}

function countNested(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + 1 + countNested(item?.children), 0);
}

function countFunctions(sections) {
  if (!Array.isArray(sections)) return 0;
  return sections.reduce((sum, section) => (
    sum
    + (Array.isArray(section?.functionConfig) ? section.functionConfig.length : 0)
    + countFunctions(section?.children)
  ), 0);
}

/** Ordnet erfasste Projektzeiten anhand der Management-Tätigkeiten Kostenstellen zu. */
export function aggregateTimeEntries(timeEntries = [], costCenters = []) {
  const rows = (Array.isArray(costCenters) ? costCenters : []).map(center => ({
    id: String(center.id),
    name: String(center.name || "Kostenstelle"),
    minutes: 0,
    hours: 0
  }));
  const byActivity = new Map();
  for (const center of costCenters) {
    for (const activityId of center?.activityIds || []) {
      if (!byActivity.has(activityId)) byActivity.set(activityId, String(center.id));
    }
  }

  let unmappedMinutes = 0;
  for (const entry of Array.isArray(timeEntries) ? timeEntries : []) {
    const minutes = nonNegativeNumber(entry?.duration);
    const activityId = entry?.customWorkType
      ? `custom:${entry.customWorkType}`
      : entry?.workType;
    const centerId = byActivity.get(activityId);
    const row = rows.find(item => item.id === centerId);
    if (row) row.minutes += minutes;
    else unmappedMinutes += minutes;
  }

  for (const row of rows) row.hours = Math.round((row.minutes / 60) * 100) / 100;
  return {
    rows,
    totalHours: Math.round(((rows.reduce((sum, row) => sum + row.minutes, 0) + unmappedMinutes) / 60) * 100) / 100,
    unmappedHours: Math.round((unmappedMinutes / 60) * 100) / 100
  };
}
