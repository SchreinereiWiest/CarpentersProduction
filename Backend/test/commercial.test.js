import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCommercialTotals,
  commercialDocumentData,
  CommercialValidationError,
  commissionData,
  normalizeTemplateAnalysis
} from "../src/modules/commercial/commercial.validation.js";

test("Kommissionen benötigen mindestens zwei eindeutige Projekte", () => {
  assert.throws(() => commissionData({ title: "Ausbau", projectIds: ["one"] }), CommercialValidationError);
  assert.deepEqual(commissionData({ title: " Ausbau ", projectIds: ["one", "two", "one"] }), {
    title: "Ausbau",
    commissionNumber: null,
    description: null,
    projectIds: ["one", "two"]
  });
});

test("Belegsummen berücksichtigen Menge, Positionsrabatt und Mehrwertsteuer", () => {
  const items = commercialDocumentData({
    documentType: "quote",
    items: [{ description: "Einbauschrank", quantity: 2, unitPrice: 1000, discountPercent: 10 }],
    vatPercent: 19
  }).items;
  assert.deepEqual(calculateCommercialTotals(items, 19), { net: 1800, vatPercent: 19, vat: 342, gross: 2142 });
});

test("Belege akzeptieren die vier unterstützten Belegarten", () => {
  assert.equal(commercialDocumentData({ documentType: "order_confirmation", items: [] }).title, "Auftragsbestätigung");
  assert.equal(commercialDocumentData({ documentType: "partial_invoice", items: [] }).title, "Abschlagsrechnung");
  assert.throws(() => commercialDocumentData({ documentType: "memo", items: [] }), /Belegart/);
});

test("Layoutvorlagen speichern nur normalisierte Gestaltungselemente", () => {
  const analysis = normalizeTemplateAnalysis({
    version: 4,
    layout: { page: { background: "#ffffff", gridSize: 2 }, objects: [
      { id: "address", type: "field", key: "customerAddress", x: 9.5, y: 16, width: 42, height: 11, fontSize: 10, background: "#ffffff" },
      { id: "static", type: "text", text: "Feststehender Text", x: 14, y: 30, width: 60, height: 8 },
      { id: "unknown", type: "field", key: "unknown", x: 1, y: 1, width: 1, height: 1 }
    ] }
  });
  assert.equal(analysis.version, 4);
  assert.equal(analysis.layout.objects.length, 2);
  const { id, type, key, x, y, width, height } = analysis.layout.objects[0];
  assert.deepEqual({ id, type, key, x, y, width, height }, { id: "address", type: "field", key: "customerAddress", x: 9.5, y: 16, width: 42, height: 11 });
  assert.equal(analysis.layout.objects[1].text, "Feststehender Text");
});

test("Belege speichern ihre Inhalte und den festgesetzten Editorzustand ohne Layout", () => {
  const document = commercialDocumentData({
    documentType: "quote",
    items: [],
    fieldValues: { customerAddress: "Musterweg 1", editorLocked: true },
    layout: { version: 1, objects: [{ id: "legacy-layout" }] },
    templateId: "legacy-template"
  });
  assert.equal(document.fieldValues.customerAddress, "Musterweg 1");
  assert.equal(document.fieldValues.editorLocked, true);
  assert.equal("layout" in document, false);
  assert.equal("templateId" in document, false);
});
