import { describe, expect, it } from "vitest";

import {
  addDays,
  buildEventPayload,
  eventOverlapsDay,
  startOfWorkWeek,
  viewRange
} from "../../src/features/calendar/engine/calendar.js";
import { formatGermanDate } from "../../src/shared/utils/date.js";

describe("Kalender-Engine", () => {
  it("zeigt in der Wochenansicht Montag bis Freitag", () => {
    const range = viewRange("week", new Date("2026-10-28T12:00:00"));
    expect(range.from.getDay()).toBe(1);
    expect(range.to).toEqual(addDays(startOfWorkWeek(range.from), 5));
  });

  it("erstellt ganztägige Produktionszeiträume anhand der Dauer", () => {
    const payload = buildEventPayload({
      scope: "production",
      type: "manufacturing",
      title: "Fertigung",
      description: "",
      projectId: "project-1",
      allDay: true,
      startDate: "2026-10-28",
      startTime: "08:00",
      endDate: "2026-10-28",
      endTime: "09:00",
      duration: 3
    });
    expect((new Date(payload.endAt) - new Date(payload.startAt)) / 86_400_000).toBe(3);
  });

  it("erkennt mehrtägige Termine an jedem betroffenen Tag", () => {
    const event = {
      startAt: "2026-10-28T00:00:00",
      endAt: "2026-10-31T00:00:00"
    };
    expect(eventOverlapsDay(event, new Date("2026-10-29T12:00:00"))).toBe(true);
    expect(eventOverlapsDay(event, new Date("2026-10-31T12:00:00"))).toBe(false);
  });

  it("formatiert Projektdaten deutsch", () => {
    expect(formatGermanDate("2026-10-28T10:00:00.000Z")).toBe("28. Oktober 26");
  });
});
