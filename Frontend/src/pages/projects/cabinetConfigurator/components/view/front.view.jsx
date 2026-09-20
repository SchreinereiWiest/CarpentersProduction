import React from "react";


export function FrontLayer({
    cabinet,
    selectedElement,
    onSelect
}) {

    const fronts =
        cabinet.fronts ?? [];


    const renderFronts = (
        fronts,
        parentNumber = ""
    ) => {

        return fronts.map(
            (front, index) => {

                const number =
                    parentNumber
                        ? `${parentNumber}.${index + 1}`
                        : `${index + 1}`;


                const selected =
                    selectedElement?.id ===
                    front.id;


                const hasChildren =
                    front.children &&
                    front.children.length > 0;


                return (

                    <g
                        key={front.id}
                    >

                        {/* ================================= */}
                        {/* FRONT */}
                        {/* ================================= */}

                        {!hasChildren && (

                            <g
                                onClick={(event) => {

                                    event.stopPropagation();

                                    onSelect?.({
                                        ...front,
                                        type: "front"
                                    });

                                }}

                                onDoubleClick={(event) => {

                                    event.stopPropagation();

                                    onSelect?.({
                                        ...front,
                                        type: "front",
                                        openSetup: true
                                    });

                                }}

                                style={{
                                    cursor: "pointer"
                                }}
                            >

                                <rect
                                    x={front.x}
                                    y={front.y}
                                    width={front.width}
                                    height={front.height}

                                    fill={
                                        selected
                                            ? "#166534"
                                            : "#14532d"
                                    }

                                    stroke={
                                        selected
                                            ? "#4ade80"
                                            : "#22c55e"
                                    }

                                    strokeWidth={
                                        selected
                                            ? 3
                                            : 1.5
                                    }

                                    vectorEffect="non-scaling-stroke"
                                />


                                <text
                                    x={
                                        front.x +
                                        front.width / 2
                                    }

                                    y={
                                        front.y +
                                        front.height / 2
                                    }

                                    textAnchor="middle"
                                    dominantBaseline="middle"

                                    fill="#bbf7d0"

                                    fontSize="16"

                                    pointerEvents="none"
                                >
                                    {number}
                                </text>


                                <text
                                    x={
                                        front.x +
                                        front.width / 2
                                    }

                                    y={
                                        front.y +
                                        front.height / 2 +
                                        22
                                    }

                                    textAnchor="middle"
                                    dominantBaseline="middle"

                                    fill="#86efac"

                                    fontSize="12"

                                    pointerEvents="none"
                                >
                                    {Math.round(
                                        front.width
                                    )} × {Math.round(
                                        front.height
                                    )} mm
                                </text>

                            </g>

                        )}


                        {/* ================================= */}
                        {/* UNTERFRONTEN */}
                        {/* ================================= */}

                        {hasChildren &&
                            renderFronts(
                                front.children,
                                number
                            )
                        }

                    </g>

                );

            }
        );
    };


    return (

        <g>

            {/*
             * Korpus-Hintergrund
             */}

            <rect
                x={0}
                y={0}
                width={cabinet.width}
                height={cabinet.height}

                fill="#171717"

                stroke="#737373"

                strokeWidth={2}

                vectorEffect="non-scaling-stroke"
            />


            {renderFronts(fronts)}

        </g>
    );
}