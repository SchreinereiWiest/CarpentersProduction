import { createPart } from "../createPart.js";
import { flattenSections } from "../flattenSections.js";
import { getDefaultDrawerDepth, getLegraboxBackHeight } from "../../../cnc/legraboxDimensions.js";

const getLegraboxFunctions = (section) => {
    return (section.functionConfig ?? [])
        .filter(func => func.type === "legrabox");
};

export const generateLegraboxParts = ({
    cabinet,
    materials,
    nextPID,
    color,
    cncConfig
}) => {
    const parts = [];
    const sections = flattenSections(cabinet.sections ?? []);
    const materialThickness = Number(cabinet.thickness) || 19;
    let legraboxIndex = 0;

    sections.forEach(section => {
        const sectionWidth = Number(section.width) || 0;

        getLegraboxFunctions(section).forEach(func => {
            const index = legraboxIndex++;
            const variant = String(func.variant ?? "M").toUpperCase();
            const materialKey = func.materialColor === "gray"
                ? "grayMaterialId"
                : "whiteMaterialId";
            const materialId =
                cncConfig?.legrabox?.materials?.[materialKey] ||
                cabinet.materialId;
            const drawerDepth =
                Number(func.drawerDepth) ||
                getDefaultDrawerDepth(cabinet.depth);
            const bottomWidth = Math.max(0, sectionWidth - 35);
            const bottomDepth = Math.max(0, drawerDepth - 10);
            const backWidth = getLegraboxBackHeight(cncConfig, variant); 
            const backHeight = Math.max(0, sectionWidth - 38);
            const source = {
                type: "legrabox",
                sectionId: section.id,
                functionId: func.id,
                variant,
                drawerDepth
            };

            if (bottomWidth > 0 && bottomDepth > 0) {
                parts.push(
                    createPart({
                        PID: nextPID(),
                        name: `Legrabox ${index + 1} Boden`,
                        type: "Boden",
                        quantity: 1,
                        L: bottomWidth,
                        B: bottomDepth,
                        T: materialThickness,
                        materialId,
                        materials,
                        color,
                        source: {
                            ...source,
                            role: "bottom"
                        }
                    })
                );
            }

            if (backWidth > 0 && backHeight > 0) {
                parts.push(
                    createPart({
                        PID: nextPID(),
                        name: `Legrabox ${index + 1} Rückwand`,
                        type: "Rückwand",
                        edges: {

                        ELID:
                            "",

                        ERID:
                            materialId,

                        ETID:
                            "",

                        EBID:
                            ""
                    },
                        quantity: 1,
                        L: backHeight,
                        B: backWidth,
                        T: materialThickness,
                        materialId,
                        materials,
                        color,
                        source: {
                            ...source,
                            role: "rear"
                        }
                    })
                );
            }
        });
    });

    return parts;
};
