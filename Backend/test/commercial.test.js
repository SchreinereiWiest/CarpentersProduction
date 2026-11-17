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
    fields: [{ key: "documentNumber", label: "Belegnummer", page: 1, anchorText: "Rechnungsnummer" }]
  });
  assert.equal(analysis.pageCount, 2);
  assert.equal(analysis.fields[0].key, "documentNumber");
});
