import { fiscalRange, today, dateInBerlin } from '../utils/dates.mjs';
import { round } from '../utils/numbers.mjs';

/** Ermittelt produktive Jahresstunden aus Kapazität und Ausfällen; ein direkter Jahreswert hat Vorrang. */
export function productiveHours(staff) {
  if (
    staff.annualHours !== null &&
    staff.annualHours !== "" &&
    staff.annualHours !== undefined
  )
    return Number(staff.annualHours);
  return round(
    (Math.max(
      0,
      Number(staff.workDays) -
        Number(staff.holidays) -
        Number(staff.vacation) -
        Number(staff.sickDays) -
        Number(staff.trainingDays)
    ) *
      Number(staff.hoursPerDay) *
      Number(staff.fte ?? 1) *
      Number(staff.productivity)) /
      100
  );
}

/** Bildet eine eindeutige Zuordnungskennung für katalogisierte oder frei benannte Tätigkeiten. */
export const activityKey = (entry) =>
  entry.customWorkType ? `custom:${entry.customWorkType}` : entry.workType;

/** Aggregiert abgeschlossene Zeitberichte getrennt nach Mitarbeitern, Tätigkeiten, Kostenstellen und Monaten; fehlende Zuordnungen bleiben sichtbar. */
export function aggregateWorkingHours(entries, config, year, asOf = today()) {
  const range = fiscalRange(year, config.startMonth);
  const centers = config.costCenters;
  const employees = new Map();
  const activities = new Map();
  const months = new Map();
  const values = Object.fromEntries(centers.map((center) => [center.id, 0]));
  let total = 0;
  let unmapped = 0;
  for (const entry of entries || []) {
    if (!entry.startedAt || !entry.endedAt || Number(entry.duration) <= 0)
      continue;
    const date = dateInBerlin(entry.startedAt);
    if (date < range.start || date > range.end || date > asOf) continue;
    const hours = Number(entry.duration) / 60;
    const key = activityKey(entry);
    const center = centers.find((item) =>
      (item.activityIds || []).includes(key)
    );
    total += hours;
    if (center) values[center.id] += hours;
    else unmapped += hours;
    const employeeId = entry.userId || "unassigned";
    if (!employees.has(employeeId))
      employees.set(employeeId, {
        id: employeeId,
        name:
          [entry.user?.firstName, entry.user?.lastName]
            .filter(Boolean)
            .join(" ") ||
          entry.user?.login ||
          "Ohne Mitarbeiter",
        total: 0,
        unmapped: 0,
        values: Object.fromEntries(centers.map((item) => [item.id, 0]))
      });
    const employee = employees.get(employeeId);
    employee.total += hours;
    if (center) employee.values[center.id] += hours;
    else employee.unmapped += hours;
    if (!activities.has(key))
      activities.set(key, { id: key, hours: 0, centerId: center?.id || null });
    activities.get(key).hours += hours;
    const month = date.slice(0, 7);
    if (!months.has(month))
      months.set(month, {
        month,
        total: 0,
        values: Object.fromEntries(centers.map((item) => [item.id, 0]))
      });
    months.get(month).total += hours;
    if (center) months.get(month).values[center.id] += hours;
  }
  for (const employee of employees.values()) {
    employee.total = round(employee.total);
    employee.unmapped = round(employee.unmapped);
    for (const id of Object.keys(employee.values))
      employee.values[id] = round(employee.values[id]);
  }
  return {
    total: round(total),
    unmapped: round(unmapped),
    values: Object.fromEntries(
      Object.entries(values).map(([id, value]) => [id, round(value)])
    ),
    employees: [...employees.values()],
    activities: [...activities.values()].map((item) => ({
      ...item,
      hours: round(item.hours)
    })),
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month))
  };
}
