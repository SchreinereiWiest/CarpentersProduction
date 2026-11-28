export function resolveCncOperationSelection(operations, selection) {
    if (selection && typeof selection === "object") return selection;
    if (selection === null || selection === undefined) return null;

    return (Array.isArray(operations) ? operations : []).find((operation, index) => (
        String(operation?.id ?? `operation-${index}`) === String(selection)
    )) ?? null;
}
