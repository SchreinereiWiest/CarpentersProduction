import assert from "node:assert/strict";
import test from "node:test";

import {
  createMeasurementPrintLayout,
  MEASUREMENT_PRINT_PAGE
} from "../browser/measurement-pdf/createMeasurementPDF.js";

test("Aufmaß-Drucklayout speichert offene Felder in physischen Seitenkoordinaten", () => {
  const layout = createMeasurementPrintLayout({
    projectId: "project-1",
    runId: "run-1",
    views: [
      { id: "front", label: "Frontansicht", type: "elevation" },
      { id: "three", label: "3D", type: "three" }
    ],
    objects: [
      {
        id: "measure-1",
        viewId: "front",
        kind: "measurement",
        status: "pending",
        label: "Raumbreite",
        unit: "mm",
        points: [{ x: 100, y: 100 }, { x: 900, y: 100 }]
      },
      {
        id: "measure-2",
        viewId: "front",
        kind: "measurement",
        status: "measured",
        value: "800",
        points: [{ x: 100, y: 200 }, { x: 900, y: 200 }]
      }
    ]
  });

  assert.equal(layout.pages.length, 1);
  assert.equal(layout.pages[0].fields.length, 1);
  assert.equal(layout.pages[0].fields[0].objectId, "measure-1");
  assert.equal(layout.pages[0].fields[0].widthMm, 32);
  assert.equal(layout.pages[0].fields[0].heightMm, 10);
  assert.ok(layout.pages[0].fields[0].xMm >= 0);
  assert.ok(
    layout.pages[0].fields[0].xMm + layout.pages[0].fields[0].widthMm <=
      MEASUREMENT_PRINT_PAGE.widthMm
  );
  assert.equal(
    layout.pages[0].identifier,
    `CPM1:project-1:run-1:${layout.pages[0].id}`
  );
});

test("Aufmaß-Drucklayout übernimmt die konfigurierte Formularfeldgröße", () => {
  const layout = createMeasurementPrintLayout({
    projectId: "project-1",
    runId: "run-1",
    measurementFormFieldWidthMm: 26,
    measurementFormFieldHeightMm: 9,
    views: [{ id: "front", label: "Frontansicht", type: "elevation" }],
    objects: [{
      id: "measure-1",
      viewId: "front",
      kind: "measurement",
      status: "pending",
      points: [{ x: 100, y: 100 }, { x: 900, y: 100 }]
    }]
  });

  assert.equal(layout.pages[0].fields[0].widthMm, 26);
  assert.equal(layout.pages[0].fields[0].heightMm, 9);
});

test("Aufmaß-Drucklayout erzeugt auch ohne vorgegebene IDs gültige UUIDs", () => {
  const layout = createMeasurementPrintLayout({
    projectId: "64f14598-27f8-4c52-a89a-f66960a0feb7",
    views: [{ id: "front", label: "Frontansicht", type: "elevation" }],
    objects: [
      {
        id: "measure-1",
        viewId: "front",
        kind: "measurement",
        status: "pending",
        points: [{ x: 100, y: 100 }, { x: 900, y: 100 }]
      }
    ]
  });
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  assert.match(layout.runId, uuidV4);
  assert.match(layout.pages[0].id, uuidV4);
  assert.match(layout.pages[0].fields[0].id, uuidV4);
});
