
export const findSection = (
        sections,
        id
    ) => {

        for (const section of sections) {

            if (section.id === id) {
                return section;
            }

            if (
                section.children &&
                section.children.length > 0
            ) {

                const found =
                    findSection(
                        section.children,
                        id
                    );

                if (found) {
                    return found;
                }
            }
        }

        return null;
    };

export const findParent = (
        sections,
        childId,
        parent = null
    ) => {

        for (const section of sections) {

            if (section.id === childId) {
                return parent;
            }

            if (
                section.children &&
                section.children.length > 0
            ) {

                const foundParent =
                    findParent(
                        section.children,
                        childId,
                        section
                    );

                if (foundParent) {
                    return foundParent;
                }
            }
        }

        return null;
    };

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

    let targetParent = null;


    if (
        selectedSection.children &&
        selectedSection.children.length > 0
    ) {

        targetParent =
            selectedSection;

    } else {

        targetParent =
            findParent(
                activeCabinet.sections ?? [],
                sectionId
            );
    }


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

    const mergeInTree = (
        sections
    ) => {

        return sections.map(section => {

            if (
                section.id === targetParent.id
            ) {

                return {
                    ...section,

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
                section.children &&
                section.children.length > 0
            ) {

                return {
                    ...section,

                    children:
                        mergeInTree(
                            section.children
                        )
                };
            }


            return section;
        });
    };


    const newSections =
        mergeInTree(
            activeCabinet.sections ?? []
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