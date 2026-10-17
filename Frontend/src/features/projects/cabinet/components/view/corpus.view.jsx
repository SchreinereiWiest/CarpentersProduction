export function CarcassLayer({
    cabinet
}) {

    const t =
        Number(cabinet.thickness) || 19;

    const width =
        Number(cabinet.width) || 0;

    const height =
        Number(cabinet.height) || 0;

    const topOffset =
        Number(cabinet.topOffset ?? 0);

    const bottomOffset =
        Number(cabinet.bottomOffset ?? 0);


    return (
        <g>

            {/* -----------------------------------------
                Außenkontur
            ----------------------------------------- */}

            <rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill="#4B5563"
                stroke="#374151"
                strokeWidth="2"
                data-element-id="carcass"
                data-element-type="carcass"
            />


            {/* -----------------------------------------
                Innenraum
            ----------------------------------------- */}

            <rect
                x={t}
                y={t}
                width={
                    Math.max(
                        0,
                        width - 2 * t
                    )
                }
                height={
                    Math.max(
                        0,
                        height - 2 * t
                    )
                }
                fill="#1F2937"
                stroke="#737373"
                strokeWidth="1"
                pointerEvents="none"
            />


            {/* =========================================
                Oberen Offset ausblenden
               ========================================= */}

            {topOffset > 0 && (

                <rect
                    x={t}
                    y={0}
                    width={
                        Math.max(
                            0,
                            width - 2 * t
                        )
                    }
                    height={topOffset}
                    fill="#111827"
                    stroke="none"
                    pointerEvents="none"
                />

            )}


            {/* =========================================
                Unteren Offset ausblenden
               ========================================= */}

            {bottomOffset > 0 && (

                <rect
                    x={t}
                    y={
                        height -
                        bottomOffset
                    }
                    width={
                        Math.max(
                            0,
                            width - 2 * t
                        )
                    }
                    height={
                        bottomOffset
                    }
                    fill="#111827"
                    stroke="none"
                    pointerEvents="none"
                />

            )}

        </g>
    );
}