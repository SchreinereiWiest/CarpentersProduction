import test from "node:test";
import assert from "node:assert/strict";
import { getVisibleOnboardingSteps } from "../src/modules/onboarding/onboarding.controller.js";

test("Onboarding enthält nur lizenzierte Modulschritte in stabiler Reihenfolge", () => {
  assert.deepEqual(
    getVisibleOnboardingSteps(["crm", "shop"]).map(step => step.id),
    ["welcome", "company", "team", "workspace", "integrations", "shop-settings", "articles", "customers", "tour"]
  );
});

test("Datenimporte und Rundgang bleiben als optionale Schritte markiert", () => {
  const steps = getVisibleOnboardingSteps(["shop", "crm"]);
  assert.equal(steps.find(step => step.id === "articles").optional, true);
  assert.equal(steps.find(step => step.id === "customers").optional, true);
  assert.equal(steps.find(step => step.id === "tour").optional, true);
  assert.equal(steps.find(step => step.id === "company").optional, undefined);
});
