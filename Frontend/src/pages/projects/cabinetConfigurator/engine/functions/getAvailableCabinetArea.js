

export const getAvailableCabinetArea = (
    cabinet
) => {

    const thickness =
        Number(cabinet.thickness) || 0;

    const width =
        Number(cabinet.width) || 0;

    const height =
        Number(cabinet.height) || 0;

    const topOffset =
        Math.max(
            0,
            Number(cabinet.topOffset ?? 0)
        );

    const bottomOffset =
        Math.max(
            0,
            Number(cabinet.bottomOffset ?? 0)
        );

    const topExists =
        cabinet.topExists ?? true;

    const bottomExists =
        cabinet.bottomExists ?? true;


    const x =
        thickness;

    const y =
        topOffset +
        (
            topExists
                ? thickness
                : 0
        );


    const availableWidth =
        width -
        2 * thickness;


    const bottom =
        height -
        bottomOffset -
        (
            bottomExists
                ? thickness
                : 0
        );


    const availableHeight =
        bottom - y;


    return {
        x,
        y,

        width:
            availableWidth,

        height:
            availableHeight,

        top:
            y,

        bottom
    };
};