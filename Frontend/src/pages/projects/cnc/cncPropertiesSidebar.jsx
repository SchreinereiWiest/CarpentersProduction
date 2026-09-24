function PropertyValue({
    label,
    value
}) {
    return (
        <div className="
            rounded
            border
            border-gray-700
            bg-gray-800
            p-2
        ">

            <div className="
                text-xs
                text-gray-500
            ">
                {label}
            </div>

            <div className="
                text-sm
                text-gray-200
            ">
                {value} mm
            </div>

        </div>
    );
}


function OperationProperties({
    operation
}) {

    if (!operation) {
        return (
            <div className="
                h-full
                flex
                items-center
                justify-center
                text-sm
                text-gray-500
            ">
                Keine Bearbeitung ausgewählt
            </div>
        );
    }


    const entries =
        Object.entries(operation)
            .filter(
                ([key]) =>
                    key !== "id" &&
                    key !== "type" &&
                    key !== "source"
            );


    return (
        <div className="
            space-y-2
        ">

            {/* Typ */}

            <div className="
                rounded
                border
                border-blue-700
                bg-gray-800
                p-3
            ">

                <div className="
                    text-xs
                    text-gray-500
                ">
                    Bearbeitungstyp
                </div>

                <div className="
                    mt-1
                    text-sm
                    text-blue-300
                ">
                    {operation.type}
                </div>

            </div>


            {/* Parameter */}

            {entries.map(
                ([key, value]) => {

                    if (
                        value === null ||
                        value === undefined
                    ) {
                        return null;
                    }


                    if (
                        typeof value === "object"
                    ) {

                        return (
                            <div
                                key={key}
                                className="
                                    rounded
                                    border
                                    border-gray-700
                                    bg-gray-800
                                    p-2
                                "
                            >

                                <div className="
                                    text-xs
                                    text-gray-500
                                ">
                                    {key}
                                </div>

                                <pre className="
                                    mt-1
                                    text-xs
                                    text-gray-300
                                    whitespace-pre-wrap
                                    break-all
                                ">
                                    {
                                        JSON.stringify(
                                            value,
                                            null,
                                            2
                                        )
                                    }
                                </pre>

                            </div>
                        );

                    }


                    return (
                        <div
                            key={key}
                            className="
                                flex
                                justify-between
                                gap-4
                                rounded
                                border
                                border-gray-800
                                bg-gray-800/50
                                px-2
                                py-1.5
                                text-sm
                            "
                        >

                            <span className="
                                text-gray-500
                            ">
                                {key}
                            </span>

                            <span className="
                                text-gray-200
                                text-right
                            ">
                                {String(value)}
                            </span>

                        </div>
                    );
                }
            )}

        </div>
    );
}


