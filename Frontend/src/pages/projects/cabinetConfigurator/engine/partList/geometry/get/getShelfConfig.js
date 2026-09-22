

export const getShelfConfig = (
    section,
    cabinet
) => {

    const config =
        section.functionConfig ?? {};


    const shelf =
        config.shelf ?? {};


    const depth =
        Number(
            shelf.depth ??
            config.shelfDepth ??
            cabinet.depth
        );


    const frontOffset =
        Number(
            shelf.frontOffset ??
            config.shelfFrontOffset ??
            (
                Number(cabinet.depth) -
                depth
            )
        );


    const compartmentCount =
        Math.max(
            1,
            Number(
                config.compartmentCount ??
                2
            )
        );


    return {

        compartmentCount,

        quantity:
            Math.max(
                0,
                compartmentCount - 1
            ),

        depth:

            Math.max(
                0,
                Math.min(
                    Number(cabinet.depth),
                    depth
                )
            ),

        frontOffset:

            Math.max(
                0,
                Math.min(
                    Number(cabinet.depth),
                    frontOffset
                )
            )
    };
};