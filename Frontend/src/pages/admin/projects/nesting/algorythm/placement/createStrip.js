
export function createStrips(sortedPlates, settings) {
    const verticalTarget =
        settings.defaultSheet.height;

    const horizontalTarget =
        settings.defaultSheet.width;

    const cutGap =
        settings.cutGap;

    const stripDifference = settings.stripDifference;
    
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
                cutGap,
                stripDifference,
                settings
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
    cutGap,
    stripDifference,
    settings
) {
    let bestCombination = null;

    function search(
        startIndex,
        selectedPlates,
        currentHeight,
        minWidth,
        maxWidth
    ) {
        /*
         * Die aktuelle Kombination bewerten
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

            if (
                verticalCandidate && settings.allowRotation
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

            /*
             * Bei der ersten Platte gibt es
             * noch keine Breitenbegrenzung.
             */
            let newMinWidth;
            let newMaxWidth;

            if (
                selectedPlates.length === 0
            ) {
                newMinWidth =
                    plate.width -
                    stripDifference;

                newMaxWidth =
                    plate.width +
                    stripDifference;
            } else {
                /*
                 * Die neue Platte muss innerhalb
                 * der Breiten-Grenzen liegen.
                 */
                if (
                    plate.width <
                        minWidth ||
                    plate.width >
                        maxWidth
                ) {
                    continue;
                }

                /*
                 * Die Grenzen bleiben bestehen.
                 */
                newMinWidth =
                    minWidth;

                newMaxWidth =
                    maxWidth;
            }

            /*
             * Schnittspalt zwischen Platten
             */
            const gap =
                selectedPlates.length > 0
                    ? cutGap
                    : 0;

            const newHeight =
                currentHeight +
                gap +
                plate.height;

            /*
             * Wenn die Kombination länger
             * als beide möglichen Zielrichtungen
             * ist, nicht weiter verfolgen.
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
                newHeight,
                newMinWidth,
                newMaxWidth
            );

            selectedPlates.pop();
        }
    }

    search(
        0,
        [],
        0,
        null,
        null
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

