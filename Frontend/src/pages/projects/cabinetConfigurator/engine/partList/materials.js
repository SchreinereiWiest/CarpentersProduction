

export const getMaterial = (
    materials = [],
    id
) => {

    if (!id) {
        return null;
    }

    return materials.find(
        material =>
            material.id === id
    ) ?? null;
};


export const getMaterialNumber = (
    materials,
    id
) => {

    const material =
        getMaterial(
            materials,
            id
        );

    return (
        material?.materialNumber ??
        ""
    );
};


export const getGrainValue = (
    materials,
    id
) => {

    const material =
        getMaterial(
            materials,
            id
        );

    return material?.maser
        ? "Ja"
        : "";
};