import { flattenSections } from "../cncHelpers";
import { sectionAbsolute } from "../sectionAbsolute";


export const applyShelfCncToSides = (
    cabinet,
    parts
) => {

    const sections =
        flattenSections(
            cabinet.sections ?? []
        );


        console.log(sections);


    const side =
        parts.find(
            part =>
                part.Source?.role === "side"
        );


    if (
        !side
    ) {
        return parts;
    }


    sections.forEach(section => {

        if (
            section.functionType !== "shelf"
        ) {
            return;
        }


        const shelf = {
            type: "shelf",
            top: sectionAbsolute(section, "top", section.functionConfig.holeRow.endFromTop),
            bottom: cabinet.height - sectionAbsolute(section, "bottom", section.functionConfig.holeRow.startFromBottom),
            frontOffset: section.functionConfig.holeRow.frontOffset,
            backOffset: section.functionConfig.holeRow.backOffset,
            spacing: section.functionConfig.holeRow.spacing 
        };

        side.CNC.operations.push(shelf);

    });


    return parts;
};
