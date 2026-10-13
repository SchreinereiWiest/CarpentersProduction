import { findTreeNode, findTreeParent, updateTree } from "../../../utils/tree.js";

export const findFront = findTreeNode;
export const findFrontParent = findTreeParent;


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

    const targetParent = (
        selectedFront.children &&
        selectedFront.children.length > 0
    )
        ? selectedFront
        : findFrontParent(
            activeCabinet.fronts ?? [],
            frontId
        );


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

    const newFronts = updateTree(
        activeCabinet.fronts ?? [],
        targetParent.id,
        front => ({
            ...front,
            children: [],
            splitDirection: undefined,
            splitSpec: undefined,
            splitGap: undefined
        })
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
