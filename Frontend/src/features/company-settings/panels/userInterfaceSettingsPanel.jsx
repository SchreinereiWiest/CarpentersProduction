import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router";

import { uploadJSONFile } from "../../../shared/api/file-api.js";
import { uploadGlobalFile } from "../../../shared/cache/global-cache.js";
import { useAuth } from "../../../app/providers/AuthContext.js";
import { useTheme } from "../../../app/theme/ThemeContext.js";
import { THEMES } from "../../../app/theme/theme.js";
import { eventToKeybinding } from "../../../shared/workspace/keybindings.js";
import { persistWorkspacePreferences } from "../../../shared/workspace/workspace-settings.js";
import { availableHomeModules, normalizeHomePreferences } from "@Engine/dashboard/home.mjs";
import {
    DEFAULT_COMPANY_SETTINGS,
    loadCompanySettings,
    normalizeLineLockThresholdCm,
    normalizeMeasurementFormFieldHeightMm,
    normalizeMeasurementFormFieldWidthMm,
    normalizeMeasurementLabelOffsetY,
    normalizeMeasurementLabelSizePercent,
    normalizeWorkspaceScalePercent,
    normalizeCompanySettings
} from "../../../shared/settings/company-settings.js";

const interfaceTabs = [
    ["home", "Startseite"],
    ["general", "Allgemein"],
    ["measurement", "Aufmaß"],
    ["keybindings", "Tastatur"],
    ["workspace", "Fensterlayout"]
];

