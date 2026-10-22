import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeMeasurementValue,
  safeUploadName
} from "../src/modules/measurement-ocr/measurement-ocr.service.js";

test("OCR-Maßwerte werden als locale-unabhängige Dezimalzahlen normalisiert", () => {
  assert.equal(normalizeMeasurementValue(" 1234,5 "), "1234.5");
  assert.equal(normalizeMeasurementValue("-12.25"), "-12.25");
  assert.equal(normalizeMeasurementValue("12 mm"), null);
  assert.equal(normalizeMeasurementValue(""), null);
});

test("Scandateinamen werden für objektspeichergeeignete Schlüssel bereinigt", () => {
  assert.equal(safeUploadName("Aufmaß Seite 1.pdf"), "Aufma-Seite-1.pdf");
  assert.equal(safeUploadName("../../scan?.jpg"), "scan.jpg");
});
