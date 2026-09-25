import { createId } from "../cncHelpers";
import { CNC_DEFAULTS } from "../cncDefaults";
import { flattenSections } from "../../partList/geometry/flattenSections";

function createLgBox ({
    x,
    yOffset,
    cabinet}) {
    
    const thickness =
        Number(
            cabinet.thickness
        );

    return {

        id: createId(),
            

        type:
            "LgBox",

        x:
            Number(
                x?.toFixed(3)
            ),
        
        yOffset: yOffset,

        depth: CNC_DEFAULTS.holeDepth,

        diameter: 5

    };
};


// ============================================================
// applyJoints
// ============================================================

export const applyLgBox = (
    cabinet,
    parts
) => {

    // ========================================================
    // Joint-Einstellungen
    // ========================================================

    const sections =
            flattenSections(
                cabinet.sections ?? []
            );

    const cabinetWidth =
        Number(
            cabinet.width
        );


    const cabinetHeight =
        Number(
            cabinet.height
        );


    const cabinetDepth =
        Number(
            cabinet.depth
        );


    const thickness =
        Number(
            cabinet.thickness
        );


    parts.forEach(
        part => {

            const role = part.Source?.role;

             if (
                role == "side"
            ) {

            sections.forEach(section => {

                if (
                    section.functionType !== "legrabox"
                ) {
                    return;
                }

                

                for(const box of section.functionConfig.legraboxes) {
                    const LgX = section.y + section.height - box.positionFromBottom;
                    const yOffset = 0;
                part.CNC.operations.push(createLgBox({x:LgX, yOffset: yOffset, cabinet:cabinet}));
            }

            });

}});

    return parts;
};  