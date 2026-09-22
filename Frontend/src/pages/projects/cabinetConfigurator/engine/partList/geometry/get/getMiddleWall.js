

export const getMiddleWallCenter = ({
    wall,
    section,
    cabinet
}) => {

    const offset =
        Number(
            wall.positionOffset ?? 0
        );


    const sectionY =
        Number(section.y);

    const sectionHeight =
        Number(section.height);

    const cabinetHeight =
        Number(cabinet.height);


    switch (
        wall.positionReference
    ) {

        case "cabinetTop":

            return offset;


        case "cabinetBottom":

            return (
                cabinetHeight -
                offset
            );


        case "sectionTop":

            return (
                sectionY +
                offset
            );


        case "sectionBottom":

            return (
                sectionY +
                sectionHeight -
                offset
            );


        default:

            return (
                sectionY +
                sectionHeight / 2
            );
    }
};