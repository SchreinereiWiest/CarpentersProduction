import { DEFAULT_CNC } from "./cncDefaults.js";

export const DRAWER_DEPTHS = [270, 300, 350, 400, 450, 500, 550, 600];

export const getDefaultDrawerDepth = cabinetDepth => {
    const depth = Number(cabinetDepth) || 0;
    const available = DRAWER_DEPTHS.filter(value => value <= depth);

    return available[available.length - 1] ?? DRAWER_DEPTHS[0];
};

const getVariantValue = (values, variant, fallbackValues) => {
    const key = String(variant ?? "M").toUpperCase();
    const configuredValue = Number(values?.[key]);

    if (Number.isFinite(configuredValue) && configuredValue > 0) {
        return configuredValue;
    }

    return fallbackValues[key] ?? fallbackValues.M;
};

export const getLegraboxHeight = (cncConfig, variant) =>
    getVariantValue(
        cncConfig?.legrabox?.heights,
        variant,
        DEFAULT_CNC.legrabox.heights
    );

export const getLegraboxBackHeight = (cncConfig, variant) =>
    getVariantValue(
        cncConfig?.legrabox?.backHeights,
        variant,
        DEFAULT_CNC.legrabox.backHeights
    );
