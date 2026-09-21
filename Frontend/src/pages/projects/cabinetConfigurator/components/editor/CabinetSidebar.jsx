import React from "react";
import { CabinetList } from "../view/cabinetList.view.jsx";


export default function CabinetSidebar({

    // ---------------------------------------------------------
    // Korpusse
    // ---------------------------------------------------------

    cabinets,
    activeCabinetId,
    activeCabinet,

    addCabinet,
    selectCabinet,
    deleteCabinet,

    updateActiveCabinet,


    // ---------------------------------------------------------
    // Section-Unterteilungen
    // ---------------------------------------------------------

    sectionSplitSpec,
    setSectionSplitSpec,

    sectionSplitDirection,
    setSectionSplitDirection,

    createInitialSections,
    setSectionCount,

    setSelectedElement
}) {

    return (

        <aside className="
            flex
            h-full
            min-h-0
            flex-col
            border-r
            border-gray-700
            bg-gray-900
        ">

            {/* =================================================
                Cabinet List
            ================================================= */}

            <div className="
                shrink-0
                border-t
                border-gray-700
            ">

                <div className="
                    flex
                    items-center
                    justify-between
                    px-4
                    py-3
                ">

                    <h2 className="
                        text-md
                        font-semibold
                        uppercase
                        tracking-wide
                        text-gray-200
                    ">
                        Korpusse
                    </h2>


                    <button
                        type="button"
                        onClick={addCabinet}
                        className="
                            flex
                            h-7
                            w-7
                            items-center
                            justify-center
                            rounded
                            border
                            border-gray-700
                            bg-gray-800
                            text-gray-300
                            hover:bg-gray-700
                        "
                    >
                        +
                    </button>

                </div>


                {/* =================================================
                    Cabinet List
                ================================================= */}

                <div className="
                    min-h-[200px]
                    max-h-[200px]
                    shrink-0
                    overflow-y-auto
                    px-2
                    pb-3
                ">

                    <CabinetList
                        cabinets={cabinets}
                        activeCabinetId={activeCabinetId}
                        onSelect={selectCabinet}
                    />

                </div>


                {/* =================================================
                    Bezeichnung
                ================================================= */}

                <label className="
                    block
                    px-3
                ">

                    <span className="
                        text-xs
                        text-gray-400
                    ">
                        Bezeichnung
                    </span>


                    <input
                        type="text"
                        value={activeCabinet?.name ?? ""}
                        onChange={(event) => {

                            updateActiveCabinet({
                                name:
                                    event.target.value
                            });

                        }}
                        className="
                            w-full
                            rounded
                            border
                            border-gray-700
                            bg-gray-800
                            px-3
                            py-1
                            text-sm
                            text-gray-100
                            outline-none
                            focus:border-blue-500
                        "
                    />

                </label>


                {/* =================================================
                    Abmessungen
                ================================================= */}

                <div className="
                    mt-4
                    space-y-3
                    px-3
                ">


                    {/* Breite */}

                    <label className="block">

                        <span className="
                            text-xs
                            text-neutral-400
                        ">
                            Breite
                        </span>


                        <input
                            type="number"
                            value={activeCabinet?.width ?? ""}
                            onChange={(event) => {

                                updateActiveCabinet({
                                    width:
                                        Number(
                                            event.target.value
                                        )
                                });

                            }}
                            className="
                                w-full
                                rounded
                                border
                                border-neutral-700
                                bg-gray-800
                                px-3
                                py-1
                            "
                        />

                    </label>


                    {/* Höhe */}

                    <label className="block">

                        <span className="
                            text-xs
                            text-neutral-400
                        ">
                            Höhe
                        </span>


                        <input
                            type="number"
                            value={activeCabinet?.height ?? ""}
                            onChange={(event) => {

                                updateActiveCabinet({
                                    height:
                                        Number(
                                            event.target.value
                                        )
                                });

                            }}
                            className="
                                w-full
                                rounded
                                border
                                border-neutral-700
                                bg-gray-800
                                px-3
                                py-1
                            "
                        />

                    </label>


                    {/* Tiefe */}

                    <label className="block">

                        <span className="
                            text-xs
                            text-neutral-400
                        ">
                            Tiefe
                        </span>


                        <input
                            type="number"
                            value={activeCabinet?.depth ?? ""}
                            onChange={(event) => {

                                updateActiveCabinet({
                                    depth:
                                        Number(
                                            event.target.value
                                        )
                                });

                            }}
                            className="
                                mt-1
                                w-full
                                rounded
                                border
                                border-gray-700
                                bg-gray-800
                                px-3
                                py-1
                            "
                        />

                    </label>

                </div>


                {/* =================================================
                    Unterteilungen
                ================================================= */}

                <section className="
                    mt-6
                    px-3
                ">

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                    ">
                        Unterteilungen
                    </div>


                    <div className="
                        mt-3
                        space-y-3
                    ">


                        {/* Split-Spezifikation */}

                        <input
                            type="text"
                            value={sectionSplitSpec}
                            onChange={(event) =>
                                setSectionSplitSpec(
                                    event.target.value
                                )
                            }
                            placeholder="1:1:1 oder 1:1:145mm"
                            className="
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


                        {/* Richtung */}

                        <div className="
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


                        {/* Unterteilungen erzeugen */}

                        <button
                            type="button"
                            onClick={() =>
                                createInitialSections(
                                    sectionSplitSpec,
                                    sectionSplitDirection,
                                    activeCabinet,
                                    updateActiveCabinet,
                                    setSectionCount,
                                    setSelectedElement
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
                            Unterteilungen erzeugen
                        </button>

                    </div>

                </section>

            </div>


            {/* =================================================
                Korpus löschen
            ================================================= */}

            <div className="
                mt-6
                border-t
                border-gray-700
                px-3
                pt-4
            ">

                <button
                    type="button"
                    onClick={deleteCabinet}
                    disabled={cabinets.length <= 1}
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
                    Korpus löschen
                </button>

            </div>

        </aside>
    );
}