export default function UserInterfaceSettingsPanel() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [searchParams] = useSearchParams();
    const isAdmin = user?.role === "admin";
    const [companySettings, setCompanySettings] = useState(DEFAULT_COMPANY_SETTINGS);
    const [homePreferences, setHomePreferences] = useState(() => normalizeHomePreferences({}, user?.role));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState(() => {
        const requested = searchParams.get("uitab");
        return interfaceTabs.some(([id]) => id === requested) ? requested : isAdmin ? "general" : "home";
    });

    useEffect(() => {
        let active = true;

        Promise.all([
            loadCompanySettings(),
            axios.get("/api/user/me/preferences")
        ])
            .then(([settings, preferencesResponse]) => {
                if (!active) return;
                setCompanySettings(settings);
                setHomePreferences(normalizeHomePreferences(preferencesResponse.data?.preferences?.home, user?.role));
            })
            .catch(error => {
                console.warn("Einstellungen der Benutzeroberfläche konnten nicht geladen werden:", error);
                if (active) {
                    setMessage({
                        type: "error",
                        text: "Die Einstellungen konnten nicht geladen werden. Es werden Standardwerte angezeigt."
                    });
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [user?.role]);

    const setShowTips = showTips => {
        setCompanySettings(previous => ({
            ...previous,
            userInterface: {
                ...previous.userInterface,
                showTips
            }
        }));
    };

    const setLineLockThreshold = lineLockThresholdCm => {
        setCompanySettings(previous => ({
            ...previous,
            userInterface: {
                ...previous.userInterface,
                lineLockThresholdCm
            }
        }));
    };

    const setMeasurementDisplay = patch => {
        setCompanySettings(previous => ({
            ...previous,
            userInterface: {
                ...previous.userInterface,
                ...patch
            }
        }));
    };

    const setUserInterface = patch => {
        setCompanySettings(previous => ({
            ...previous,
            userInterface: {
                ...previous.userInterface,
                ...patch
            }
        }));
    };

    const setKeybinding = (action, value) => {
        const duplicate = Object.entries(companySettings.userInterface.keybindings)
            .find(([key, binding]) => key !== action && binding.toLowerCase() === value.toLowerCase());
        if (duplicate) {
            setMessage({
                type: "error",
                text: "Diese Tastenkombination ist bereits vergeben."
            });
            return;
        }

        setMessage(null);
        setUserInterface({
            keybindings: {
                ...companySettings.userInterface.keybindings,
                [action]: value
            }
        });
    };

    const save = async () => {
        setSaving(true);
        setMessage(null);

        try {
            if (activeTab === "home") {
                const normalizedHome = normalizeHomePreferences(homePreferences, user?.role);
                await axios.put("/api/user/me/preferences", { home: normalizedHome });
                setHomePreferences(normalizedHome);
            }
            if (activeTab !== "home") {
                const normalized = normalizeCompanySettings(companySettings);
                if (isAdmin) {
                    await uploadGlobalFile({
                        file: "settings-company.json",
                        data: normalized,
                        uploadFunction: {
                            upload: uploadJSONFile,
                            path: "/api/settings/company"
                        }
                    });
                } else {
                    const personalUserInterface = Object.fromEntries(
                        Object.entries(normalized.userInterface).filter(([key]) => key !== "home")
                    );
                    await axios.put("/api/user/me/preferences", { userInterface: personalUserInterface });
                }
                setCompanySettings(normalized);
                persistWorkspacePreferences(normalized.userInterface);
            }
            if (activeTab === "home" && isAdmin) {
                const normalized = normalizeCompanySettings(companySettings);
                await uploadGlobalFile({
                    file: "settings-company.json",
                    data: normalized,
                    uploadFunction: {
                        upload: uploadJSONFile,
                        path: "/api/settings/company"
                    }
                });
                setCompanySettings(normalized);
            }
            setMessage({
                type: "success",
                text: activeTab === "home" ? "Startseiten-Einstellungen wurden gespeichert." : "Einstellungen der Benutzeroberfläche wurden gespeichert."
            });
        } catch (error) {
            console.error("Einstellungen der Benutzeroberfläche konnten nicht gespeichert werden:", error);
            setMessage({
                type: "error",
                text: "Die Einstellungen konnten nicht gespeichert werden."
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="responsive-settings-panel h-full overflow-y-auto p-6 text-sm text-gray-500">
                Einstellungen der Benutzeroberfläche werden geladen …
            </div>
        );
    }

    return (
        <div className="responsive-settings-panel h-full overflow-y-auto p-6">
            <div className="max-w-4xl space-y-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold">Benutzeroberfläche</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {isAdmin ? "Darstellung und Bedienhilfen zentral verwalten." : "Darstellung und Bedienhilfen persönlich für deinen Account verwalten."}
                        </p>
                    </div>
                    <button
                        type="button"
                        data-keybinding-action="apply"
                        onClick={save}
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Speichert …" : "Einstellungen speichern"}
                    </button>
                </header>

                {message && (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${
                        message.type === "success"
                            ? "border-green-800 bg-green-950/40 text-green-300"
                            : "border-red-800 bg-red-950/40 text-red-300"
                    }`}>
                        {message.text}
                    </div>
                )}

                <nav aria-label="Bereiche der Benutzeroberfläche" className="overflow-x-auto border-b border-gray-700">
                    <div className="flex min-w-max gap-1">
                        {interfaceTabs.map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === id}
                                onClick={() => setActiveTab(id)}
                                aria-current={activeTab === id ? "page" : undefined}
                                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                                    activeTab === id
                                        ? "border-blue-500 text-blue-400"
                                        : "border-transparent text-gray-500 hover:text-gray-300"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </nav>

                {activeTab === "home" && <HomeSettings
                    role={user?.role}
                    preferences={homePreferences}
                    onChange={setHomePreferences}
                    documentTags={companySettings.userInterface.home.documentTags}
                    onDocumentTagsChange={documentTags => setUserInterface({
                        home: { ...companySettings.userInterface.home, documentTags }
                    })}
                    canConfigureDocumentTags={isAdmin}
                />}

                {activeTab === "general" && <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Darstellung</p>
                        <h2 className="mt-1 text-base font-semibold text-gray-100">Theme</h2>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400">
                            Das Theme wird sofort angewendet und auf diesem Gerät gespeichert. Technische Zeichenflächen behalten ihre kontrastoptimierte Darstellung.
                        </p>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Theme auswählen">
                        <ThemeOption
                            id={THEMES.DARK}
                            title="Dark Mode"
                            description="Das bisherige Carpenters-Theme mit dunklen Arbeitsflächen."
                            selected={theme === THEMES.DARK}
                            onSelect={setTheme}
                        />
                        <ThemeOption
                            id={THEMES.LIGHT}
                            title="Light Mode"
                            description="Helle Flächen, Ink-Navigation und Copper-Akzente wie im Licensing-Portal."
                            selected={theme === THEMES.LIGHT}
                            onSelect={setTheme}
                        />
                    </div>
                </section>}

                {activeTab === "measurement" && <>
                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-100">Tipps anzeigen</h2>
                            <p className="mt-1 max-w-2xl text-xs text-gray-400">
                                Zeigt im Aufmaß die Bedienhinweise für Werkzeuge, Kalibrierung und das Verschieben der Ansicht an.
                            </p>
                        </div>
                        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                            <span className="sr-only">Tipps anzeigen</span>
                            <input
                                type="checkbox"
                                checked={companySettings.userInterface.showTips}
                                onChange={event => setShowTips(event.target.checked)}
                                className="peer sr-only"
                            />
                            <span className="h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-checked:bg-blue-600 peer-checked:after:translate-x-5" />
                        </label>
                    </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-100">Line-Lock</h2>
                        <p className="mt-1 max-w-2xl text-xs text-gray-400">
                            Linien werden exakt horizontal oder vertikal ausgerichtet, wenn ihre Abweichung vom ersten Punkt innerhalb dieses Werts liegt. Mit 0 cm wird der Line-Lock deaktiviert.
                        </p>
                    </div>
                    <label className="mt-4 block max-w-xs text-sm text-gray-200">
                        Maximale Abweichung
                        <div className="mt-2 flex items-center gap-3">
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={companySettings.userInterface.lineLockThresholdCm}
                                onChange={event => setLineLockThreshold(event.target.value)}
                                onBlur={() => setLineLockThreshold(
                                    normalizeLineLockThresholdCm(
                                        companySettings.userInterface.lineLockThresholdCm
                                    )
                                )}
                                className="w-28 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100 outline-none focus:border-blue-500"
                            />
                            <span className="text-gray-400">cm</span>
                        </div>
                    </label>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-100">Aufmaßdarstellung</h2>
                        <p className="mt-1 max-w-2xl text-xs text-gray-400">
                            Passt Größe und vertikale Position der Maßzahl sowie die leeren Schreibfelder im gedruckten Aufmaßformular an.
                        </p>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm text-gray-200">
                            Maßgröße
                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    type="number"
                                    min="50"
                                    max="200"
                                    step="5"
                                    value={companySettings.userInterface.measurementLabelSizePercent}
                                    onChange={event => setMeasurementDisplay({
                                        measurementLabelSizePercent: event.target.value
                                    })}
                                    onBlur={() => setMeasurementDisplay({
                                        measurementLabelSizePercent: normalizeMeasurementLabelSizePercent(
                                            companySettings.userInterface.measurementLabelSizePercent
                                        )
                                    })}
                                    className="w-28 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100 outline-none focus:border-blue-500"
                                />
                                <span className="text-gray-400">%</span>
                            </div>
                            <span className="mt-1.5 block text-xs text-gray-500">
                                50–200 %
                            </span>
                        </label>
                        <label className="block text-sm text-gray-200">
                            Maßoffset Y
                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    type="number"
                                    min="-200"
                                    max="200"
                                    step="5"
                                    value={companySettings.userInterface.measurementLabelOffsetY}
                                    onChange={event => setMeasurementDisplay({
                                        measurementLabelOffsetY: event.target.value
                                    })}
                                    onBlur={() => setMeasurementDisplay({
                                        measurementLabelOffsetY: normalizeMeasurementLabelOffsetY(
                                            companySettings.userInterface.measurementLabelOffsetY
                                        )
                                    })}
                                    className="w-28 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100 outline-none focus:border-blue-500"
                                />
                                <span className="text-gray-400">Rasterpunkte</span>
                            </div>
                            <span className="mt-1.5 block text-xs text-gray-500">
                                Negativ = oberhalb der Maßlinie
                            </span>
                        </label>
                    </div>
                    <div className="mt-5 border-t border-gray-700 pt-5">
                        <h3 className="text-sm font-medium text-gray-100">Formularfelder</h3>
                        <p className="mt-1 max-w-2xl text-xs text-gray-400">
                            Physische Größe der leeren weißen Felder für handschriftliche Maße. Die eingestellten Maße werden auch für die spätere OCR-Auswertung gespeichert.
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm text-gray-200">
                                Feldbreite
                                <div className="mt-2 flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="20"
                                        max="80"
                                        step="1"
                                        value={companySettings.userInterface.measurementFormFieldWidthMm}
                                        onChange={event => setMeasurementDisplay({
                                            measurementFormFieldWidthMm: event.target.value
                                        })}
                                        onBlur={() => setMeasurementDisplay({
                                            measurementFormFieldWidthMm: normalizeMeasurementFormFieldWidthMm(
                                                companySettings.userInterface.measurementFormFieldWidthMm
                                            )
                                        })}
                                        className="w-28 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100 outline-none focus:border-blue-500"
                                    />
                                    <span className="text-gray-400">mm</span>
                                </div>
                                <span className="mt-1.5 block text-xs text-gray-500">20–80 mm</span>
                            </label>
                            <label className="block text-sm text-gray-200">
                                Feldhöhe
                                <div className="mt-2 flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="8"
                                        max="30"
                                        step="1"
                                        value={companySettings.userInterface.measurementFormFieldHeightMm}
                                        onChange={event => setMeasurementDisplay({
                                            measurementFormFieldHeightMm: event.target.value
                                        })}
                                        onBlur={() => setMeasurementDisplay({
                                            measurementFormFieldHeightMm: normalizeMeasurementFormFieldHeightMm(
                                                companySettings.userInterface.measurementFormFieldHeightMm
                                            )
                                        })}
                                        className="w-28 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100 outline-none focus:border-blue-500"
                                    />
                                    <span className="text-gray-400">mm</span>
                                </div>
                                <span className="mt-1.5 block text-xs text-gray-500">8–30 mm</span>
                            </label>
                        </div>
                    </div>
                </section>
                </>}

                {activeTab === "keybindings" && (
                    <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Navigation</p>
                            <h2 className="mt-1 text-base font-semibold text-gray-100">Tastenkürzel</h2>
                            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400">
                                Ein Feld anklicken und anschließend die gewünschte Tastenkombination drücken. Die Kürzel gelten auch in geöffneten Rasterfeldern.
                            </p>
                        </div>
                        <div className="mt-5 divide-y divide-gray-700 rounded-lg border border-gray-700">
                            <KeybindingRow
                                label="Sidebar fokussieren"
                                description="Setzt den Tastaturfokus auf die globale Hauptnavigation."
                                value={companySettings.userInterface.keybindings.sidebar}
                                onChange={value => setKeybinding("sidebar", value)}
                            />
                            <KeybindingRow
                                label="Project Bar fokussieren"
                                description="Setzt den Fokus auf die Navigation des aktuellen Projekts."
                                value={companySettings.userInterface.keybindings.projectBar}
                                onChange={value => setKeybinding("projectBar", value)}
                            />
                            <KeybindingRow
                                label="Anwenden / Speichern"
                                description="Löst die primäre Anwenden- oder Speichern-Aktion im aktiven Feld aus."
                                value={companySettings.userInterface.keybindings.apply}
                                onChange={value => setKeybinding("apply", value)}
                            />
                        </div>
                    </section>
                )}

                {activeTab === "workspace" && (
                    <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Große Bildschirme</p>
                            <h2 className="mt-1 text-base font-semibold text-gray-100">Hauptbereich aufteilen</h2>
                            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400">
                                Die Sidebar bleibt global und öffnet ihr Ziel im aktiven Feld. Die Project Bar gehört zum jeweiligen Feld und wechselt dessen Projektansicht ohne Neuladen des gesamten Feldes. Verfügbar ab 1280 px Breite.
                            </p>
                        </div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Fensterlayout auswählen">
                            <LayoutOption
                                id="single"
                                title="Einzelansicht"
                                description="Ein zusammenhängender Arbeitsbereich."
                                selected={companySettings.userInterface.workspaceLayout === "single"}
                                onSelect={workspaceLayout => setUserInterface({ workspaceLayout })}
                            />
                            <LayoutOption
                                id="split"
                                title="Split View"
                                description="Zwei Felder nebeneinander."
                                selected={companySettings.userInterface.workspaceLayout === "split"}
                                onSelect={workspaceLayout => setUserInterface({ workspaceLayout })}
                            />
                            <LayoutOption
                                id="grid"
                                title="2 × 2 View"
                                description="Vier unabhängig belegbare Felder."
                                selected={companySettings.userInterface.workspaceLayout === "grid"}
                                onSelect={workspaceLayout => setUserInterface({ workspaceLayout })}
                            />
                        </div>

                        <div className="mt-6 border-t border-gray-700 pt-5">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-100">Allgemeine Skalierung</h3>
                                <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400">
                                    In der Einzelansicht wird die gesamte Oberfläche skaliert. In Split View und 2 × 2 View gilt die Skalierung nur innerhalb der einzelnen Felder; die globale Sidebar behält ihre Größe.
                                </p>
                            </div>
                            <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-4">
                                <input
                                    type="range"
                                    min="50"
                                    max="125"
                                    step="5"
                                    aria-label="Allgemeine Skalierung"
                                    value={companySettings.userInterface.workspaceScalePercent}
                                    onChange={event => setUserInterface({
                                        workspaceScalePercent: event.target.value
                                    })}
                                    className="min-w-56 flex-1 accent-blue-500"
                                />
                                <label className="flex items-center gap-2 text-sm text-gray-200">
                                    <input
                                        type="number"
                                        min="50"
                                        max="125"
                                        step="5"
                                        value={companySettings.userInterface.workspaceScalePercent}
                                        onChange={event => setUserInterface({
                                            workspaceScalePercent: event.target.value
                                        })}
                                        onBlur={() => setUserInterface({
                                            workspaceScalePercent: normalizeWorkspaceScalePercent(
                                                companySettings.userInterface.workspaceScalePercent
                                            )
                                        })}
                                        className="w-24 rounded border border-gray-600 bg-gray-900 px-3 py-2 text-right text-gray-100 outline-none focus:border-blue-500"
                                    />
                                    <span className="text-gray-400">%</span>
                                </label>
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-gray-500 sm:max-w-[32rem]">
                                <span>50 % · mehr Inhalt</span>
                                <span>100 % · Standard</span>
                                <span>125 % · größer</span>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function HomeSettings({ role, preferences, onChange, documentTags, onDocumentTagsChange, canConfigureDocumentTags }) {
    const modules = availableHomeModules(role);
    const moduleById = new Map(modules.map(module => [module.id, module]));
    const orderedModules = preferences.order.map(id => moduleById.get(id)).filter(Boolean);

    const toggleModule = id => onChange({
        ...preferences,
        hidden: preferences.hidden.includes(id)
            ? preferences.hidden.filter(value => value !== id)
            : [...preferences.hidden, id]
    });
    const moveModule = (id, direction) => {
        const index = preferences.order.indexOf(id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= preferences.order.length) return;
        const order = [...preferences.order];
        [order[index], order[target]] = [order[target], order[index]];
        onChange({ ...preferences, order });
    };
    const updateTag = (index, value) => onDocumentTagsChange(documentTags.map((tag, tagIndex) => tagIndex === index ? value : tag));

    return <div className="space-y-5">
        <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">Persönliche Startseite</p>
            <h2 className="mt-1 text-base font-semibold text-gray-100">Module anordnen und ausblenden</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400">Die Auswahl gilt nur für deinen Account. Inhalte und Berechtigungen richten sich weiterhin nach deiner Rolle.</p>
            <div className="mt-5 divide-y divide-gray-700 overflow-hidden rounded-lg border border-gray-700">
                {orderedModules.map((module, index) => {
                    const visible = !preferences.hidden.includes(module.id);
                    return <div key={module.id} className="flex flex-wrap items-center gap-3 bg-gray-900/50 p-3">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm text-gray-200">
                            <input type="checkbox" checked={visible} onChange={() => toggleModule(module.id)} className="size-4 rounded border-gray-600 bg-gray-950 text-blue-600" />
                            <span className={visible ? "" : "text-gray-500 line-through"}>{module.label}</span>
                        </label>
                        <div className="flex gap-1">
                            <button type="button" aria-label={`${module.label} nach oben`} disabled={index === 0} onClick={() => moveModule(module.id, -1)} className="rounded border border-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-700 disabled:opacity-30">↑</button>
                            <button type="button" aria-label={`${module.label} nach unten`} disabled={index === orderedModules.length - 1} onClick={() => moveModule(module.id, 1)} className="rounded border border-gray-700 px-2 py-1 text-gray-300 hover:bg-gray-700 disabled:opacity-30">↓</button>
                        </div>
                    </div>;
                })}
            </div>
        </section>

        {canConfigureDocumentTags && <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-400">Firmenweite Anzeige</p>
            <h2 className="mt-1 text-base font-semibold text-gray-100">Dokument-Tags auf der Admin-Startseite</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400">Dokumente aus dem DMS-Eingang erscheinen, wenn Dokumenttyp oder Paperless-Tag einem dieser Werte entspricht.</p>
            <div className="mt-4 space-y-2">
                {documentTags.map((tag, index) => <div key={index} className="flex gap-2">
                    <input aria-label={`Dokument-Tag ${index + 1}`} value={tag} onChange={event => updateTag(index, event.target.value)} placeholder="z. B. Rechnung" className="min-w-0 flex-1 rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500" />
                    <button type="button" onClick={() => onDocumentTagsChange(documentTags.filter((_, tagIndex) => tagIndex !== index))} className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950/40">Entfernen</button>
                </div>)}
                <button type="button" disabled={documentTags.length >= 20} onClick={() => onDocumentTagsChange([...documentTags, ""])} className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-40">Tag hinzufügen</button>
            </div>
        </section>}
    </div>;
}

function KeybindingRow({ label, description, value, onChange }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
                <h3 className="text-sm font-medium text-gray-100">{label}</h3>
                <p className="mt-1 text-xs text-gray-400">{description}</p>
            </div>
            <input
                value={value}
                readOnly
                aria-label={`${label}: Tastenkombination`}
                onKeyDown={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const binding = eventToKeybinding(event);
                    if (binding) onChange(binding);
                }}
                className="w-36 cursor-pointer rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-center font-mono text-sm text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
        </div>
    );
}

function LayoutOption({ id, title, description, selected, onSelect }) {
    const cells = id === "grid" ? 4 : id === "split" ? 2 : 1;

    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(id)}
            className={`rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                selected
                    ? "border-blue-500 bg-blue-950/20 ring-2 ring-blue-500/20"
                    : "border-gray-700 bg-gray-900/40 hover:border-gray-600"
            }`}
        >
            <span className={`grid h-24 gap-1 rounded-lg border border-gray-600 bg-gray-950 p-2 ${
                id === "grid" ? "grid-cols-2 grid-rows-2" : id === "split" ? "grid-cols-2" : "grid-cols-1"
            }`} aria-hidden="true">
                {Array.from({ length: cells }, (_, index) => (
                    <span key={index} className={`rounded ${index === 0 ? "bg-blue-600" : "bg-gray-700"}`} />
                ))}
            </span>
            <span className="mt-3 block text-sm font-semibold text-gray-100">{title}</span>
            <span className="mt-1 block text-xs text-gray-400">{description}</span>
        </button>
    );
}

function ThemeOption({ id, title, description, selected, onSelect }) {
    const light = id === THEMES.LIGHT;

    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(id)}
            className={`overflow-hidden rounded-xl border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                selected
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-gray-700 hover:border-gray-600"
            }`}
        >
            <span className={`block p-3 ${light ? "bg-[#f4f5f2]" : "bg-[#111827]"}`} aria-hidden="true">
                <span className="grid h-24 grid-cols-[3.25rem_1fr] overflow-hidden rounded-lg shadow-lg">
                    <span className={`flex flex-col gap-2 p-2 ${light ? "bg-[#111516]" : "bg-[#1f2937]"}`}>
                        <span className={`h-2.5 rounded-full ${light ? "bg-[#cf8b4f]" : "bg-[#2563eb]"}`} />
                        <span className={`h-2 rounded-full ${light ? "bg-[#223033]" : "bg-[#374151]"}`} />
                        <span className={`h-2 rounded-full ${light ? "bg-[#223033]" : "bg-[#374151]"}`} />
                    </span>
                    <span className={`p-3 ${light ? "bg-[#f4f5f2]" : "bg-[#111827]"}`}>
                        <span className={`block h-full rounded-md border p-2 ${light ? "border-[#d7ded9] bg-white" : "border-[#374151] bg-[#1f2937]"}`}>
                            <span className={`block h-2 w-2/3 rounded ${light ? "bg-[#34413e]" : "bg-[#d1d5db]"}`} />
                            <span className={`mt-2 block h-1.5 w-full rounded ${light ? "bg-[#d7ded9]" : "bg-[#4b5563]"}`} />
                            <span className={`mt-1.5 block h-1.5 w-4/5 rounded ${light ? "bg-[#d7ded9]" : "bg-[#4b5563]"}`} />
                        </span>
                    </span>
                </span>
            </span>
            <span className="flex items-start justify-between gap-4 px-4 py-3">
                <span>
                    <span className="block text-sm font-semibold text-gray-100">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-gray-400">{description}</span>
                </span>
                <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                    selected ? "border-blue-500 bg-blue-600" : "border-gray-600"
                }`}>
                    {selected && <span className="size-1.5 rounded-full bg-white" />}
                </span>
            </span>
        </button>
    );
}
