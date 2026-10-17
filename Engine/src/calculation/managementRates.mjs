import { nonNegativeNumber, roundMoney } from './calculation.mjs';

const validRate = center => (
  center?.hourlyRate !== null
  && center?.hourlyRate !== ''
  && center?.hourlyRate !== undefined
  && Number.isFinite(Number(center.hourlyRate))
);

/**
 * Verdichtet die Vollstundensätze der Hauptkostenstellen zu einem Satz.
 * Pro Kostenstelle wird zunächst der arithmetische Mittelwert der bei allen
 * Mitarbeitern hinterlegten Zeitanteile gebildet. Anschließend werden die
 * Kostenstellensätze mit diesen Anteilen gewichtet.
 *
 * Fehlen Personalschlüssel (z. B. in älteren Managementständen), dienen die
 * geplanten Kostenstellenstunden und zuletzt eine Gleichverteilung als
 * nachvollziehbarer Fallback.
 */
export function combineManagementHourlyRates({ costCenters = [], staff = [] } = {}) {
  const centers = (Array.isArray(costCenters) ? costCenters : [])
    .filter(center => center?.kind !== 'support' && validRate(center))
    .map(center => ({
      ...center,
      id: String(center.id),
      hourlyRate: nonNegativeNumber(center.hourlyRate),
      hours: nonNegativeNumber(center.hours)
    }));
  const employees = (Array.isArray(staff) ? staff : [])
    .filter(employee => Array.isArray(employee?.allocations));

  const averageAllocations = Object.fromEntries(centers.map(center => {
    const sum = employees.reduce((total, employee) => {
      const allocation = employee.allocations.find(item => String(item?.centerId) === center.id);
      return total + nonNegativeNumber(allocation?.percent);
    }, 0);
    return [center.id, employees.length ? sum / employees.length : 0];
  }));
  const allocationTotal = Object.values(averageAllocations)
    .reduce((sum, percent) => sum + percent, 0);
  const plannedHours = centers.reduce((sum, center) => sum + center.hours, 0);
  const source = allocationTotal > 0
    ? 'staff-allocation'
    : plannedHours > 0
      ? 'planned-hours'
      : centers.length
        ? 'equal'
        : 'unavailable';

  const weightTotal = source === 'staff-allocation'
    ? allocationTotal
    : source === 'planned-hours'
      ? plannedHours
      : centers.length;
  const rawWeightPercent = center => {
    const rawWeight = source === 'staff-allocation'
      ? averageAllocations[center.id]
      : source === 'planned-hours'
        ? center.hours
        : source === 'equal'
          ? 1
          : 0;
    return weightTotal > 0 ? rawWeight / weightTotal * 100 : 0;
  };
  const weightedCenters = centers.map(center => {
    return {
      ...center,
      averageAllocationPercent: roundMoney(averageAllocations[center.id]),
      rateWeightPercent: roundMoney(rawWeightPercent(center))
    };
  });

  return {
    hourlyRate: roundMoney(centers.reduce(
      (sum, center) => sum + center.hourlyRate * rawWeightPercent(center) / 100,
      0
    )),
    source,
    staffCount: employees.length,
    costCenters: weightedCenters
  };
}
