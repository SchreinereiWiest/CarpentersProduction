import { generateHoleRow } from "./generateHoleRow";

export const generateShelfCnc = ({
    section,
    cabinet,
    config
}) => {

    const holeRow =
        config.holeRow ?? {};


    const operations =
        generateHoleRow({

            section,

            boardDepth:
                Number(
                    cabinet.depth
                ),

            frontOffset:
                Number(
                    holeRow.frontOffset ??
                    37
                ),

            backOffset:
                Number(
                    holeRow.backOffset ??
                    37
                ),

            spacing:
                Number(
                    holeRow.spacing ??
                    32
                ),

            startFromBottom:
                Number(
                    holeRow.startFromBottom ??
                    150
                ),

            endFromTop:
                Number(
                    holeRow.endFromTop ??
                    150
                ),

            source: {
                functionType:
                    "shelf",

                sectionId:
                    section.id
            }
        });


    return {

        operations,

        requirements: []
    };
};