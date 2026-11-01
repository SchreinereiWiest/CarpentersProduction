import { useEffect, useState } from "react";

import { uploadJSONFile } from "../../../shared/api/file-api.js";
import { uploadGlobalFile } from "../../../shared/cache/global-cache.js";
import { useTheme } from "../../../app/theme/ThemeContext.js";
import { THEMES } from "../../../app/theme/theme.js";
import { eventToKeybinding } from "../../../shared/workspace/keybindings.js";
import { persistWorkspacePreferences } from "../../../shared/workspace/workspace-settings.js";
import {
    DEFAULT_COMPANY_SETTINGS,
    loadCompanySettings,
    normalizeLineLockThresholdCm,
    normalizeMeasurementFormFieldHeightMm,
    normalizeMeasurementFormFieldWidthMm,
    normalizeMeasurementLabelOffsetY,
    normalizeMeasurementLabelSizePercent,
    normalizeCompanySettings
} from "../../../shared/settings/company-settings.js";

export default function UserInterfaceSettingsPanel() {
    const { theme, setTheme } = useTheme();
    const [companySettings, setCompanySettings] = useState(DEFAULT_COMPANY_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState("general");

    useEffect(() => {
        let active = true;

        loadCompanySettings()
            .then(settings => {
                if (active) setCompanySettings(settings);
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
    }, []);

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
            persistWorkspacePreferences(normalized.userInterface);
            setMessage({
                type: "success",
                text: "Einstellungen der Benutzeroberfläche wurden gespeichert."
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
                            Darstellung und Bedienhilfen zentral verwalten.
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
                        {[
                            ["general", "Allgemein"],
                            ["measurement", "Aufmaß"],
                            ["keybindings", "Tastatur"],
                            ["workspace", "Fensterlayout"]
                        ].map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
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
                    </section>
                )}
            </div>
        </div>
    );
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
