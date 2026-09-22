import { getBackPanelGeometry } from "../get/getBackPanel";
import { createPart } from "../createPart";

export const generateBackPart = ({
    cabinet,
    materials,
    nextPID
}) => {

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
            cabinet.backPanel?.materialId ??
            cabinet.materialId,

        materials,

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