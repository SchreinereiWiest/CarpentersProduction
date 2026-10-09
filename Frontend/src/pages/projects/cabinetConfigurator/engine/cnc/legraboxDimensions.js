import { DEFAULT_CNC } from "./cncDefaults";

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
