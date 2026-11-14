import { describe, expect, it } from "vitest";
import { advancedSettingsTabs } from "../../src/features/company-settings/advancedSettingsTabs.js";
import { primarySettingsTabs } from "../../src/shared/components/settings-tabs.js";
import { canAccessRequiredRole } from "../../src/app/routing/roleAuthorization.js";

describe("settings navigation", () => {
  it("keeps Shop and Company in Advanced", () => {
    const ids = primarySettingsTabs.map(tab => tab.id);
    expect(ids).not.toContain("shop");
    expect(ids).not.toContain("company");
    expect(ids.at(-1)).toBe("advanced");
    expect(advancedSettingsTabs.map(tab => tab.id)).toEqual(expect.arrayContaining(["shop", "company", "documents", "contactHistory"]));
  });

  it.each(["user", "manager"])("shows only personal interface and cache settings to %s", role => {
    const visible = primarySettingsTabs
      .filter(tab => canAccessRequiredRole(role, tab.requiredRole))
      .map(tab => tab.id);
    expect(visible).toEqual(["userInterface", "cache"]);
  });
});
