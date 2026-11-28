import { getBackPanelGeometry } from "../get/getBackPanel.js";
import { createPart } from "../createPart.js";

export const generateBackPart = ({
    cabinet,
    materials,
    nextPID,
    color
}) => {
    const usesLegacyMaterialOverride = cabinet.backPanel?.materialSource === "legacy" ||
        cabinet.backPanel?.materialManuallyChanged === true ||
        cabinet.backPanel?.manualMaterial === true;

    const geometry =
        getBackPanelGeometry(
            cabinet
        );


    return createPart({

        PID:
            nextPID(),

        name:
            "Rückwand",

        type:
            "Back",

        quantity:
            1,

        L:
            geometry.L,

        B:
            geometry.B,

        T:
            geometry.T,

        materialId:
            usesLegacyMaterialOverride
                ? cabinet.backPanel?.materialId ?? cabinet.materialId
                : cabinet.materialId,

        materials,

        color: color,

        edges: {
            ELID: "",
            ERID: "",
            ETID: "",
            EBID: ""
        },

        source: {
            type:
                "cabinet",

            role:
                "back",

            construction:
                cabinet.backPanel?.construction ??
                "butt"
        }
    });
};
