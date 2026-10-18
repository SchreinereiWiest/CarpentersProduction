import React from "react";


/* =========================================================
 * Allgemeine Anzeige
 * ========================================================= */

function PropertyValue({
    label,
    value,
    unit = "mm"
}) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }


    return (
        <div className="rounded border border-gray-700 bg-gray-800 p-2">

            <div className="text-xs text-gray-500">
                {label}
            </div>

            <div className="text-sm text-gray-200">
                {String(value)}
                {unit ? ` ${unit}` : ""}
            </div>

        </div>
    );

}


/* =========================================================
 * Wert für generische Parameter formatieren
 * ========================================================= */

function formatParameterValue(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }


    if (
        Array.isArray(value)
    ) {

        return value
            .map(
                entry =>
                    typeof entry === "object"
                        ? JSON.stringify(entry)
                        : String(entry)
            )
            .join(" / ");

    }


    if (
        typeof value === "object"
    ) {

        return JSON.stringify(
            value,
            null,
            2
        );

    }


    return String(value);

}

/* =========================================================
 * X-Position bestimmen
 *
 * Rückgabe:
 *
 * {
 *     left,
 *     right
 * }
 *
 * left  = Abstand von linker Kante
 * right = Abstand von rechter Kante
 * ========================================================= */

function getOperationXPosition(
    operation,
    part
) {

    const partLength =
        Number(
            part?.L
        );


    if (
        !Number.isFinite(
            partLength
        )
    ) {

        return {
            left: null,
            right: null
        };

    }


    let x = null;


    /*
     * Direkte X-Koordinate
     */

    if (
        Number.isFinite(
            Number(
                operation?.x
            )
        )
    ) {

        x =
            Number(
                operation.x
            );

    }


    /*
     * position wird bei VB / VBH
     * als lokale X-Position verwendet.
     */

    if (
        x === null &&
        Number.isFinite(
            Number(
                operation?.position
            )
        )
    ) {

        x =
            Number(
                operation.position
            );

    }


    /*
     * lengthOffset
     */

    if (
        x === null &&
        Number.isFinite(
            Number(
                operation?.lengthOffset
            )
        )
    ) {

        const offset =
            Number(
                operation.lengthOffset
            );


        const reference =
            operation.lengthReference ??
            "left";


        if (
            reference === "right" ||
            reference === "bottom"
        ) {

            x =
                partLength -
                offset;

        } else {

            x =
                offset;

        }

    }


    /*
     * Kein X vorhanden
     */

    if (
        x === null
    ) {

        return {
            left: null,
            right: null
        };

    }


    return {

        left:
            x,

        right:
            partLength -
            x

    };

}


/* =========================================================
 * X-Endposition für Bearbeitungen mit Start / Ende
 *
 * z.B. RNT / XL2P
 * ========================================================= */

function getOperationEndXPosition(
    operation,
    part
) {

    const partLength =
        Number(
            part?.L
        );


    if (
        !Number.isFinite(
            partLength
        )
    ) {

        return {
            left: null,
            right: null
        };

    }


    let endX = null;


    if (
        Number.isFinite(
            Number(
                operation?.endX
            )
        )
    ) {

        endX =
            Number(
                operation.endX
            );

    }


    /*
     * Bei Operationen mit startX ohne endX
     * wird die rechte Plattenkante verwendet.
     */

    if (
        endX === null &&
        Number.isFinite(
            Number(
                operation?.startX
            )
        )
    ) {

        endX =
            partLength;

    }


    if (
        endX === null
    ) {

        return {
            left: null,
            right: null
        };

    }


    return {

        left:
            endX,

        right:
            partLength -
            endX

    };

}


/* =========================================================
 * Y-Position bestimmen
 * ========================================================= */

function getOperationYPosition(
    operation
) {

    if (
        Number.isFinite(
            Number(
                operation?.y
            )
        )
    ) {

        return {
            label: "Y Position",
            value:
                Number(
                    operation.y
                )
        };

    }


    if (
        Number.isFinite(
            Number(
                operation?.depthPosition
            )
        )
    ) {

        return {
            label: "Y Position",
            value:
                Number(
                    operation.depthPosition
                )
        };

    }


    /*
     * VB / VBH:
     *
     * mehrere Y-Positionen
     */

    if (
        Array.isArray(
            operation?.positions
        )
    ) {

        return {

            label:
                "Y Positionen",

            value:
                operation.positions
                    .join(" / ")

        };

    }


    return {
        label: "Y Position",
        value: null
    };

}


/* =========================================================
 * Operationsparameter
 * ========================================================= */

