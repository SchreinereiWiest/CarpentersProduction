export function InteriorLayer({
    cabinet,
    selectedElement,
    onSelect
}) {

    const sections =
        cabinet.sections ?? [];

    const thickness =
        Number(cabinet.thickness) || 19;

    const width =
        Number(cabinet.width) || 0;

    const height =
        Number(cabinet.height) || 0;

    const topOffset =
        Number(
            cabinet.topOffset ?? 0
        );

    const bottomOffset =
        Number(
            cabinet.bottomOffset ?? 0
        );

    const topExists =
        cabinet.topExists ?? true;

    const bottomExists =
        cabinet.bottomExists ?? true;


    const innerLeft =
        thickness;

    const innerWidth =
        Math.max(
            0,
            width -
            2 * thickness
        );


    const deckelY =
        topOffset;

    const bodenY =
        height -
        bottomOffset -
        thickness;


    const renderFunctions = (
        section
    ) => {

        const config =
            section.functionConfig ?? {};

        const functionType =
            section.functionType;


        const elements = [];


        // =====================================================
        // Legrabox
        // =====================================================

        if (
            functionType === "legrabox"
        ) {

            const legraboxes =
                Array.isArray(
                    config.legraboxes
                )
                    ? config.legraboxes
                    : [];


            legraboxes.forEach(
                (box, index) => {

                    const heights = {
                        M: 60,
                        K: 100,
                        C: 130,
                        L: 200
                    };


                    const boxHeight =
                        heights[
                            box.variant
                        ] ?? 60;


                    const positionFromBottom =
                        Number(
                            box.positionFromBottom - 37 ?? 3
                            
                        );


                    const y =
                        section.y +
                        section.height -
                        positionFromBottom -
                        boxHeight;


                    if (
                        y < section.y ||
                        y > (
                            section.y +
                            section.height
                        )
                    ) {
                        return;
                    }


                    elements.push(

                        <rect
                            key={
                                `legrabox-${section.id}-${index}`
                            }
                            x={
                                section.x
                            }
                            y={y}
                            width={
                                section.width
                            }
                            height={
                                boxHeight
                            }
                            fill="#374151"
                            stroke="#a1a1aa"
                            strokeWidth="1"
                            pointerEvents="none"
                        />

                    );

                }
            );
        }


        // =====================================================
        // Einlegeböden
        // =====================================================

        if (
            functionType === "shelf"
        ) {

            const compartmentCount =
                Math.max(
                    1,
                    Number(
                        config.compartmentCount ??
                        1
                    )
                );


            const shelfCount =
                Math.max(
                    0,
                    compartmentCount - 1
                );


            const availableHeight =
                section.height;


            if (
                shelfCount > 0
            ) {

                for (
                    let index = 1;
                    index <= shelfCount;
                    index++
                ) {

                    const y =
                        section.y +
                        (
                            availableHeight *
                            index /
                            compartmentCount
                        ) -
                        thickness / 2;


                    elements.push(

                        <rect
                            key={
                                `shelf-${section.id}-${index}`
                            }
                            x={
                                section.x
                            }
                            y={y}
                            width={
                                section.width
                            }
                            height={
                                thickness
                            }
                            fill="#4b5563"
                            stroke="#9ca3af"
                            strokeWidth="1"
                            pointerEvents="none"
                        />

                    );

                }

            }
        }


        // =====================================================
        // Mittelboden / Mittelwand
        // =====================================================

        if (
            functionType === "middleWall"
        ) {
       

            section.functionConfig.middleWalls.forEach(
                (partition, index) => {

                    const positionFromBottom =
                        Number(
                            partition.absoluteOffset ??
                            0
                        );


                    const y =
                        positionFromBottom - thickness/2;

                    elements.push(

                        <rect
                            key={
                                `partition-${section.id}-${index}`
                            }
                            x={
                                section.x
                            }
                            y={y}
                            width={
                                section.width
                            }
                            height={
                                thickness
                            }
                            fill="#4b5563"
                            stroke="#9ca3af"
                            strokeWidth="1"
                            pointerEvents="none"
                        />

                    );

                }
            );
        }


        return elements;
    };


    const renderSections = (
        sectionList,
        parentNumber = ""
    ) => {

        return sectionList.map(
            (
                section,
                index
            ) => {

                const sectionNumber =
                    parentNumber
                        ? `${parentNumber}.${index + 1}`
                        : `${index + 1}`;


                const selected =
                    selectedElement?.id ===
                    section.id;


                return (
                    <g
                        key={section.id}
                    >

                        <g
                            onClick={(event) => {

                                event.stopPropagation();

                                onSelect({
                                    id:
                                        section.id,

                                    type:
                                        "section",

                                    x:
                                        section.x,

                                    y:
                                        section.y,

                                    width:
                                        section.width,

                                    height:
                                        section.height
                                });

                            }}
                            onDoubleClick={(event) => {

                                event.stopPropagation();

                                onSelect({
                                    id:
                                        section.id,

                                    type:
                                        "section",

                                    x:
                                        section.x,

                                    y:
                                        section.y,

                                    width:
                                        section.width,

                                    height:
                                        section.height,

                                    openSetup:
                                        true
                                });

                            }}
                            className="
                                cursor-pointer
                            "
                        >

                            <rect
                                x={
                                    section.x
                                }
                                y={
                                    section.y
                                }
                                width={
                                    section.width
                                }
                                height={
                                    section.height
                                }
                                fill={
                                    selected
                                        ? "#de7b2f"
                                        : "#1F2937"
                                }
                                stroke={
                                    selected
                                        ? "#e36e15"
                                        : "#9CA3AF"
                                }
                                strokeWidth={
                                    selected
                                        ? 3
                                        : 2
                                }
                            />

                            <text
                                x={
                                    section.x +
                                    section.width / 2
                                }
                                y={
                                    section.y +
                                    section.height / 2
                                }
                                fill="#a1a1aa"
                                fontSize="48"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                pointerEvents="none"
                            >
                                {sectionNumber}
                            </text>

                        </g>


                        {/* Funktionen */}

                        <g
                            pointerEvents="none"
                        >
                            {
                                renderFunctions(
                                    section
                                )
                            }
                        </g>


                        {/* Kinder */}

                        {section.children?.length > 0 &&
                            renderSections(
                                section.children,
                                sectionNumber
                            )}

                    </g>
                );
            }
        );
    };


    return (
        <g>

            {/* ========================================= */}
            {/* Deckel */}
            {/* ========================================= */}

            {topExists && (

                <rect
                    x={thickness}
                    y={deckelY}
                    width={width - thickness*2}
                    height={thickness}
                    fill="#4B5563"
                    stroke="#374151"
                    strokeWidth="1"
                    pointerEvents="none"
                />

            )}


            {/* ========================================= */}
            {/* Boden */}
            {/* ========================================= */}

            {bottomExists && (

                <rect
                    x={thickness}
                    y={bodenY}
                    width={width - thickness*2}
                    height={thickness}
                    fill="#4B5563"
                    stroke="#374151"
                    strokeWidth="1"
                    pointerEvents="none"
                />

            )}


            {/* ========================================= */}
            {/* Sections */}
            {/* ========================================= */}

            {renderSections(
                sections
            )}

        </g>
    );
}