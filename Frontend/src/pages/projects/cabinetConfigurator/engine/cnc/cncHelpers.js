
export function createId() {
        return Date.now() + Math.random();
    }


export const createEmptyCnc = () => ({
    version: 1,

    coordinateSystem: {
        unit: "mm",
        origin: "top-left"
    },

    operations: []
});


export const ensureCnc = (part) => {

    // console.log(part);

    if (!part.CNC) {
        part.CNC = createEmptyCnc();
    }

    if (!Array.isArray(part.CNC.operations)) {
        part.CNC.operations = [];
    }

    return part;
};


export const flattenSections = (
    sections = []
) => {

    const result = [];

    const walk = (nodes) => {

        if (!Array.isArray(nodes)) {
            return;
        }

        nodes.forEach(section => {

            result.push(section);

            if (
                Array.isArray(section.children) &&
                section.children.length > 0
            ) {
                walk(section.children);
            }
        });
    };

    walk(sections);

    const filteredResult = result.filter(
    element =>
        !element.children ||
        element.children.length === 0
);

    return filteredResult;
};


export const isNear = (
    a,
    b,
    tolerance = 0.01
) => {

    return Math.abs(
        Number(a) - Number(b)
    ) <= tolerance;
};