const number = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const percent = value => Math.min(100, number(value));
const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * Lineare Vollkostenrechnung fuer Leistungsbereiche.
 *
 * Gemeinkosten werden nach produktiven Stunden verteilt. Maschinenkosten
 * bleiben davon getrennt und fliessen nur mit dem hinterlegten Nutzungsanteil
 * in den Leistungsstundensatz ein. So bleiben Personal-, Gemein- und
 * Maschinenkosten fuer die Projektkalkulation nachvollziehbar.
 */
export function calculateHourlyRates(input = {}) {
  const overheadCosts = (Array.isArray(input.overheadCosts) ? input.overheadCosts : [])
    .map(item => ({
      id: String(item?.id || "other"),
      label: String(item?.label || "Sonstige Kosten"),
      amount: number(item?.amount)
    }));
  const activities = (Array.isArray(input.activities) ? input.activities : [])
    .map(item => ({
      id: String(item?.id || ""),
      name: String(item?.name || "Leistungsbereich"),
      productiveHours: number(item?.productiveHours),
      personnelCosts: number(item?.personnelCosts),
      otherDirectCosts: number(item?.otherDirectCosts),
      machineCosts: number(item?.machineCosts),
      machineHours: number(item?.machineHours),
      machineUsagePercent: percent(item?.machineUsagePercent)
    }))
    .filter(item => item.id);
  const profitPercent = number(input.profitPercent);
  const totalProductiveHours = activities.reduce((sum, item) => sum + item.productiveHours, 0);
  const totalOverheadCosts = overheadCosts.reduce((sum, item) => sum + item.amount, 0);

  const rates = activities.map(activity => {
    const allocationShare = totalProductiveHours > 0
      ? activity.productiveHours / totalProductiveHours
      : activities.length ? 1 / activities.length : 0;
    const allocatedOverhead = totalOverheadCosts * allocationShare;
    const baseHourlyRate = activity.productiveHours > 0
      ? (activity.personnelCosts + activity.otherDirectCosts + allocatedOverhead) / activity.productiveHours
      : 0;
    const machineHourlyRate = activity.machineHours > 0
      ? activity.machineCosts / activity.machineHours
      : 0;
    const hourlyRate = baseHourlyRate + machineHourlyRate * activity.machineUsagePercent / 100;

    return {
      id: activity.id,
      name: activity.name,
      activityIds: [activity.id],
      productiveHours: money(activity.productiveHours),
      personnelCosts: money(activity.personnelCosts),
      otherDirectCosts: money(activity.otherDirectCosts),
      allocatedOverhead: money(allocatedOverhead),
      allocationPercent: money(allocationShare * 100),
      baseHourlyRate: money(baseHourlyRate),
      machineHourlyRate: money(machineHourlyRate),
      machineUsagePercent: activity.machineUsagePercent,
      hourlyRate: money(hourlyRate),
      sellingRate: money(hourlyRate * (1 + profitPercent / 100))
    };
  });
  const weightedRate = totalProductiveHours > 0
    ? rates.reduce((sum, rate) => sum + rate.hourlyRate * rate.productiveHours, 0) / totalProductiveHours
    : rates.length ? rates.reduce((sum, rate) => sum + rate.hourlyRate, 0) / rates.length : 0;

  return {
    overheadCosts,
    activities,
    profitPercent,
    totalOverheadCosts: money(totalOverheadCosts),
    totalProductiveHours: money(totalProductiveHours),
    fullHourlyRate: money(weightedRate),
    rates
  };
}