function OperationProperties({
    operation,
    part
}) {

    if (
        !operation
    ) {

        return null;

    }


    const xPosition =
        getOperationXPosition(
            operation,
            part
        );


    const endXPosition =
        getOperationEndXPosition(
            operation,
            part
        );


    const yPosition =
        getOperationYPosition(
            operation
        );


    /*
     * Diese Felder werden oben bereits
     * als geometrische Informationen dargestellt.
     */

    const excludedKeys = new Set([
        "id",
        "type",
        "source",

        "x",
        "endX",
        "startX",

        "y",
        "depthPosition",

        "position",
        "lengthOffset",
        "lengthReference",

        "positions"
    ]);


    const entries =
        Object.entries(
            operation
        ).filter(
            ([key, value]) => {

                if (
                    excludedKeys.has(key)
                ) {
                    return false;
                }

                if (
                    value === null ||
                    value === undefined
                ) {
                    return false;
                }

                return true;

            }
        );


    return (
        <div className="space-y-3">

            {/* =================================================
             * Bearbeitungstyp
             * ================================================= */}

            <section>

                <div className="mb-2 text-xs text-gray-500">
                    Bearbeitung
                </div>

                <div className="rounded border border-blue-700 bg-blue-900/20 p-3">

                    <div className="text-sm font-medium text-blue-300">
                        {operation.type}
                    </div>

                    {
                        operation.pattern && (
                            <div className="mt-1 text-xs text-gray-400">
                                Muster: {operation.pattern}
                            </div>
                        )
                    }

                </div>

            </section>


            {/* =================================================
             * X-Position
             * ================================================= */}

            <section>

                <div className="mb-2 text-xs text-gray-500">
                    X Position
                </div>

                <div className="grid grid-cols-2 gap-2">

                    <PropertyValue
                        label="Von links"
                        value={
                            xPosition.left
                        }
                    />

                    <PropertyValue
                        label="Von rechts"
                        value={
                            xPosition.right
                        }
                    />

                </div>


                {
                    endXPosition.left !== null && (
                        <div className="mt-2 grid grid-cols-2 gap-2">

                            <PropertyValue
                                label="Ende von links"
                                value={
                                    endXPosition.left
                                }
                            />

                            <PropertyValue
                                label="Ende von rechts"
                                value={
                                    endXPosition.right
                                }
                            />

                        </div>
                    )
                }

            </section>


            {/* =================================================
             * Y-Position
             * ================================================= */}

            {
                yPosition.value !== null && (
                    <section>

                        <div className="mb-2 text-xs text-gray-500">
                            Y Position
                        </div>

                        <div className="rounded border border-gray-700 bg-gray-800 p-2">

                            <div className="text-xs text-gray-500">
                                {yPosition.label}
                            </div>

                            <div className="text-sm text-gray-200">

                                {
                                    typeof yPosition.value === "number"
                                        ? `${yPosition.value} mm`
                                        : yPosition.value
                                }

                            </div>

                        </div>

                    </section>
                )
            }


            {/* =================================================
             * Betriebsparameter
             * ================================================= */}

            {
                entries.length > 0 && (
                    <section>

                        <div className="mb-2 text-xs text-gray-500">
                            Bearbeitungsparameter
                        </div>

                        <div className="space-y-1">

                            {
                                entries.map(
                                    ([key, value]) => {

                                        const formatted =
                                            formatParameterValue(
                                                value
                                            );


                                        const isObject =
                                            typeof value === "object" &&
                                            value !== null;


                                        return (
                                            <div
                                                key={key}
                                                className="rounded border border-gray-700 bg-gray-800 p-2"
                                            >

                                                <div className="text-xs text-gray-500">
                                                    {key}
                                                </div>

                                                {
                                                    isObject ? (

                                                        <pre className="mt-1 whitespace-pre-wrap break-all text-xs text-gray-300">
                                                            {formatted}
                                                        </pre>

                                                    ) : (

                                                        <div className="mt-1 text-sm text-gray-200">
                                                            {formatted}
                                                        </div>

                                                    )
                                                }

                                            </div>
                                        );

                                    }
                                )

                            }

                        </div>

                    </section>
                )
            }

        </div>
    );

}


/* =========================================================
 * Hauptsidebar
 * ========================================================= */

