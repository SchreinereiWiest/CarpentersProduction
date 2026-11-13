import { beforeEach, describe, expect, it } from "vitest";

import {
    applyTheme,
    getStoredTheme,
    persistTheme,
    THEME_STORAGE_KEY,
    THEMES
} from "../../src/app/theme/theme.js";

describe("Theme-Verwaltung", () => {
    beforeEach(() => {
        window.localStorage.clear();
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.style.colorScheme = "";
    });

    it("verwendet ohne gespeicherte Auswahl weiterhin den bisherigen Dark Mode", () => {
        expect(getStoredTheme()).toBe(THEMES.DARK);
        expect(applyTheme(getStoredTheme())).toBe(THEMES.DARK);
        expect(document.documentElement.dataset.theme).toBe(THEMES.DARK);
        expect(document.documentElement.style.colorScheme).toBe(THEMES.DARK);
    });

    it("speichert und aktiviert den Light Mode", () => {
        persistTheme(THEMES.LIGHT);

        expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEMES.LIGHT);
        expect(getStoredTheme()).toBe(THEMES.LIGHT);
        expect(document.documentElement.dataset.theme).toBe(THEMES.LIGHT);
        expect(document.documentElement.style.colorScheme).toBe(THEMES.LIGHT);
    });

    it("fällt bei unbekannten Werten sicher auf Dark Mode zurück", () => {
        window.localStorage.setItem(THEME_STORAGE_KEY, "unknown-theme");
        expect(getStoredTheme()).toBe(THEMES.DARK);
    });
});
