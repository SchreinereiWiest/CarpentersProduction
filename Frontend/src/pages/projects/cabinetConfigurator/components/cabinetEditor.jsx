import React, {
    useState,
    useEffect,
} from "react";

import CabinetViewport from "./cabinetViewport.jsx";
import ProjectBar from '../../../../components/projectBar.jsx';
import SideBar from '../../../../components/sideBar.jsx';
import { createSections } from "./view/createSections.js";
import { CabinetList } from "./view/cabinetList.view.jsx";
import { MaterialSelect } from "./view/materialSelect.view.jsx";

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

    const [sectionCount, setSectionCount] = useState(1);

    const [cabinets, setCabinets] = useState([
        {
            id: createId(),
            name: "Korpus 1",

            width: 600,
            height: 2000,
            depth: 580,
            thickness: 19,

            sections:
                createSections(
                    1,
                    {width: 600,
            height: 2000,
            depth: 580,

            thickness: 19}
                ),
            fronts: []
        }
    ]);

    const [activeCabinetId, setActiveCabinetId] = useState(cabinets[0].id);

    const activeCabinet = cabinets.find(
        cabinet =>
            cabinet.id === activeCabinetId
    );

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
    changes
) => {

    setCabinets(
        prev =>
            prev.map(
                cabinet =>
                    cabinet.id ===
                    activeCabinetId

                        ? {
                            ...cabinet,
                            ...changes
                        }

                        : cabinet
            )
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
                <aside className="flex h-full min-h-0 flex-col border-r border-gray-700 bg-gray-900">

                    {/* Cabinet List */}
                    <div className="shrink-0 border-t border-gray-700">

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

                            <button type="button" onClick={addCabinet} className="
                                flex
                                h-7
                                w-7
                                items-center
                                justify-center
                                rounded
                                bg-gray-800
                                border
                                border-gray-700
                                text-gray-300
                                hover:bg-gray-700
                            ">
                                +
                            </button>

                        </div>

                        <div className="min-h-[200px] max-h-[200px] shrink-0 overflow-y-auto px-2 pb-3">
                            <CabinetList cabinets={cabinets} activeCabinetId={activeCabinetId}
                                onSelect={selectCabinet} />
                        </div>

                        <label className="block px-3">

                            <span className="
        text-xs
        text-gray-400
    ">
                                Bezeichnung
                            </span>

                            <input type="text" value={ activeCabinet?.name ?? "" } onChange={(event)=> {

                            const name =
                            event.target.value;

                            setCabinets(
                            prev =>
                            prev.map(
                            cabinet =>
                            cabinet.id ===
                            activeCabinetId

                            ? {
                            ...cabinet,
                            name
                            }

                            : cabinet
                            )
                            );

                            }}

                            className="
                            mt-1
                            w-full
                            rounded
                            border
                            border-gray-700
                            bg-gray-800
                            px-3
                            py-2
                            text-sm
                            text-gray-100
                            outline-none
                            focus:border-blue-500
                            "
                            />

                        </label>

                        <div className="mt-4 space-y-3 px-3">

                            <label className="block">

                                <span className="text-xs text-neutral-400">
                                    Breite
                                </span>

                                <input type="number" value={activeCabinet.width} onChange={(event)=> {

                                setCabinets(
                                prev =>
                                prev.map(
                                cabinet =>
                                cabinet.id ===
                                activeCabinetId

                                ? {
                                ...cabinet,
                                width: Number(
                                event.target.value
                                )
                                }

                                : cabinet
                                )
                                );

                                }}

                                className="
                                mt-1
                                w-full
                                rounded
                                border
                                border-neutral-700
                                bg-gray-800
                                px-3
                                py-2
                                "
                                />

                            </label>

                            <label className="block">

                                <span className="text-xs text-neutral-400">
                                    Höhe
                                </span>

                                <input type="number" value={activeCabinet.height} onChange={(event)=> {

                                setCabinets(
                                prev =>
                                prev.map(
                                cabinet =>
                                cabinet.id ===
                                activeCabinetId

                                ? {
                                ...cabinet,
                                height: Number(
                                event.target.value
                                )
                                }

                                : cabinet
                                )
                                );

                                }}

                                className="
                                mt-1
                                w-full
                                rounded
                                border
                                border-neutral-700
                                bg-gray-800
                                px-3
                                py-2
                                "
                                />

                            </label>

                            <label className="block">

                                <span className="text-xs text-neutral-400">
                                    Tiefe
                                </span>

                                <input type="number" value={activeCabinet.depth} onChange={(event)=> {

                                setCabinets(
                                prev =>
                                prev.map(
                                cabinet =>
                                cabinet.id ===
                                activeCabinetId

                                ? {
                                ...cabinet,
                                depth:Number(event.target.value)
                                }

                                : cabinet
                                )
                                );

                                }}

                                className="
                                mt-1
                                w-full
                                rounded
                                border
                                border-neutral-700
                                bg-gray-800
                                px-3
                                py-2
                                "
                                />

                            </label>

                        </div>

                        <label className="block mt-8 px-3">

                            <span className="text-xs text-neutral-400">
                                Unterteilungen
                            </span>

                            <input type="number" min="1" max="20" value={sectionCount} onChange={(event)=> {
                            const count = Math.max(
                            1,
                            Math.min(
                            20,
                            Number(event.target.value)
                            )
                            );

                            setSectionCount(count);

                            updateActiveCabinet({
                            sections:
                            createSections(
                            count,
                            activeCabinet
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
                            py-2
                            "
                            />

                        </label>

                    </div>

                    <div className="mt-6 border-t border-gray-700 pt-4 px-3">

                        <button type="button" onClick={deleteCabinet} disabled={cabinets.length <=1} className="
                                w-full
                                rounded
                                border border-red-800
                                px-3 py-2
                                text-sm
                                text-red-400
                                hover:bg-red-950
                                disabled:cursor-not-allowed
                                disabled:opacity-30
                            ">
                            Korpus löschen
                        </button>

                    </div>

                </aside>

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

                        <CabinetViewport cabinet={activeCabinet} mode="interior" onSelect={setSelectedElement}
                            selectedElement={selectedElement} />

                    </div>

                </main>

               {/* RECHTS */}

<aside
    className="
        min-h-0
        border-l
        border-gray-700
        bg-gray-900
        overflow-y-auto
    "
>

    <div className="p-5">

        <h2 className="text-lg font-semibold">
            Eigenschaften
        </h2>


        {/* ================================================= */}
        {/* ELEMENT AUSGEWÄHLT */}
        {/* ================================================= */}

        {selectedElement ? (

            <div className="mt-6 space-y-6">

                <section>

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                    ">
                        Auswahl
                    </div>

                    <div className="mt-2 text-base">

                        {selectedElement.id}

                    </div>

                    <div className="text-sm text-gray-500">

                        {selectedElement.type}

                    </div>

                </section>


                <section>

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                    ">
                        Position
                    </div>

                    <div className="
                        mt-3
                        grid
                        grid-cols-2
                        gap-3
                    ">

                        <label>

                            <span className="text-xs text-gray-400">
                                X
                            </span>

                            <input
                                type="number"
                                value={
                                    selectedElement.x ?? ""
                                }
                                readOnly
                                className="
                                    mt-1
                                    w-full
                                    rounded
                                    border
                                    border-gray-700
                                    bg-gray-800
                                    px-3
                                    py-2
                                "
                            />

                        </label>


                        <label>

                            <span className="text-xs text-gray-400">
                                Y
                            </span>

                            <input
                                type="number"
                                value={
                                    selectedElement.y ?? ""
                                }
                                readOnly
                                className="
                                    mt-1
                                    w-full
                                    rounded
                                    border
                                    border-gray-700
                                    bg-gray-800
                                    px-3
                                    py-2
                                "
                            />

                        </label>

                    </div>

                </section>

            </div>


        ) : activeCabinet ? (

            /* ================================================= */
            /* KEIN ELEMENT -> AKTIVER KORPUS */
            /* ================================================= */

            <div className="mt-6 space-y-6">


                {/* KORPUS */}

                <section>

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                    ">
                        Korpus
                    </div>

                    <div className="mt-2 text-base">
                        {activeCabinet.name}
                    </div>

                </section>


                {/* MATERIAL */}

                <section>

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                        mb-3
                    ">
                        Materialien
                    </div>


                    <div className="space-y-4">


                        <MaterialSelect
                            label="Korpusmaterial"
                            value={
                                activeCabinet.materialId
                            }
                            materials={materials}
                            loading={loadingMaterials}
                            error={materialError}
                            onChange={(value) =>
                                updateActiveCabinet({
                                    materialId: value
                                })
                            }
                        />


                        <MaterialSelect
                            label="Kante oben"
                            value={
                                activeCabinet.edgeTopMaterialId
                            }
                            materials={materials}
                            loading={loadingMaterials}
                            error={materialError}
                            onChange={(value) =>
                                updateActiveCabinet({
                                    edgeTopMaterialId: value
                                })
                            }
                        />


                        <MaterialSelect
                            label="Kante unten"
                            value={
                                activeCabinet.edgeBottomMaterialId
                            }
                            materials={materials}
                            loading={loadingMaterials}
                            error={materialError}
                            onChange={(value) =>
                                updateActiveCabinet({
                                    edgeBottomMaterialId: value
                                })
                            }
                        />


                        <MaterialSelect
                            label="Frontkante"
                            value={
                                activeCabinet.frontEdgeMaterialId
                            }
                            materials={materials}
                            loading={loadingMaterials}
                            error={materialError}
                            onChange={(value) =>
                                updateActiveCabinet({
                                    frontEdgeMaterialId: value
                                })
                            }
                        />

                    </div>

                </section>


                {/* OPTIONAL: INFORMATION */}

                <section className="
                    border-t
                    border-gray-800
                    pt-4
                ">

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                    ">
                        Abmessungen
                    </div>

                    <div className="
                        mt-3
                        grid
                        grid-cols-3
                        gap-2
                        text-sm
                    ">

                        <div>

                            <div className="text-xs text-gray-500">
                                Breite
                            </div>

                            <div className="mt-1">
                                {activeCabinet.width} mm
                            </div>

                        </div>


                        <div>

                            <div className="text-xs text-gray-500">
                                Höhe
                            </div>

                            <div className="mt-1">
                                {activeCabinet.height} mm
                            </div>

                        </div>


                        <div>

                            <div className="text-xs text-gray-500">
                                Tiefe
                            </div>

                            <div className="mt-1">
                                {activeCabinet.depth} mm
                            </div>

                        </div>

                    </div>

                </section>


            </div>


        ) : (

            <div className="mt-6 text-sm text-gray-500">

                Kein Korpus ausgewählt.

            </div>

        )}

    </div>

</aside>

            </div>

        </div>

    </main>

</div>


    );


}