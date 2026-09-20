import React, {
    useState,
    useEffect,
} from "react";

import CabinetViewport from "./cabinetViewport.jsx";
import ProjectBar from '../../../../components/projectBar.jsx';
import SideBar from '../../../../components/sideBar.jsx';
import { createSections } from "../engine/sektions/interior/createSections.js";
import { CabinetList } from "./view/cabinetList.view.jsx";
import { MaterialSelect } from "./view/materialSelect.view.jsx";
import { createInitialSections } from "../engine/sektions/interior/createInitialSections.js"
import { generateFronts } from "../engine/sektions/front/generateFronts.js"
import { splitFront } from "../engine/sektions/front/splitFront.js";
import { splitSection } from "../engine/sektions/splitSections.js";
import {updateSelectedGeometry} from "../engine/sektions/geometryChange/updateSelectedGeometry.js"

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

    const toggleViewMode = () => {

    setViewMode(prev =>
        prev === "interior"
            ? "front"
            : "interior"
    );

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
                                py-1
                                "
                                />

                            </label>

                        </div>

                        <section className="mt-6 px-3">

                            <div className="
                                text-xs
                                uppercase
                                tracking-wide
                                text-gray-500
                            ">
                                Unterteilungen
                            </div>


                            <div className="mt-3 space-y-3">

                                <input
                                    type="text"
                                    value={sectionSplitSpec}
                                    onChange={(e) =>
                                        setSectionSplitSpec(
                                            e.target.value
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
                                                sectionSplitDirection === "vertical"
                                                    ? "border-blue-600 bg-blue-900 text-blue-200"
                                                    : "border-gray-700 bg-gray-800 text-gray-400"
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
                                                sectionSplitDirection === "horizontal"
                                                    ? "border-blue-600 bg-blue-900 text-blue-200"
                                                    : "border-gray-700 bg-gray-800 text-gray-400"
                                            }
                                        `}
                                    >
                                        Horizontal
                                    </button>

                                </div>


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

                        <CabinetViewport cabinet={activeCabinet} mode={viewMode} onSelect={setSelectedElement}
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

        {/* ============================================= */}
        {/* AUSWAHL */}
        {/* ============================================= */}

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
                {selectedElement.name ??
                    selectedElement.id}
            </div>

            <div className="text-sm text-gray-500">
                {selectedElement.type}
            </div>

        </section>


        {/* ============================================= */}
        {/* POSITION / GRÖSSE */}
        {/* ============================================= */}

        <section>

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
        grid-cols-2
        gap-3
    ">

        {/* X */}
        <label>

            <span className="text-xs text-gray-400">
                X
            </span>

            <input
                type="number"
                value={
                    selectedElement.x ?? ""
                }
                onChange={(e) =>
                    updateSelectedGeometry(
                        "x",
                        e.target.value,
                        selectedElement,
                        activeCabinet,
                        updateActiveCabinet,
                        setSelectedElement
                    )
                }
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


        {/* Y */}
        <label>

            <span className="text-xs text-gray-400">
                Y
            </span>

            <input
                type="number"
                value={
                    selectedElement.y ?? ""
                }
                onChange={(e) =>
                    updateSelectedGeometry(
                        "y",
                        e.target.value,
                        selectedElement,
                        activeCabinet,
                        updateActiveCabinet,
                        setSelectedElement
                    )
                }
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


        {/* Breite */}
        <label>

            <span className="text-xs text-gray-400">
                Breite
            </span>

            <input
                type="number"
                value={
                    selectedElement.width ?? ""
                }
                onChange={(e) =>
                    updateSelectedGeometry(
                        "width",
                        e.target.value,
                        selectedElement,
                        activeCabinet,
                        updateActiveCabinet,
                        setSelectedElement
                    )
                }
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


        {/* Höhe */}
        <label>

            <span className="text-xs text-gray-400">
                Höhe
            </span>

            <input
                type="number"
                value={
                    selectedElement.height ?? ""
                }
                onChange={(e) =>
                    updateSelectedGeometry(
                        "height",
                        e.target.value,
                        selectedElement,
                        activeCabinet,
                        updateActiveCabinet,
                        setSelectedElement
                    )
                }
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


        {/* ============================================= */}
        {/* FRONT UNTERTEILEN */}
        {/* ============================================= */}

        {selectedElement.type === "front" ? (

            <section>

                <div className="
                    text-xs
                    uppercase
                    tracking-wide
                    text-gray-500
                ">
                    Front unterteilen
                </div>


                <div className="mt-4 space-y-4">

                    {/* Aufteilung */}

                    <label className="block">

                        <span className="text-xs text-gray-400">
                            Aufteilung
                        </span>

                        <input
                            type="text"
                            value={frontSplitSpec}
                            onChange={(e) =>
                                setFrontSplitSpec(
                                    e.target.value
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


                    {/* Richtung */}

                    <div>

                        <div className="text-xs text-gray-400">
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
                                    setFrontSplitDirection(
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
                                        frontSplitDirection ===
                                        "vertical"
                                            ? "border-blue-600 bg-blue-900 text-blue-200"
                                            : "border-gray-700 bg-gray-800 text-gray-400"
                                    }
                                `}
                            >
                                Vertikal
                            </button>


                            <button
                                type="button"
                                onClick={() =>
                                    setFrontSplitDirection(
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
                                        frontSplitDirection ===
                                        "horizontal"
                                            ? "border-blue-600 bg-blue-900 text-blue-200"
                                            : "border-gray-700 bg-gray-800 text-gray-400"
                                    }
                                `}
                            >
                                Horizontal
                            </button>

                        </div>

                    </div>


                    {/* Fuge */}

                    <label className="block">

                        <span className="text-xs text-gray-400">
                            Fuge
                        </span>

                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={
                                activeCabinet.frontGap ??
                                3
                            }
                            onChange={(e) =>
                                updateActiveCabinet({
                                    frontGap:
                                        Number(
                                            e.target.value
                                        )
                                })
                            }
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
                            "
                        />

                    </label>


                    {/* Unterteilen */}

                    <button
                        type="button"
                        onClick={() =>
                            splitFront(
                                selectedElement.id,
                                frontSplitSpec,
                                frontSplitDirection,
                                activeCabinet,
                                updateActiveCabinet,
                                setSelectedElement
                            )
                        }
                        className="
                            w-full
                            rounded
                            bg-gray-800
                            border
                            border-gray-700
                            px-3
                            py-2
                            text-sm
                            hover:bg-gray-700
                        "
                    >
                        Front unterteilen
                    </button>

                </div>

            </section>

        ) : selectedElement.type === "section" && (

    <section>

        <div className="
            text-xs
            uppercase
            tracking-wide
            text-gray-500
        ">
            Sektion unterteilen
        </div>


        <div className="mt-4 space-y-4">

            <label className="block">

                <span className="text-xs text-gray-400">
                    Aufteilung
                </span>

                <input
                    type="text"
                    value={sectionSplitSpec}
                    onChange={(e) =>
                        setSectionSplitSpec(
                            e.target.value
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


            <div>

                <div className="text-xs text-gray-400">
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
                                    ? "border-blue-600 bg-blue-900 text-blue-200"
                                    : "border-gray-700 bg-gray-800 text-gray-400"
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
                                    ? "border-blue-600 bg-blue-900 text-blue-200"
                                    : "border-gray-700 bg-gray-800 text-gray-400"
                            }
                        `}
                    >
                        Horizontal
                    </button>

                </div>

            </div>


            <button
                type="button"
                onClick={() =>
                    splitSection(
                        selectedElement.id,
                        sectionSplitSpec,
                        sectionSplitDirection,
                        activeCabinet,
                        updateActiveCabinet,
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
                Sektion unterteilen
            </button>

        </div>

    </section>

)}

    </div>

) : activeCabinet ? (

                            /* ================================================= */
                            /* KEIN ELEMENT -> AKTIVER KORPUS */
                            /* ================================================= */
                            viewMode==="front" ? (
                                <section>

                                    <div className="
                                        text-xs
                                        uppercase
                                        tracking-wide
                                        text-gray-500
                                    ">
                                        Frontaufteilung
                                    </div>


                                    <div className="mt-4 space-y-4">

                                        <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Aufteilung
                                            </span>

                                            <input
                                                type="text"
                                                value={frontSplitSpec}
                                                onChange={(e) =>
                                                    setFrontSplitSpec(e.target.value)
                                                }
                                                placeholder="1:145mm:300mm"
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


                                        <div>

                                            <div className="text-xs text-gray-400">
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
                                                        setFrontSplitDirection("vertical")
                                                    }
                                                    className={`
                                                        rounded
                                                        border
                                                        px-3
                                                        py-2
                                                        text-sm
                                                        ${
                                                            frontSplitDirection === "vertical"
                                                                ? "border-blue-600 bg-blue-900 text-blue-200"
                                                                : "border-gray-700 bg-gray-800 text-gray-400"
                                                        }
                                                    `}
                                                >
                                                    Vertikal
                                                </button>


                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFrontSplitDirection("horizontal")
                                                    }
                                                    className={`
                                                        rounded
                                                        border
                                                        px-3
                                                        py-2
                                                        text-sm
                                                        ${
                                                            frontSplitDirection === "horizontal"
                                                                ? "border-blue-600 bg-blue-900 text-blue-200"
                                                                : "border-gray-700 bg-gray-800 text-gray-400"
                                                        }
                                                    `}
                                                >
                                                    Horizontal
                                                </button>

                                            </div>

                                        </div>


                                        <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Fuge
                                            </span>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={activeCabinet.frontGap ?? 3}
                                                onChange={(e) =>
                                                    updateActiveCabinet({
                                                        frontGap:
                                                            Number(e.target.value)
                                                    })
                                                }
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
                                                "
                                            />

                                        </label>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                generateFronts(
                                                    frontSplitSpec,
                                                    frontSplitDirection,
                                                    activeCabinet,
                                                    updateActiveCabinet,
                                                    setSelectedElement
                                                )
                                            }
                                            className="
                                                w-full
                                                rounded
                                                bg-gray-800
                                                border
                                                border-gray-700
                                                px-3
                                                py-2
                                                text-sm
                                                hover:bg-gray-700
                                            "
                                        >
                                            Fronten erzeugen
                                        </button>

                                    </div>

                                </section>
                            ) :
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