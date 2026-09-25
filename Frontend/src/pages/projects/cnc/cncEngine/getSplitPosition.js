

import { calculateSplitSizes } from "../../cabinetConfigurator/engine/sektions/calcSplitSizes";

export const getSplitPositions = (
    total,
    spec
) => {

    const numericTotal =
        Number(total);

    if (
        !Number.isFinite(numericTotal) ||
        numericTotal <= 0
    ) {
        return [];
    }

    if (
        !spec ||
        typeof spec !== "string"
    ) {
        return [];
    }

    const sizes =
        calculateSplitSizes(
            numericTotal,
            spec,
            0,
            false
        );

    if (
        !Array.isArray(sizes) ||
        sizes.length < 2
    ) {
        return [];
    }

    const positions = [];

    let position = 0;

    /*
     * Wir brauchen die Grenzen zwischen
     * den Teilbereichen.
     *
     * Beispiel:
     *
     * 50 : 300 : 300 : 300 : 50
     *
     * ergibt:
     *
     * 50
     * 350
     * 650
     * 950
     */

    for (
        let i = 0;
        i < sizes.length - 1;
        i++
    ) {

        position +=
            Number(sizes[i]);

        if (
            Number.isFinite(position)
        ) {
            positions.push(
                position
            );
        }
    }

    return positions;
};