export default function CncPropertiesSidebar({
    part,
    group,
    selectedOperation,
    onSelectOperation
}) {

    if (
        !part
    ) {

        return (
            <aside className="h-full bg-gray-900 text-gray-500">

                <div className="flex h-full items-center justify-center">

                    Kein Bauteil ausgewählt.

                </div>

            </aside>
        );

    }


    const cnc =
        part.CNC ?? {};


    const operations =
        Array.isArray(
            cnc.operations
        )
            ? cnc.operations
            : [];


    const selectedOperationId =
        selectedOperation?.id ??
        null;


    return (

        <aside className="h-full min-h-0 min-w-0 bg-gray-900">

            {/* =================================================
             * Header
             * ================================================= */}

            <div className="flex h-12 shrink-0 items-center border-b border-gray-700 px-4 text-sm font-semibold">

                CNC Eigenschaften

            </div>


            {/* =================================================
             * Zwei Spalten
             * ================================================= */}

            <div className="grid h-[calc(100%-3rem)] min-h-0 grid-cols-2">

                {/* =================================================
                 * LINKE SPALTE
                 * ================================================= */}

                <section className="min-h-0 min-w-0 overflow-y-auto border-r border-gray-700">

                    <div className="border-b border-gray-700 px-4 py-3 text-sm font-medium">

                        Bearbeitungen

                    </div>


                    <div className="space-y-4 p-4">

                        {/* =================================================
                         * Anzahl
                         * ================================================= */}

                        <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2">

                            <div className="text-xs text-gray-500">
                                Anzahl Bearbeitungen
                            </div>

                            <div className="mt-1 text-sm text-gray-200">
                                {operations.length}
                            </div>

                        </div>


                        {/* =================================================
                         * Operationsliste
                         * ================================================= */}

                        {
                            operations.length > 0 && (

                                <div>

                                    <div className="mb-2 text-xs text-gray-500">
                                        Operationen
                                    </div>


                                    <div className="space-y-1">

                                        {
                                            operations.map(
                                                (
                                                    operation,
                                                    index
                                                ) => {

                                                    const operationId =
                                                        operation.id ??
                                                        `operation-${index}`;


                                                    const selected =
                                                        String(
                                                            selectedOperationId
                                                        ) ===
                                                        String(
                                                            operationId
                                                        );


                                                    return (

                                                        <button
                                                            key={
                                                                operationId
                                                            }

                                                            type="button"

                                                            onClick={() => {

                                                                onSelectOperation?.(
                                                                    operation
                                                                );

                                                            }}

                                                            className={`
                                                                w-full
                                                                rounded
                                                                border
                                                                px-3
                                                                py-2
                                                                text-left
                                                                text-sm
                                                                transition
                                                                ${selected

                                                                    ? "border-blue-600 bg-blue-900/50 text-blue-200"

                                                                    : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-750"

                                                                }
                                                            `}
                                                        >

                                                            <div className="flex items-center justify-between gap-2">

                                                                <span>

                                                                    {index + 1}.
                                                                    {" "}
                                                                    {operation.type}

                                                                </span>


                                                                {
                                                                    operation.pattern && (

                                                                        <span className="text-xs text-gray-500">

                                                                            {
                                                                                operation.pattern
                                                                            }

                                                                        </span>

                                                                    )
                                                                }

                                                            </div>


                                                            {
                                                                operation.side && (

                                                                    <div className="mt-1 text-xs text-gray-500">

                                                                        Seite:
                                                                        {" "}
                                                                        {
                                                                            operation.side
                                                                        }

                                                                    </div>

                                                                )
                                                            }

                                                        </button>

                                                    );

                                                }
                                            )

                                        }

                                    </div>

                                </div>

                            )
                        }

                    </div>

                </section>


                {/* =================================================
                 * RECHTE SPALTE
                 * ================================================= */}

                <section className="min-h-0 min-w-0 overflow-y-auto">

                    {
                        selectedOperation ? (

                            <>

                                <div className="border-b border-gray-700 px-4 py-3">

                                    <div className="text-sm font-medium text-blue-300">

                                        Operations-Eigenschaften

                                    </div>

                                    <div className="mt-1 text-xs text-gray-500">

                                        Operation {selectedOperation.type}

                                    </div>

                                </div>


                                <div className="p-4">

                                    <OperationProperties
                                        operation={
                                            selectedOperation
                                        }
                                        part={
                                            part
                                        }
                                    />

                                </div>

                            </>

                        ) : (

                            <>

                                <div className="border-b border-gray-700 px-4 py-3 text-sm font-medium">

                                    Grundeigenschaften

                                </div>


                                <div className="space-y-4 p-4">

                                    {/* =================================================
                                     * Bauteil
                                     * ================================================= */}

                                    <section>

                                        <div className="mb-2 text-xs text-gray-500">
                                            Bauteil
                                        </div>

                                        <div className="rounded border border-gray-700 bg-gray-800 p-3">

                                            <div className="text-sm text-gray-200">
                                                {part.Objektname}
                                            </div>

                                            <div className="mt-1 text-xs text-gray-500">
                                                PID: {part.PID}
                                            </div>

                                        </div>

                                    </section>


                                    {/* =================================================
                                     * Abmessungen
                                     * ================================================= */}

                                    <section>

                                        <div className="mb-2 text-xs text-gray-500">
                                            Abmessungen
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">

                                            <PropertyValue
                                                label="L"
                                                value={
                                                    part.L
                                                }
                                            />

                                            <PropertyValue
                                                label="B"
                                                value={
                                                    part.B
                                                }
                                            />

                                            <PropertyValue
                                                label="T"
                                                value={
                                                    part.T
                                                }
                                            />

                                        </div>

                                    </section>


                                    {/* =================================================
                                     * CNC Programm
                                     * ================================================= */}

                                    <section>

                                        <div className="mb-2 text-xs text-gray-500">
                                            CNC Programm
                                        </div>

                                        <div className="rounded border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">

                                            {group?.name ?? "—"}

                                        </div>

                                    </section>

                                </div>

                            </>

                        )
                    }

                </section>

            </div>

        </aside>

    );

}