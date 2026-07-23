
export function createStrips(sortedPlates, settings) {
    const verticalTarget =
        settings.defaultSheet.height;

    const horizontalTarget =
        settings.defaultSheet.width;

    const cutGap =
        settings.cutGap;

    const strips = [];

    let remainingPlates = [
        ...sortedPlates
    ];

    let stripId = 0;

    while (
        remainingPlates.length > 0
    ) {
        const bestCombination =
            findBestStripCombination(
                remainingPlates,
                verticalTarget,
                horizontalTarget,
                cutGap
            );

        if (
            !bestCombination ||
            bestCombination.plates.length === 0
        ) {
            break;
        }

        const {
            plates,
            type,
            height,
            targetHeight
        } = bestCombination;

        /*
         * Plates innerhalb des Strips
         * horizontal positionieren.
         */
        let currentX = 0;

        const positionedPlates =
            plates.map((plate, index) => {
                const positionedPlate = {
                    ...plate,

                    x: currentX
                };

                /*
                 * Position für die nächste Platte
                 *
                 * aktuelle Breite
                 * +
                 * Schnittspalt
                 */
                currentX += plate.height + cutGap;

                return positionedPlate;
            });

        /*
         * Strip-Breite
         */
        const width =
            positionedPlates.length > 0
                ? Math.max(
                    ...positionedPlates.map(
                        plate =>
                            plate.width
                    )
                )
                : 0;

        strips.push({
            id: stripId++,

            type,

            placedWidth: type=="horizontal" ? height : width,

            placedHeight: type=="horizontal" ? width : height,

            width,

            height,

            remainingHeight:
                targetHeight - height,

            plates: positionedPlates
        });

        /*
         * Die verwendeten Platten aus
         * dem verbleibenden Datensatz entfernen
         */
        const usedIds = new Set(
            plates.map(
                plate => plate.id
            )
        );

        remainingPlates =
            remainingPlates.filter(
                plate =>
                    !usedIds.has(
                        plate.id
                    )
            );
    }

    return strips;
}


function findBestStripCombination(
    plates,
    verticalTarget,
    horizontalTarget,
    cutGap
) {
    let bestCombination = null;

    function search(
        startIndex,
        selectedPlates,
        currentHeight
    ) {
        /*
         * Die aktuelle Kombination
         * sowohl vertikal als auch horizontal
         * bewerten.
         */
        if (
            selectedPlates.length > 0
        ) {
            const verticalCandidate =
                createCandidate(
                    selectedPlates,
                    currentHeight,
                    verticalTarget,
                    "vertical"
                );

            const horizontalCandidate =
                createCandidate(
                    selectedPlates,
                    currentHeight,
                    horizontalTarget,
                    "horizontal"
                );

            /*
             * Die Kombination kann für beide
             * Zielrichtungen geeignet sein.
             *
             * Die bessere Variante wird gewählt.
             */
            if (
                verticalCandidate
            ) {
                bestCombination =
                    chooseBetterCombination(
                        verticalCandidate,
                        bestCombination
                    );
            }

            if (
                horizontalCandidate
            ) {
                bestCombination =
                    chooseBetterCombination(
                        horizontalCandidate,
                        bestCombination
                    );
            }
        }

        /*
         * Weitere Platte hinzufügen
         */
        for (
            let i = startIndex;
            i < plates.length;
            i++
        ) {
            const plate =
                plates[i];

            const gap =
                selectedPlates.length > 0
                    ? cutGap
                    : 0;

            const newHeight =
                currentHeight +
                gap +
                plate.height;

            /*
             * Wenn die Kombination bereits
             * länger als beide Zielrichtungen
             * ist, kann nicht weiter gesucht werden.
             */
            if (
                newHeight >
                    verticalTarget &&
                newHeight >
                    horizontalTarget
            ) {
                continue;
            }

            selectedPlates.push(
                plate
            );

            search(
                i + 1,
                selectedPlates,
                newHeight
            );

            selectedPlates.pop();
        }
    }

    search(
        0,
        [],
        0
    );

    return bestCombination;
}


function createCandidate(
    plates,
    height,
    targetHeight,
    type
) {
    if (
        height > targetHeight
    ) {
        return null;
    }

    return {
        plates: [
            ...plates
        ],

        type,

        height,

        targetHeight,

        remainingHeight:
            targetHeight - height,

        utilization:
            height / targetHeight
    };
}

function chooseBetterCombination(
    candidate,
    currentBest
) {
    if (
        !currentBest
    ) {
        return candidate;
    }

    /*
     * 1. Höhere Auslastung bevorzugen
     */
    if (
        candidate.utilization >
        currentBest.utilization
    ) {
        return candidate;
    }

    if (
        candidate.utilization <
        currentBest.utilization
    ) {
        return currentBest;
    }

    /*
     * 2. Bei gleicher Auslastung
     * mehr Platten bevorzugen
     */
    if (
        candidate.plates.length >
        currentBest.plates.length
    ) {
        return candidate;
    }

    if (
        candidate.plates.length <
        currentBest.plates.length
    ) {
        return currentBest;
    }

    /*
     * 3. Bei komplettem Gleichstand
     * vertical bevorzugen
     */
    if (
        candidate.type === "vertical"
    ) {
        return candidate;
    }

    return currentBest;
}

