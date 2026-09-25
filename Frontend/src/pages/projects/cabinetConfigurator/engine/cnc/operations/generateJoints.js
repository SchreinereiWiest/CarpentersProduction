import { createId } from "../cncHelpers";
import { CNC_DEFAULTS } from "../cncDefaults";
import { flattenSections } from "../../partList/geometry/flattenSections";

function createVbOperation ({x,
    y,
    z,
    depth,
    d,
    spec,
    f,
    cabinet}) {
    
    const thickness =
        Number(
            cabinet.thickness
        );

    return {

        id: createId(),
            

        type:
            "vb",

        x:
            Number(
                x?.toFixed(3)
            ),

        y:
            Number(
                y?.toFixed(3)
            ),

        z:
        Number(
                z?.toFixed(3)
            ),  

        f: f,

        spec:
            spec,

        depth:
            depth,

        diameter: d

    };
};

function createVb2Operation({    x,
    y,
    z,
    depth,
    d,
    spec,
    f,
    cabinet}) {

    const thickness =
        Number(
            cabinet.thickness
        );

    return {

        id: createId(),
            
        type:
            "vb2",

        x:
            Number(
                x?.toFixed(3)
            ),

        y:
            Number(
                y?.toFixed(3)
            ),

        z:
        Number(
                z?.toFixed(3)
            ),

        f: f,

        spec:
            spec,

        depth:
            depth,

        diameter: d

    };
};

// ============================================================
// applyJoints
// ============================================================

export const applyJoints = (
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

    const specJoint = cabinet.depth<CNC_DEFAULTS.min4 ? CNC_DEFAULTS.joint3 : CNC_DEFAULTS.joint4;
    const specScrew = cabinet.depth<CNC_DEFAULTS.min4 ? CNC_DEFAULTS.screw3 : CNC_DEFAULTS.screw4;

    const spax = cabinet.spax;

    parts.forEach(
        part => {

            const role = part.Source?.role;

            if (
                role == "bottom" || role == "middleWall"
            ) {
                
                part.CNC.operations.push(createVb2Operation({z:thickness/2, f:1, d:8, spec:specJoint, depth:28, cabinet:cabinet}));
            } else if (role == "side") {
                
                part.CNC.operations.push(createVb2Operation({x:thickness/2, f:0, d:8, spec:specJoint, depth:15, cabinet:cabinet}));
                if(spax) {part.CNC.operations.push(createVb2Operation({x:thickness/2, f:0, d:5, spec:specScrew, depth:thickness+3, cabinet:cabinet}))};

                
                sections.forEach(section => {

                if (
                    section.functionType !== "middleWall"
                ) {
                    return;
                }

                for(const wall of section.functionConfig.middleWalls) {
                    console.log(wall);
                part.CNC.operations.push(createVbOperation({x:wall.absoluteOffset, spec:specJoint, f:0, d:8, depth:15, cabinet:cabinet}));
                if (spax) {part.CNC.operations.push(createVbOperation({x:wall.absoluteOffset, spec:specScrew, f:0, d:8, depth:15, cabinet:cabinet}));}
            }

            });
            

        }
    }
    );


    return parts;
};  