import { useEffect, useState } from "react";

import { uploadJSONFile } from "../../../shared/api/file-api.js";
import { uploadGlobalFile } from "../../../shared/cache/global-cache.js";
import {
    DEFAULT_COMPANY_SETTINGS,
    loadCompanySettings,
    normalizeLineLockThresholdCm,
    normalizeMeasurementLabelOffsetY,
    normalizeMeasurementLabelSizePercent,
    normalizeCompanySettings
} from "../../../shared/settings/company-settings.js";

export default function UserInterfaceSettingsPanel() {
    const [companySettings, setCompanySettings] = useState(DEFAULT_COMPANY_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

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
                            Passt Größe und vertikale Position der Maßzahl samt Rechteck an. Negative Offsetwerte verschieben die Anzeige über die Maßlinie.
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
                </section>
            </div>
        </div>
    );
}
