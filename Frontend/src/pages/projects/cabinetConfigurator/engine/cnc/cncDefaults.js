


export const DEFAULT_CNC = {

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
        frontOffset: 37,
        backOffset: 37
    },

    legrabox: {
        diameter: 5,
        depth: 15,
        depthPattern: [
            37,
            69,
            192,
            224,
            256
        ]
    },

    backPanel: {

        groove: {

            frontOffset: 42,
            backOffset: 42,

            depth: 8.3,

            rnt: {
                startOffset: 3,
                endOffset: 3,
                openStartOffset: -20,

                intermediateStartOffset: -20,
                intermediateEndOffset: 20,

                y: 20,
                z: 9,
                width: 8.3,
                tool: 81,
                c: 3
            }

        },

        rabbet: {
            startOffset: 16,
            depth: 16
        },

        insertedRabbet: {
            startOffset: 16,
            depth: 16
        }

    }

};