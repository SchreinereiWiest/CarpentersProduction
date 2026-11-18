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

test("Belege akzeptieren nur Angebot oder Rechnung", () => {
  assert.throws(() => commercialDocumentData({ documentType: "memo", items: [] }), /Belegart/);
});

test("PDF-Analysen werden begrenzt und validiert", () => {
  assert.throws(() => normalizeTemplateAnalysis("not-json"), /PDF-Analyse/);
  const analysis = normalizeTemplateAnalysis({
    pageCount: 2,
    imageCount: 3,
    textBlocks: [{ text: "Rechnungsnummer", page: 1, x: 10, y: 20 }],
    fields: [{ key: "documentNumber", label: "Belegnummer", page: 1, anchorText: "Rechnungsnummer" }],
    layout: { version: 1, objects: [{ id: "date", type: "field", key: "issuedAt", x: 150, y: 30 }] }
  });
  assert.equal(analysis.pageCount, 2);
  assert.equal(analysis.fields[0].key, "documentNumber");
  assert.equal(analysis.layout.objects[0].key, "issuedAt");
});

test("Belege speichern Layout-Snapshot und ausgefüllte automatische Felder", () => {
  const document = commercialDocumentData({
    documentType: "quote",
    items: [],
    fieldValues: { customerAddress: "Musterweg 1" },
    layout: { version: 1, objects: [{ id: "address", type: "field", key: "customerAddress" }] }
  });
  assert.equal(document.fieldValues.customerAddress, "Musterweg 1");
  assert.equal(document.layout.objects[0].id, "address");
});
