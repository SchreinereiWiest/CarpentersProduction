import { useState } from "react";
import { DRAWER_DEPTHS, getDefaultDrawerDepth } from "@Engine/cabinet/cnc/legraboxDimensions.js";
import { getMiddleWallCenter } from "@Engine/cabinet/geometry/middleWall.js";
import { findSection } from "@Engine/cabinet/sektions/interior/mergeSectionChildren.js";
import { updateSectionTree } from "@Engine/cabinet/sektions/updateSectionTree.js";
import { createId } from "@Engine/shared/id.js";
import { createShelfHoleRowDefaults } from "../../../sectionFunctionDefaults.js";
import FormulaNumberInput from "../FormulaNumberInput.jsx";



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
    setSelectedElement,
    cncConfig,
    measurementVariables = []
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
    const shelfHoleRowDefaults = createShelfHoleRowDefaults(cncConfig);



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
     * Neue Funktion erstellen
     * ------------------------------------------------------------
     */

    const createDefaultFunction = (type) => {

        const cabinetDepth =
            Number(activeCabinet?.depth ?? 0);

        const halfMaterialThickness =
            (Number(activeCabinet?.thickness) || 19) / 2;


        switch (type) {

            case "shelf":

                return {
                    id: createId(),

                    type: "shelf",

                    compartmentCount: 2,

                    shelfFrontOffset: 0,

                    holeRow: shelfHoleRowDefaults
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

                    positionOffset: halfMaterialThickness,

                    absoluteOffset: halfMaterialThickness
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

    const updateFunctionFormula = (
        functionId,
        fieldPath,
        expression,
        evaluation,
        createChanges,
        exclusivePaths = []
    ) => {
        updateFunction(functionId, func => {
            const measurementExpressions = {
                ...(func.measurementExpressions ?? {}),
                [fieldPath]: expression
            };
            exclusivePaths.forEach(path => delete measurementExpressions[path]);
            return {
                measurementExpressions,
                ...(evaluation.valid ? createChanges(evaluation.value, func) : {})
            };
        });
    };


    /*
     * ------------------------------------------------------------
     * Mittelwand
     * ------------------------------------------------------------
     */

    const getMiddleWallOffset = (
        wall,
        reference
    ) => {

        const orientation =
            wall.orientation ?? "horizontal";

        const center =
            getMiddleWallCenter({
                wall,
                section: selectedElement,
                cabinet: activeCabinet
            });

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


    const middleWallFormulaInput = (wall, reference, label) => {
        const fieldPath = `position.${reference}`;
        const positionPaths = [
            "position.cabinetTop",
            "position.cabinetBottom",
            "position.sectionTop",
            "position.sectionBottom",
            "position.cabinetLeft",
            "position.cabinetRight",
            "position.sectionLeft",
            "position.sectionRight"
        ];
        return (
            <FormulaNumberInput
                label={label}
                value={Number(getMiddleWallOffset(wall, reference)).toFixed(1)}
                expression={wall.measurementExpressions?.[fieldPath]}
                variables={measurementVariables}
                min={0}
                onChange={(expression, evaluation) => updateFunctionFormula(
                    wall.id,
                    fieldPath,
                    expression,
                    evaluation,
                    value => ({
                        positionReference: reference,
                        positionOffset: value,
                        absoluteOffset: value
                    }),
                    positionPaths.filter(path => path !== fieldPath)
                )}
            />
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
                                        <FormulaNumberInput
                                            label="Fächeranzahl"
                                            value={Math.max(
                                                0,
                                                Number(func.compartmentCount ?? 1) - 1
                                            )}
                                            expression={func.measurementExpressions?.compartmentCount}
                                            variables={measurementVariables}
                                            min={0}
                                            unit=""
                                            onChange={(expression, evaluation) => updateFunctionFormula(
                                                func.id,
                                                "compartmentCount",
                                                expression,
                                                evaluation,
                                                value => ({
                                                    compartmentCount: Math.max(1, value + 1)
                                                })
                                            )}
                                        />


                                        {/* Fachtiefe */}
                                        <FormulaNumberInput
                                            label="Fachtiefe"
                                            value={Math.max(0, Number(activeCabinet.depth ?? 0) - Number(func.shelfFrontOffset ?? 0))}
                                            expression={func.measurementExpressions?.shelfDepth}
                                            variables={measurementVariables}
                                            min={0}
                                            max={Number(activeCabinet.depth ?? 0)}
                                            onChange={(expression, evaluation) => updateFunctionFormula(
                                                func.id,
                                                "shelfDepth",
                                                expression,
                                                evaluation,
                                                value => ({ shelfFrontOffset: Number(activeCabinet.depth ?? 0) - value }),
                                                ["shelfFrontOffset"]
                                            )}
                                        />


                                        {/* Abstand vorne */}
                                        <FormulaNumberInput
                                            label="Abstand von vorne"
                                            value={func.shelfFrontOffset ?? 0}
                                            expression={func.measurementExpressions?.shelfFrontOffset}
                                            variables={measurementVariables}
                                            min={0}
                                            max={Number(activeCabinet.depth ?? 0)}
                                            onChange={(expression, evaluation) => updateFunctionFormula(
                                                func.id,
                                                "shelfFrontOffset",
                                                expression,
                                                evaluation,
                                                value => ({ shelfFrontOffset: value }),
                                                ["shelfDepth"]
                                            )}
                                        />

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
                                        <FormulaNumberInput
                                            label="Lochabstand"
                                            value={func.holeRow?.spacing ?? 32}
                                            expression={func.measurementExpressions?.["holeRow.spacing"]}
                                            variables={measurementVariables}
                                            min={1}
                                            onChange={(expression, evaluation) => updateFunctionFormula(
                                                func.id,
                                                "holeRow.spacing",
                                                expression,
                                                evaluation,
                                                (value, current) => ({ holeRow: { ...(current.holeRow ?? {}), spacing: value } })
                                            )}
                                        />


                                        {/* Vorne */}
                                        <FormulaNumberInput
                                            label="Abstand von vorne"
                                            value={func.holeRow?.frontOffset ?? shelfHoleRowDefaults.frontOffset}
                                            expression={func.measurementExpressions?.["holeRow.frontOffset"]}
                                            variables={measurementVariables}
                                            min={0}
                                            onChange={(expression, evaluation) => updateFunctionFormula(
                                                func.id,
                                                "holeRow.frontOffset",
                                                expression,
                                                evaluation,
                                                (value, current) => ({ holeRow: { ...(current.holeRow ?? {}), frontOffset: value } })
                                            )}
                                        />


                                        {/* Hinten */}
                                        <FormulaNumberInput
                                            label="Abstand von hinten"
                                            value={func.holeRow?.backOffset ?? shelfHoleRowDefaults.backOffset}
                                            expression={func.measurementExpressions?.["holeRow.backOffset"]}
                                            variables={measurementVariables}
                                            min={0}
                                            onChange={(expression, evaluation) => updateFunctionFormula(
                                                func.id,
                                                "holeRow.backOffset",
                                                expression,
                                                evaluation,
                                                (value, current) => ({ holeRow: { ...(current.holeRow ?? {}), backOffset: value } })
                                            )}
                                        />


                                        {/* Start unten */}
                                        <FormulaNumberInput
                                            label="Lochreihe Start von unten"
                                            value={func.holeRow?.startFromBottom ?? 150}
                                            expression={func.measurementExpressions?.["holeRow.startFromBottom"]}
                                            variables={measurementVariables}
                                            min={0}
                                            onChange={(expression, evaluation) => updateFunctionFormula(
                                                func.id,
                                                "holeRow.startFromBottom",
                                                expression,
                                                evaluation,
                                                (value, current) => ({ holeRow: { ...(current.holeRow ?? {}), startFromBottom: value } })
                                            )}
                                        />


                                        {/* Ende oben */}
                                        <FormulaNumberInput
                                            label="Lochreihe Ende von oben"
                                            value={func.holeRow?.endFromTop ?? 150}
                                            expression={func.measurementExpressions?.["holeRow.endFromTop"]}
                                            variables={measurementVariables}
                                            min={0}
                                            onChange={(expression, evaluation) => updateFunctionFormula(
                                                func.id,
                                                "holeRow.endFromTop",
                                                expression,
                                                evaluation,
                                                (value, current) => ({ holeRow: { ...(current.holeRow ?? {}), endFromTop: value } })
                                            )}
                                        />

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
                                            onClick={() => {
                                                const halfMaterialThickness =
                                                    (Number(activeCabinet?.thickness) || 19) / 2;

                                                updateFunction(func.id, {
                                                    orientation: "horizontal",
                                                    positionReference: "sectionBottom",
                                                    positionOffset: halfMaterialThickness,
                                                    absoluteOffset: halfMaterialThickness
                                                });
                                            }}
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
                                            {middleWallFormulaInput(func, "cabinetTop", "Abstand zur Korpusoberkante")}


                                            {/* Korpusunterkante */}
                                            {middleWallFormulaInput(func, "cabinetBottom", "Abstand zur Korpusunterkante")}


                                            {/* Sektionoberkante */}
                                            {middleWallFormulaInput(func, "sectionTop", "Abstand zur Sektionoberkante")}


                                            {/* Sektionunterkante */}
                                            {middleWallFormulaInput(func, "sectionBottom", "Abstand zur Sektionunterkante")}

                                        </div>

                                    ) : (

                                        /* =================================================
                                        VERTIKAL
                                        ================================================= */

                                        <div className="mt-4 grid grid-cols-1 gap-4">

                                            {/* Korpus linke Kante */}
                                            {middleWallFormulaInput(func, "cabinetLeft", "Abstand zur Korpus linken Kante")}


                                            {/* Korpus rechte Kante */}
                                            {middleWallFormulaInput(func, "cabinetRight", "Abstand zur Korpus rechten Kante")}


                                            {/* Sektion linke Kante */}
                                            {middleWallFormulaInput(func, "sectionLeft", "Abstand zur Sektion linken Kante")}


                                            {/* Sektion rechte Kante */}
                                            {middleWallFormulaInput(func, "sectionRight", "Abstand zur Sektion rechten Kante")}

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
                                <FormulaNumberInput
                                    label="Position über Sektionunterkante"
                                    value={func.positionFromBottom ?? 40}
                                    expression={func.measurementExpressions?.positionFromBottom}
                                    variables={measurementVariables}
                                    min={0}
                                    onChange={(expression, evaluation) => updateFunctionFormula(
                                        func.id,
                                        "positionFromBottom",
                                        expression,
                                        evaluation,
                                        value => ({ positionFromBottom: value })
                                    )}
                                />

                                        

                                {/* Aufdopplungen */}
                                <div className="border-t border-gray-800 pt-2">

                                    <FormulaNumberInput
                                        label="Innenliegend"
                                        value={func.doubling?.insideRightOffset ?? 0}
                                        expression={func.measurementExpressions?.["doubling.insideRightOffset"]}
                                        variables={measurementVariables}
                                        min={0}
                                        onChange={(expression, evaluation) => updateFunctionFormula(
                                            func.id,
                                            "doubling.insideRightOffset",
                                            expression,
                                            evaluation,
                                            (value, current) => ({ doubling: { ...(current.doubling ?? {}), insideRightOffset: value } })
                                        )}
                                    />

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

                                            <FormulaNumberInput
                                                label="Stärke der Aufdopplung"
                                                value={func.doubling?.thickness ?? 0}
                                                expression={func.measurementExpressions?.["doubling.thickness"]}
                                                variables={measurementVariables}
                                                min={0}
                                                onChange={(expression, evaluation) => updateFunctionFormula(
                                                    func.id,
                                                    "doubling.thickness",
                                                    expression,
                                                    evaluation,
                                                    (value, current) => ({ doubling: { ...(current.doubling ?? {}), thickness: value } })
                                                )}
                                            />

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
