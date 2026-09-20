

/*
========================================================
KORPUS
========================================================
*/

export function CarcassLayer({
    cabinet
}) {

    const t =
        cabinet.thickness ?? 19;


    return (
        <g>

            {/* -----------------------------------------
                Außenkontur
            ----------------------------------------- */}

            <rect
                x={0}
                y={0}

                width={
                    cabinet.width
                }

                height={
                    cabinet.height
                }

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
                    cabinet.width -
                    t * 2
                }

                height={
                    cabinet.height -
                    t * 2
                }

                fill="#1F2937"
                stroke="#737373"
                strokeWidth="1"

                pointerEvents="none"
            />

        </g>
    );
}