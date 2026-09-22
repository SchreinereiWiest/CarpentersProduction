

export const getBackPanelGeometry = (
    cabinet
) => {

    const width =
        Number(cabinet.width);

    const height =
        Number(cabinet.height);

    const thickness =
        Number(
            cabinet.backPanel?.thickness ??
            8
        );


    const construction =
        cabinet.backPanel?.construction ??
        "butt";


    switch (construction) {

        case "butt":

            return {
                L: height,
                B: width,
                T: thickness
            };


        case "rabbet":

            return {
                L:
                    height - 12,

                B:
                    width - 12,

                T: thickness
            };


        case "groove":

            return {
                L:
                    height - 21,

                B:
                    width - 21,

                T: thickness
            };


        case "grooveOpen":

            return {
                L:
                    height - 10,

                B:
                    width - 21,

                T: thickness
            };


        default:

            return {
                L: height,
                B: width,
                T: thickness
            };
    }
};