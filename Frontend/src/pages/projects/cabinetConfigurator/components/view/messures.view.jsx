



/*
========================================================
MASSE
========================================================
*/

export function DimensionLayer({
    cabinet
}) {

    return (
        <g
            pointerEvents="none"
        >

            {/* -----------------------------------------
                Höhe
            ----------------------------------------- */}

            <line
                x1={-60}
                y1={0}
                x2={-60}
                y2={cabinet.height}

                stroke="#a855f7"
                strokeWidth="1.5"

                vectorEffect="non-scaling-stroke"
            />

            <line
                x1={-75}
                y1={0}
                x2={-45}
                y2={0}

                stroke="#a855f7"
                strokeWidth="1.5"

                vectorEffect="non-scaling-stroke"
            />

            <line
                x1={-75}
                y1={cabinet.height}
                x2={-45}
                y2={cabinet.height}

                stroke="#a855f7"
                strokeWidth="1.5"

                vectorEffect="non-scaling-stroke"
            />

            <text
                x={-85}
                y={
                    cabinet.height / 2
                }

                fill="#c084fc"

                fontSize="48"

                textAnchor="middle"

                transform={`
                    rotate(
                        -90
                        ${-85}
                        ${cabinet.height / 2}
                    )
                `}
            >
                {cabinet.height} mm
            </text>


            {/* -----------------------------------------
                Breite
            ----------------------------------------- */}

            <line
                x1={0}
                y1={cabinet.height + 60}

                x2={cabinet.width}
                y2={cabinet.height + 60}

                stroke="#a855f7"
                strokeWidth="1.5"

                vectorEffect="non-scaling-stroke"
            />


            <line
                x1={0}
                y1={cabinet.height + 45}

                x2={0}
                y2={cabinet.height + 75}

                stroke="#a855f7"
                strokeWidth="1.5"

                vectorEffect="non-scaling-stroke"
            />


            <line
                x1={cabinet.width}
                y1={cabinet.height + 45}

                x2={cabinet.width}
                y2={cabinet.height + 75}

                stroke="#a855f7"
                strokeWidth="1.5"

                vectorEffect="non-scaling-stroke"
            />


            <text
                x={
                    cabinet.width / 2
                }

                y={
                    cabinet.height + 115
                }

                fill="#c084fc"

                fontSize="48"

                textAnchor="middle"
            >
                {cabinet.width} mm
            </text>

        </g>
    );
}