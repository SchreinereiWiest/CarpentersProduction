

export const findFront = (
    fronts,
    id
) => {

    for (const front of fronts) {

        if (front.id === id) {
            return front;
        }

        if (
            front.children &&
            front.children.length > 0
        ) {

            const found =
                findFront(
                    front.children,
                    id
                );

            if (found) {
                return found;
            }
        }
    }

    return null;
};


export const findFrontParent = (
    fronts,
    childId,
    parent = null
) => {

    for (const front of fronts) {

        if (front.id === childId) {
            return parent;
        }

        if (
            front.children &&
            front.children.length > 0
        ) {

            const foundParent =
                findFrontParent(
                    front.children,
                    childId,
                    front
                );

            if (foundParent) {
                return foundParent;
            }
        }
    }

    return null;
};


export const mergeFrontChildren = (
    frontId,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement
) => {

    if (!activeCabinet) {
        return;
    }


    // =====================================================
    // Ausgewählte Front suchen
    // =====================================================

    const selectedFront =
        findFront(
            activeCabinet.fronts ?? [],
            frontId
        );


    if (!selectedFront) {

        console.warn(
            "Front nicht gefunden:",
            frontId
        );

        return;
    }


    // =====================================================
    // Ziel-Parent bestimmen
    //
    // Hat die ausgewählte Front selbst Children,
    // werden diese direkt entfernt.
    //
    // Ist sie selbst ein Child, wird ihr Parent
    // verwendet.
    // =====================================================

    let targetParent = null;


    if (
        selectedFront.children &&
        selectedFront.children.length > 0
    ) {

        targetParent =
            selectedFront;

    } else {

        targetParent =
            findFrontParent(
                activeCabinet.fronts ?? [],
                frontId
            );
    }


    if (!targetParent) {

        console.warn(
            "Kein Parent zum Zusammenführen gefunden."
        );

        return;
    }


    // =====================================================
    // Prüfen, ob tatsächlich Children vorhanden sind
    // =====================================================

    if (
        !targetParent.children ||
        targetParent.children.length === 0
    ) {

        console.warn(
            "Die Front besitzt keine Unterteilungen."
        );

        return;
    }


    // =====================================================
    // Front-Tree rekursiv aktualisieren
    // =====================================================

    const mergeInTree = (
        fronts
    ) => {

        return fronts.map(front => {

            if (
                front.id === targetParent.id
            ) {

                return {
                    ...front,

                    // Children entfernen
                    children: [],

                    // Split-Informationen entfernen
                    splitDirection:
                        undefined,

                    splitSpec:
                        undefined,

                    splitGap:
                        undefined
                };
            }


            if (
                front.children &&
                front.children.length > 0
            ) {

                return {
                    ...front,

                    children:
                        mergeInTree(
                            front.children
                        )
                };
            }


            return front;
        });
    };


    const newFronts =
        mergeInTree(
            activeCabinet.fronts ?? []
        );


    // =====================================================
    // Cabinet aktualisieren
    // =====================================================

    updateActiveCabinet({
        fronts: newFronts
    });


    // =====================================================
    // Zusammengeführte Parent-Front wieder auswählen
    // =====================================================

    const mergedParent =
        findFront(
            newFronts,
            targetParent.id
        );


    if (mergedParent) {

        setSelectedElement({
            ...mergedParent,
            type: "front"
        });
    }
};