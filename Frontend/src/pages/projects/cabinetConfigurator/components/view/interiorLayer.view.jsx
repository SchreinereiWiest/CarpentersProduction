export function InteriorLayer({
    cabinet,
    selectedElement,
    onSelect
}) {

    const sections = cabinet.sections ?? [];


    const renderSections = (
        sections,
        parentNumber = ""
    ) => {

        return sections.map(
            (section, index) => {

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

                        {/* Section */}

                        <g
                            onClick={(event) => {

                                event.stopPropagation();

                                onSelect({
                                    id: section.id,

                                    type: "section",

                                    x: section.x,
                                    y: section.y,

                                    width: section.width,
                                    height: section.height
                                });

                            }}

                            onDoubleClick={(event) => {

                                event.stopPropagation();

                                onSelect({
                                    id: section.id,

                                    type: "section",

                                    x: section.x,
                                    y: section.y,

                                    width: section.width,
                                    height: section.height,

                                    openSetup: true
                                });

                            }}

                            className="cursor-pointer"
                        >

                            <rect
                                x={section.x}
                                y={section.y}

                                width={section.width}
                                height={section.height}

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


                        {/* Untersektionen */}

                        {section.children?.length > 0 &&
                            renderSections(
                                section.children,
                                sectionNumber
                            )
                        }

                    </g>

                );

            }
        );
    };


    return (
        <g>
            {renderSections(sections)}
        </g>
    );
}