export const THEMES = Object.freeze({
    DARK: "dark",
    LIGHT: "light"
});

export const THEME_STORAGE_KEY = "carpentersproduction.theme";

export function normalizeTheme(value) {
    return value === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK;
}

export function getStoredTheme() {
    try {
        return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
        return THEMES.DARK;
    }
}

export function applyTheme(theme) {
    const normalized = normalizeTheme(theme);
    document.documentElement.dataset.theme = normalized;
    document.documentElement.style.colorScheme = normalized;
    return normalized;
}

export function persistTheme(theme) {
    const normalized = applyTheme(theme);
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
        // Das Theme funktioniert auch dann für die laufende Sitzung weiter.
    }
    return normalized;
}

export function initializeTheme() {
    return applyTheme(getStoredTheme());
}
