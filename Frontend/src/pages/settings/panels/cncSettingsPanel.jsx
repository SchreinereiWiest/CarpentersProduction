import React, {
    useMemo,
    useState
} from "react";

const initialOperations = [

    {
        id: "shelf",
        name: "Einlegeboden",
        description:
            "Lochreihe für Einlegeböden",

        parameters: {
            diameter: 5,
            depth: 12,
            spacing: 32,
            frontOffset: 37,
            backOffset: 37,
            top: 150,
            bottom: 150
        }
    },


    {
        id: "vb",
        name: "VB",
        description:
            "Verbindungsbohrung",

        parameters: {
            diameter: 8,
            depth: 15,
            f: 0,
            spec:
                "50mm:1:1:1:50mm"
        }
    },


    {
        id: "vb2",
        name: "VB2",
        description:
            "Gespiegelte Verbindungsbohrung",

        parameters: {
            diameter: 8,
            depth: 15,
            f: 0,
            spec:
                "50mm:1:1:1:50mm"
        }
    },


    {
        id: "LgBox",
        name: "Legrabox",
        description:
            "Bohrbild für Legrabox",

        parameters: {
            diameter: 5,
            depth: 12,
            offset: 0
        }
    }

];


const initialLinks = [
    {
        id: "legrabox",
        name: "Legrabox",
        operation: "LgBox"
    },
    {
        id: "shelf",
        name: "Einlegeboden",
        operation: "shelf"
    },
    {
        id: "vb",
        name: "Verbindung VB",
        operation: "vb"
    },
    {
        id: "vb2",
        name: "Verbindung VB2",
        operation: "vb2"
    }
];


