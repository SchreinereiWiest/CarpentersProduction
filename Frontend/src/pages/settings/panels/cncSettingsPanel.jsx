import React, {
    useState,
    useEffect
} from "react";

import {
    DEFAULT_CNC
} from "../../projects/cabinetConfigurator/engine/cnc/cncDefaults";
import { getGlobalFile, uploadGlobalFile } from "../../../services/globalMemoryCache";
import { downloadFile, uploadJSONFile } from "../../../services/apiTemplates";
import axios from "axios";

const cloneConfig = (value) => {

    return JSON.parse(
        JSON.stringify(value)
    );

};

export default function CncSettingsPanel() {

    const [
        config,
        setConfig
    ] = useState(
        () =>
            cloneConfig(
                DEFAULT_CNC
            )
    );


    const [
        selectedSection,
        setSelectedSection
    ] = useState("spax");


    const [
        saving,
        setSaving
    ] = useState(false);


    /* =====================================================
     * Verschachtelte Werte ändern
     * ===================================================== */

    const updateConfig = (
        path,
        value
    ) => {

        setConfig(
            previous => {

                const next =
                    cloneConfig(
                        previous
                    );


                let target =
                    next;


                for (
                    let i = 0;
                    i < path.length - 1;
                    i++
                ) {

                    target =
                        target[
                            path[i]
                        ];

                }


                target[
                    path[path.length - 1]
                ] =
                    value;


                return next;

            }
        );

    };


    const updateNumber = (
        path,
        value
    ) => {

        updateConfig(
            path,
            Number(value) || 0
        );

    };


    const updateBoolean = (
        path,
        value
    ) => {

        updateConfig(
            path,
            Boolean(value)
        );

    };


    /* =====================================================
     * Depth Pattern
     * ===================================================== */

    const updateDepthPattern = (
        index,
        value
    ) => {

        const pattern =
            [
                ...(config.legrabox.depthPattern ??
                    [])
            ];


        pattern[index] =
            Number(value) || 0;


        updateConfig(
            [
                "legrabox",
                "depthPattern"
            ],
            pattern
        );

    };


    /* =====================================================
     * Speichern
     * ===================================================== */

    const saveSettings =
        async () => {

            setSaving(true);


            try {

                const data = {

                    schemaVersion:
                        1,

                    cncDefault:
                        config

                };


                console.log(
                    "CNC Settings:",
                    data
                );


                const response = await uploadGlobalFile({
                                
                    file: "settings-cnc.json",
        
                    data: data,
                    
                    uploadFunction: {upload: uploadJSONFile, path:"/api/settings/cnc"}
                });

            } catch (error) {

                console.error(
                    "Error uploading cabinet.json:",
                    error
                );

                console.error(
                    "Response:",
                    error.response?.data
                );
            }
            setSaving(false);
        };


    const resetSettings =
        () => {

            setConfig(
                cloneConfig(
                    DEFAULT_CNC
                )
            );

        };


    const sections = [

        {
            id:
                "spax",

            name:
                "Spax / Verbinder"

        },

        {
            id:
                "shelf",

            name:
                "Fachboden"

        },

        {
            id:
                "legrabox",

            name:
                "Legrabox"

        },

        {
            id:
                "backPanel",

            name:
                "Rückwand"

        }

    ];

        useEffect(() => {
            const loadGeneratedData = async () => {
            
                    try {
            
                        const data =
                            await getGlobalFile({
        
                                file: "settings-cnc.json",
        
                                loadFromServer: {download: downloadFile, path:"/api/settings/cnc"}
        
                            });

                        console.log(data);
            
                        // Datei existiert bereits
                        if (data) {
                                   
                            setConfig(data.cncDefault);
        
                            return;
               
                        }
            
                    } catch (error) {
            
                        console.error(
                            "Generated data konnte nicht geladen werden",
                            error
                        );
            
                    }
            
                };
    
            loadGeneratedData();
        }, []);


    return (

        <div className="
            h-full
            min-h-0
            flex
            flex-col
            bg-gray-900
            text-white
        ">


            {/* =================================================
             * Header
             * ================================================= */}

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
                        Bearbeitungsparameter
                    </div>

                </div>


                <div className="
                    flex
                    items-center
                    gap-2
                ">

                    <button
                        type="button"
                        onClick={
                            resetSettings
                        }
                        className="
                            rounded
                            border
                            border-gray-700
                            px-4
                            py-2
                            text-sm
                            text-gray-400
                            hover:bg-gray-800
                        "
                    >
                        Standardwerte
                    </button>


                    <button
                        type="button"
                        onClick={
                            saveSettings
                        }
                        disabled={
                            saving
                        }
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
                        {
                            saving
                                ? "Speichern..."
                                : "Speichern"
                        }
                    </button>

                </div>

            </div>


            {/* =================================================
             * Hauptbereich
             * ================================================= */}

            <div className="
                flex-1
                min-h-0
                grid
                grid-cols-[240px_minmax(0,1fr)]
            ">


                {/* =================================================
                 * Navigation
                 * ================================================= */}

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
                        Bereiche
                    </div>


                    <div className="
                        space-y-1
                    ">

                        {
                            sections.map(
                                section => {

                                    const selected =
                                        selectedSection ===
                                        section.id;


                                    return (

                                        <button
                                            key={
                                                section.id
                                            }

                                            type="button"

                                            onClick={() =>
                                                setSelectedSection(
                                                    section.id
                                                )
                                            }

                                            className={`
                                                w-full
                                                rounded-lg
                                                border
                                                px-3
                                                py-3
                                                text-left
                                                text-sm
                                                transition

                                                ${
                                                    selected

                                                        ? "border-blue-700 bg-gray-800 text-blue-200"

                                                        : "border-transparent text-gray-300 hover:bg-gray-800"
                                                }
                                            `}
                                        >

                                            {
                                                section.name
                                            }

                                        </button>

                                    );

                                }
                            )
                        }

                    </div>

                </aside>


                {/* =================================================
                 * Inhalt
                 * ================================================= */}

                <main className="
                    min-w-0
                    min-h-0
                    overflow-y-auto
                    p-6
                ">


                    {
                        selectedSection ===
                            "spax" && (

                            <SpaxSettings
                                config={
                                    config
                                }
                                updateNumber={
                                    updateNumber
                                }
                                updateBoolean={
                                    updateBoolean
                                }
                            />

                        )
                    }


                    {
                        selectedSection ===
                            "shelf" && (

                            <ShelfSettings
                                config={
                                    config
                                }
                                updateNumber={
                                    updateNumber
                                }
                            />

                        )
                    }


                    {
                        selectedSection ===
                            "legrabox" && (

                            <LegraboxSettings
                                config={
                                    config
                                }
                                updateNumber={
                                    updateNumber
                                }
                                updateDepthPattern={
                                    updateDepthPattern
                                }
                            />

                        )
                    }


                    {
                        selectedSection ===
                            "backPanel" && (

                            <BackPanelSettings
                                config={
                                    config
                                }
                                updateNumber={
                                    updateNumber
                                }
                            />

                        )
                    }

                </main>

            </div>

        </div>

    );

}


