


/*
========================================================
FRONTEN
========================================================
*/

export function FrontLayer({
    cabinet
}) {

    const fronts =
        cabinet.fronts ?? [];


    return (
        <g>

            {fronts.map(
                (front) => (

                    <rect
                        key={front.id}

                        x={front.x}
                        y={front.y}

                        width={front.width}
                        height={front.height}

                        fill="#3f3f46"

                        stroke="#a1a1aa"
                        strokeWidth="2"

                        vectorEffect="non-scaling-stroke"

                        data-element-id={
                            front.id
                        }

                        data-element-type="front"

                        data-x={
                            front.x
                        }

                        data-y={
                            front.y
                        }
                    />

                )
            )}

        </g>
    );
}