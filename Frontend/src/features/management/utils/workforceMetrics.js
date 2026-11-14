import {
  annualScheduledMinutes,
  averageScheduledDayMinutes,
  scheduledWorkBlocksForDate
} from "../../../shared/settings/company-settings.js";

const dateKey = value => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const mergeIntervals = intervals => {
  const sorted = intervals.sort((left, right) => left[0] - right[0]);
  const merged = [];
  sorted.forEach(interval => {
    const current = merged.at(-1);
    if (!current || interval[0] > current[1]) merged.push([...interval]);
    else current[1] = Math.max(current[1], interval[1]);
  });
  return merged;
};

export function vacationMinutesForYear(settings, events, year) {
  const relevant = (events || []).map(event => {
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    return { ...event, start, end, startKey: dateKey(start), endKey: dateKey(end) };
  });
  const cursor = new Date(Number(year), 0, 1, 12);
  const yearEnd = new Date(Number(year) + 1, 0, 1, 12);
  let total = 0;

  while (cursor < yearEnd) {
    const blocks = scheduledWorkBlocksForDate(settings, cursor);
    const key = dateKey(cursor);
    const intervals = [];
    relevant.forEach(event => {
      if (event.allDay) {
        if (key >= event.startKey && key < event.endKey) {
          blocks.forEach(block => intervals.push([block.start.getTime(), block.end.getTime()]));
        }
        return;
      }
      blocks.forEach(block => {
        const start = Math.max(block.start.getTime(), event.start.getTime());
        const end = Math.min(block.end.getTime(), event.end.getTime());
        if (end > start) intervals.push([start, end]);
      });
    });
    total += mergeIntervals(intervals).reduce((sum, [start, end]) => sum + ((end - start) / 60000), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

export function buildEmployeeMetrics({ employeeId, year, settings, timeSummary, vacationEvents, vacationDays }) {
  const productiveRows = (timeSummary || []).filter(row => row.userId === employeeId);
  const productiveMinutes = productiveRows.reduce((sum, row) => sum + Number(row.minutes || 0), 0);
  const companyFreeMinutes = vacationMinutesForYear(
    settings,
    (vacationEvents || []).filter(event => event.type === "company-closed"),
    year
  );
  const maximumMinutes = Math.max(0, annualScheduledMinutes(settings, year) - companyFreeMinutes);
  const vacationMinutes = vacationMinutesForYear(
    settings,
    (vacationEvents || []).filter(event => event.type !== "company-closed" && event.ownerUserId === employeeId),
    year
  );
  const regularDayMinutes = averageScheduledDayMinutes(settings);
  const entitlementMinutes = Number(vacationDays || 0) * regularDayMinutes;
  return {
    productiveRows,
    productiveMinutes,
    maximumMinutes,
    companyFreeMinutes,
    vacationMinutes,
    regularDayMinutes,
    entitlementMinutes,
    remainingVacationMinutes: Math.max(0, entitlementMinutes - vacationMinutes)
  };
}
