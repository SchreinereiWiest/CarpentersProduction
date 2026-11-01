const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"];

function normalizedKeyName(key) {
    if (key === " ") return "Space";
    if (key === "Control") return "Ctrl";
    if (key === "Esc") return "Escape";
    if (key.length === 1) return key.toUpperCase();
    return key;
}

export function eventToKeybinding(event) {
    const key = normalizedKeyName(event.key);
    if (MODIFIER_ORDER.includes(key)) return "";

    const parts = [];
    if (event.ctrlKey) parts.push("Ctrl");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");
    if (event.metaKey) parts.push("Meta");
    parts.push(key);
    return parts.join("+");
}

export function matchesKeybinding(event, binding) {
    return eventToKeybinding(event).toLowerCase() === String(binding || "").toLowerCase();
}

export function focusNavigation(target) {
    const navigation = document.querySelector(`[data-keybinding-target="${target}"]`);
    if (!navigation) return false;

    const focusTarget = navigation.querySelector("[aria-current='page'], a, button");
    focusTarget?.focus();
    return Boolean(focusTarget);
}

export function triggerApplyAction() {
    const explicit = document.querySelector(
        '[data-keybinding-action="apply"]:not(:disabled)'
    );
    if (explicit) {
        explicit.click();
        return true;
    }

    const candidates = [...document.querySelectorAll("button:not(:disabled)")];
    const fallback = candidates.find(button => /^(anwenden|übernehmen|apply|speichern|einstellungen speichern)$/i
        .test(button.textContent.trim()));
    fallback?.click();
    return Boolean(fallback);
}

export function isEditableTarget(target) {
    return target instanceof Element
        && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}
