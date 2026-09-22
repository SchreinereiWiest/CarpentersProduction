


export const getCabinetDimensions = (
    cabinet
) => {

    const width =
        Number(cabinet.width);

    const height =
        Number(cabinet.height);

    const depth =
        Number(cabinet.depth);

    const thickness =
        Number(cabinet.thickness);

    return {
        width,
        height,
        depth,
        thickness
    };
};  



export const getCarcassPartsGeometry = (
    cabinet
) => {

    const {
        width,
        height,
        depth,
        thickness
    } =
        getCabinetDimensions(
            cabinet
        );


    const continuous =
        cabinet.backPanel?.continuous ??
        cabinet.carcassContinuous ??
        "side";


    if (
        continuous === "bottom"
    ) {

        return {

            side: {
                L:
                    height -
                    thickness,

                B:
                    depth,

                T:
                    thickness
            },

            bottom: {
                L:
                    width,

                B:
                    depth,

                T:
                    thickness
            }
        };
    }


    return {

        side: {
            L:
                height,

            B:
                depth,

            T:
                thickness
        },

        bottom: {
            L:
                width -
                2 * thickness,

            B:
                depth,

            T:
                thickness
        }
    };
};