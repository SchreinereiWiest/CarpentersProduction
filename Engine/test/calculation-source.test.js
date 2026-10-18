import assert from "node:assert/strict";
import test from "node:test";

import {
  CALCULATION_SOURCES,
  getProjectDocumentCalculationSource,
  isCalculationSource
} from "../src/contracts/project/calculation-source.js";

test("assigns an existing nesting to the server and a missing nesting to the client", () => {
  assert.equal(
    getProjectDocumentCalculationSource("nesting", true),
    CALCULATION_SOURCES.SERVER
  );
  assert.equal(
    getProjectDocumentCalculationSource("nesting", false),
    CALCULATION_SOURCES.CLIENT
  );
  assert.equal(getProjectDocumentCalculationSource("list", false), null);
});

test("accepts only known calculation source identifiers", () => {
  assert.equal(isCalculationSource("server"), true);
  assert.equal(isCalculationSource("client"), true);
  assert.equal(isCalculationSource("browser"), false);
});
