const clamp = (value, minimum, maximum, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
};

const cleanBinding = value => String(value || "").trim().slice(0, 64);

export function sanitizePersonalUserInterface(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  if (value.showTips !== undefined) result.showTips = value.showTips !== false;
  if (value.lineLockThresholdCm !== undefined) result.lineLockThresholdCm = clamp(value.lineLockThresholdCm, 0, 1000, 5);
  if (value.measurementLabelSizePercent !== undefined) result.measurementLabelSizePercent = clamp(value.measurementLabelSizePercent, 50, 200, 100);
  if (value.measurementLabelOffsetY !== undefined) result.measurementLabelOffsetY = clamp(value.measurementLabelOffsetY, -200, 200, -30);
  if (value.measurementFormFieldWidthMm !== undefined) result.measurementFormFieldWidthMm = clamp(value.measurementFormFieldWidthMm, 20, 80, 32);
  if (value.measurementFormFieldHeightMm !== undefined) result.measurementFormFieldHeightMm = clamp(value.measurementFormFieldHeightMm, 8, 30, 10);
  if (value.workspaceLayout !== undefined) result.workspaceLayout = ["single", "split", "grid"].includes(value.workspaceLayout) ? value.workspaceLayout : "single";
  if (value.workspaceScalePercent !== undefined) result.workspaceScalePercent = clamp(value.workspaceScalePercent, 50, 125, 100);
  if (value.keybindings && typeof value.keybindings === "object" && !Array.isArray(value.keybindings)) {
    result.keybindings = Object.fromEntries(["sidebar", "projectBar", "apply"]
      .map(key => [key, cleanBinding(value.keybindings[key])])
      .filter(([, binding]) => binding));
  }
  return result;
}

export function normalizePersonalCache(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    schemaVersion: 3,
    offlineMode: Boolean(source.offlineMode),
    preloadMode: source.preloadMode === "selected" ? "selected" : "active",
    selectedProjectIds: [...new Set((Array.isArray(source.selectedProjectIds) ? source.selectedProjectIds : [])
      .map(id => String(id || "").trim())
      .filter(Boolean))].slice(0, 500),
    cacheRetentionDays: Math.round(clamp(source.cacheRetentionDays, 1, 3650, 30))
  };
}
