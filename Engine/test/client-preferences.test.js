import assert from "node:assert/strict";
import test from "node:test";

import { normalizePersonalCache, sanitizePersonalUserInterface } from "../src/preferences/client.mjs";

test("personal interface settings keep only supported client values", () => {
  assert.deepEqual(sanitizePersonalUserInterface({
    showTips: false,
    workspaceLayout: "grid",
    workspaceScalePercent: 40,
    measurementLabelSizePercent: 500,
    keybindings: { sidebar: " Ctrl+B ", unknown: "Alt+X" },
    home: { documentTags: ["must-not-be-personal"] },
    companyName: "must-not-be-stored"
  }), {
    showTips: false,
    measurementLabelSizePercent: 200,
    workspaceLayout: "grid",
    workspaceScalePercent: 50,
    keybindings: { sidebar: "Ctrl+B" }
  });
});

test("personal cache settings are bounded and deduplicated", () => {
  assert.deepEqual(normalizePersonalCache({
    offlineMode: true,
    preloadMode: "selected",
    selectedProjectIds: ["project-1", "project-1", "", "project-2"],
    cacheRetentionDays: 9999
  }), {
    schemaVersion: 3,
    offlineMode: true,
    preloadMode: "selected",
    selectedProjectIds: ["project-1", "project-2"],
    cacheRetentionDays: 3650
  });
});
