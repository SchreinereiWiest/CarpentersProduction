export const updateParentGeometry = (
    parent,
    children,
    property
) => {

    if (
        !children ||
        children.length === 0
    ) {
        return parent;
    }


    // ==========================================
    // horizontal
    // ==========================================

    if (
        property === "x" ||
        property === "width"
    ) {

        const left =
            Math.min(
                ...children.map(
                    child => Number(child.x)
                )
            );

        const right =
            Math.max(
                ...children.map(
                    child =>
                        Number(child.x) +
                        Number(child.width)
                )
            );


        return {
            ...parent,
            x: left,
            width: right - left
        };
    }


    // ==========================================
    // vertikal
    // ==========================================

    if (
        property === "y" ||
        property === "height"
    ) {

        const top =
            Math.min(
                ...children.map(
                    child => Number(child.y)
                )
            );

        const bottom =
            Math.max(
                ...children.map(
                    child =>
                        Number(child.y) +
                        Number(child.height)
                )
            );


        return {
            ...parent,
            y: top,
            height: bottom - top
        };
    }


    return parent;
};