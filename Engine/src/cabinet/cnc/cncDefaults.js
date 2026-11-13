import { DEFAULT_MACHINING_ASSIGNMENTS } from "../../postprocessor/defaults.js";


export const DEFAULT_CNC = {

    machiningAssignments: DEFAULT_MACHINING_ASSIGNMENTS,

    spax: {

        enabled: true,

        screw: {
            diameter: 5,
            depth: 15,
            startOffset: 40,
            endOffset: 60
        },

        connector: {
            diameter: 8,
            depth: 15,
            startOffset: 50,
            endOffset: 50,
            holeCountThreshold: 300
        },

        horizontal: {
            diameter: 8,
            depth: 15,
            startOffset: 50,
            endOffset: 50
        }

    },

    shelf: {
        diameter: 5,
        depth: 16,
        shelfFrontOffset: 10,
        frontOffset: 37,
        backOffset: 37
    },

    clamex: {
        surface: {
            axisMode: "3-axis",
            cutterType: "router"
        },
        horizontal: {
            axisMode: "3-axis",
            cutterType: "disc"
        },
        edgeDistance: 80,
        outsideOffset: 20,
        reducedConnectorThreshold: 300
    },

    legrabox: {
        diameter: 5,
        depth: 15,
        heights: {
            N: 78,
            M: 104,
            K: 142,
            C: 190,
            L: 254
        },
        backHeights: {
            N: 39,
            M: 63,
            C: 101,
            K: 148,
            L: 212
        },
        materials: {
            whiteMaterialId: "",
            grayMaterialId: ""
        },
        depthPattern: [
            37,
            69,
            192,
            224,
            256
        ]
    },

    fronts: {
        drawer: {
            fallbackBoxPositionFromBottom: 59,
            programs: [
                {
                    id: "legra-base",
                    name: "Grundprogramm",
                    matchKeys: "M,K",
                    extendsProgramId: "",
                    groups: [{
                        id: "mk-primary",
                        name: "Grundgruppe",
                        verticalOffset: 0,
                        holes: [{
                            id: "primary",
                            verticalOffset: 13,
                            sideOffset: 33,
                            diameter: 5,
                            depth: 1
                        }]
                    }]
                },
                {
                    id: "legra-c",
                    name: "Zusatzprogramm C",
                    matchKeys: "C",
                    extendsProgramId: "legra-base",
                    groups: [{
                        id: "c-secondary",
                        name: "C Zusatzgruppe 1",
                        verticalOffset: 92,
                        holes: [{
                            id: "c-secondary-primary",
                            verticalOffset: 13,
                            sideOffset: 33,
                            diameter: 5,
                            depth: 1
                        }]
                    }]
                }
            ]
        },
        door: {
            cup: {
                enabled: true,
                edgeOffset: 22.5,
                topOffset: 100,
                bottomOffset: 100,
                diameter: 35,
                depth: 13
            },
            auxiliaryHoles: [],
            corpus: {
                enabled: true,
                frontOffset: 37,
                centerOffsets: [-32, 32],
                diameter: 5,
                depth: 15
            }
        }
    },

    backPanel: {

        groove: {

            continuous: {
                startOffset: -20,
                endOffset: -20
            },

            inserted: {
                startOffset: 3,
                endOffset: 3
            },

            distanceFromBack: 20,
            zDepth: 9,
            width: 8.3,

            frontOffset: 42,
            backOffset: 42,

            depth: 9,

            path: {
                startOffset: 3,
                endOffset: 3,
                openStartOffset: -20,

                intermediateStartOffset: -20,
                intermediateEndOffset: 20,

                y: 20,
                z: 9,
                width: 8.3
            }

        },

        rabbet: {
            continuous: {
                startLeft: -20,
                endRight: -20
            },
            inserted: {
                startLeft: 3,
                endRight: 3
            },
            depth: 16,
            topOffset: 7,
            startOffset: 16
        },

        insertedRabbet: {
            startOffset: 16,
            depth: 16
        }

    }

};