export default function CncSettingsPanel() {

    const [operations, setOperations] =
        useState(initialOperations);

    const [links, setLinks] =
        useState(initialLinks);


    const [selectedOperationId, setSelectedOperationId] =
        useState(
            initialOperations[0]?.id ?? null
        );


    const [tab, setTab] =
        useState("parameters");


    const [saving, setSaving] =
        useState(false);


    const selectedOperation =
        operations.find(
            operation =>
                operation.id ===
                selectedOperationId
        );


    const updateParameter =
        (
            key,
            value
        ) => {

            setOperations(
                prev =>
                    prev.map(
                        operation =>
                            operation.id !==
                            selectedOperationId
                                ? operation
                                : {
                                    ...operation,

                                    parameters: {
                                        ...operation.parameters,

                                        [key]:
                                            value
                                }
                            }
                    )
            );
        };


    const addOperation = () => {

        const operation = {

            id:
                crypto.randomUUID(),

            name:
                "Neue Bearbeitung",

            description:
                "",

            parameters: {
                diameter: 5,
                depth: 10
            }

        };


        setOperations(
            prev => [
                ...prev,
                operation
            ]
        );


        setSelectedOperationId(
            operation.id
        );
    };


    const deleteOperation = () => {

        if (!selectedOperation) {
            return;
        }


        setOperations(
            prev =>
                prev.filter(
                    operation =>
                        operation.id !==
                        selectedOperation.id
                )
        );


        setSelectedOperationId(
            operations.find(
                operation =>
                    operation.id !==
                    selectedOperation.id
            )?.id ?? null
        );
    };


    const updateLink = (
        linkId,
        operationId
    ) => {

        setLinks(
            prev =>
                prev.map(
                    link =>
                        link.id !== linkId
                            ? link
                            : {
                                ...link,
                                operation:
                                    operationId ||
                                    null
                            }
                )
        );
    };


    const saveSettings = async () => {

        setSaving(true);

        try {

            const data = {

                schemaVersion: 1,

                operations,

                links

            };


            /*
             * Später beispielsweise:
             *
             * await axios.put(
             *   "/api/company-settings/cnc",
             *   data
             * );
             */

            console.log(
                "CNC Settings:",
                data
            );

        } finally {

            setSaving(false);

        }
    };


    return (
        <div className="
            h-full
            min-h-0
            flex
            flex-col
        ">

            {/* ========================================== */}
            {/* Header */}
            {/* ========================================== */}

            <div className="
                h-16
                shrink-0
                border-b
                border-gray-700
                px-6
                flex
                items-center
                justify-between
            ">

                <div>

                    <h1 className="
                        text-lg
                        font-semibold
                    ">
                        CNC
                    </h1>

                    <div className="
                        text-xs
                        text-gray-500
                    ">
                        Bearbeitungen und Verknüpfungen
                    </div>

                </div>


                <button
                    type="button"
                    onClick={
                        saveSettings
                    }
                    disabled={saving}
                    className="
                        rounded
                        bg-blue-600
                        px-4
                        py-2
                        text-sm
                        hover:bg-blue-700
                        disabled:opacity-50
                    "
                >
                    {saving
                        ? "Speichern..."
                        : "Speichern"}
                </button>

            </div>


            {/* ========================================== */}
            {/* Inhalt */}
            {/* ========================================== */}

            <div className="
                flex-1
                min-h-0
                grid
                grid-cols-[280px_minmax(0,1fr)]
            ">


                {/* ====================================== */}
                {/* CNC Operationen */}
                {/* ====================================== */}

                <aside className="
                    min-h-0
                    overflow-y-auto
                    border-r
                    border-gray-700
                    p-2
                ">

                    <div className="
                        px-2
                        py-2
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                    ">
                        Bearbeitungen
                    </div>


                    {operations.map(
                        operation => {

                            const selected =
                                operation.id ===
                                selectedOperationId;


                            return (
                                <button
                                    key={
                                        operation.id
                                    }
                                    type="button"
                                    onClick={() => {

                                        setSelectedOperationId(
                                            operation.id
                                        );

                                        setTab(
                                            "parameters"
                                        );

                                    }}
                                    className={`
                                        w-full
                                        rounded-lg
                                        border
                                        px-3
                                        py-3
                                        mb-1
                                        text-left

                                        ${
                                            selected
                                                ? "border-blue-700 bg-gray-800"
                                                : "border-transparent hover:bg-gray-800"
                                        }
                                    `}
                                >

                                    <div className="
                                        text-sm
                                        text-gray-200
                                    ">
                                        {
                                            operation.name
                                        }
                                    </div>

                                    <div className="
                                        mt-1
                                        text-xs
                                        text-gray-500
                                    ">
                                        {
                                            operation.id
                                        }
                                    </div>

                                </button>
                            );
                        }
                    )}


                    <button
                        type="button"
                        onClick={
                            addOperation
                        }
                        className="
                            mt-3
                            w-full
                            rounded
                            border
                            border-dashed
                            border-gray-700
                            px-3
                            py-2
                            text-sm
                            text-gray-400
                            hover:bg-gray-800
                        "
                    >
                        + Bearbeitung
                    </button>

                </aside>


                {/* ====================================== */}
                {/* Editor */}
                {/* ====================================== */}

                <main className="
                    min-w-0
                    min-h-0
                    overflow-y-auto
                    p-6
                ">

                    {!selectedOperation ? (

                        <div className="
                            text-gray-500
                        ">
                            Keine Bearbeitung ausgewählt.
                        </div>

                    ) : (

                        <div className="
                            max-w-5xl
                            space-y-6
                        ">

                            {/* Name */}

                            <section className="
                                rounded-xl
                                border
                                border-gray-700
                                bg-gray-800
                                p-5
                            ">

                                <div className="
                                    text-xs
                                    text-gray-500
                                ">
                                    Bearbeitung
                                </div>

                                <div className="
                                    mt-1
                                    text-xl
                                    font-semibold
                                ">
                                    {
                                        selectedOperation.name
                                    }
                                </div>

                                <div className="
                                    mt-1
                                    text-sm
                                    text-gray-500
                                ">
                                    {
                                        selectedOperation.description
                                    }
                                </div>

                            </section>


                            {/* Tabs */}

                            <div className="
                                flex
                                gap-1
                                border-b
                                border-gray-700
                            ">

                                <Tab
                                    active={
                                        tab ===
                                        "parameters"
                                    }
                                    onClick={() =>
                                        setTab(
                                            "parameters"
                                        )
                                    }
                                >
                                    Parameter
                                </Tab>

                                <Tab
                                    active={
                                        tab ===
                                        "pattern"
                                    }
                                    onClick={() =>
                                        setTab(
                                            "pattern"
                                        )
                                    }
                                >
                                    Bohrbild
                                </Tab>

                                <Tab
                                    active={
                                        tab ===
                                        "links"
                                    }
                                    onClick={() =>
                                        setTab(
                                            "links"
                                        )
                                    }
                                >
                                    Verknüpfungen
                                </Tab>

                            </div>


                            {/* ================================= */}
                            {/* Parameter */}
                            {/* ================================= */}

                            {tab ===
                                "parameters" && (

                                <section className="
                                    rounded-xl
                                    border
                                    border-gray-700
                                    bg-gray-800
                                    p-5
                                ">

                                    <div className="
                                        grid
                                        grid-cols-3
                                        gap-4
                                    ">

                                        {Object.entries(
                                            selectedOperation.parameters ??
                                            {}
                                        ).map(
                                            ([key, value]) => {

                                                if (
                                                    typeof value ===
                                                    "number"
                                                ) {

                                                    return (
                                                        <NumberField
                                                            key={key}
                                                            label={key}
                                                            value={value}
                                                            onChange={
                                                                next =>
                                                                    updateParameter(
                                                                        key,
                                                                        next
                                                                    )
                                                            }
                                                        />
                                                    );

                                                }


                                                return (
                                                    <label
                                                        key={key}
                                                        className="
                                                            block
                                                            col-span-1
                                                        "
                                                    >

                                                        <span className="
                                                            block
                                                            text-xs
                                                            text-gray-500
                                                            mb-1
                                                        ">
                                                            {key}
                                                        </span>

                                                        <input
                                                            value={
                                                                value ??
                                                                ""
                                                            }
                                                            onChange={
                                                                event =>
                                                                    updateParameter(
                                                                        key,
                                                                        event.target.value
                                                                    )
                                                            }
                                                            className="
                                                                w-full
                                                                rounded
                                                                border
                                                                border-gray-700
                                                                bg-gray-900
                                                                px-3
                                                                py-2
                                                                text-sm
                                                            "
                                                        />

                                                    </label>
                                                );
                                            }
                                        )}

                                    </div>

                                </section>

                            )}


                            {/* ================================= */}
                            {/* Bohrbild */}
                            {/* ================================= */}

                            {tab ===
                                "pattern" && (

                                <section className="
                                    rounded-xl
                                    border
                                    border-gray-700
                                    bg-gray-800
                                    p-5
                                ">

                                    <div className="
                                        text-sm
                                        text-gray-300
                                        mb-3
                                    ">
                                        Bohrbild-Konfiguration
                                    </div>

                                    <div className="
                                        rounded
                                        bg-gray-900
                                        border
                                        border-gray-700
                                        p-4
                                        font-mono
                                        text-sm
                                        text-gray-400
                                    ">
                                        {
                                            JSON.stringify(
                                                selectedOperation.parameters,
                                                null,
                                                2
                                            )
                                        }
                                    </div>

                                </section>

                            )}


                            {/* ================================= */}
                            {/* Links */}
                            {/* ================================= */}

                            {tab ===
                                "links" && (

                                <section className="
                                    rounded-xl
                                    border
                                    border-gray-700
                                    bg-gray-800
                                    p-5
                                ">

                                    <div className="
                                        space-y-3
                                    ">

                                        {links.map(
                                            link => (

                                                <div
                                                    key={
                                                        link.id
                                                    }
                                                    className="
                                                        grid
                                                        grid-cols-[1fr_240px]
                                                        gap-4
                                                        items-center
                                                    "
                                                >

                                                    <div>

                                                        <div className="
                                                            text-sm
                                                            text-gray-200
                                                        ">
                                                            {
                                                                link.name
                                                            }
                                                        </div>

                                                        <div className="
                                                            text-xs
                                                            text-gray-500
                                                        ">
                                                            {
                                                                link.id
                                                            }
                                                        </div>

                                                    </div>


                                                    <select
                                                        value={
                                                            link.operation ??
                                                            ""
                                                        }
                                                        onChange={
                                                            event =>
                                                                updateLink(
                                                                    link.id,
                                                                    event.target.value
                                                                )
                                                        }
                                                        className="
                                                            rounded
                                                            border
                                                            border-gray-700
                                                            bg-gray-900
                                                            px-3
                                                            py-2
                                                            text-sm
                                                        "
                                                    >

                                                        <option value="">
                                                            Keine
                                                        </option>

                                                        {operations.map(
                                                            operation => (

                                                                <option
                                                                    key={
                                                                        operation.id
                                                                    }
                                                                    value={
                                                                        operation.id
                                                                    }
                                                                >
                                                                    {
                                                                        operation.name
                                                                    }
                                                                </option>

                                                            )
                                                        )}

                                                    </select>

                                                </div>

                                            )
                                        )}

                                    </div>

                                </section>

                            )}


                            {/* Löschen */}

                            <div className="
                                border-t
                                border-gray-800
                                pt-4
                            ">

                                <button
                                    type="button"
                                    onClick={
                                        deleteOperation
                                    }
                                    className="
                                        rounded
                                        border
                                        border-red-800
                                        px-4
                                        py-2
                                        text-sm
                                        text-red-400
                                        hover:bg-red-950
                                    "
                                >
                                    Bearbeitung löschen
                                </button>

                            </div>

                        </div>

                    )}

                </main>

            </div>

        </div>
    );
}


function Tab({
    active,
    children,
    onClick
}) {

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                px-4
                py-2
                text-sm
                border-b-2

                ${
                    active
                        ? "border-blue-500 text-white"
                        : "border-transparent text-gray-500 hover:text-gray-300"
                }
            `}
        >
            {children}
        </button>
    );
}


function NumberField({
    label,
    value,
    onChange
}) {

    return (
        <label className="block">

            <span className="
                block
                text-xs
                text-gray-500
                mb-1
            ">
                {label}
            </span>

            <input
                type="number"
                value={value ?? 0}
                onChange={
                    event =>
                        onChange(
                            Number(
                                event.target.value
                            ) || 0
                        )
                }
                className="
                    w-full
                    rounded
                    border
                    border-gray-700
                    bg-gray-900
                    px-3
                    py-2
                    text-sm
                    text-white
                    outline-none
                    focus:border-blue-500
                "
            />

        </label>
    );
}