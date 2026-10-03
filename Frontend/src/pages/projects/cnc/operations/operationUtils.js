

export const getOperationId = (
    operation,
    index
) => {
    return (
        operation.id ??
        `operation-${index}`
    );
};


export const getPartWidth = (
    part
) => {
    return Number(part?.L) || 0;
};


export const getPartHeight = (
    part
) => {
    return Number(part?.B) || 0;
};


export const isFiniteNumber = (
    value
) => {
    return Number.isFinite(
        Number(value)
    );
};


export const getSelectedStroke = (
    selected
) => {
    return selected
        ? "#fed7aa"
        : "#d1d5db";
};


export const getSelectedFill = (
    selected
) => {
    return selected
        ? "#f97316"
        : "#111827";
};