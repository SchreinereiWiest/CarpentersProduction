import { beforeEach, describe, expect, it } from "vitest";

import { eventToKeybinding, matchesKeybinding } from "../../src/shared/workspace/keybindings.js";
import {
  getStoredWorkspacePreferences,
  persistWorkspacePreferences,
  WORKSPACE_PREFERENCES_STORAGE_KEY
} from "../../src/shared/workspace/workspace-settings.js";

describe("workspace settings", () => {
  beforeEach(() => window.localStorage.clear());

  it("stores the layout and keybindings for immediate use", () => {
    persistWorkspacePreferences({
      workspaceLayout: "split",
      workspaceScalePercent: 75,
      keybindings: { sidebar: "Ctrl+B", projectBar: "Ctrl+P", apply: "Alt+Enter" }
    });

    expect(JSON.parse(window.localStorage.getItem(WORKSPACE_PREFERENCES_STORAGE_KEY)))
      .toMatchObject({ workspaceLayout: "split", workspaceScalePercent: 75 });
    expect(getStoredWorkspacePreferences().keybindings.apply).toBe("Alt+Enter");
  });

  it("creates and matches stable keyboard shortcut labels", () => {
    const event = new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true });
    expect(eventToKeybinding(event)).toBe("Ctrl+Enter");
    expect(matchesKeybinding(event, "Ctrl+Enter")).toBe(true);
  });
});
