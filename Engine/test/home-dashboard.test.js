import assert from "node:assert/strict";
import test from "node:test";

import { availableHomeModules, normalizeHomePreferences } from "../src/dashboard/home.mjs";

test("start page modules are restricted to the membership role", () => {
  assert.deepEqual(availableHomeModules("user").map(module => module.id), ["assignments", "appointments", "week"]);
  assert.ok(availableHomeModules("manager").some(module => module.id === "managerDocuments"));
  assert.ok(availableHomeModules("admin").some(module => module.id === "openDeliveries"));
});

test("home preferences keep valid order and discard unavailable modules", () => {
  assert.deepEqual(normalizeHomePreferences({
    order: ["week", "managerDocuments", "week", "assignments"],
    hidden: ["appointments", "managerDocuments", "appointments"]
  }, "user"), {
    order: ["week", "assignments", "appointments"],
    hidden: ["appointments"]
  });
});
