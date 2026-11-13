import assert from "node:assert/strict";
import test from "node:test";

import {
  CalendarValidationError,
  calendarRange,
  normalizeCalendarEvent
} from "../src/modules/calendar/calendar.validation.js";
import { newProjectData, projectUpdateData } from "../src/modules/projects/project.logic.js";

test("new projects always start inactive", () => {
  const data = newProjectData({
    customerId: "customer-1",
    title: "Küche",
    status: "active"
  }, "user-1");
  assert.equal(data.status, "inactive");
});

test("the first activation stores a start date and later updates preserve it", () => {
  const activation = new Date("2026-10-28T09:15:00.000Z");
  const first = projectUpdateData({ status: "inactive", startDate: null }, { status: "active" }, activation);
  assert.equal(first.startDate, activation);

  const existing = new Date("2026-10-20T07:00:00.000Z");
  const later = projectUpdateData({ status: "inactive", startDate: existing }, { status: "active" }, activation);
  assert.equal(Object.hasOwn(later, "startDate"), false);

  const unrelatedUpdate = projectUpdateData({ status: "active", startDate: null }, { title: "Neuer Titel" }, activation);
  assert.equal(Object.hasOwn(unrelatedUpdate, "startDate"), false);
});

test("production phases require a project while standalone appointments do not", () => {
  assert.throws(() => normalizeCalendarEvent({
    scope: "production",
    type: "manufacturing",
    title: "Fertigung",
    startAt: "2026-10-28T08:00:00.000Z",
    endAt: "2026-10-28T09:00:00.000Z"
  }), CalendarValidationError);

  const appointment = normalizeCalendarEvent({
    scope: "production",
    type: "appointment",
    title: "Lieferung",
    startAt: "2026-10-28T08:00:00.000Z",
    endAt: "2026-10-28T09:00:00.000Z"
  });
  assert.equal(appointment.projectId, null);
});

test("personal calendar entries cannot use production-only types", () => {
  assert.throws(() => normalizeCalendarEvent({
    scope: "personal",
    type: "planning",
    title: "Privat",
    startAt: "2026-10-28T08:00:00.000Z",
    endAt: "2026-10-28T09:00:00.000Z"
  }), /nur für die Produktionsplanung/);
});

test("calendar ranges are ordered and bounded", () => {
  assert.throws(() => calendarRange({
    from: "2026-11-01T00:00:00.000Z",
    to: "2026-10-01T00:00:00.000Z"
  }), /Bereichsende/);
});
