

export const updateSectionTree = (
    sections,
    sectionId,
    updateFn
) => {

    return sections.map(section => {

        // Die gesuchte Section gefunden
        if (section.id === sectionId) {
            return updateFn(section);
        }

        // Untersektionen durchsuchen
        if (
            section.children &&
            section.children.length > 0
        ) {
            return {
                ...section,
                children: updateSectionTree(
                    section.children,
                    sectionId,
                    updateFn
                )
            };
        }

        return section;
    });
};