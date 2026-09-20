import { parseSplitSpec } from "./parseSplitSpec";


export const calculateSplitSizes = (
    totalSize,
    spec,
    gap = 0,
    useGap = true
) => {
    const parts = parseSplitSpec(spec);

    if (parts.length === 0) {
        return [];
    }

    const numericTotal = Number(totalSize);
    const numericGap = Number(gap);

    if (
        !Number.isFinite(numericTotal) ||
        numericTotal <= 0
    ) {
        return [];
    }

    const gapCount = useGap
        ? parts.length - 1
        : 0;

    const totalGap = gapCount * numericGap;

    const availableSize =
        numericTotal - totalGap;

    if (availableSize <= 0) {
        return [];
    }

    const fixedTotal = parts
        .filter(part => part.type === "fixed")
        .reduce(
            (sum, part) => sum + part.value,
            0
        );

    const remainingSize =
        availableSize - fixedTotal;

    if (remainingSize <= 0) {
        return [];
    }

    const totalRatio = parts
        .filter(part => part.type === "ratio")
        .reduce(
            (sum, part) => sum + part.value,
            0
        );

    if (totalRatio <= 0) {
        return [];
    }

    return parts.map(part => {
        if (part.type === "fixed") {
            return part.value;
        }

        return (
            remainingSize *
            part.value /
            totalRatio
        );
    });
};