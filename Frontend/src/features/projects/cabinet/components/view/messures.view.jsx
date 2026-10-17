export function DimensionLayer({ cabinet }) {

    const width =
        Number(cabinet.width) || 0;

    const height =
        Number(cabinet.height) || 0;

    const topOffset =
        Number(cabinet.topOffset ?? 0);

    const bottomOffset =
        Number(cabinet.bottomOffset ?? 0);

    return (
        <g pointerEvents="none">

            {/* ================================================= */}
            {/* GESAMTHÖHE – links */}
            {/* ================================================= */}

            <line
                x1={-60}
                y1={0}
                x2={-60}
                y2={height}
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
                y1={height}
                x2={-45}
                y2={height}
                stroke="#a855f7"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
            />

            <text
                x={-85}
                y={height / 2}
                fill="#c084fc"
                fontSize="48"
                textAnchor="middle"
                transform={`
                    rotate(
                        -90
                        ${-85}
                        ${height / 2}
                    )
                `}
            >
                {height} mm
            </text>


            {/* ================================================= */}
            {/* GESAMTBREITE – unten */}
            {/* ================================================= */}

            <line
                x1={0}
                y1={height + 60}
                x2={width}
                y2={height + 60}
                stroke="#a855f7"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
            />

            <line
                x1={0}
                y1={height + 45}
                x2={0}
                y2={height + 75}
                stroke="#a855f7"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
            />

            <line
                x1={width}
                y1={height + 45}
                x2={width}
                y2={height + 75}
                stroke="#a855f7"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
            />

            <text
                x={width / 2}
                y={height + 115}
                fill="#c084fc"
                fontSize="48"
                textAnchor="middle"
            >
                {width} mm
            </text>


            {/* ================================================= */}
            {/* DECKEL OFFSET – rechts */}
            {/* ================================================= */}

            {topOffset > 0 && (

                <g>

                    <line
                        x1={width + 60}
                        y1={0}
                        x2={width + 60}
                        y2={topOffset}
                        stroke="#a855f7"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                    />

                    <line
                        x1={width + 45}
                        y1={0}
                        x2={width + 75}
                        y2={0}
                        stroke="#a855f7"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                    />

                    <line
                        x1={width + 45}
                        y1={topOffset}
                        x2={width + 75}
                        y2={topOffset}
                        stroke="#a855f7"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                    />

                    <text
                        x={width + 120}
                        y={topOffset / 2}
                        fill="#c084fc"
                        fontSize="48"
                        textAnchor="middle"
                        transform={`
                            rotate(
                                -90
                                ${width + 120}
                                ${topOffset / 2}
                            )
                        `}
                    >
                        {topOffset} mm
                    </text>

                </g>
            )}


            {/* ================================================= */}
            {/* BODEN OFFSET – rechts */}
            {/* ================================================= */}

            {bottomOffset > 0 && (

                <g>

                    <line
                        x1={width + 60}
                        y1={height - bottomOffset}
                        x2={width + 60}
                        y2={height}
                        stroke="#a855f7"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                    />

                    <line
                        x1={width + 45}
                        y1={height - bottomOffset}
                        x2={width + 75}
                        y2={height - bottomOffset}
                        stroke="#a855f7"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                    />

                    <line
                        x1={width + 45}
                        y1={height}
                        x2={width + 75}
                        y2={height}
                        stroke="#a855f7"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                    />

                    <text
                        x={width + 120}
                        y={
                            height -
                            bottomOffset / 2
                        }
                        fill="#c084fc"
                        fontSize="48"
                        textAnchor="middle"
                        transform={`
                            rotate(
                                -90
                                ${width + 120}
                                ${
                                    height -
                                    bottomOffset / 2
                                }
                            )
                        `}
                    >
                        {bottomOffset} mm
                    </text>

                </g>
            )}

        </g>
    );
}