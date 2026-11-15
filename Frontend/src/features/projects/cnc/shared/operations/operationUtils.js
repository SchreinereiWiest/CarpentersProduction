

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
        ? "var(--cnc-operation-selected-stroke)"
        : "var(--cnc-operation-stroke)";
};


export const getSelectedFill = (
    selected
) => {
    return selected
        ? "var(--cnc-operation-selected)"
        : "var(--cnc-operation-fill)";
};
