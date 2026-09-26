import React, { useState } from "react";

import PropertiesTabs from "./PropertiesTabs";
import SelectedElementProperties from "./SelectedElementProperties";
import FrontProperties from "./FrontProperties";
import SectionProperties from "./SectionProperties";
import SectionFunctionProperties from "./SectionFunctionProperties";
import CabinetProperties from "./CabinetProperties";


export default function PropertiesSidebar({

    // =========================================================
    // Auswahl
    // =========================================================

    selectedElement,
    setSelectedElement,


    // =========================================================
    // Korpus
    // =========================================================

    activeCabinet,
    updateActiveCabinet,


    // =========================================================
    // Ansicht
    // =========================================================

    viewMode,


    // =========================================================
    // Fronten
    // =========================================================

    frontSplitSpec,
    setFrontSplitSpec,

    frontSplitDirection,
    setFrontSplitDirection,

    splitFront,
    mergeFrontChildren,
    findFrontParent,

    generateFronts,


    // =========================================================
    // Sections
    // =========================================================

    sectionSplitSpec,
    setSectionSplitSpec,

    sectionSplitDirection,
    setSectionSplitDirection,

    splitSection,
    mergeSectionChildren,
    findParent,


    // =========================================================
    // Materialien
    // =========================================================

    materials,
    loadingMaterials,
    materialError,

    updateCabinetLayout

}) {

    // =========================================================
    // Aktiver Tab
    // =========================================================

    const [activeTab, setActiveTab] =
        useState("properties");


    return (

        <aside className="
            min-h-0
            overflow-y-auto
            border-l
            border-gray-700
            bg-gray-900
        ">

            <div className="p-3">

                {/* =================================================
                    Überschrift
                ================================================= */}
{/* 
                <h2 className="
                    text-lg
                    font-semibold
                ">
                    Eigenschaften
                </h2> */}


                {/* =================================================
                    Tabs
                ================================================= */}

                <div className="mt-2">

                    <PropertiesTabs
                        activeTab={
                            activeTab
                        }
                        setActiveTab={
                            setActiveTab
                        }
                    />

                </div>


                {/* =================================================
                    EIGENSCHAFTEN
                ================================================= */}

                {activeTab === "properties" && (

                    <>

                        {selectedElement ? (

                            <div className="
                                mt-6
                                space-y-6
                            ">

                                <SelectedElementProperties
                                    selectedElement={
                                        selectedElement
                                    }
                                />


                                {selectedElement.type ===
                                    "front" ? (

                                    <FrontProperties
                                        selectedElement={
                                            selectedElement
                                        }

                                        activeCabinet={
                                            activeCabinet
                                        }

                                        updateActiveCabinet={
                                            updateActiveCabinet
                                        }

                                        frontSplitSpec={
                                            frontSplitSpec
                                        }

                                        setFrontSplitSpec={
                                            setFrontSplitSpec
                                        }

                                        frontSplitDirection={
                                            frontSplitDirection
                                        }

                                        setFrontSplitDirection={
                                            setFrontSplitDirection
                                        }

                                        splitFront={
                                            splitFront
                                        }

                                        mergeFrontChildren={
                                            mergeFrontChildren
                                        }

                                        findFrontParent={
                                            findFrontParent
                                        }

                                        setSelectedElement={
                                            setSelectedElement
                                        }
                                    />

                                ) : selectedElement.type ===
                                    "section" ? (

                                    <SectionProperties
                                        selectedElement={
                                            selectedElement
                                        }

                                        activeCabinet={
                                            activeCabinet
                                        }

                                        sectionSplitSpec={
                                            sectionSplitSpec
                                        }

                                        setSectionSplitSpec={
                                            setSectionSplitSpec
                                        }

                                        sectionSplitDirection={
                                            sectionSplitDirection
                                        }

                                        setSectionSplitDirection={
                                            setSectionSplitDirection
                                        }

                                        splitSection={
                                            splitSection
                                        }

                                        mergeSectionChildren={
                                            mergeSectionChildren
                                        }

                                        findParent={
                                            findParent
                                        }

                                        updateActiveCabinet={
                                            updateActiveCabinet
                                        }

                                        setSelectedElement={
                                            setSelectedElement
                                        }
                                    />

                                ) : null}

                            </div>

                        ) : activeCabinet ? (

                            <>
                                {viewMode === "front" ? (

                                    <FrontProperties
                                        activeCabinet={
                                            activeCabinet
                                        }

                                        updateActiveCabinet={
                                            updateActiveCabinet
                                        }

                                        frontSplitSpec={
                                            frontSplitSpec
                                        }

                                        setFrontSplitSpec={
                                            setFrontSplitSpec
                                        }

                                        frontSplitDirection={
                                            frontSplitDirection
                                        }

                                        setFrontSplitDirection={
                                            setFrontSplitDirection
                                        }

                                        generateFronts={
                                            generateFronts
                                        }

                                        setSelectedElement={
                                            setSelectedElement
                                        }
                                    />

                                ) : (

                                    <CabinetProperties
                                        activeCabinet={activeCabinet}
                                        updateActiveCabinet={
                                            updateActiveCabinet
                                        }
                                        onLayoutChange={
                                            updateCabinetLayout
                                        }
                                        materials={materials}
                                        loadingMaterials={
                                            loadingMaterials
                                        }
                                        materialError={
                                            materialError
                                        }
                                    />

                                )}
                            </>

                        ) : (

                            <div className="
                                mt-6
                                text-sm
                                text-gray-500
                            ">
                                Kein Korpus ausgewählt.
                            </div>

                        )}

                    </>

                )}


                {/* =================================================
                    FUNKTION
                ================================================= */}

                {activeTab === "function" && (

                    <>

                        {selectedElement?.type === "section" ? (

                            <SectionFunctionProperties
                                selectedElement={
                                    selectedElement
                                }

                                activeCabinet={
                                    activeCabinet
                                }

                                updateActiveCabinet={
                                    updateActiveCabinet
                                }

                                setSelectedElement={
                                    setSelectedElement
                                }
                            />

                        ) : (

                            <div className="
                                mt-6
                                text-sm
                                text-gray-500
                            ">
                                Wähle eine Sektion aus,
                                um deren Funktion zu konfigurieren.
                            </div>

                        )}

                    </>

                )}

            </div>

        </aside>
    );
}