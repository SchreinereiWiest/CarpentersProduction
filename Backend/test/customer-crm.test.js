import assert from "node:assert/strict";
import test from "node:test";

import {
  appointmentData,
  communicationData,
  CrmValidationError
} from "../src/modules/customers/customer-crm.validation.js";

test("CRM communication accepts phone and written contact records", () => {
  const phone = communicationData({ type: "phone", content: "Rückruf wegen Angebot" });
  const letter = communicationData({ type: "letter", subject: "Bemusterung", content: "Unterlagen versendet" });
  assert.equal(phone.type, "phone");
  assert.equal(letter.subject, "Bemusterung");
});

test("CRM communication requires content", () => {
  assert.throws(() => communicationData({ type: "email", content: "" }), CrmValidationError);
});

test("CRM appointments validate their time range", () => {
  assert.throws(() => appointmentData({
    title: "Aufmaß",
    startAt: "2026-11-05T10:00:00.000Z",
    endAt: "2026-11-05T09:00:00.000Z"
  }), /nach dem Beginn/);

  const appointment = appointmentData({
    title: "Aufmaß",
    startAt: "2026-11-05T09:00:00.000Z",
    endAt: "2026-11-05T10:00:00.000Z",
    projectId: "project-1"
  });
  assert.equal(appointment.status, "planned");
  assert.equal(appointment.projectId, "project-1");
});
