

export const generateMiddleWallCnc = ({
    section,
    cabinet,
    config
}) => {

    const middleWalls =
        config.middleWalls ?? [];


    return {

        operations: [],

        requirements:
            middleWalls.map(
                wall => ({

                    type:
                        "middleWall",

                    wallId:
                        wall.id,

                    positionReference:
                        wall.positionReference,

                    positionOffset:
                        Number(
                            wall.positionOffset ??
                            0
                        ),

                    sectionId:
                        section.id,

                    cabinetId:
                        cabinet.id
                })
            )
    };
};