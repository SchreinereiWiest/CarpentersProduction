import React, {
    useState,
    useEffect
} from "react";

import {
    DEFAULT_CNC
} from "@Engine/cabinet/cnc/cncDefaults.js";
import { getGlobalFile, uploadGlobalFile } from "../../../shared/cache/global-cache.js";
import { downloadFile, uploadJSONFile } from "../../../shared/api/file-api.js";
import MaterialSelect from "../../projects/cabinet/components/editor/properties/MaterialSelect.jsx";
import axios from "axios";
import {
    AVAILABLE_POSTPROCESSORS,
    MACHINING_INTENTS,
    createPluginConfiguration,
    getUsedMachiningStrategies
} from "@Engine/postprocessor/index.js";
import { createId } from "@Engine/shared/id.js";

const cloneConfig = (value) => {

    return JSON.parse(
        JSON.stringify(value)
    );

};

const mergeConfig = (defaults, saved) => {
    if (
        !defaults ||
        typeof defaults !== "object" ||
        Array.isArray(defaults) ||
        !saved ||
        typeof saved !== "object" ||
        Array.isArray(saved)
    ) {
        return saved === undefined
            ? cloneConfig(defaults)
            : cloneConfig(saved);
    }

    const merged = {};

    for (const key of new Set([
        ...Object.keys(defaults),
        ...Object.keys(saved)
    ])) {
        merged[key] = key in saved
            ? mergeConfig(defaults[key], saved[key])
            : cloneConfig(defaults[key]);
    }

    return merged;
};

const STRATEGY_PANELS = {
    "connector.drill": { id: "connector.drill", name: "Bohrverbinder" },
    "connector.clamex": { id: "connector.clamex", name: "Clamex" },
    "connector.screw": { id: "connector.screw", name: "Spax" },
    "shelf.row": { id: "shelf.row", name: "Fachboden" },
    "drawer.legrabox": { id: "drawer.legrabox", name: "Legrabox" },
    "back.groove": { id: "back.groove", name: "Rückwandnut" },
    "back.rabbet": { id: "back.rabbet", name: "Rückwandfalz" }
};

const createLegacyPostprocessorInstance = () => {
    const descriptor = AVAILABLE_POSTPROCESSORS.find(item => item.id === "legacy-viewer-bridge");
    return descriptor ? {
        id: "builtin-legacy-viewer",
        pluginId: descriptor.id,
        name: "CNC Viewer",
        enabled: true,
        configuration: createPluginConfiguration({ manifest: descriptor })
    } : null;
};

