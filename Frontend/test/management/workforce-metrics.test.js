import { describe, expect, it } from "vitest";
import { DEFAULT_COMPANY_SETTINGS, normalizeCompanySettings } from "../../src/shared/settings/company-settings.js";
import { buildEmployeeMetrics, vacationMinutesForYear } from "../../src/features/management/utils/workforceMetrics.js";

const settings = normalizeCompanySettings({
  workWeek: DEFAULT_COMPANY_SETTINGS.workWeek.map(day => day.weekday === 5 ? { ...day, end: "12:00" } : day)
});

describe("Mitarbeiter-Jahreswerte", () => {
  it("charges an all-day vacation using the short Friday schedule", () => {
    expect(vacationMinutesForYear(settings, [{
      startAt: new Date(2026, 10, 13, 0, 0).toISOString(),
      endAt: new Date(2026, 10, 14, 0, 0).toISOString(),
      allDay: true
    }], 2026)).toBe(285);
  });

  it("charges partial-day vacation only where it intersects work blocks", () => {
    const start = new Date(2026, 10, 13, 8, 0).toISOString();
    const end = new Date(2026, 10, 13, 10, 0).toISOString();
    expect(vacationMinutesForYear(settings, [{ startAt: start, endAt: end, allDay: false }], 2026)).toBe(105);
  });

  it("aggregates productive time separately for the selected employee", () => {
    const metrics = buildEmployeeMetrics({
      employeeId: "anna",
      year: 2026,
      settings,
      vacationDays: 30,
      vacationEvents: [],
      timeSummary: [
        { userId: "anna", workType: "cutting", minutes: 120 },
        { userId: "max", workType: "cutting", minutes: 500 }
      ]
    });
    expect(metrics.productiveMinutes).toBe(120);
    expect(metrics.entitlementMinutes).toBe(30 * 477);
  });
});
