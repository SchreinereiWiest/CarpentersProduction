
export function createId() {
        return Date.now() + Math.random();
    }

export const createCncPlan = ({
    L,
    B,
    T,
    source = null
}) => {

    return {

        version: 1,

        coordinateSystem:
            "top-left",

        panel: {
            L,
            B,
            T
        },

        contour: {
            type: "rectangle",

            x: 0,
            y: 0,

            width: B,
            height: L
        },

        operations: [],

        source
    };
};