export default function CncPropertiesSidebar({
    part,
    group,
    selectedOperation
}) {

    if (!part) {

        return (
            <aside className="
                h-full
                bg-gray-900
                text-gray-500
            ">

                <div className="
                    h-full
                    flex
                    items-center
                    justify-center
                ">
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


    return (
        <aside className="
            h-full
            min-h-0
            min-w-0
            bg-gray-900
        ">

            {/* ============================================= */}
            {/* HEADER */}
            {/* ============================================= */}

            <div className="
                h-12
                shrink-0
                border-b
                border-gray-700
                flex
                items-center
                px-4
                font-semibold
                text-sm
            ">
                CNC Eigenschaften
            </div>


            {/* ============================================= */}
            {/* 2 HORIZONTALE BEREICHE */}
            {/* ============================================= */}

            <div className="
                grid
                grid-cols-2
                h-[calc(100%-3rem)]
                min-h-0
            ">


                {/* ========================================= */}
                {/* LINKS: BEARBEITUNGEN */}
                {/* ========================================= */}

                <section className="
                    min-w-0
                    min-h-0
                    overflow-y-auto
                    border-r
                    border-gray-700
                ">

                    <div className="
                        px-4
                        py-3
                        border-b
                        border-gray-700
                        text-sm
                        font-medium
                    ">
                        Bearbeitungen
                    </div>


                    <div className="
                        p-4
                        space-y-4
                    ">


                        {/* Anzahl */}

                        <div className="
                            rounded
                            border
                            border-gray-700
                            bg-gray-800
                            px-3
                            py-2
                        ">

                            <div className="
                                text-xs
                                text-gray-500
                            ">
                                Anzahl Bearbeitungen
                            </div>

                            <div className="
                                mt-1
                                text-sm
                                text-gray-200
                            ">
                                {operations.length}
                            </div>

                        </div>


                        {/* Operationen-Liste */}

                        {operations.length > 0 && (

                            <div>

                                <div className="
                                    text-xs
                                    text-gray-500
                                    mb-2
                                ">
                                    Operationen
                                </div>

                                <div className="
                                    space-y-1
                                ">

                                    {operations.map(
                                        (operation, index) => {

                                            const operationId =
                                                operation.id ??
                                                `operation-${index}`;

                                            const selected =
                                                selectedOperation?.id ===
                                                operationId;

                                            return (
                                                <div
                                                    key={
                                                        operationId
                                                    }
                                                    className={`
                                                        rounded
                                                        border
                                                        px-3
                                                        py-2
                                                        text-sm

                                                        ${
                                                            selected
                                                                ? "border-blue-700 bg-blue-900/40 text-blue-200"
                                                                : "border-gray-700 bg-gray-800 text-gray-300"
                                                        }
                                                    `}
                                                >

                                                    <div className="
                                                        flex
                                                        justify-between
                                                        gap-2
                                                    ">

                                                        <span>
                                                            {
                                                                index + 1
                                                            }.{" "}
                                                            {
                                                                operation.type
                                                            }
                                                        </span>

                                                        <span className="
                                                            text-xs
                                                            text-gray-500
                                                        ">
                                                            {operationId}
                                                        </span>

                                                    </div>

                                                </div>
                                            );

                                        }
                                    )}

                                </div>

                            </div>

                        )}


                        {/* Details */}

                        {selectedOperation && (

                            <div>

                                <div className="
                                    text-xs
                                    text-gray-500
                                    mb-2
                                ">
                                    Bearbeitungsdetails
                                </div>

                                <OperationProperties
                                    operation={
                                        selectedOperation
                                    }
                                />

                            </div>

                        )}

                    </div>

                </section>


                {/* ========================================= */}
                {/* RECHTS: GRUNDEIGENSCHAFTEN */}
                {/* ========================================= */}

                <section className="
                    min-w-0
                    min-h-0
                    overflow-y-auto
                ">

                    <div className="
                        px-4
                        py-3
                        border-b
                        border-gray-700
                        text-sm
                        font-medium
                    ">
                        Grundeigenschaften
                    </div>


                    <div className="
                        p-4
                        space-y-4
                    ">


                        {/* Bauteil */}

                        <section>

                            <div className="
                                text-xs
                                text-gray-500
                                mb-2
                            ">
                                Bauteil
                            </div>

                            <div className="
                                rounded
                                border
                                border-gray-700
                                bg-gray-800
                                p-3
                            ">

                                <div className="
                                    text-sm
                                    text-gray-200
                                ">
                                    {part.Objektname}
                                </div>

                                <div className="
                                    mt-1
                                    text-xs
                                    text-gray-500
                                ">
                                    PID: {part.PID}
                                </div>

                            </div>

                        </section>


                        {/* Abmessungen */}

                        <section>

                            <div className="
                                text-xs
                                text-gray-500
                                mb-2
                            ">
                                Abmessungen
                            </div>

                            <div className="
                                grid
                                grid-cols-3
                                gap-2
                            ">

                                <PropertyValue
                                    label="L"
                                    value={part.L}
                                />

                                <PropertyValue
                                    label="B"
                                    value={part.B}
                                />

                                <PropertyValue
                                    label="T"
                                    value={part.T}
                                />

                            </div>

                        </section>


                        {/* CNC Programm */}

                        <section>

                            <div className="
                                text-xs
                                text-gray-500
                                mb-2
                            ">
                                CNC Programm
                            </div>

                            <div className="
                                rounded
                                border
                                border-gray-700
                                bg-gray-800
                                p-3
                                text-sm
                                text-gray-200
                            ">
                                {group?.name ?? "—"}
                            </div>

                        </section>

                    </div>

                </section>

            </div>

        </aside>
    );
}
