import assert from "node:assert/strict";
import test from "node:test";

import {
  createEticketPrintJob,
  createPartCodePayload,
  normalizeEticketSettings,
  parsePartCodePayload
} from "../src/eticket/index.js";
import { createPlateList } from "../src/nesting/createPlates.js";
import { migrateNestingPartIdentities } from "../src/nesting/partIdentity.js";

const ticket = {
  projectId: "project-1",
  pid: "000042",
  instanceId: "part-7",
  project: "Empfang",
  partName: "Seite links",
  dimensions: "720 × 560 × 19 mm",
  material: "W980"
};

test("Eticket-Code bildet Projekt, PID und physische Instanz verlustfrei ab", () => {
  const payload = createPartCodePayload(ticket);
  assert.deepEqual(parsePartCodePayload(payload), {
    version: 1,
    projectId: "project-1",
    pid: "000042",
    instanceId: "part-7"
  });
});

test("QR-Weblink öffnet das richtige CNC-Bauteil und bleibt scannerlesbar", () => {
  const payload = createPartCodePayload({ ...ticket, scanBaseUrl: "https://carpenters.example.com/app" });
  assert.equal(payload, "https://carpenters.example.com/Projects/Cnc/project-1?pid=000042&instance=part-7");
  assert.deepEqual(parsePartCodePayload(payload), {
    version: 1,
    projectId: "project-1",
    pid: "000042",
    instanceId: "part-7"
  });
});

test("Etiketteneinstellungen werden auf druckbare Werte normalisiert", () => {
  const settings = normalizeEticketSettings({
    printer: { language: "unknown", port: 99999, dpi: 250 },
    label: { widthMm: 2, copies: 99 },
    code: { type: "ean" }
  });
  assert.equal(settings.printer.language, "zpl");
  assert.equal(settings.printer.port, 65535);
  assert.equal(settings.printer.dpi, 203);
  assert.equal(settings.label.widthMm, 20);
  assert.equal(settings.label.copies, 20);
  assert.equal(settings.code.type, "qr");
});

test("ZPL-Druckauftrag enthält PID, QR-Code und Kopienzahl", () => {
  const job = createEticketPrintJob(ticket, { label: { copies: 2 }, code: { type: "qr" } });
  assert.match(job.content, /\^BQN/);
  assert.match(job.content, /PID: 000042/);
  assert.match(job.content, /carpenters:\/\/part\/v1/);
  assert.match(job.content, /\^PQ2/);
});

test("TSPL kann denselben Vertrag als Code-128 ausgeben", () => {
  const job = createEticketPrintJob(ticket, {
    printer: { language: "tspl" },
    code: { type: "code128" }
  });
  assert.equal(job.language, "tspl");
  assert.match(job.content, /BARCODE/);
  assert.match(job.content, /PRINT 1,1/);
});

test("Nesting-Instanzen übernehmen bei Links/Rechts-Teilen die eindeutige CNC-PID", () => {
  const [material] = createPlateList([{
    PID: "000042",
    Objektname: "Seite",
    Anzahl: 2,
    L: 720,
    B: 560,
    T: 19,
    MID: "W980",
    Children: [],
    CNC: {
      operations: [{ type: "BO", x: 32, y: 37 }],
      machiningVariants: [
        { id: "left", side: "left", quantity: 1, cnc: { operations: [{ type: "BO", x: 32, y: 37 }] } },
        { id: "right", side: "right", quantity: 1, mirrorX: true, cnc: { operations: [{ type: "BO", x: 32, y: 37 }] } }
      ]
    }
  }]);

  assert.deepEqual(material.plates.map(plate => plate.original.PID), ["000042-L", "000042-R"]);
  assert.deepEqual(material.plates.map(plate => plate.id), [0, 1]);
});

test("bestehende Nestings migrieren mehrdeutige Basis-PIDs konsistent", () => {
  const original = {
    PID: "000042",
    Anzahl: 2,
    CNC: {
      machiningVariants: [
        { side: "left", quantity: 1, cnc: { operations: [{ type: "BO", x: 1, y: 1 }] } },
        { side: "right", quantity: 1, cnc: { operations: [{ type: "BO", x: 2, y: 2 }] } }
      ]
    }
  };
  const saved = [{
    plates: [{ id: 8, original }, { id: 3, original }],
    strips: [{ id: 1, plates: [{ id: 3, original }, { id: 8, original }] }],
    nestingPlates: [{ strips: [{ id: 1, plates: [{ id: 3, original }, { id: 8, original }] }] }]
  }];

  const migrated = migrateNestingPartIdentities(saved);
  assert.deepEqual(migrated[0].plates.map(part => part.original.PID), ["000042-R", "000042-L"]);
  assert.deepEqual(migrated[0].strips[0].plates.map(part => part.original.PID), ["000042-L", "000042-R"]);
  assert.equal(migrated[0].nestingPlates[0].strips[0].plates[0].original.PID, "000042-L");
});
