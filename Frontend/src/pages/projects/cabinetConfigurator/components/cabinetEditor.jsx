import React, {
    useState,
    useEffect,
} from "react";

import CabinetViewport from "./cabinetViewport.jsx";
import ProjectBar from '../../../../components/projectBar.jsx';
import SideBar from '../../../../components/sideBar.jsx';
import { createSections } from "../engine/sektions/interior/createSections.js";
import { MaterialSelect } from "./view/materialSelect.view.jsx";
import { createInitialSections } from "../engine/sektions/interior/createInitialSections.js"
import { generateFronts } from "../engine/sektions/front/generateFronts.js"
import { splitFront } from "../engine/sektions/front/splitFront.js";
import { splitSection } from "../engine/sektions/splitSections.js";
import { mergeSectionChildren, findSection, findParent } from "../engine/sektions/mergeSectionChildren.js";
import { frontsToSections } from "../engine/parseFrontSections.js";
import { findFrontParent, mergeFrontChildren } from "../engine/sektions/mergeFrontChildren.js";
import CabinetSidebar from "./editor/CabinetSidebar.jsx";
import PropertiesSidebar from "./editor/PropertiesSidebar";

import axios from "axios";

export function createId() {
        return Date.now() + Math.random();
    }

export default function CabinetEditor() {

    const [
    materials,
    setMaterials
    ] = useState([]);

    const [
        loadingMaterials,
        setLoadingMaterials
    ] = useState(false);

    const [
        materialError,
        setMaterialError
    ] = useState(null);


    useEffect(() => {

        const loadMaterials =
            async () => {

            try {

                setLoadingMaterials(true);

                const response =
                    await axios.get(
                        "/api/materials/get"
                    );

                setMaterials(
                    response.data.materials
                );

            } catch (error) {

                console.error(
                    "Materialien konnten nicht geladen werden:",
                    error
                );

                setMaterialError(
                    "Materialien konnten nicht geladen werden."
                );

            } finally {

                setLoadingMaterials(false);

            }

        };

        loadMaterials();

    }, []);

    const [viewMode, setViewMode] = useState("interior");

    const [sectionCount, setSectionCount] = useState(1);

    const [cabinets, setCabinets] = useState([
        {
            id: createId(),
            name: "Korpus 1",

            width: 600,
            height: 2000,
            depth: 580,
            thickness: 19,

            sections: [],
                
            fronts: []
        }
    ]);

    const [activeCabinetId, setActiveCabinetId] = useState(cabinets[0].id);

    const activeCabinet = cabinets.find(
        cabinet =>
            cabinet.id === activeCabinetId
    );

    const [frontSplitSpec, setFrontSplitSpec] = useState("1:145mm");
    const [frontSplitDirection, setFrontSplitDirection] = useState("vertical");

    const [sectionSplitSpec, setSectionSplitSpec] = useState("1:1");
    const [sectionSplitDirection, setSectionSplitDirection] = useState("vertical");

    const addCabinet = () => {

    const newCabinet = {

        id:
            createId(),

        name:
            `Korpus ${cabinets.length + 1}`,

        width: 600,
        height: 2000,
        depth: 580,

        thickness: 19,

        backPanel: {
        construction: "butt",
        continuous: "side"
    },

        sections:
            createSections(
                1,
                {width: 600,
        height: 2000,
        depth: 580,

        thickness: 19}
            ),
        fronts: []
    };


    setCabinets(
        prev => [
            ...prev,
            newCabinet
        ]

    );

    selectCabinet(newCabinet.id);
    };

    const [selectedElement, setSelectedElement] = useState(null);

   const updateActiveCabinet = (
    changesOrUpdater
) => {

    setCabinets(prev =>

        prev.map(cabinet => {

            if (
                cabinet.id !== activeCabinetId
            ) {
                return cabinet;
            }


            const changes =
                typeof changesOrUpdater === "function"
                    ? changesOrUpdater(cabinet)
                    : changesOrUpdater;


            return {
                ...cabinet,
                ...changes
            };
        })
    );
};

    const selectCabinet = (id) => {
        console.log(id);

        setActiveCabinetId(id);

        const cabinet = cabinets.find(cabinet => cabinet.id === id);

        setSectionCount(cabinet?.sections?.length ?? 1);

        console.log(cabinet?.sections);

        setSelectedElement(null);
    };

    const deleteCabinet = () => {

        if (cabinets.length <= 1) {
            return;
        }

        const index = cabinets.findIndex(
            cabinet => cabinet.id === activeCabinetId
        );

        const remainingCabinets = cabinets.filter(
            cabinet => cabinet.id !== activeCabinetId
        );

        setCabinets(remainingCabinets);

        // nächsten Korpus auswählen
        const newIndex = Math.min(index, remainingCabinets.length - 1);
        const newActiveCabinet = remainingCabinets[newIndex];

        setActiveCabinetId(newActiveCabinet.id);
        setSelectedElement(null);
        setSectionCount(newActiveCabinet.sections?.length ?? 1);
    };

    const toggleViewMode = () => {

    setViewMode(prev =>
        prev === "interior"
            ? "front"
            : "interior"
    );

    setSelectedElement(null);

    console.log(cabinets);
    };

    const createSectionsFromFronts = () => {

    if (!activeCabinet) {
        return;
    }

    const newSections =
        frontsToSections(
            activeCabinet.fronts ?? [],
            activeCabinet
        );

    updateActiveCabinet({
        sections: newSections
    });

    setSelectedElement(null);
    };


    return (
        <div className="bg-gray-900 text-white h-screen flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <div className="shrink-0 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={2} />
        </div>

        <div className="flex-1 min-h-0">

            <div className="
                grid
                h-full
                min-h-0
                grid-cols-[260px_1fr_660px]
            ">

                {/* LINKS */}
                <CabinetSidebar
                    cabinets={cabinets}
                    activeCabinetId={activeCabinetId}
                    activeCabinet={activeCabinet}

                    addCabinet={addCabinet}
                    selectCabinet={selectCabinet}
                    deleteCabinet={deleteCabinet}

                    updateActiveCabinet={updateActiveCabinet}

                    sectionSplitSpec={sectionSplitSpec}
                    setSectionSplitSpec={setSectionSplitSpec}

                    sectionSplitDirection={sectionSplitDirection}
                    setSectionSplitDirection={setSectionSplitDirection}

                    createInitialSections={createInitialSections}
                    setSectionCount={setSectionCount}

                    setSelectedElement={setSelectedElement}
                />

                {/* MITTE */}
                <main className="
        min-w-0
        min-h-0
        flex
        flex-col
        bg-gray-900
    ">

                    {/* ====================================
                    TOOLBAR
                    ==================================== */}

                    <div className="
            h-14
            shrink-0
            border-b
            border-gray-700
            bg-gray-900
            flex
            items-center
            gap-2
            px-3
        ">

                        <button type="button" className="
                rounded
                bg-gray-800
                border
                border-gray-700
                px-3
                py-2
                text-sm
                hover:bg-gray-700
            ">
                            + Fachboden
                        </button>

                        <button type="button" className="
                rounded
                bg-gray-800
                border
                border-gray-700
                px-3
                py-2
                text-sm
                hover:bg-gray-700
            ">
                            + Lochreihe
                        </button>

                        <button type="button" className="
                rounded
                bg-gray-800
                border
                border-gray-700
                px-3
                py-2
                text-sm
                hover:bg-gray-700
            ">
                            + Legrabox
                        </button>

                        <button type="button" className="
                rounded
                bg-gray-800
                border
                border-gray-700
                px-3
                py-2
                text-sm
                hover:bg-gray-700
            ">
                            + Trennwand
                        </button>

                        <div className="mx-2 h-6 w-px bg-gray-700" />

                        <button
                            type="button"
                            onClick={toggleViewMode}
                            className={`
                                rounded
                                border
                                px-3
                                py-2
                                text-sm
                                transition

                                ${
                                    viewMode === "front"
                                        ? "border-green-700 bg-green-900 text-green-300 hover:bg-green-800"
                                        : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                                }
                            `}
                        >
                            Fronten
                        </button>

                        <button type="button" className="
                rounded
                bg-gray-800
                border
                border-gray-700
                px-3
                py-2
                text-sm
                hover:bg-gray-700
            ">
                            Maße
                        </button>

                    </div>

                    {/* ====================================
                    VIEWPORT
                    ==================================== */}

                    <div className="
            flex-1
            min-h-0
        ">

                        <div className="relative h-full w-full overflow-hidden">

                            <CabinetViewport
                                cabinet={activeCabinet}
                                mode={viewMode}
                                selectedElement={selectedElement}
                                onSelect={setSelectedElement}
                                showGrid={false}
                            />


                            {/* Floating Controls */}
                            <div
                                className="
                                    absolute
                                    right-3
                                    top-3
                                    z-20
                                "
                            >

                                <div className="flex flex-col gap-2">

                                    <button
                                        type="button"
                                        onClick={createSectionsFromFronts}
                                        className="
                                            rounded
                                            border
                                            border-gray-700
                                            bg-gray-800/90
                                            px-3
                                            py-2
                                            text-sm
                                            text-gray-200
                                            shadow-lg
                                            backdrop-blur
                                            hover:bg-gray-700
                                        "
                                    >
                                        ParseFront
                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                </main>

                {/* RECHTS */}
                <PropertiesSidebar
    selectedElement={selectedElement}
    setSelectedElement={setSelectedElement}

    activeCabinet={activeCabinet}
    updateActiveCabinet={updateActiveCabinet}

    viewMode={viewMode}

    frontSplitSpec={frontSplitSpec}
    setFrontSplitSpec={setFrontSplitSpec}

    frontSplitDirection={frontSplitDirection}
    setFrontSplitDirection={
        setFrontSplitDirection
    }

    splitFront={splitFront}
    mergeFrontChildren={
        mergeFrontChildren
    }
    findFrontParent={
        findFrontParent
    }

    generateFronts={generateFronts}

    sectionSplitSpec={sectionSplitSpec}
    setSectionSplitSpec={
        setSectionSplitSpec
    }

    sectionSplitDirection={
        sectionSplitDirection
    }
    setSectionSplitDirection={
        setSectionSplitDirection
    }

    splitSection={splitSection}
    mergeSectionChildren={
        mergeSectionChildren
    }
    findParent={findParent}

    materials={materials}
    loadingMaterials={
        loadingMaterials
    }
    materialError={materialError}
/>

            </div>

        </div>

    </main>

</div>


    );


}