/* =========================================================
 * SPAX
 * ========================================================= */

function SpaxSettings({
    config,
    updateNumber,
    updateBoolean
}) {
    return (

        <div className="
            max-w-5xl
            space-y-6
        ">


            <SettingsHeader
                title="Spax / Verbinder"
                description="
                    Einstellungen für VB, VBH und Spax-Bohrungen
                "
            />


            {/* =================================================
             * Geschraubt
             * ================================================= */}

            <SettingsCard
                title="Allgemein"
            >

                <ToggleField
                    label="Geschraubt"
                    value={
                        config.spax.enabled
                    }
                    onChange={
                        value =>
                            updateBoolean(
                                [
                                    "spax",
                                    "enabled"
                                ],
                                value
                            )
                    }
                />

            </SettingsCard>


            {/* =================================================
             * Schraube
             * ================================================= */}

            <SettingsCard
                title="Spax"
            >

                <div className="
                    grid
                    grid-cols-4
                    gap-4
                ">

                    <NumberField
                        label="Durchmesser"
                        value={
                            config.spax.screw
                                .diameter
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "screw",
                                        "diameter"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Tiefe"
                        value={
                            config.spax.screw
                                .depth
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "screw",
                                        "depth"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Startabstand"
                        value={
                            config.spax.screw
                                .startOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "screw",
                                        "startOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Endabstand"
                        value={
                            config.spax.screw
                                .endOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "screw",
                                        "endOffset"
                                    ],
                                    value
                                )
                        }
                    />

                </div>

            </SettingsCard>


            {/* =================================================
             * Verbinder
             * ================================================= */}

            <SettingsCard
                title="Verbinder Ø 8 mm"
            >

                <div className="
                    grid
                    grid-cols-4
                    gap-4
                ">

                    <NumberField
                        label="Durchmesser"
                        value={
                            config.spax.connector
                                .diameter
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "connector",
                                        "diameter"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Tiefe"
                        value={
                            config.spax.connector
                                .depth
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "connector",
                                        "depth"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Startabstand"
                        value={
                            config.spax.connector
                                .startOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "connector",
                                        "startOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Endabstand"
                        value={
                            config.spax.connector
                                .endOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "connector",
                                        "endOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Schwellenwert 3 Löcher"
                        value={
                            config.spax.connector
                                .holeCountThreshold
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "connector",
                                        "holeCountThreshold"
                                    ],
                                    value
                                )
                        }
                    />

                </div>

            </SettingsCard>


            {/* =================================================
             * Horizontal
             * ================================================= */}

            <SettingsCard
                title="Horizontale Verbinder"
            >

                <div className="
                    grid
                    grid-cols-4
                    gap-4
                ">

                    <NumberField
                        label="Durchmesser"
                        value={
                            config.spax.horizontal
                                .diameter
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "horizontal",
                                        "diameter"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Tiefe"
                        value={
                            config.spax.horizontal
                                .depth
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "horizontal",
                                        "depth"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Startabstand"
                        value={
                            config.spax.horizontal
                                .startOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "horizontal",
                                        "startOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Endabstand"
                        value={
                            config.spax.horizontal
                                .endOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "spax",
                                        "horizontal",
                                        "endOffset"
                                    ],
                                    value
                                )
                        }
                    />

                </div>

            </SettingsCard>

        </div>

    );

}


/* =========================================================
 * FACHBODEN
 * ========================================================= */

function ShelfSettings({
    config,
    updateNumber
}) {

    return (

        <div className="
            max-w-5xl
            space-y-6
        ">

            <SettingsHeader
                title="Fachboden"
                description="
                    Einstellungen für die Lochreihen der Fachböden
                "
            />


            <SettingsCard
                title="Lochreihe"
            >

                <div className="
                    grid
                    grid-cols-5
                    gap-4
                ">

                    <NumberField
                        label="Durchmesser"
                        value={
                            config.shelf
                                .diameter
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "shelf",
                                        "diameter"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Tiefe"
                        value={
                            config.shelf
                                .depth
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "shelf",
                                        "depth"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Vorne"
                        value={
                            config.shelf
                                .frontOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "shelf",
                                        "frontOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Hinten"
                        value={
                            config.shelf
                                .backOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "shelf",
                                        "backOffset"
                                    ],
                                    value
                                )
                        }
                    />

                </div>

            </SettingsCard>

        </div>

    );

}


/* =========================================================
 * LEGRABOX
 * ========================================================= */

function LegraboxSettings({
    config,
    updateNumber,
    updateDepthPattern
}) {

    const depthPattern =
        config.legrabox.depthPattern ??
        [];


    return (

        <div className="
            max-w-5xl
            space-y-6
        ">

            <SettingsHeader
                title="Legrabox"
                description="
                    Einstellungen für das Legrabox-Bohrbild
                "
            />


            <SettingsCard
                title="Allgemein"
            >

                <div className="
                    grid
                    grid-cols-3
                    gap-4
                ">

                    <NumberField
                        label="Durchmesser"
                        value={
                            config.legrabox
                                .diameter
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "legrabox",
                                        "diameter"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Tiefe"
                        value={
                            config.legrabox
                                .depth
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "legrabox",
                                        "depth"
                                    ],
                                    value
                                )
                        }
                    />

                </div>

            </SettingsCard>


            <SettingsCard
                title="Tiefenpositionen"
            >

                <div className="
                    grid
                    grid-cols-5
                    gap-4
                ">

                    {
                        depthPattern.map(
                            (
                                value,
                                index
                            ) => (

                                <NumberField
                                    key={
                                        index
                                    }

                                    label={
                                        `Loch ${index + 1}`
                                    }

                                    value={
                                        value
                                    }

                                    onChange={
                                        next =>
                                            updateDepthPattern(
                                                index,
                                                next
                                            )
                                    }
                                />

                            )
                        )
                    }

                </div>


                <div className="
                    mt-3
                    text-xs
                    text-gray-500
                ">

                    Diese Positionen werden in der Reihenfolge
                    der CNC-Bohrungen verwendet.

                </div>

            </SettingsCard>

        </div>

    );

}


/* =========================================================
 * RÜCKWAND
 * ========================================================= */

function BackPanelSettings({
    config,
    updateNumber
}) {

    return (

        <div className="
            max-w-5xl
            space-y-6
        ">

            <SettingsHeader
                title="Rückwand"
                description="
                    Einstellungen für Nut, Falz und Rückwandbearbeitung
                "
            />


            {/* =================================================
             * Nut
             * ================================================= */}

            <SettingsCard
                title="Rückwandnut"
            >

                <div className="
                    grid
                    grid-cols-4
                    gap-4
                ">

                    <NumberField
                        label="Vorne"
                        value={
                            config.backPanel.groove
                                .frontOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "frontOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Hinten"
                        value={
                            config.backPanel.groove
                                .backOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "backOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Nut-Tiefe"
                        value={
                            config.backPanel.groove
                                .depth
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "depth"
                                    ],
                                    value
                                )
                        }
                    />

                </div>

            </SettingsCard>


            {/* =================================================
             * RNT
             * ================================================= */}

            <SettingsCard
                title="RNT"
            >

                <div className="
                    grid
                    grid-cols-4
                    gap-4
                ">

                    <NumberField
                        label="Start"
                        value={
                            config.backPanel.groove.rnt
                                .startOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "rnt",
                                        "startOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Ende"
                        value={
                            config.backPanel.groove.rnt
                                .endOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "rnt",
                                        "endOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Offen Start"
                        value={
                            config.backPanel.groove.rnt
                                .openStartOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "rnt",
                                        "openStartOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Zwischen Start"
                        value={
                            config.backPanel.groove.rnt
                                .intermediateStartOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "rnt",
                                        "intermediateStartOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Zwischen Ende"
                        value={
                            config.backPanel.groove.rnt
                                .intermediateEndOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "rnt",
                                        "intermediateEndOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Y"
                        value={
                            config.backPanel.groove.rnt
                                .y
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "rnt",
                                        "y"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Z"
                        value={
                            config.backPanel.groove.rnt
                                .z
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "rnt",
                                        "z"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Breite"
                        value={
                            config.backPanel.groove.rnt
                                .width
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "rnt",
                                        "width"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Werkzeug"
                        value={
                            config.backPanel.groove.rnt
                                .tool
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "rnt",
                                        "tool"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="C"
                        value={
                            config.backPanel.groove.rnt
                                .c
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "groove",
                                        "rnt",
                                        "c"
                                    ],
                                    value
                                )
                        }
                    />

                </div>

            </SettingsCard>


            {/* =================================================
             * Falz
             * ================================================= */}

            <SettingsCard
                title="Falz"
            >

                <div className="
                    grid
                    grid-cols-3
                    gap-4
                ">

                    <NumberField
                        label="Startabstand"
                        value={
                            config.backPanel.rabbet
                                .startOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "rabbet",
                                        "startOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Tiefe"
                        value={
                            config.backPanel.rabbet
                                .depth
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "rabbet",
                                        "depth"
                                    ],
                                    value
                                )
                        }
                    />

                </div>

            </SettingsCard>


            {/* =================================================
             * Eingesetzter Falz
             * ================================================= */}

            <SettingsCard
                title="Eingesetzter Falz"
            >

                <div className="
                    grid
                    grid-cols-3
                    gap-4
                ">

                    <NumberField
                        label="Startabstand"
                        value={
                            config.backPanel
                                .insertedRabbet
                                .startOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "insertedRabbet",
                                        "startOffset"
                                    ],
                                    value
                                )
                        }
                    />

                    <NumberField
                        label="Tiefe"
                        value={
                            config.backPanel
                                .insertedRabbet
                                .depth
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "backPanel",
                                        "insertedRabbet",
                                        "depth"
                                    ],
                                    value
                                )
                        }
                    />

                </div>

            </SettingsCard>

        </div>

    );

}


/* =========================================================
 * UI-Helfer
 * ========================================================= */

function SettingsHeader({
    title,
    description
}) {

    return (

        <div>

            <h2 className="
                text-xl
                font-semibold
                text-gray-100
            ">
                {title}
            </h2>

            <div className="
                mt-1
                text-sm
                text-gray-500
            ">
                {description}
            </div>

        </div>

    );

}


function SettingsCard({
    title,
    children
}) {

    return (

        <section className="
            rounded-xl
            border
            border-gray-700
            bg-gray-800
            p-5
        ">

            <div className="
                mb-4
                text-sm
                font-medium
                text-gray-300
            ">
                {title}
            </div>

            {children}

        </section>

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
                mb-1
                block
                text-xs
                text-gray-500
            ">
                {label}
            </span>

            <input
                type="number"
                step="any"
                value={
                    value ?? 0
                }
                onChange={event =>
                    onChange(
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
                    text-white
                    outline-none
                    focus:border-blue-500
                "
            />

        </label>

    );

}


function ToggleField({
    label,
    value,
    onChange
}) {

    return (

        <label className="
            flex
            items-center
            justify-between
            cursor-pointer
        ">

            <span className="
                text-sm
                text-gray-300
            ">
                {label}
            </span>


            <input
                type="checkbox"
                checked={
                    value === true
                }
                onChange={event =>
                    onChange(
                        event.target.checked
                    )
                }
                className="
                    h-4
                    w-4
                    rounded
                    border-gray-600
                    bg-gray-900
                    text-blue-600
                "
            />

        </label>

    );

}