export default function CncSettingsPanel() {

    const [activeTab, setActiveTab] = useState("machining");

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
    ] = useState("assignments");


    const [
        saving,
        setSaving
    ] = useState(false);

    const [materials, setMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [materialError, setMaterialError] = useState(null);
    const [postprocessors, setPostprocessors] = useState(() => {
        const legacy = createLegacyPostprocessorInstance();
        return legacy ? [legacy] : [];
    });
    const [activePostprocessorId, setActivePostprocessorId] = useState("builtin-legacy-viewer");
    const [selectedPluginId, setSelectedPluginId] = useState(AVAILABLE_POSTPROCESSORS[0]?.id ?? "");

    const activePostprocessor = postprocessors.find(item => item.id === activePostprocessorId) ?? postprocessors[0] ?? null;
    const activePostprocessorDescriptor = AVAILABLE_POSTPROCESSORS.find(item => item.id === activePostprocessor?.pluginId) ?? null;


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
                        2,

                    cncDefault:
                        config,

                    postprocessors,
                    activePostprocessorId

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


    const usedStrategies = getUsedMachiningStrategies(
        config.machiningAssignments,
        activePostprocessorDescriptor?.supportedMachiningStrategies
    );
    const sections = [
        { id: "assignments", name: "Zuordnungen" },
        ...usedStrategies
            .map(strategy => STRATEGY_PANELS[strategy.id])
            .filter(Boolean)
    ];
    const visibleSectionKey = sections.map(section => section.id).join("|");

    useEffect(() => {
        if (!visibleSectionKey.split("|").includes(selectedSection)) {
            setSelectedSection("assignments");
        }
    }, [selectedSection, visibleSectionKey]);

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
                                   
                            setConfig(
                                mergeConfig(
                                    DEFAULT_CNC,
                                    data.cncDefault ?? data
                                )
                            );

                            const savedPostprocessors = Array.isArray(data.postprocessors)
                                ? data.postprocessors
                                : [createLegacyPostprocessorInstance()].filter(Boolean);
                            setPostprocessors(savedPostprocessors);
                            setActivePostprocessorId(
                                savedPostprocessors.some(item => item.id === data.activePostprocessorId)
                                    ? data.activePostprocessorId
                                    : savedPostprocessors[0]?.id ?? null
                            );
        
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

        const addPostprocessor = () => {
            const descriptor = AVAILABLE_POSTPROCESSORS.find(item => item.id === selectedPluginId);
            if (!descriptor) return;
            const plugin = {
                id: createId(),
                pluginId: descriptor.id,
                name: descriptor.name,
                enabled: true,
                configuration: createPluginConfiguration({ manifest: descriptor })
            };
            setPostprocessors(previous => [...previous, plugin]);
            setActivePostprocessorId(plugin.id);
        };

        const updatePostprocessor = changes => {
            if (!activePostprocessor) return;
            setPostprocessors(previous => previous.map(item => item.id === activePostprocessor.id
                ? { ...item, ...changes }
                : item));
        };

        const updatePostprocessorConfiguration = (key, value) => {
            updatePostprocessor({
                configuration: {
                    ...(activePostprocessor?.configuration ?? {}),
                    [key]: value
                }
            });
        };

        const removePostprocessor = () => {
            if (!activePostprocessor) return;
            const remaining = postprocessors.filter(item => item.id !== activePostprocessor.id);
            setPostprocessors(remaining);
            setActivePostprocessorId(remaining[0]?.id ?? null);
        };

        useEffect(() => {
            const loadMaterials = async () => {
                setLoadingMaterials(true);
                setMaterialError(null);

                try {
                    const response = await axios.get("/api/materials/get");
                    setMaterials(response.data.materials ?? []);
                } catch (error) {
                    console.error("Materialien konnten nicht geladen werden:", error);
                    setMaterialError("Materialien konnten nicht geladen werden.");
                } finally {
                    setLoadingMaterials(false);
                }
            };

            loadMaterials();
        }, []);


    return (

        <div className="responsive-settings-panel
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
                        {activeTab === "machining" ? "Bearbeitungsparameter" : "Maschinenadapter und Schnittstellen"}
                    </div>

                </div>


                <div className="
                    flex
                    items-center
                    gap-2
                ">

                    {activeTab === "machining" && <button
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
                    </button>}


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

            <nav aria-label="CNC-Einstellungsbereiche" className="shrink-0 border-b border-gray-700 bg-gray-900">
                <div className="flex h-12 items-end gap-1 overflow-x-auto px-4">
                    {[["machining", "Bearbeitungsparameter"], ["postprocessors", "Postprozessor"]].map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            aria-current={activeTab === id ? "page" : undefined}
                            onClick={() => setActiveTab(id)}
                            className={`h-full whitespace-nowrap border-b-2 px-4 text-sm font-medium transition ${activeTab === id
                                ? "border-blue-500 text-blue-400"
                                : "border-transparent text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </nav>


            {/* =================================================
             * Hauptbereich
             * ================================================= */}

            {activeTab === "machining" ? <div className="settings-panel-split
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

                    {selectedSection === "assignments" && (
                        <MachiningAssignments
                            config={config}
                            descriptor={activePostprocessorDescriptor}
                            updateConfig={updateConfig}
                        />
                    )}


                    {
                        selectedSection ===
                            "connector.drill" && (

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
                            "shelf.row" && (

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
                            "drawer.legrabox" && (

                            <LegraboxSettings
                                config={
                                    config
                                }
                                materials={materials}
                                loadingMaterials={loadingMaterials}
                                materialError={materialError}
                                updateConfig={updateConfig}
                                updateNumber={
                                    updateNumber
                                }
                                updateDepthPattern={
                                    updateDepthPattern
                                }
                            />

                        )
                    }


                    {selectedSection === "back.groove" && (
                        <BackPanelSettings mode="groove" config={config} updateNumber={updateNumber} />
                    )}

                    {selectedSection === "back.rabbet" && (
                        <BackPanelSettings mode="rabbet" config={config} updateNumber={updateNumber} />
                    )}

                    {selectedSection === "connector.clamex" && (
                        <ClamexSettings config={config} updateConfig={updateConfig} updateNumber={updateNumber} />
                    )}

                    {selectedSection === "connector.screw" && (
                        <SpaxSettings config={config} updateNumber={updateNumber} updateBoolean={updateBoolean} screwOnly />
                    )}

                </main>

            </div> : (
                <PostprocessorSettings
                    postprocessors={postprocessors}
                    activePostprocessor={activePostprocessor}
                    activePostprocessorId={activePostprocessorId}
                    descriptor={activePostprocessorDescriptor}
                    selectedPluginId={selectedPluginId}
                    setSelectedPluginId={setSelectedPluginId}
                    setActivePostprocessorId={setActivePostprocessorId}
                    addPostprocessor={addPostprocessor}
                    updatePostprocessor={updatePostprocessor}
                    updateConfiguration={updatePostprocessorConfiguration}
                    removePostprocessor={removePostprocessor}
                />
            )}

        </div>

    );

}


function MachiningAssignments({ config, descriptor, updateConfig }) {
    const strategies = descriptor?.supportedMachiningStrategies ?? [];

    return (
        <div className="max-w-5xl space-y-6">
            <SettingsHeader
                title="Bearbeitungszuordnungen"
                description="Ordnet fachliche Bearbeitungen einer vom aktiven Postprozessor unterstützten Maschinenstrategie zu."
            />

            {!descriptor && (
                <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200">
                    Füge zuerst unter „Postprozessor“ einen Maschinenadapter hinzu. Bis dahin bleiben die gespeicherten Standardzuordnungen erhalten.
                </div>
            )}

            <div className="space-y-3">
                {MACHINING_INTENTS.map(intent => {
                    const value = config.machiningAssignments?.[intent.id]?.strategyId ?? "";
                    const supported = strategies.some(strategy => strategy.id === value);
                    return (
                        <section key={intent.id} className="grid gap-4 rounded-xl border border-gray-700 bg-gray-800 p-5 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] md:items-center">
                            <div>
                                <h3 className="font-medium text-gray-100">{intent.label}</h3>
                                <p className="mt-1 text-sm text-gray-500">{intent.description}</p>
                            </div>
                            <label>
                                <span className="mb-1 flex items-center justify-between text-xs text-gray-500">
                                    Maschinenstrategie
                                    {value && !supported && <span className="text-amber-400">Nicht unterstützt</span>}
                                </span>
                                <select
                                    value={value}
                                    onChange={event => updateConfig(["machiningAssignments", intent.id, "strategyId"], event.target.value)}
                                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                >
                                    <option value="">Nicht zugeordnet</option>
                                    {value && !supported && <option value={value}>{value} (nicht verfügbar)</option>}
                                    {strategies.map(strategy => <option key={strategy.id} value={strategy.id}>{strategy.label}</option>)}
                                </select>
                            </label>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}


function PostprocessorSettings({
    postprocessors,
    activePostprocessor,
    activePostprocessorId,
    descriptor,
    selectedPluginId,
    setSelectedPluginId,
    setActivePostprocessorId,
    addPostprocessor,
    updatePostprocessor,
    updateConfiguration,
    removePostprocessor
}) {
    return (
        <div className="settings-panel-split grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-y-auto border-r border-gray-700 p-3">
                <div className="mb-3 px-2 text-xs uppercase tracking-wide text-gray-500">Konfigurierte Maschinen</div>
                <div className="space-y-2">
                    {postprocessors.map(item => {
                        const plugin = AVAILABLE_POSTPROCESSORS.find(entry => entry.id === item.pluginId);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setActivePostprocessorId(item.id)}
                                className={`w-full rounded-lg border p-3 text-left transition ${item.id === activePostprocessorId
                                    ? "border-blue-700 bg-gray-800"
                                    : "border-transparent hover:bg-gray-800"
                                }`}
                            >
                                <div className="truncate text-sm font-medium text-gray-100">{item.name}</div>
                                <div className="mt-1 truncate text-xs text-gray-500">{plugin?.name ?? item.pluginId}</div>
                            </button>
                        );
                    })}
                    {!postprocessors.length && <div className="rounded-lg border border-dashed border-gray-700 p-4 text-sm text-gray-500">Noch kein Postprozessor konfiguriert.</div>}
                </div>

                <div className="mt-5 border-t border-gray-700 pt-4">
                    <label className="block">
                        <span className="mb-1 block text-xs text-gray-500">Verfügbaren Postprozessor wählen</span>
                        <select value={selectedPluginId} onChange={event => setSelectedPluginId(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white">
                            {AVAILABLE_POSTPROCESSORS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                    </label>
                    <button type="button" onClick={addPostprocessor} disabled={!selectedPluginId} className="mt-2 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50">
                        Postprozessor hinzufügen
                    </button>
                </div>
            </aside>

            <main className="min-h-0 min-w-0 overflow-y-auto p-6">
                {!activePostprocessor || !descriptor ? (
                    <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-gray-700 p-10 text-center">
                        <h2 className="font-medium text-gray-200">Maschinenadapter hinzufügen</h2>
                        <p className="mt-2 text-sm text-gray-500">Wähle links einen registrierten Postprozessor. Neue Plugins werden zentral in der Engine-Registry verfügbar gemacht.</p>
                    </div>
                ) : (
                    <div className="max-w-5xl space-y-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-100">{descriptor.name}</h2>
                                <p className="mt-1 text-sm text-gray-500">{descriptor.description}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Capability label="Viewer" enabled={descriptor.capabilities?.viewer} />
                                    <Capability label="Maschinencode" enabled={descriptor.capabilities?.machineCode} />
                                    <Capability label="Bearbeitungsauflösung" enabled={descriptor.capabilities?.machiningResolution} />
                                    <span className="rounded-full border border-gray-700 px-2 py-1 text-xs text-gray-500">API {descriptor.apiVersion} · v{descriptor.version}</span>
                                </div>
                            </div>
                            <button type="button" onClick={removePostprocessor} className="rounded border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950">Entfernen</button>
                        </div>

                        <SettingsCard title="Instanz">
                            <div className="grid gap-4 md:grid-cols-2">
                                <label>
                                    <span className="mb-1 block text-xs text-gray-500">Bezeichnung</span>
                                    <input value={activePostprocessor.name ?? ""} onChange={event => updatePostprocessor({ name: event.target.value })} className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                                </label>
                                <ToggleField label="Aktiv" value={activePostprocessor.enabled} onChange={value => updatePostprocessor({ enabled: value })} />
                            </div>
                        </SettingsCard>

                        <SettingsCard title="Maschinenkonfiguration">
                            <div className="grid gap-4 md:grid-cols-2">
                                {descriptor.configuration.map(field => (
                                    <PostprocessorConfigurationField
                                        key={field.key}
                                        field={field}
                                        value={activePostprocessor.configuration?.[field.key]}
                                        onChange={value => updateConfiguration(field.key, value)}
                                    />
                                ))}
                            </div>
                        </SettingsCard>

                        <SettingsCard title="Integrationsendpunkte">
                            <div className="grid gap-3 lg:grid-cols-3">
                                <Endpoint name="Viewer" method="translateForViewer" description="Übersetzt Bauteil- und Function-Config in darstellbare Viewer-Operationen." />
                                <Endpoint name="Maschinencode" method="generateMachineCode" description="Erzeugt erst im maschinenspezifischen Plugin ausführbaren G-Code oder Hersteller-Code." />
                                <Endpoint name="Bearbeitung" method="resolveMachining" description="Prüft Zuordnungen und löst interne Bearbeitungsabsichten in Maschinenstrategien auf." />
                            </div>
                            <p className="mt-4 text-xs text-gray-500">Die Endpunkte sind vorbereitet, werden aber noch nicht automatisch von buildPartList oder dem CNC Viewer aufgerufen.</p>
                        </SettingsCard>

                        <SettingsCard title="Unterstützte Bearbeitungen">
                            <div className="grid gap-3 md:grid-cols-2">
                                {descriptor.supportedMachiningStrategies.map(strategy => (
                                    <div key={strategy.id} className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-gray-200">{strategy.label}</span>
                                            <code className="text-xs text-blue-300">{strategy.id}</code>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">{strategy.description}</p>
                                    </div>
                                ))}
                            </div>
                        </SettingsCard>
                    </div>
                )}
            </main>
        </div>
    );
}

function Capability({ label, enabled }) {
    return <span className={`rounded-full border px-2 py-1 text-xs ${enabled ? "border-emerald-800 bg-emerald-950/40 text-emerald-300" : "border-gray-700 text-gray-500"}`}>{label}: {enabled ? "bereit" : "Adapter nötig"}</span>;
}

function Endpoint({ name, method, description }) {
    return (
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <div className="text-sm font-medium text-gray-200">{name}</div>
            <code className="mt-1 block text-xs text-blue-300">{method}()</code>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">{description}</p>
        </div>
    );
}


function PostprocessorConfigurationField({ field, value, onChange }) {
    if (field.type === "boolean") {
        return <ToggleField label={field.label} value={value} onChange={onChange} />;
    }

    if (field.type === "select") {
        return (
            <label>
                <span className="mb-1 block text-xs text-gray-500">{field.label}</span>
                <select value={value ?? ""} onChange={event => onChange(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white">
                    {(field.options ?? []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
            </label>
        );
    }

    if (field.type === "json") {
        return <JsonConfigurationField field={field} value={value} onChange={onChange} />;
    }

    return (
        <label>
            <span className="mb-1 block text-xs text-gray-500">{field.label}</span>
            <div className="flex items-center gap-2">
                <input
                    type={field.type === "number" ? "number" : "text"}
                    min={field.min}
                    value={value ?? ""}
                    onChange={event => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)}
                    className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
                {field.unit && <span className="text-xs text-gray-500">{field.unit}</span>}
            </div>
        </label>
    );
}


function JsonConfigurationField({ field, value, onChange }) {
    const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
    const [error, setError] = useState("");

    useEffect(() => {
        setText(JSON.stringify(value ?? {}, null, 2));
        setError("");
    }, [value]);

    return (
        <label className="md:col-span-2">
            <span className="mb-1 flex justify-between text-xs text-gray-500"><span>{field.label}</span>{error && <span className="text-red-400">Ungültiges JSON</span>}</span>
            <textarea
                rows={5}
                value={text}
                onChange={event => {
                    const next = event.target.value;
                    setText(next);
                    try {
                        onChange(JSON.parse(next));
                        setError("");
                    } catch {
                        setError("invalid");
                    }
                }}
                className={`w-full rounded border bg-gray-900 px-3 py-2 font-mono text-xs text-white outline-none ${error ? "border-red-700" : "border-gray-700 focus:border-blue-500"}`}
            />
        </label>
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
                title="Bohrverbinder"
                description="
                    Einstellungen für VB, VBH und Spax-Bohrbilder
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
                        label="Fachrückstand"
                        value={
                            config.shelf
                                .shelfFrontOffset
                        }
                        onChange={
                            value =>
                                updateNumber(
                                    [
                                        "shelf",
                                        "shelfFrontOffset"
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

                <p className="mt-3 text-xs text-gray-500">
                    Fachrückstand setzt <code>shelfFrontOffset</code> der Fachboden-Function-Config. „Vorne“ setzt separat <code>frontOffset</code> der Lochreihe.
                </p>

            </SettingsCard>

        </div>

    );

}


/* =========================================================
 * LEGRABOX
 * ========================================================= */

function LegraboxSettings({
    config,
    materials,
    loadingMaterials,
    materialError,
    updateConfig,
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
                title="Materialzuordnung"
            >

                <div className="grid grid-cols-2 gap-4">
                    <MaterialSelect
                        label="Weiße Legrabox"
                        value={config.legrabox.materials?.whiteMaterialId ?? ""}
                        materials={materials}
                        loading={loadingMaterials}
                        error={materialError}
                        onChange={value =>
                            updateConfig(
                                ["legrabox", "materials", "whiteMaterialId"],
                                value
                            )
                        }
                    />

                    <MaterialSelect
                        label="Graue Legrabox"
                        value={config.legrabox.materials?.grayMaterialId ?? ""}
                        materials={materials}
                        loading={loadingMaterials}
                        error={materialError}
                        onChange={value =>
                            updateConfig(
                                ["legrabox", "materials", "grayMaterialId"],
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


            <SettingsCard
                title="Legrabox-Höhen"
            >

                <div className="grid grid-cols-5 gap-4">
                    {Object.entries(DEFAULT_CNC.legrabox.heights).map(
                        ([variant, defaultHeight]) => (
                            <NumberField
                                key={variant}
                                label={`${variant} (mm)`}
                                value={
                                    config.legrabox.heights?.[variant] ??
                                    defaultHeight
                                }
                                onChange={value =>
                                    updateNumber(
                                        ["legrabox", "heights", variant],
                                        value
                                    )
                                }
                            />
                        )
                    )}
                </div>

            </SettingsCard>


            <SettingsCard
                title="Legrabox-Rückwandhöhen"
            >

                <div className="grid grid-cols-5 gap-4">
                    {Object.entries(DEFAULT_CNC.legrabox.backHeights).map(
                        ([variant, defaultHeight]) => (
                            <NumberField
                                key={variant}
                                label={`${variant} (mm)`}
                                value={
                                    config.legrabox.backHeights?.[variant] ??
                                    defaultHeight
                                }
                                onChange={value =>
                                    updateNumber(
                                        ["legrabox", "backHeights", variant],
                                        value
                                    )
                                }
                            />
                        )
                    )}
                </div>

            </SettingsCard>

        </div>

    );

}


/* =========================================================
 * CLAMEX
 * ========================================================= */

function ClamexSettings({ config, updateConfig, updateNumber }) {
    const clamex = config.clamex;

    const updateAxisMode = (orientation, axisMode) => {
        updateConfig(["clamex", orientation, "axisMode"], axisMode);
        if (orientation === "surface") {
            updateConfig(["clamex", orientation, "cutterType"], axisMode === "3-axis" ? "router" : "disc");
        } else if (axisMode === "3-axis") {
            updateConfig(["clamex", orientation, "cutterType"], "disc");
        }
    };

    return (
        <div className="max-w-5xl space-y-6">
            <SettingsHeader title="Clamex" description="Maschinenunabhängige Definition der Clamex-Bearbeitung. Werkzeugdaten werden vom Postprozessor ergänzt." />

            <SettingsCard title="Flächige Bearbeitung">
                <div className="grid gap-4 md:grid-cols-2">
                    <ChoiceField
                        label="Kinematik"
                        value={clamex.surface.axisMode}
                        options={[["3-axis", "3-Achs"], ["5-axis", "5-Achs"]]}
                        onChange={value => updateAxisMode("surface", value)}
                    />
                    <ChoiceField
                        label="Bearbeitungswerkzeug"
                        value={clamex.surface.cutterType}
                        options={clamex.surface.axisMode === "3-axis"
                            ? [["router", "Fräser"]]
                            : [["disc", "Frässcheibe"]]}
                        onChange={value => updateConfig(["clamex", "surface", "cutterType"], value)}
                    />
                </div>
                <p className="mt-3 text-xs text-gray-500">Flächig: 3-Achs mit Fräser oder 5-Achs mit Frässcheibe.</p>
            </SettingsCard>

            <SettingsCard title="Horizontale Bearbeitung">
                <div className="grid gap-4 md:grid-cols-2">
                    <ChoiceField
                        label="Kinematik"
                        value={clamex.horizontal.axisMode}
                        options={[["3-axis", "3-Achs"], ["5-axis", "5-Achs"]]}
                        onChange={value => updateAxisMode("horizontal", value)}
                    />
                    <ChoiceField
                        label="Bearbeitungswerkzeug"
                        value={clamex.horizontal.cutterType}
                        options={clamex.horizontal.axisMode === "3-axis"
                            ? [["disc", "Frässcheibe"]]
                            : [["disc", "Frässcheibe"], ["router", "Fräser"]]}
                        onChange={value => updateConfig(["clamex", "horizontal", "cutterType"], value)}
                    />
                </div>
                <p className="mt-3 text-xs text-gray-500">Horizontal: 3-Achs nur mit Frässcheibe; 5-Achs mit Frässcheibe oder Fräser.</p>
            </SettingsCard>

            <SettingsCard title="Verbinderverteilung">
                <div className="grid gap-4 md:grid-cols-3">
                    <NumberField label="Randentfernung" value={clamex.edgeDistance} onChange={value => updateNumber(["clamex", "edgeDistance"], value)} />
                    <NumberField label="Abstand von außen" value={clamex.outsideOffset} onChange={value => updateNumber(["clamex", "outsideOffset"], value)} />
                    <NumberField label="Schwellenwert für weniger Verbinder" value={clamex.reducedConnectorThreshold} onChange={value => updateNumber(["clamex", "reducedConnectorThreshold"], value)} />
                </div>
            </SettingsCard>
        </div>
    );
}


/* =========================================================
 * RÜCKWAND
 * ========================================================= */

function BackPanelSettings({
    mode,
    config,
    updateNumber
}) {

    if (mode === "groove") {
        const groove = config.backPanel.groove;
        return (
            <div className="max-w-5xl space-y-6">
                <SettingsHeader title="Rückwandnut" description="Parameter für durchgehende und eingesetzte Nuten. Werkzeugdaten verknüpft der aktive Postprozessor." />

                <SettingsCard title="Durchgehende Nut">
                    <div className="grid gap-4 md:grid-cols-2">
                        <NumberField label="Start" value={groove.continuous.startOffset} onChange={value => updateNumber(["backPanel", "groove", "continuous", "startOffset"], value)} />
                        <NumberField label="Ende" value={groove.continuous.endOffset} onChange={value => updateNumber(["backPanel", "groove", "continuous", "endOffset"], value)} />
                    </div>
                </SettingsCard>

                <SettingsCard title="Eingesetzte Nut">
                    <div className="grid gap-4 md:grid-cols-2">
                        <NumberField label="Start" value={groove.inserted.startOffset} onChange={value => updateNumber(["backPanel", "groove", "inserted", "startOffset"], value)} />
                        <NumberField label="Ende" value={groove.inserted.endOffset} onChange={value => updateNumber(["backPanel", "groove", "inserted", "endOffset"], value)} />
                    </div>
                </SettingsCard>

                <SettingsCard title="Allgemein für alle Nuten">
                    <div className="grid gap-4 md:grid-cols-3">
                        <NumberField label="Abstand von hinten" value={groove.distanceFromBack} onChange={value => updateNumber(["backPanel", "groove", "distanceFromBack"], value)} />
                        <NumberField label="Tiefe Z" value={groove.zDepth} onChange={value => updateNumber(["backPanel", "groove", "zDepth"], value)} />
                        <NumberField label="Breite" value={groove.width} onChange={value => updateNumber(["backPanel", "groove", "width"], value)} />
                    </div>
                </SettingsCard>
            </div>
        );
    }

    if (mode === "rabbet") {
        const rabbet = config.backPanel.rabbet;
        return (
            <div className="max-w-5xl space-y-6">
                <SettingsHeader title="Rückwandfalz" description="Parameter für durchgehende und eingesetzte Falze. Werkzeugdaten verknüpft der aktive Postprozessor." />

                <SettingsCard title="Durchgehender Falz">
                    <div className="grid gap-4 md:grid-cols-2">
                        <NumberField label="Start links" value={rabbet.continuous.startLeft} onChange={value => updateNumber(["backPanel", "rabbet", "continuous", "startLeft"], value)} />
                        <NumberField label="Ende rechts" value={rabbet.continuous.endRight} onChange={value => updateNumber(["backPanel", "rabbet", "continuous", "endRight"], value)} />
                    </div>
                </SettingsCard>

                <SettingsCard title="Eingesetzter Falz">
                    <div className="grid gap-4 md:grid-cols-2">
                        <NumberField label="Start links" value={rabbet.inserted.startLeft} onChange={value => updateNumber(["backPanel", "rabbet", "inserted", "startLeft"], value)} />
                        <NumberField label="Ende rechts" value={rabbet.inserted.endRight} onChange={value => updateNumber(["backPanel", "rabbet", "inserted", "endRight"], value)} />
                    </div>
                </SettingsCard>

                <SettingsCard title="Allgemein für alle Falze">
                    <div className="grid gap-4 md:grid-cols-2">
                        <NumberField label="Tiefe" value={rabbet.depth} onChange={value => updateNumber(["backPanel", "rabbet", "depth"], value)} />
                        <NumberField label="Abstand von oben" value={rabbet.topOffset} onChange={value => updateNumber(["backPanel", "rabbet", "topOffset"], value)} />
                    </div>
                </SettingsCard>
            </div>
        );
    }

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


function ChoiceField({ label, value, options, onChange }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs text-gray-500">{label}</span>
            <select value={value ?? ""} onChange={event => onChange(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
                {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
            </select>
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
