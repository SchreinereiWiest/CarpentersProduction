import {
    DEFAULT_COMPANY_SETTINGS,
    normalizeKeybindings,
    normalizeWorkspaceLayout,
    normalizeWorkspaceScalePercent
} from "../settings/company-settings.js";

export const WORKSPACE_PREFERENCES_STORAGE_KEY = "carpenters-workspace-preferences";
export const WORKSPACE_PREFERENCES_EVENT = "carpenters-workspace-preferences-changed";

export function normalizeWorkspacePreferences(value) {
    return {
        workspaceLayout: normalizeWorkspaceLayout(value?.workspaceLayout),
        workspaceScalePercent: normalizeWorkspaceScalePercent(value?.workspaceScalePercent),
        keybindings: normalizeKeybindings(value?.keybindings)
    };
}

export function getStoredWorkspacePreferences() {
    if (typeof window === "undefined") {
        return normalizeWorkspacePreferences(DEFAULT_COMPANY_SETTINGS.userInterface);
    }

    try {
        return normalizeWorkspacePreferences(JSON.parse(
            window.localStorage.getItem(WORKSPACE_PREFERENCES_STORAGE_KEY) || "{}"
        ));
    } catch {
        return normalizeWorkspacePreferences(DEFAULT_COMPANY_SETTINGS.userInterface);
    }
}

export function persistWorkspacePreferences(value) {
    const normalized = normalizeWorkspacePreferences(value);

    if (typeof window !== "undefined") {
        window.localStorage.setItem(
            WORKSPACE_PREFERENCES_STORAGE_KEY,
            JSON.stringify(normalized)
        );
        window.dispatchEvent(new CustomEvent(WORKSPACE_PREFERENCES_EVENT, {
            detail: normalized
        }));
    }

    return normalized;
}

export function isWorkspacePane() {
    if (typeof window === "undefined") return false;

    const explicitPane = new URLSearchParams(window.location.search).get("workspacePane") === "1";
    if (explicitPane) window.name = "carpenters-workspace-pane";
    return explicitPane || window.name === "carpenters-workspace-pane";
}
