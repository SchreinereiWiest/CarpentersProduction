import {getOperationPosition} from "../cncOperationLayer";

export default function Drill({operation, height, operationId, selectedOperationId, onSelectOperation}) {

    const selected =
                        operationId ===
                        selectedOperationId;

    if (operation.type === "drill") {

                        const position =
                            getOperationPosition(
                                operation,
                                height
                            );

                        if (!position) {
                            return null;
                        }

                        const diameter =
                            Number(
                                operation.diameter
                            ) || 5;

                        const radius =
                            diameter / 2;

                        return (
                            <g
                                key={operationId}
                                onClick={(event) => {

                                    event.stopPropagation();

                                    onSelectOperation?.(
                                        operation
                                    );

                                }}
                                style={{
                                    cursor: "pointer"
                                }}
                            >

                                {/* Außenkreis */}

                                <circle
                                    cx={position.x}
                                    cy={position.y}
                                    r={
                                        radius +
                                        (selected
                                            ? 2
                                            : 0)
                                    }
                                    fill={
                                        selected
                                            ? "rgb(59 130 246)"
                                            : "rgb(239 68 68)"
                                    }
                                    fillOpacity={
                                        selected
                                            ? 0.35
                                            : 0.2
                                    }
                                    stroke={
                                        selected
                                            ? "rgb(96 165 250)"
                                            : "rgb(248 113 113)"
                                    }
                                    strokeWidth={
                                        selected
                                            ? 1.5
                                            : 1
                                    }
                                />

                                {/* Bohrungsmittelpunkt */}

                                <line
                                    x1={
                                        position.x -
                                        radius -
                                        4
                                    }
                                    y1={
                                        position.y
                                    }
                                    x2={
                                        position.x +
                                        radius +
                                        4
                                    }
                                    y2={
                                        position.y
                                    }
                                    stroke={
                                        selected
                                            ? "rgb(147 197 253)"
                                            : "rgb(252 165 165)"
                                    }
                                    strokeWidth={0.5}
                                    pointerEvents="none"
                                />

                                <line
                                    x1={
                                        position.x
                                    }
                                    y1={
                                        position.y -
                                        radius -
                                        4
                                    }
                                    x2={
                                        position.x
                                    }
                                    y2={
                                        position.y +
                                        radius +
                                        4
                                    }
                                    stroke={
                                        selected
                                            ? "rgb(147 197 253)"
                                            : "rgb(252 165 165)"
                                    }
                                    strokeWidth={0.5}
                                    pointerEvents="none"
                                />

                            </g>
                        );
                    }
}