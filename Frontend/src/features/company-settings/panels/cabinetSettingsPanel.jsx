

import React, {
    useState, useEffect
} from "react";
import axios from "axios";
import { getGlobalFile, uploadGlobalFile } from "../../../shared/cache/global-cache.js";
import { downloadFile, uploadJSONFile } from "../../../shared/api/file-api.js";
import MaterialSelect from "../../projects/cabinet/components/editor/properties/MaterialSelect.jsx";
import CabinetPresetModal from "../../projects/cabinet/components/editor/CabinetPresetModal.jsx";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";


const DEFAULT_CABINET = {

    width: 600,
    height: 720,
    depth: 535,

    thickness: 19,

    topOffset: 0,
    bottomOffset: 0,

    topExists: true,
    bottomExists: true,

    frontGap: 3,

    frontGapLeft: 0,
    frontGapRight: 0,
    frontGapTop: 0,
    frontGapBottom: 0,
    frontGrainDirection: "vertical",

    insetFront: {
        widthClearance: 5,
        heightAddition: 10,
        bottomClearance: 2.5
    },

    functionDefaults: {
        shelf: {
            holeRow: {
                centered: true
            }
        }
    },

    backPanel: {
        construction: "butt",
        continuous: "side"
    },

    spax: true,

    partListSettings: {
        grouping: "cabinet",

        separate: {
            fronts: false,
            shelves: false,
            middleWalls: false,
            legrabox: false
    }
},

};


