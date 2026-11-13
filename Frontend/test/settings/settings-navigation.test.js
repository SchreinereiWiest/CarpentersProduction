import { describe, expect, it } from "vitest";
import { advancedSettingsTabs } from "../../src/features/company-settings/advancedSettingsTabs.js";
import { primarySettingsTabs } from "../../src/shared/components/settingsBar.jsx";

describe("settings navigation", () => {
  it("keeps Shop and Company in Advanced", () => {
    const ids = primarySettingsTabs.map(tab => tab.id);
    expect(ids).not.toContain("shop");
    expect(ids).not.toContain("company");
    expect(ids.at(-1)).toBe("advanced");
    expect(advancedSettingsTabs.map(tab => tab.id)).toEqual(expect.arrayContaining(["shop", "company", "documents", "contactHistory"]));
  });
});
