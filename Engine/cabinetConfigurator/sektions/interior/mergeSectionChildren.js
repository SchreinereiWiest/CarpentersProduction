import { findTreeNode, findTreeParent, updateTree } from "../../../utils/tree.js";

export const findSection = findTreeNode;
export const findParent = findTreeParent;

export const mergeSectionChildren = (
    sectionId,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement
) => {

    if (!activeCabinet) {
        return;
    }

    const selectedSection =
        findSection(
            activeCabinet.sections ?? [],
            sectionId
        );


    if (!selectedSection) {
        console.warn(
            "Sektion nicht gefunden:",
            sectionId
        );
        return;
    }


    // =====================================================
    // Parent bestimmen
    //
    // Falls die ausgewählte Section selbst Children hat,
    // kann sie direkt zusammengeführt werden.
    //
    // Falls sie ein Child ist, wird ihr Parent verwendet.
    // =====================================================

    const targetParent = (
        selectedSection.children &&
        selectedSection.children.length > 0
    )
        ? selectedSection
        : findParent(
            activeCabinet.sections ?? [],
            sectionId
        );


    if (!targetParent) {

        console.warn(
            "Kein Parent zum Zusammenführen gefunden."
        );

        return;
    }


    // =====================================================
    // Nichts zu tun
    // =====================================================

    if (
        !targetParent.children ||
        targetParent.children.length === 0
    ) {

        console.warn(
            "Die Sektion besitzt keine Unterteilungen."
        );

        return;
    }


    // =====================================================
    // Tree rekursiv aktualisieren
    // =====================================================

    const newSections = updateTree(
        activeCabinet.sections ?? [],
        targetParent.id,
        section => ({
            ...section,
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
        sections: newSections
    });


    // =====================================================
    // Parent wieder auswählen
    // =====================================================

    const mergedParent =
        findSection(
            newSections,
            targetParent.id
        );


    if (mergedParent) {

        setSelectedElement({
            ...mergedParent,
            type: "section"
        });
    }
};