export default function CabinetSettingsPanel() {

    const [cabinet, setCabinet] =
        useState(DEFAULT_CABINET);

    const [presets, setPresets] = useState([]);

    const [functionPresets, setFunctionPresets] = useState([]);

    const [activeTab, setActiveTab] = useState("standard");

    const [editingPreset, setEditingPreset] = useState(null);

    const [defaultConfig, setDefaultConfig] = useState(DEFAULT_CNC);


    const [saving, setSaving] =
        useState(false);

    const [loadSettings, setLoadSettings] = useState(false);


    const update =
        (changes) => {

            setCabinet(
                prev => ({
                    ...prev,
                    ...changes
                })
            );
        };


    const updateBackPanel =
        (changes) => {

            setCabinet(
                prev => ({
                    ...prev,

                    backPanel: {
                        ...prev.backPanel,
                        ...changes
                    }
                })
            );
        };

    const updateInsetFront = changes => {
        setCabinet(previous => ({
            ...previous,
            insetFront: {
                ...DEFAULT_CABINET.insetFront,
                ...(previous.insetFront ?? {}),
                ...changes
            }
        }));
    };

    const updateShelfHoleRowDefaults = changes => {
        setCabinet(previous => ({
            ...previous,
            functionDefaults: {
                ...previous.functionDefaults,
                shelf: {
                    ...previous.functionDefaults.shelf,
                    holeRow: {
                        ...previous.functionDefaults.shelf.holeRow,
                        ...changes
                    }
                }
            }
        }));
    };


    const savePreset = async () => {

        setSaving(true);

        try {

            if (activeTab === "presets") {
                await uploadGlobalFile({
                    file: "settings-cabinetPreset.json",
                    data: presets,
                    uploadFunction: { upload: uploadJSONFile, path: "/api/settings/cabinetPreset" }
                });
            } else if (activeTab === "functions") {
                await uploadGlobalFile({
                    file: "settings-functionPreset.json",
                    data: functionPresets,
                    uploadFunction: { upload: uploadJSONFile, path: "/api/settings/functionPreset" }
                });
            } else {
                await Promise.all([
                    uploadGlobalFile({
                        file: "settings-cabinet.json",
                        data: cabinet,
                        uploadFunction: { upload: uploadJSONFile, path: "/api/settings/cabinet" }
                    }),
                    uploadGlobalFile({
                        file: "settings-cabinetPreset.json",
                        data: presets,
                        uploadFunction: { upload: uploadJSONFile, path: "/api/settings/cabinetPreset" }
                    })
                ]);
            }


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

    const [materials, setMaterials] = useState([]);
    
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    const [materialError, setMaterialError] = useState(null);

    //fetch config json file
    useEffect(() => {
    
            const loadGeneratedData = async () => {
    
                setLoadSettings(true);
    
                try {
    
                    const [data, presetData, functionPresetData] = await Promise.all([
                        getGlobalFile({
                            file: "settings-cabinet.json",
                            loadFromServer: {download: downloadFile, path:"/api/settings/cabinet"}
                        }),
                        getGlobalFile({
                            file: "settings-cabinetPreset.json",
                            loadFromServer: {download: downloadFile, path:"/api/settings/cabinetPreset"}
                        }),
                        getGlobalFile({
                            file: "settings-functionPreset.json",
                            loadFromServer: {download: downloadFile, path:"/api/settings/functionPreset"}
                        })
                    ]);
    
    
                    // Datei existiert bereits
                    const { presets: legacyPresets, ...cabinetSettings } = data ?? {};
                    if (data) {
                        setCabinet({
                            ...DEFAULT_CABINET,
                            ...cabinetSettings,
                            insetFront: {
                                ...DEFAULT_CABINET.insetFront,
                                ...(cabinetSettings.insetFront ?? {})
                            }
                        });
                    } else {
                        setCabinet(DEFAULT_CABINET);
                    }

                    setPresets(
                        Array.isArray(presetData)
                            ? presetData
                            : Array.isArray(presetData?.presets)
                                ? presetData.presets
                                : Array.isArray(legacyPresets)
                                    ? legacyPresets
                                    : []
                    );

                    setFunctionPresets(Array.isArray(functionPresetData) ? functionPresetData : []);
    
    
                } catch (error) {
    
                    console.error(
                        "Generated data konnte nicht geladen werden",
                        error
                    );
    
                } finally {
    
                    setLoadSettings(false);
    
                }
    
            };
    
    
            loadGeneratedData();
    
        }, []);

    //load materials
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

    useEffect(() => {
        const loadCncSettings = async () => {
            try {
                const data = await getGlobalFile({
                    file: "settings-cnc.json",
                    loadFromServer: {
                        download: downloadFile,
                        path: "/api/settings/cnc"
                    }
                });

                if (data) {
                    setDefaultConfig(data.cncDefault ?? data);
                }
            } catch (error) {
                console.error("CNC-Einstellungen konnten nicht geladen werden:", error);
            }
        };

        loadCncSettings();
    }, []);

    const savePresetChanges = ({ name, cabinet: presetCabinet }) => {
        setPresets(previous => previous.map(preset => preset.id === editingPreset.id
                ? { ...preset, name, cabinet: presetCabinet }
                : preset));
        setEditingPreset(null);
    };

    return (
        <div className="responsive-settings-panel
            h-full
            overflow-y-auto
            p-6
        ">

            <div className="
                max-w-5xl
                space-y-6
            ">


                {/* Header */}

                <div className="
                    flex
                    items-start
                    justify-between
                ">

                    <div>

                        <h1 className="
                            text-lg
                            font-semibold
                        ">
                            Projekt
                        </h1>

                        <p className="
                            mt-1
                            text-sm
                            text-gray-500
                        ">
                            {activeTab === "presets"
                                ? "Cabinet Presets verwalten"
                                : activeTab === "functions"
                                    ? "Dimensionsunabhängige Sections und Funktionen verwalten"
                                    : "Standardwerte für den CabinetEditor"}
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={
                            savePreset
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
                            : activeTab === "presets"
                                ? "Cabinet Presets speichern"
                                : activeTab === "functions"
                                    ? "Function Presets speichern"
                                    : "Standardkorpus speichern"}
                    </button>

                </div>


                <div className="flex gap-2 border-b border-gray-700 pb-3">
                    {[
                        ["standard", "Standardkorpus"],
                        ["presets", "Cabinet Presets"],
                        ["functions", "Function Presets"]
                    ].map(([tab, label]) => (
                        <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-lg px-4 py-2 text-sm ${activeTab === tab ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
                            {label}{tab === "presets"
                                ? ` (${presets.length})`
                                : tab === "functions" ? ` (${functionPresets.length})` : ""}
                        </button>
                    ))}
                </div>

                {activeTab === "standard" ? (
                    <>
                {/* Maße */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="
                        font-medium
                        mb-4
                    ">
                        Standardkorpus
                    </h2>


                    <div className="
                        grid
                        grid-cols-4
                        gap-4
                    ">

                        <NumberField
                            label="Breite"
                            value={cabinet.width}
                            onChange={
                                value =>
                                    update({
                                        width: value
                                    })
                            }
                        />

                        <NumberField
                            label="Höhe"
                            value={cabinet.height}
                            onChange={
                                value =>
                                    update({
                                        height: value
                                    })
                            }
                        />

                        <NumberField
                            label="Tiefe"
                            value={cabinet.depth}
                            onChange={
                                value =>
                                    update({
                                        depth: value
                                    })
                            }
                        />

                        <NumberField
                            label="Materialstärke"
                            value={cabinet.thickness}
                            onChange={
                                value =>
                                    update({
                                        thickness: value
                                    })
                            }
                        />

                    </div>

                    <div className="mt-5 rounded-lg border border-gray-700 bg-gray-900 p-4">
                        <div className="mb-1 text-sm font-medium text-gray-300">
                            Innenliegende Schubladenfront
                        </div>
                        <p className="mb-4 text-xs text-gray-500">
                            Die Front wird aus der lichten Sektion und der verknüpften Legrabox berechnet.
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            <NumberField
                                label="Abzug lichte Breite"
                                value={cabinet.insetFront?.widthClearance ?? 5}
                                onChange={value => updateInsetFront({ widthClearance: value })}
                            />
                            <NumberField
                                label="Zugabe Legraboxhöhe"
                                value={cabinet.insetFront?.heightAddition ?? 10}
                                onChange={value => updateInsetFront({ heightAddition: value })}
                            />
                            <NumberField
                                label="Abstand unten"
                                value={cabinet.insetFront?.bottomClearance ?? 2.5}
                                onChange={value => updateInsetFront({ bottomClearance: value })}
                            />
                        </div>
                        <p className="mt-3 text-xs text-gray-500">
                            Standard: lichte Breite − 5 mm, Legraboxhöhe + 10 mm und 2,5 mm Abstand zur unteren lichten Kante.
                        </p>
                    </div>

                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <h2 className="mb-4 font-medium">Funktionsvorgaben</h2>
                    <Checkbox
                        checked={cabinet.functionDefaults.shelf.holeRow.centered}
                        label="Lochreihe mittig"
                        onChange={value => updateShelfHoleRowDefaults({ centered: value })}
                    />
                    <p className="mt-3 text-xs text-gray-500">
                        Wird für neu angelegte Funktionen „Einlegeböden + Lochreihe“ übernommen.
                    </p>
                </section>


                {/* Boden / Deckel */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="
                        font-medium
                        mb-4
                    ">
                        Boden und Deckel
                    </h2>


                    <div className="
                        grid
                        grid-cols-2
                        gap-4
                    ">

                        <NumberField
                            label="Bodenabstand"
                            value={
                                cabinet.bottomOffset
                            }
                            onChange={
                                value =>
                                    update({
                                        bottomOffset:
                                            value
                                    })
                            }
                        />


                        <NumberField
                            label="Deckelabstand"
                            value={
                                cabinet.topOffset
                            }
                            onChange={
                                value =>
                                    update({
                                        topOffset:
                                            value
                                    })
                            }
                        />

                    </div>


                    <div className="
                        mt-4
                        grid
                        grid-cols-2
                        gap-4
                    ">

                        <Checkbox
                            checked={
                                cabinet.bottomExists
                            }
                            label="Boden vorhanden"
                            onChange={
                                value =>
                                    update({
                                        bottomExists:
                                            value
                                    })
                            }
                        />

                        <Checkbox
                            checked={
                                cabinet.topExists
                            }
                            label="Deckel vorhanden"
                            onChange={
                                value =>
                                    update({
                                        topExists:
                                            value
                                    })
                            }
                        />

                    </div>

                </section>


                {/* Fronten */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="
                        font-medium
                        mb-4
                    ">
                        Fronten
                    </h2>


                    <div className="
                        grid
                        grid-cols-5
                        gap-3
                    ">

                        <NumberField
                            label="Fuge"
                            value={
                                cabinet.frontGap
                            }
                            onChange={
                                value =>
                                    update({
                                        frontGap:
                                            value
                                    })
                            }
                        />

                        <NumberField
                            label="Links"
                            value={
                                cabinet.frontGapLeft
                            }
                            onChange={
                                value =>
                                    update({
                                        frontGapLeft:
                                            value
                                    })
                            }
                        />

                        <NumberField
                            label="Rechts"
                            value={
                                cabinet.frontGapRight
                            }
                            onChange={
                                value =>
                                    update({
                                        frontGapRight:
                                            value
                                    })
                            }
                        />

                        <NumberField
                            label="Oben"
                            value={
                                cabinet.frontGapTop
                            }
                            onChange={
                                value =>
                                    update({
                                        frontGapTop:
                                            value
                                    })
                            }
                        />

                        <NumberField
                            label="Unten"
                            value={
                                cabinet.frontGapBottom
                            }
                            onChange={
                                value =>
                                    update({
                                        frontGapBottom:
                                            value
                                    })
                            }
                        />

                    </div>

                </section>


                {/* Rückwand */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="
                        font-medium
                        mb-4
                    ">
                        Rückwand
                    </h2>


                    <div className="
                        grid
                        grid-cols-2
                        gap-4
                    ">

                        <SelectField
                            label="Ausführung"
                            value={
                                cabinet.backPanel.construction
                            }
                            options={[
                                ["butt", "Stumpf"],
                                ["rabbet", "Falz"],
                                ["groove", "Nut geschlossen"],
                                ["grooveOpen", "Nut oben offen"]
                            ]}
                            onChange={
                                value =>
                                    updateBackPanel({
                                        construction:
                                            value
                                    })
                            }
                        />


                        <SelectField
                            label="Durchgehend"
                            value={
                                cabinet.backPanel.continuous
                            }
                            options={[
                                ["side", "Seite durchgehend"],
                                ["bottom", "Boden durchgehend"]
                            ]}
                            onChange={
                                value =>
                                    updateBackPanel({
                                        continuous:
                                            value
                                    })
                            }
                        />

                    </div>

                </section>


                {/* Material */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="
                        font-medium
                        mb-4
                    ">
                        Standardmaterialien
                    </h2>

                    <MaterialSelect
                        label="Korpusmaterial"
                        value={
                            cabinet.materialId
                        }
                        materials={
                            materials
                        }
                        loading={
                            loadingMaterials
                        }
                        error={
                            materialError
                        }
                        onChange={(value) =>
                            update({
                                materialId: value,
                                frontMaterialId: value,
                                frontEdgeMaterialId: value
                            })
                        }
                    />

                </section>
                    {/* List edit */}
                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="font-medium mb-4">
                        Teileliste
                    </h2>


                    <div className="
                        grid
                        grid-cols-2
                        gap-4
                    ">

                        <SelectField
                            label="Ausgabe"
                            value={
                                cabinet.partListSettings?.grouping ??
                                "cabinet"
                            }

                            options={[
                                [
                                    "cabinet",
                                    "Alle Teile in Korpusse gruppieren"
                                ],
                                [
                                    "separate",
                                    "Gruppen getrennt ausgeben"
                                ]
                            ]}

                            onChange={
                                value =>
                                    update({
                                        partListSettings: {
                                            ...(cabinet.partListSettings ?? {}),
                                            grouping: value,

                                            separate: {
                                                ...(cabinet.partListSettings?.separate ?? {}),
                                            }
                                        }
                                    })
                            }
                        />

                    </div>


                    {/* =====================================================
                    * Getrennte Gruppen
                    * ===================================================== */}

                    {
                        (
                            cabinet.partListSettings?.grouping ??
                            "cabinet"
                        ) === "separate" && (

                            <div className="
                                mt-5
                                rounded-lg
                                border
                                border-gray-700
                                bg-gray-900
                                p-4
                            ">

                                <div className="
                                    mb-3
                                    text-xs
                                    uppercase
                                    tracking-wide
                                    text-gray-500
                                ">
                                    Getrennte Gruppen
                                </div>


                                <div className="
                                    grid
                                    grid-cols-2
                                    gap-x-6
                                    gap-y-3
                                ">

                                    <Checkbox
                                        checked={
                                            cabinet.partListSettings?.separate?.fronts ??
                                            false
                                        }

                                        label="Fronten"

                                        onChange={
                                            value =>
                                                update({
                                                    partListSettings: {

                                                        ...(cabinet.partListSettings ?? {}),

                                                        grouping:
                                                            cabinet.partListSettings?.grouping ??
                                                            "separate",

                                                        separate: {

                                                            ...(cabinet.partListSettings?.separate ?? {}),

                                                            fronts:
                                                                value

                                                        }

                                                    }
                                                })
                                        }
                                    />


                                    <Checkbox
                                        checked={
                                            cabinet.partListSettings?.separate?.shelves ??
                                            false
                                        }

                                        label="Fächer"

                                        onChange={
                                            value =>
                                                update({
                                                    partListSettings: {

                                                        ...(cabinet.partListSettings ?? {}),

                                                        grouping:
                                                            cabinet.partListSettings?.grouping ??
                                                            "separate",

                                                        separate: {

                                                            ...(cabinet.partListSettings?.separate ?? {}),

                                                            shelves:
                                                                value

                                                        }

                                                    }
                                                })
                                        }
                                    />


                                    <Checkbox
                                        checked={
                                            cabinet.partListSettings?.separate?.middleWalls ??
                                            false
                                        }

                                        label="Mittelwände"

                                        onChange={
                                            value =>
                                                update({
                                                    partListSettings: {

                                                        ...(cabinet.partListSettings ?? {}),

                                                        grouping:
                                                            cabinet.partListSettings?.grouping ??
                                                            "separate",

                                                        separate: {

                                                            ...(cabinet.partListSettings?.separate ?? {}),

                                                            middleWalls:
                                                                value

                                                        }

                                                    }
                                                })
                                        }
                                    />


                                    <Checkbox
                                        checked={
                                            cabinet.partListSettings?.separate?.legrabox ??
                                            false
                                        }

                                        label="Legraboxen"

                                        onChange={
                                            value =>
                                                update({
                                                    partListSettings: {

                                                        ...(cabinet.partListSettings ?? {}),

                                                        grouping:
                                                            cabinet.partListSettings?.grouping ??
                                                            "separate",

                                                        separate: {

                                                            ...(cabinet.partListSettings?.separate ?? {}),

                                                            legrabox:
                                                                value

                                                        }

                                                    }
                                                })
                                        }
                                    />

                                </div>

                            </div>

                        )
                    }


                    {
                        (
                            cabinet.partListSettings?.grouping ??
                            "cabinet"
                        ) === "cabinet" && (

                            <div className="
                                mt-3
                                text-xs
                                text-gray-500
                            ">

                                Alle Teile werden in der Teileliste
                                dem jeweiligen Korpus zugeordnet.

                            </div>

                        )
                    }

                </section>
                    </>
                ) : activeTab === "presets" ? (
                    <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                        <div className="mb-4">
                            <h2 className="font-medium">Gespeicherte Cabinet Presets</h2>
                            <p className="mt-1 text-sm text-gray-500">Presets können umbenannt, in der Teileliste angepasst oder gelöscht werden.</p>
                        </div>

                        {presets.length ? (
                            <div className="space-y-2">
                                {presets.map(preset => (
                                    <div key={preset.id} className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 p-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium text-gray-100">{preset.name}</div>
                                            <div className="mt-0.5 text-xs text-gray-500">
                                                {preset.cabinet?.width} × {preset.cabinet?.height} × {preset.cabinet?.depth} mm
                                                <span className="ml-2">· {preset.cabinet?.partListPreset?.length ?? 0} Teile</span>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setEditingPreset(preset)} className="rounded border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800">Bearbeiten</button>
                                        <button type="button" onClick={() => setPresets(previous => previous.filter(item => item.id !== preset.id))} className="rounded border border-red-900 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950">Löschen</button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center text-sm text-gray-500">
                                Es sind noch keine Presets gespeichert. Halte im Cabinet Editor einen Korpus gedrückt, um ihn als Preset zu speichern.
                            </div>
                        )}
                    </section>
                ) : (
                    <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                        <div className="mb-5">
                            <h2 className="font-medium">Gespeicherte Function Presets</h2>
                            <p className="mt-1 max-w-3xl text-sm text-gray-500">
                                Diese Presets enthalten nur Sections und deren Function Config. Beim Anwenden werden sie proportional in die verfügbaren Maße des Zielkorpus eingepasst.
                            </p>
                        </div>

                        {functionPresets.length ? (
                            <div className="space-y-2">
                                {functionPresets.map(preset => (
                                    <div key={preset.id} className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 p-3">
                                        <div className="min-w-0 flex-1">
                                            <input
                                                aria-label="Name des Function Presets"
                                                value={preset.name ?? ""}
                                                onChange={event => setFunctionPresets(previous => previous.map(item => item.id === preset.id
                                                    ? { ...item, name: event.target.value }
                                                    : item))}
                                                className="w-full max-w-lg rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-gray-100 outline-none hover:border-gray-700 focus:border-blue-500 focus:bg-gray-950"
                                            />
                                            <div className="mt-0.5 px-2 text-xs text-gray-500">
                                                {preset.data?.sections?.length ?? 0} Hauptsektionen
                                                <span className="ml-2">· {countFunctions(preset.data?.sections)} Funktionen</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFunctionPresets(previous => previous.filter(item => item.id !== preset.id))}
                                            className="rounded border border-red-900 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950"
                                        >
                                            Löschen
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center">
                                <div className="text-sm text-gray-400">Noch keine Function Presets vorhanden.</div>
                                <div className="mt-1 text-xs text-gray-600">Erstelle Sections und Funktionen im Cabinet Editor und speichere sie dort über „Als Function Preset“.</div>
                            </div>
                        )}
                    </section>
                )}

            </div>

            {editingPreset && (
                <CabinetPresetModal
                    key={editingPreset.id}
                    cabinet={editingPreset.cabinet}
                    initialName={editingPreset.name}
                    materials={materials}
                    defaultConfig={defaultConfig}
                    dialogTitle="Cabinet-Preset bearbeiten"
                    saveLabel="Preset aktualisieren"
                    onCancel={() => setEditingPreset(null)}
                    onSave={savePresetChanges}
                />
            )}

        </div>
    );
}

function countFunctions(sections = []) {
    return sections.reduce((total, section) => total
        + (Array.isArray(section.functionConfig) ? section.functionConfig.length : 0)
        + countFunctions(section.children), 0);
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

            <div className="
                flex
                items-center
                gap-2
            ">

                <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={value ?? 0}
                    onChange={
                        event =>
                            onChange(
                                Math.max(
                                    0,
                                    Number(
                                        event.target.value
                                    ) || 0
                                )
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

                <span className="
                    text-xs
                    text-gray-600
                ">
                    mm
                </span>

            </div>

        </label>
    );
}


function Checkbox({
    checked,
    label,
    onChange
}) {

    return (
        <label className="
            flex
            items-center
            gap-2
            text-sm
            text-gray-300
        ">

            <input
                type="checkbox"
                checked={checked}
                onChange={
                    event =>
                        onChange(
                            event.target.checked
                        )
                }
                className="
                    h-4
                    w-4
                "
            />

            {label}

        </label>
    );
}


function SelectField({
    label,
    value,
    options,
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

            <select
                value={value}
                onChange={
                    event =>
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
                "
            >
                {options.map(
                    ([value, label]) => (
                        <option
                            key={value}
                            value={value}
                        >
                            {label}
                        </option>
                    )
                )}
            </select>

        </label>
    );
}
