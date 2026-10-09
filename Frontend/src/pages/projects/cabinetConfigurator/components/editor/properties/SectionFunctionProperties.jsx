import React, { useState } from "react";
import { updateSectionTree } from "../../../engine/sektions/updateSectionTree";
import { findSection } from "../../../engine/sektions/interior/mergeSectionChildren";

const DRAWER_DEPTHS = [
    270,
    300,
    350,
    400,
    450,
    500,
    550,
    600
];

export function createId() {
    return Date.now() + Math.random();
}

const getDefaultDrawerDepth = (cabinetDepth) => {
    const depth = Number(cabinetDepth);

    const available = DRAWER_DEPTHS.filter(
        value => value <= depth
    );

    if (available.length > 0) {
        return available[available.length - 1];
    }

    return DRAWER_DEPTHS[0];
};



/*
 * ------------------------------------------------------------
 * Funktionsnamen
 * ------------------------------------------------------------
 */

const getFunctionLabel = (type) => {

    switch (type) {

        case "shelf":
            return "Einlegeböden + Lochreihe";

        case "middleWall":
            return "Mittelwand";

        case "legrabox":
            return "Legrabox";

        default:
            return type;
    }
};


export default function SectionFunctionProperties({
    selectedElement,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement
}) {

    const [newFunctionType, setNewFunctionType] = useState("");


    /*
     * ------------------------------------------------------------
     * Keine Sektion ausgewählt
     * ------------------------------------------------------------
     */

    if (
        !selectedElement ||
        selectedElement.type !== "section" ||
        !activeCabinet
    ) {

        return (
            <div className="mt-6 text-sm text-gray-500">
                Bitte eine Sektion auswählen.
            </div>
        );
    }


    /*
     * ------------------------------------------------------------
     * Aktuelle Sektion
     * ------------------------------------------------------------
     */

    const currentSection = findSection(
        activeCabinet.sections ?? [],
        selectedElement.id
    );

    if (!currentSection) {

        return (
            <div className="mt-6 text-sm text-red-400">
                Sektion konnte nicht gefunden werden.
            </div>
        );
    }


    /*
     * ------------------------------------------------------------
     * Funktionen
     * ------------------------------------------------------------
     */

    const functions = currentSection.functionConfig ?? [];



    /*
     * ------------------------------------------------------------
     * Section aktualisieren
     * ------------------------------------------------------------
     */

    const updateSection = (changes) => {

        const newSections = updateSectionTree(
            activeCabinet.sections ?? [],
            selectedElement.id,
            section => ({
                ...section,
                ...changes
            })
        );

        updateActiveCabinet({
            sections: newSections
        });

        const updatedSection = findSection(
            newSections,
            selectedElement.id
        );

        if (updatedSection) {

            setSelectedElement({
                ...updatedSection,
                type: "section"
            });
        }
    };


    /*
     * ------------------------------------------------------------
     * FunctionType für Legacy-Kompatibilität
     * ------------------------------------------------------------
     *
     * none     = keine Funktion
     * shelf    = genau eine Funktion
     * multiple = mehrere Funktionen
     */
    const getSectionFunctionType = (functionList) => {

        if (functionList.length === 0) {
            return "none";
        }

        if (functionList.length === 1) {
            return functionList[0].type;
        }

        return "multiple";
    };


    /*
     * ------------------------------------------------------------
     * Neue Funktion erstellen
     * ------------------------------------------------------------
     */

    const createDefaultFunction = (type) => {

        const cabinetDepth =
            Number(activeCabinet?.depth ?? 0);


        switch (type) {

            case "shelf":

                return {
                    id: createId(),

                    type: "shelf",

                    compartmentCount: 2,

                    shelfFrontOffset: 0,

                    holeRow: {
                        spacing: 32,
                        frontOffset: 37,
                        backOffset: 37,
                        startFromBottom: 150,
                        endFromTop: 150
                    }
                };


            case "middleWall":

                return {
                    id: createId(),

                    type: "middleWall",

                    orientation: "horizontal",

                    /*
                     * Intern weiterhin vorhanden.
                     * Wird nicht mehr als Auswahl angezeigt.
                     */
                    positionReference: "sectionBottom",

                    positionOffset: 0,

                    absoluteOffset: 0
                };


            case "legrabox":

                return {
                    id: createId(),

                    type: "legrabox",

                    variant: "M",
                    materialColor: "white",

                    drawerDepth:
                        getDefaultDrawerDepth(cabinetDepth),

                    positionFromBottom: 40,

                    doubling: {
                        left: false,
                        right: false,
                        thickness: 0,
                        insideRightOffset: 0
                    }
                };


            default:
                return null;
        }
    };


    /*
     * ------------------------------------------------------------
     * Funktion hinzufügen
     * ------------------------------------------------------------
     */

    const addFunction = (type) => {

        if (!type || type === "none") {
            return;
        }

        const newFunction =
            createDefaultFunction(type);

        if (!newFunction) {
            return;
        }

        const newFunctions = [
            ...functions,
            newFunction
        ];

        updateSection({
            functionType:
                getSectionFunctionType(newFunctions),

            functionConfig:
                newFunctions
        });

        /*
         * Dropdown wieder zurücksetzen
         */
        setNewFunctionType("");
    };


    /*
     * ------------------------------------------------------------
     * Funktion löschen
     * ------------------------------------------------------------
     */

    const removeFunction = (functionId) => {

        const newFunctions = functions.filter(
            func => func.id !== functionId
        );

        updateSection({
            functionType:
                getSectionFunctionType(newFunctions),

            functionConfig:
                newFunctions
        });
    };


    /*
     * ------------------------------------------------------------
     * Allgemeine Funktion aktualisieren
     * ------------------------------------------------------------
     */

    const updateFunction = (functionId, changes) => {

        const newFunctions = functions.map(func => {

            if (func.id !== functionId) {
                return func;
            }

            const nextChanges =
                typeof changes === "function"
                    ? changes(func)
                    : changes;

            return {
                ...func,
                ...nextChanges
            };
        });

        updateSection({
            functionType:
                getSectionFunctionType(newFunctions),

            functionConfig:
                newFunctions
        });
    };


    /*
     * ------------------------------------------------------------
     * Nested Config aktualisieren
     * ------------------------------------------------------------
     */

    const updateFunctionNested = (
        functionId,
        key,
        changes
    ) => {

        updateFunction(
            functionId,
            func => {

                const currentValue =
                    func[key] ?? {};

                const newValue =
                    typeof changes === "function"
                        ? changes(currentValue)
                        : {
                            ...currentValue,
                            ...changes
                        };

                return {
                    [key]: newValue
                };
            }
        );
    };


    /*
     * ------------------------------------------------------------
     * Mittelwand
     * ------------------------------------------------------------
     */

    const getMiddleWallCenter = (wall) => {

        const orientation =
            wall.orientation ?? "horizontal";

        const offset =
            Number(wall.positionOffset ?? 0);

        const sectionX =
            Number(selectedElement.x);

        const sectionY =
            Number(selectedElement.y);

        const sectionWidth =
            Number(selectedElement.width);

        const sectionHeight =
            Number(selectedElement.height);

        const cabinetWidth =
            Number(activeCabinet.width);

        const cabinetHeight =
            Number(activeCabinet.height);


        if (orientation === "vertical") {

            switch (wall.positionReference) {

                case "cabinetLeft":
                    return offset;

                case "cabinetRight":
                    return cabinetWidth - offset;

                case "sectionLeft":
                    return sectionX + offset;

                case "sectionRight":
                    return sectionX + sectionWidth - offset;

                default:
                    return (
                        sectionX +
                        sectionWidth / 2
                    );
            }
        }


        switch (wall.positionReference) {

            case "cabinetTop":
                return offset;

            case "cabinetBottom":
                return cabinetHeight - offset;

            case "sectionTop":
                return sectionY + offset;

            case "sectionBottom":
                return (
                    sectionY +
                    sectionHeight -
                    offset
                );

            default:
                return (
                    sectionY +
                    sectionHeight / 2
                );
        }
    };


    const getMiddleWallOffset = (
        wall,
        reference
    ) => {

        const orientation =
            wall.orientation ?? "horizontal";

        const center =
            getMiddleWallCenter(wall);

        const sectionX =
            Number(selectedElement.x);

        const sectionY =
            Number(selectedElement.y);

        const sectionWidth =
            Number(selectedElement.width);

        const sectionHeight =
            Number(selectedElement.height);

        const cabinetWidth =
            Number(activeCabinet.width);

        const cabinetHeight =
            Number(activeCabinet.height);


        if (orientation === "vertical") {

            switch (reference) {

                case "cabinetLeft":
                    return center;

                case "cabinetRight":
                    return cabinetWidth - center;

                case "sectionLeft":
                    return center - sectionX;

                case "sectionRight":
                    return (
                        sectionX +
                        sectionWidth -
                        center
                    );

                default:
                    return center;
            }
        }


        switch (reference) {

            case "cabinetTop":
                return center;

            case "cabinetBottom":
                return cabinetHeight - center;

            case "sectionTop":
                return center - sectionY;

            case "sectionBottom":
                return (
                    sectionY +
                    sectionHeight -
                    center
                );

            default:
                return center;
        }
    };


    /*
     * Beim Ändern eines der vier Felder wird automatisch
     * dieser Bezug aktiv.
     */
    const setMiddleWallPosition = (
        functionId,
        wall,
        reference,
        value
    ) => {

        const numericValue =
            Number(value);

        if (
            !Number.isFinite(numericValue) ||
            numericValue < 0
        ) {
            return;
        }

        updateFunction(
            functionId,
            {
                positionReference: reference,

                positionOffset: numericValue,

                absoluteOffset:
                    getMiddleWallOffset(
                        {
                            ...wall,
                            positionReference: reference,
                            positionOffset: numericValue
                        },
                        reference
                    )
            }
        );
    };


    /*
     * ------------------------------------------------------------
     * Legrabox
     * ------------------------------------------------------------
     */

    const updateLegrabox = (
        functionId,
        changes
    ) => {

        updateFunction(
            functionId,
            changes
        );
    };


    const updateLegraboxDoubling = (
        functionId,
        changes
    ) => {

        updateFunctionNested(
            functionId,
            "doubling",
            changes
        );
    };


    /*
     * ------------------------------------------------------------
     * Render
     * ------------------------------------------------------------
     */

    return (
        <div className="mt-6 space-y-6">

            {/* ==================================================
                FUNKTION HINZUFÜGEN
                ================================================== */}

            <section>

                <div className="text-xs uppercase tracking-wide text-gray-500">
                    Funktion hinzufügen
                </div>

                <select
                    value={newFunctionType}
                    onChange={(event) => {
                        const type =
                            event.target.value;

                        setNewFunctionType(type);

                        if (type) {
                            addFunction(type);
                        }
                    }}
                    className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                >

                    <option value="">
                        Funktion auswählen...
                    </option>

                    <option value="shelf">
                        Einlegeböden + Lochreihe
                    </option>

                    <option value="middleWall">
                        Mittelwand
                    </option>

                    <option value="legrabox">
                        Legrabox
                    </option>

                </select>

            </section>


            {/* ==================================================
                KEINE FUNKTIONEN
                ================================================== */}

            {functions.length === 0 && (

                <section>

                    <div className="text-sm text-gray-500">
                        Für diese Sektion sind keine Funktionen
                        hinterlegt.
                    </div>

                </section>

            )}


            {/* ==================================================
                FUNKTIONSLISTE
                ================================================== */}

            {functions.map(
                (func, functionIndex) => (

                    <section
                        key={func.id}
                        className="rounded-lg border border-gray-800 bg-gray-950 p-4"
                    >

                        {/* --------------------------------------
                            Header
                            -------------------------------------- */}

                        <div className="flex items-center justify-between gap-3 mb-4">

                            <div>

                                <div className="text-xs uppercase tracking-wide text-gray-500">
                                    Funktion {functionIndex + 1}
                                </div>

                                <div className="text-sm font-medium text-gray-200">
                                    {getFunctionLabel(func.type)}
                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    removeFunction(func.id)
                                }
                                className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-950"
                            >
                                Löschen
                            </button>

                        </div>


                        {/* ==================================================
                            SHELF
                            ================================================== */}

                        {func.type === "shelf" && (

                            <div className="space-y-5">

                                {/* --------------------------------
                                    Einlegeböden
                                    -------------------------------- */}

                                <div>

                                    <div className="text-xs uppercase tracking-wide text-gray-500">
                                        Einlegeböden
                                    </div>

                                    <div className="mt-4 space-y-4">

                                        {/* Fächeranzahl */}
                                        <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Fächeranzahl
                                            </span>

                                            <input
                                                type="number"
                                                min="1"
                                                value={
                                                    func.compartmentCount ?? 2
                                                }
                                                onChange={(event) =>
                                                    updateFunction(
                                                        func.id,
                                                        {
                                                            compartmentCount:
                                                                Math.max(
                                                                    1,
                                                                    Number(
                                                                        event.target.value
                                                                    )
                                                                )
                                                        }
                                                    )
                                                }
                                                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                            />

                                        </label>


                                        {/* Fachtiefe */}
                                        <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Fachtiefe
                                            </span>

                                            <input
                                                type="number"
                                                min="0"
                                                max={
                                                    Number(
                                                        activeCabinet.depth ?? 0
                                                    )
                                                }
                                                step="1"
                                                value={
                                                    Math.max(
                                                        0,
                                                        Number(
                                                            activeCabinet.depth ?? 0
                                                        ) -
                                                        Number(
                                                            func.shelfFrontOffset ?? 0
                                                        )
                                                    )
                                                }
                                                onChange={(event) => {

                                                    const depth =
                                                        Number(
                                                            event.target.value
                                                        );

                                                    if (
                                                        !Number.isFinite(
                                                            depth
                                                        )
                                                    ) {
                                                        return;
                                                    }

                                                    const cabinetDepth =
                                                        Number(
                                                            activeCabinet.depth ?? 0
                                                        );

                                                    const clampedDepth =
                                                        Math.max(
                                                            0,
                                                            Math.min(
                                                                cabinetDepth,
                                                                depth
                                                            )
                                                        );

                                                    updateFunction(
                                                        func.id,
                                                        {
                                                            shelfFrontOffset:
                                                                cabinetDepth -
                                                                clampedDepth
                                                        }
                                                    );

                                                }}
                                                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                            />

                                        </label>


                                        {/* Abstand vorne */}
                                        <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Abstand von vorne
                                            </span>

                                            <input
                                                type="number"
                                                min="0"
                                                max={
                                                    Number(
                                                        activeCabinet.depth ?? 0
                                                    )
                                                }
                                                step="1"
                                                value={
                                                    func.shelfFrontOffset ?? 0
                                                }
                                                onChange={(event) => {

                                                    const frontOffset =
                                                        Number(
                                                            event.target.value
                                                        );

                                                    if (
                                                        !Number.isFinite(
                                                            frontOffset
                                                        )
                                                    ) {
                                                        return;
                                                    }

                                                    const cabinetDepth =
                                                        Number(
                                                            activeCabinet.depth ?? 0
                                                        );

                                                    const clampedOffset =
                                                        Math.max(
                                                            0,
                                                            Math.min(
                                                                cabinetDepth,
                                                                frontOffset
                                                            )
                                                        );

                                                    updateFunction(
                                                        func.id,
                                                        {
                                                            shelfFrontOffset:
                                                                clampedOffset
                                                        }
                                                    );

                                                }}
                                                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                            />

                                        </label>

                                    </div>

                                </div>


                                {/* --------------------------------
                                    Lochreihe
                                    -------------------------------- */}

                                <div>

                                    <div className="text-xs uppercase tracking-wide text-gray-500">
                                        Lochreihe
                                    </div>

                                    <div className="mt-4 space-y-4">

                                        {/* Lochabstand */}
                                        <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Lochabstand
                                            </span>

                                            <input
                                                type="number"
                                                min="1"
                                                step="0.1"
                                                value={
                                                    func.holeRow?.spacing ?? 32
                                                }
                                                onChange={(event) =>
                                                    updateFunctionNested(
                                                        func.id,
                                                        "holeRow",
                                                        {
                                                            spacing:
                                                                Number(
                                                                    event.target.value
                                                                )
                                                        }
                                                    )
                                                }
                                                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                                            />

                                        </label>


                                        {/* Vorne */}
                                        <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Abstand von vorne
                                            </span>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={
                                                    func.holeRow?.frontOffset ?? 37
                                                }
                                                onChange={(event) =>
                                                    updateFunctionNested(
                                                        func.id,
                                                        "holeRow",
                                                        {
                                                            frontOffset:
                                                                Number(
                                                                    event.target.value
                                                                )
                                                        }
                                                    )
                                                }
                                                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                                            />

                                        </label>


                                        {/* Hinten */}
                                        <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Abstand von hinten
                                            </span>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={
                                                    func.holeRow?.backOffset ?? 37
                                                }
                                                onChange={(event) =>
                                                    updateFunctionNested(
                                                        func.id,
                                                        "holeRow",
                                                        {
                                                            backOffset:
                                                                Number(
                                                                    event.target.value
                                                                )
                                                        }
                                                    )
                                                }
                                                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                                            />

                                        </label>


                                        {/* Start unten */}
                                        <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Lochreihe Start von unten
                                            </span>

                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={
                                                    func.holeRow?.startFromBottom ?? 150
                                                }
                                                onChange={(event) =>
                                                    updateFunctionNested(
                                                        func.id,
                                                        "holeRow",
                                                        {
                                                            startFromBottom:
                                                                Number(
                                                                    event.target.value
                                                                )
                                                        }
                                                    )
                                                }
                                                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                                            />

                                        </label>


                                        {/* Ende oben */}
                                        <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Lochreihe Ende von oben
                                            </span>

                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={
                                                    func.holeRow?.endFromTop ?? 150
                                                }
                                                onChange={(event) =>
                                                    updateFunctionNested(
                                                        func.id,
                                                        "holeRow",
                                                        {
                                                            endFromTop:
                                                                Number(
                                                                    event.target.value
                                                                )
                                                        }
                                                    )
                                                }
                                                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                                            />

                                        </label>

                                    </div>

                                </div>

                            </div>

                        )}


                        {func.type === "middleWall" && (
                            <div className="space-y-5">

                                {/* =====================================================
                                    AUSRICHTUNG
                                    ===================================================== */}

                                <div>
                                    <div className="text-xs uppercase tracking-wide text-gray-500">
                                        Ausrichtung
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2">

                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateFunction(func.id, {
                                                    orientation: "horizontal",
                                                    positionReference: "sectionBottom",
                                                    positionOffset: 0,
                                                    absoluteOffset: 0
                                                })
                                            }
                                            className={`
                                                rounded-lg px-3 py-2 text-sm transition
                                                ${
                                                    (func.orientation ?? "horizontal") === "horizontal"
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                                                }
                                            `}
                                        >
                                            Horizontal
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateFunction(func.id, {
                                                    orientation: "vertical",
                                                    positionReference: "sectionLeft",
                                                    positionOffset: 0,
                                                    absoluteOffset: 0
                                                })
                                            }
                                            className={`
                                                rounded-lg px-3 py-2 text-sm transition
                                                ${
                                                    (func.orientation ?? "horizontal") === "vertical"
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                                                }
                                            `}
                                        >
                                            Vertikal
                                        </button>

                                    </div>
                                </div>


                                {/* =====================================================
                                    POSITION
                                    ===================================================== */}

                                <div>

                                    <div className="text-xs uppercase tracking-wide text-gray-500">
                                        Position
                                    </div>


                                    {/* =================================================
                                        HORIZONTAL
                                        ================================================= */}

                                    {(func.orientation ?? "horizontal") === "horizontal" ? (

                                        <div className="mt-4 grid grid-cols-1 gap-4">

                                            {/* Korpusoberkante */}
                                            <label className="block">

                                                <span className="text-xs text-gray-400">
                                                    Abstand zur Korpusoberkante
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={Number(
                                                        getMiddleWallOffset(
                                                            func,
                                                            "cabinetTop"
                                                        )
                                                    ).toFixed(1)}
                                                    onChange={(event) =>
                                                        setMiddleWallPosition(
                                                            func.id,
                                                            func,
                                                            "cabinetTop",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                                />

                                            </label>


                                            {/* Korpusunterkante */}
                                            <label className="block">

                                                <span className="text-xs text-gray-400">
                                                    Abstand zur Korpusunterkante
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={Number(
                                                        getMiddleWallOffset(
                                                            func,
                                                            "cabinetBottom"
                                                        )
                                                    ).toFixed(1)}
                                                    onChange={(event) =>
                                                        setMiddleWallPosition(
                                                            func.id,
                                                            func,
                                                            "cabinetBottom",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                                />

                                            </label>


                                            {/* Sektionoberkante */}
                                            <label className="block">

                                                <span className="text-xs text-gray-400">
                                                    Abstand zur Sektionoberkante
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={Number(
                                                        getMiddleWallOffset(
                                                            func,
                                                            "sectionTop"
                                                        )
                                                    ).toFixed(1)}
                                                    onChange={(event) =>
                                                        setMiddleWallPosition(
                                                            func.id,
                                                            func,
                                                            "sectionTop",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                                />

                                            </label>


                                            {/* Sektionunterkante */}
                                            <label className="block">

                                                <span className="text-xs text-gray-400">
                                                    Abstand zur Sektionunterkante
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={Number(
                                                        getMiddleWallOffset(
                                                            func,
                                                            "sectionBottom"
                                                        )
                                                    ).toFixed(1)}
                                                    onChange={(event) =>
                                                        setMiddleWallPosition(
                                                            func.id,
                                                            func,
                                                            "sectionBottom",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                                />

                                            </label>

                                        </div>

                                    ) : (

                                        /* =================================================
                                        VERTIKAL
                                        ================================================= */

                                        <div className="mt-4 grid grid-cols-1 gap-4">

                                            {/* Korpus linke Kante */}
                                            <label className="block">

                                                <span className="text-xs text-gray-400">
                                                    Abstand zur Korpus linke Kante
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={Number(
                                                        getMiddleWallOffset(
                                                            func,
                                                            "cabinetLeft"
                                                        )
                                                    ).toFixed(1)}
                                                    onChange={(event) =>
                                                        setMiddleWallPosition(
                                                            func.id,
                                                            func,
                                                            "cabinetLeft",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                                />

                                            </label>


                                            {/* Korpus rechte Kante */}
                                            <label className="block">

                                                <span className="text-xs text-gray-400">
                                                    Abstand zur Korpus rechten Kante
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={Number(
                                                        getMiddleWallOffset(
                                                            func,
                                                            "cabinetRight"
                                                        )
                                                    ).toFixed(1)}
                                                    onChange={(event) =>
                                                        setMiddleWallPosition(
                                                            func.id,
                                                            func,
                                                            "cabinetRight",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                                />

                                            </label>


                                            {/* Sektion linke Kante */}
                                            <label className="block">

                                                <span className="text-xs text-gray-400">
                                                    Abstand zur Sektion linken Kante
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={Number(
                                                        getMiddleWallOffset(
                                                            func,
                                                            "sectionLeft"
                                                        )
                                                    ).toFixed(1)}
                                                    onChange={(event) =>
                                                        setMiddleWallPosition(
                                                            func.id,
                                                            func,
                                                            "sectionLeft",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                                />

                                            </label>


                                            {/* Sektion rechte Kante */}
                                            <label className="block">

                                                <span className="text-xs text-gray-400">
                                                    Abstand zur Sektion rechten Kante
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={Number(
                                                        getMiddleWallOffset(
                                                            func,
                                                            "sectionRight"
                                                        )
                                                    ).toFixed(1)}
                                                    onChange={(event) =>
                                                        setMiddleWallPosition(
                                                            func.id,
                                                            func,
                                                            "sectionRight",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                                                />

                                            </label>

                                        </div>
                                    )}

                                </div>
                            </div>
                        )}


                        {/* ==================================================
                            LEGRABOX
                            ================================================== */}

                        {func.type === "legrabox" && (

                            <div className="space-y-5">

                                {/* Variante */}
                                <label className="block">

                                    <span className="text-xs text-gray-400">
                                        Variante
                                    </span>

                                    <select
                                        value={func.variant ?? "M"}
                                        onChange={(event) =>
                                            updateLegrabox(
                                                func.id,
                                                {
                                                    variant:
                                                        event.target.value
                                                }
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                                    >

                                        <option value="N">
                                            N
                                        </option>

                                        <option value="M">
                                            M
                                        </option>

                                        <option value="C">
                                            C
                                        </option>

                                        <option value="K">
                                            K
                                        </option>

                                        <option value="L">
                                            L
                                        </option>

                                    </select>

                                </label>


                                {/* Farbe */}
                                <label className="block">

                                    <span className="text-xs text-gray-400">
                                        Farbe
                                    </span>

                                    <select
                                        value={func.materialColor ?? "white"}
                                        onChange={event =>
                                            updateLegrabox(
                                                func.id,
                                                {
                                                    materialColor: event.target.value
                                                }
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="white">Weiß</option>
                                        <option value="gray">Grau</option>
                                    </select>

                                </label>


                                {/* Auszugtiefe */}
                                <label className="block">

                                    <span className="text-xs text-gray-400">
                                        Auszugtiefe
                                    </span>

                                    <select
                                        value={
                                            func.drawerDepth ??
                                            getDefaultDrawerDepth(
                                                activeCabinet.depth
                                            )
                                        }
                                        onChange={(event) =>
                                            updateLegrabox(
                                                func.id,
                                                {
                                                    drawerDepth:
                                                        Number(
                                                            event.target.value
                                                        )
                                                }
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
                                    >

                                        {DRAWER_DEPTHS.map(
                                            depth => (
                                                <option
                                                    key={depth}
                                                    value={depth}
                                                >
                                                    {depth} mm
                                                </option>
                                            )
                                        )}

                                    </select>

                                </label>


                                {/* Position */}
                                <label className="block">

                                    <span className="text-xs text-gray-400">
                                        Position über Sektionunterkante
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={
                                            func.positionFromBottom ??
                                            40
                                        }
                                        onChange={(event) =>
                                            updateLegrabox(
                                                func.id,
                                                {
                                                    positionFromBottom:
                                                        Number(
                                                            event.target.value
                                                        )
                                                }
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                                    />

                                </label>

                                        

                                {/* Aufdopplungen */}
                                <div className="border-t border-gray-800 pt-2">

                                    <label className="block">

                                            <span className="text-xs text-gray-400">
                                                Innenliegend (mm)
                                            </span>

                                            <input
                                                type="number"
                                                step="0.5"
                                                value={func.doubling?.insideRightOffset ?? 0}
                                                onChange={event =>
                                                    updateLegraboxDoubling(
                                                        func.id,
                                                        {
                                                            insideRightOffset:
                                                                Number(event.target.value) || 0
                                                        }
                                                    )
                                                }
                                                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                                            />

                                        </label>

                                    <div className="text-xs uppercase tracking-wide text-gray-500 mt-4 ">
                                        Aufdopplungen
                                    </div>

                                    <div className="mt-3 space-y-3">

                                        

                                        <label className="flex items-center gap-2 text-sm text-gray-300">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    func.doubling?.left ??
                                                    false
                                                }
                                                onChange={(event) =>
                                                    updateLegraboxDoubling(
                                                        func.id,
                                                        {
                                                            left:
                                                                event.target.checked
                                                        }
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-gray-700 bg-gray-800"
                                            />

                                            Aufdopplung links

                                        </label>


                                        <label className="flex items-center gap-2 text-sm text-gray-300">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    func.doubling?.right ??
                                                    false
                                                }
                                                onChange={(event) =>
                                                    updateLegraboxDoubling(
                                                        func.id,
                                                        {
                                                            right:
                                                                event.target.checked
                                                        }
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-gray-700 bg-gray-800"
                                            />

                                            Aufdopplung rechts

                                        </label>


                                        {(func.doubling?.left ||
                                            func.doubling?.right) && (

                                            <label className="block">

                                                <span className="text-xs text-gray-400">
                                                    Stärke der Aufdopplung
                                                </span>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={
                                                        func.doubling?.thickness ??
                                                        0
                                                    }
                                                    onChange={(event) =>
                                                        updateLegraboxDoubling(
                                                            func.id,
                                                            {
                                                                thickness:
                                                                    Number(
                                                                        event.target.value
                                                                    )
                                                            }
                                                        )
                                                    }
                                                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                                                />

                                            </label>

                                        )}

                                        

                                    </div>

                                </div>

                            </div>

                        )}

                    </section>

                )
            )}

        </div>
    );
}
