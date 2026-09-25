import React from "react";

import MaterialSelect from "./MaterialSelect";


export default function CabinetProperties({

    activeCabinet,
    updateActiveCabinet,

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

        </div>
    );
}