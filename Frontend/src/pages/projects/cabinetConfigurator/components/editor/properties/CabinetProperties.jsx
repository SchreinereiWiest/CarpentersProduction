import React from "react";

import MaterialSelect from "./MaterialSelect";


export default function CabinetProperties({
    activeCabinet,
    updateActiveCabinet,
    onLayoutChange,
    materials,
    loadingMaterials,
    materialError
}) {

    if (!activeCabinet) {
        return null;
    }


    return (

        <div className="
            mt-2
            space-y-2
        ">

            {/* =================================================
                Korpus
            ================================================= */}

            <section>

                


                <div className="
                    mt-2 mb-2
                    text-base
                ">
                    {activeCabinet.name}
                </div>

                <section className="
                border-t
                border-gray-800
            ">


                <div className="
                    
                    grid
                    grid-cols-3
                    gap-2
                    text-sm
                ">

                    <div>

                        <div className="
                            text-xs
                            text-gray-500
                        ">
                            Breite
                        </div>

                        <div className="mt-1">
                            {activeCabinet.width} mm
                        </div>

                    </div>


                    <div>

                        <div className="
                            text-xs
                            text-gray-500
                        ">
                            Höhe
                        </div>

                        <div className="mt-1">
                            {activeCabinet.height} mm
                        </div>

                    </div>


                    <div>

                        <div className="
                            text-xs
                            text-gray-500
                        ">
                            Tiefe
                        </div>

                        <div className="mt-1">
                            {activeCabinet.depth} mm
                        </div>

                    </div>

                </div>

            </section>

            </section>


            {/* =================================================
                Materialien
            ================================================= */}

            <section>


                <div className="
                    space-y-2
                ">

                    <MaterialSelect
                        label="Korpusmaterial"
                        value={
                            activeCabinet.materialId
                        }
                        materials={
                            materials
                        }
                        loading={
                            loadingMaterials
                        }
                        error={
                            materialError
                        }
                        onChange={(value) =>
                            updateActiveCabinet({
                                materialId: value
                            })
                        }
                    />

                    <MaterialSelect
                        label="Frontmaterial"
                        value={
                            activeCabinet.frontMaterialId
                        }
                        materials={
                            materials
                        }
                        loading={
                            loadingMaterials
                        }
                        error={
                            materialError
                        }
                        onChange={(value) =>
                            updateActiveCabinet({
                                frontMaterialId: value
                            })
                        }
                    />


                    <MaterialSelect
                        label="Kante oben"
                        value={
                            activeCabinet.edgeTopMaterialId
                        }
                        materials={
                            materials
                        }
                        loading={
                            loadingMaterials
                        }
                        error={
                            materialError
                        }
                        onChange={(value) =>
                            updateActiveCabinet({
                                edgeTopMaterialId:
                                    value
                            })
                        }
                    />


                    <MaterialSelect
                        label="Kante unten"
                        value={
                            activeCabinet.edgeBottomMaterialId
                        }
                        materials={
                            materials
                        }
                        loading={
                            loadingMaterials
                        }
                        error={
                            materialError
                        }
                        onChange={(value) =>
                            updateActiveCabinet({
                                edgeBottomMaterialId:
                                    value
                            })
                        }
                    />


                    <MaterialSelect
                        label="Frontkante"
                        value={
                            activeCabinet.frontEdgeMaterialId
                        }
                        materials={
                            materials
                        }
                        loading={
                            loadingMaterials
                        }
                        error={
                            materialError
                        }
                        onChange={(value) =>
                            updateActiveCabinet({
                                frontEdgeMaterialId:
                                    value
                            })
                        }
                    />

                </div>

            </section>

            {/* =================================================
    Rückwand
================================================= */}

            <section>

                <div className="
        text-xs
        uppercase
        tracking-wide
        text-gray-500
    ">
                    Rückwand
                </div>


                <div className="space-y-2">

                    {/* Rückwandkonstruktion */}

                    <label className="block">

                        <span className="
                text-xs
                text-gray-400
            ">
                            Ausführung
                        </span>


                        <select
                            value={
                                activeCabinet.backPanel?.construction ??
                                "butt"
                            }
                            onChange={(event) =>
                                updateActiveCabinet({

                                    backPanel: {

                                        ...(activeCabinet.backPanel ?? {}),

                                        construction:
                                            event.target.value

                                    }
                                })
                            }
                            className="
                    
                    w-full
                    rounded-lg
                    border
                    border-gray-700
                    bg-gray-800
                    px-3
                    py-2
                    text-sm
                    text-white
                    outline-none
                    focus:border-blue-500
                "
                        >

                            <option value="butt">
                                Stumpf
                            </option>

                            <option value="rabbet">
                                Falz
                            </option>

                            <option value="groove">
                                Nut geschlossen
                            </option>

                            <option value="grooveOpen">
                                Nut oben offen
                            </option>

                        </select>

                    </label>


                    {/* Durchgehendes Bauteil */}

                    <label className="block">

                        <span className="
                text-xs
                text-gray-400
            ">
                            Durchgehend
                        </span>


                        <select
                            value={
                                activeCabinet.backPanel?.continuous ??
                                "side"
                            }
                            onChange={(event) =>
                                updateActiveCabinet({

                                    backPanel: {

                                        ...(activeCabinet.backPanel ?? {}),

                                        continuous:
                                            event.target.value

                                    }
                                })
                            }
                            className="
                    mt-1
                    w-full
                    rounded-lg
                    border
                    border-gray-700
                    bg-gray-800
                    px-3
                    py-2
                    text-sm
                    text-white
                    outline-none
                    focus:border-blue-500
                "
                        >

                            <option value="side">
                                Seite durchgehend
                            </option>

                            <option value="bottom">
                                Boden durchgehend
                            </option>

                        </select>

                    </label>

                </div>

            </section>


            {/* =================================================
                Abmessungen
            ================================================= */}

            <label className="
                                        flex
                                        items-center
                                        gap-2
                                        text-sm
                                        text-gray-300
                                        mt-4
                                    ">

                                        <input
                                            type="checkbox"
                                            checked={
                                                activeCabinet.spax
                                            }
                                            onChange={(event) => updateActiveCabinet({

                                    spax:event.target.checked })}
                                            className="
                                                h-4
                                                w-4
                                                rounded
                                                border-gray-700
                                                bg-gray-800
                                            "
                                        />

                                        Geschraubt

</label>

{/* ===================================================== */}
{/* Korpusaufbau */}
{/* ===================================================== */}

<section className="border-t border-gray-800 pt-3">

    <div className="
        text-xs
        uppercase
        tracking-wide
        text-gray-500
        mb-2
    ">
        Korpusaufbau
    </div>


    {/* Boden */}

    <div className="
        rounded
        border
        border-gray-800
        bg-gray-900/50
        p-3
        space-y-3
    ">

        <label className="block">

            <span className="
                text-xs
                text-gray-400
            ">
                Bodenabstand
            </span>

            <div className="flex items-center gap-2">

                <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                        activeCabinet.bottomOffset ??
                        0
                    }
                    onChange={(event) => {

                        const value =
                            Math.max(
                                0,
                                Number(
                                    event.target.value
                                ) || 0
                            );

                        onLayoutChange?.({
                            bottomOffset: value
                        });

                    }}
                    className="
                        w-full
                        rounded-lg
                        border
                        border-gray-700
                        bg-gray-800
                        px-3
                        py-2
                        text-sm
                        text-white
                        outline-none
                        focus:border-blue-500
                    "
                />

                <span className="
                    text-xs
                    text-gray-500
                ">
                    mm
                </span>

            </div>

        </label>


        <label className="
            flex
            items-center
            gap-2
            text-sm
            text-gray-300
        ">

            <input
                type="checkbox"
                checked={
                    activeCabinet.bottomExists ??
                    true
                }
                onChange={(event) => {

                    onLayoutChange?.({
                        bottomExists:
                            event.target.checked
                    });

                }}
                className="
                    h-4
                    w-4
                    rounded
                    border-gray-700
                    bg-gray-800
                "
            />

            Boden vorhanden

        </label>

    </div>


    {/* Deckel */}

    <div className="
        mt-2
        rounded
        border
        border-gray-800
        bg-gray-900/50
        p-3
        space-y-3
    ">

        <label className="block">

            <span className="
                text-xs
                text-gray-400
            ">
                Deckelabstand
            </span>

            <div className="flex items-center gap-2">

                <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                        activeCabinet.topOffset ??
                        0
                    }
                    onChange={(event) => {

                        const value =
                            Math.max(
                                0,
                                Number(
                                    event.target.value
                                ) || 0
                            );

                        onLayoutChange?.({
                            topOffset: value
                        });

                    }}
                    className="
                        w-full
                        rounded-lg
                        border
                        border-gray-700
                        bg-gray-800
                        px-3
                        py-2
                        text-sm
                        text-white
                        outline-none
                        focus:border-blue-500
                    "
                />

                <span className="
                    text-xs
                    text-gray-500
                ">
                    mm
                </span>

            </div>

        </label>


        <label className="
            flex
            items-center
            gap-2
            text-sm
            text-gray-300
        ">

            <input
                type="checkbox"
                checked={
                    activeCabinet.topExists ??
                    true
                }
                onChange={(event) => {

                    onLayoutChange?.({
                        topExists:
                            event.target.checked
                    });

                }}
                className="
                    h-4
                    w-4
                    rounded
                    border-gray-700
                    bg-gray-800
                "
            />

            Deckel vorhanden

        </label>

    </div>

</section>

        </div>
    );
}