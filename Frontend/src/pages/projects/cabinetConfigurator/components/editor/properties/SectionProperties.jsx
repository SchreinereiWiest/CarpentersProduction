import React from "react";


export default function SectionProperties({

    selectedElement,

    activeCabinet,

    sectionSplitSpec,
    setSectionSplitSpec,

    sectionSplitDirection,
    setSectionSplitDirection,

    splitSection,
    mergeSectionChildren,
    findParent,

    updateActiveCabinet,
    setSelectedElement

}) {

    if (
        !activeCabinet ||
        !selectedElement
    ) {
        return null;
    }


    const canMerge =
        selectedElement.children?.length > 0 ||
        findParent(
            activeCabinet.sections ?? [],
            selectedElement.id
        ) !== null;


    return (

        <section className="mt-6">

            <div className="
                text-xs
                uppercase
                tracking-wide
                text-gray-500
            ">
                Sektion unterteilen
            </div>


            <div className="
                mt-4
                space-y-4
            ">

                {/* =================================================
                    Aufteilung
                ================================================= */}

                <label className="block">

                    <span className="
                        text-xs
                        text-gray-400
                    ">
                        Aufteilung
                    </span>


                    <input
                        type="text"
                        value={
                            sectionSplitSpec
                        }
                        onChange={(event) =>
                            setSectionSplitSpec(
                                event.target.value
                            )
                        }
                        placeholder="1:1:145mm"
                        className="
                            mt-1
                            w-full
                            rounded-lg
                            border
                            border-gray-700
                            bg-gray-900
                            px-3
                            py-2
                            text-white
                            focus:border-blue-500
                            focus:outline-none
                        "
                    />

                </label>


                {/* =================================================
                    Richtung
                ================================================= */}

                <div>

                    <div className="
                        text-xs
                        text-gray-400
                    ">
                        Richtung
                    </div>


                    <div className="
                        mt-1
                        grid
                        grid-cols-2
                        gap-2
                    ">

                        <button
                            type="button"
                            onClick={() =>
                                setSectionSplitDirection(
                                    "vertical"
                                )
                            }
                            className={`
                                rounded
                                border
                                px-3
                                py-2
                                text-sm

                                ${
                                    sectionSplitDirection ===
                                    "vertical"

                                        ? `
                                            border-blue-600
                                            bg-blue-900
                                            text-blue-200
                                        `

                                        : `
                                            border-gray-700
                                            bg-gray-800
                                            text-gray-400
                                        `
                                }
                            `}
                        >
                            Vertikal
                        </button>


                        <button
                            type="button"
                            onClick={() =>
                                setSectionSplitDirection(
                                    "horizontal"
                                )
                            }
                            className={`
                                rounded
                                border
                                px-3
                                py-2
                                text-sm

                                ${
                                    sectionSplitDirection ===
                                    "horizontal"

                                        ? `
                                            border-blue-600
                                            bg-blue-900
                                            text-blue-200
                                        `

                                        : `
                                            border-gray-700
                                            bg-gray-800
                                            text-gray-400
                                        `
                                }
                            `}
                        >
                            Horizontal
                        </button>

                    </div>

                </div>


                {/* =================================================
                    Sektion teilen
                ================================================= */}

                <button
                    type="button"
                    onClick={() =>
                        splitSection(
                            selectedElement.id,
                            sectionSplitSpec,
                            sectionSplitDirection,
                            activeCabinet,
                            updateActiveCabinet,
                            setSelectedElement,
                            0
                        )
                    }
                    className="
                        w-full
                        rounded
                        border
                        border-gray-700
                        bg-gray-800
                        px-3
                        py-2
                        text-sm
                        hover:bg-gray-700
                    "
                >
                    Sektion unterteilen
                </button>


                {/* =================================================
                    Zusammenführen
                ================================================= */}

                <button
                    type="button"
                    disabled={!canMerge}
                    onClick={() =>
                        mergeSectionChildren(
                            selectedElement.id,
                            activeCabinet,
                            updateActiveCabinet,
                            setSelectedElement
                        )
                    }
                    className="
                        w-full
                        rounded
                        border
                        border-red-800
                        px-3
                        py-2
                        text-sm
                        text-red-400
                        hover:bg-red-950
                        disabled:cursor-not-allowed
                        disabled:opacity-30
                    "
                >
                    Unterteilungen aufheben
                </button>

            </div>

        </section>
    );
}