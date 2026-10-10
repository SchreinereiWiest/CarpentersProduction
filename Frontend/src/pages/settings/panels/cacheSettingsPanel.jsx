import { useEffect, useState } from "react";

import axios from "axios";
import {invalidateAllProjects} from "../../../services/projectIndexDb";
import { getGlobalFile, uploadGlobalFile } from "../../../services/globalMemoryCache";
import { downloadFile, uploadJSONFile } from "../../../services/apiTemplates";


/* =========================================================
 * Hauptkomponente
 * ========================================================= */

export default function CacheSettingsPanel() {

    const [
        config,
        setConfig
    ] = useState({

        schemaVersion:
            1,

        healthDurationHours:
            12,

        preloadMode:
            "active"

    });


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        saving,
        setSaving
    ] = useState(false);


    const [
        clearing,
        setClearing
    ] = useState(false);


    const [
        preloading,
        setPreloading
    ] = useState(false);


    const [
        message,
        setMessage
    ] = useState(null);


    /* =====================================================
     * Settings laden
     * ===================================================== */

    useEffect(() => {

        const loadSettings =
            async () => {

                try {

                    const data =
                        await getGlobalFile({
    
                            file: "settings-cache.json",
    
                            loadFromServer: {download: downloadFile, path:"/api/settings/cache"}
    
                        });

                    if (
                        data
                    ) {

                        setConfig(
                            previous => ({
                                ...previous,
                                ...data
                            })
                        );

                    }

                } catch (error) {

                    /*
                     * Falls die Einstellung noch nicht existiert,
                     * bleiben die Defaultwerte erhalten.
                     */

                    console.warn(
                        "Cache-Einstellungen konnten nicht geladen werden:",
                        error
                    );

                } finally {

                    setLoading(
                        false
                    );

                }

            };


        loadSettings();

    }, []);


    /* =====================================================
     * Werte ändern
     * ===================================================== */

    const updateConfig = (
        key,
        value
    ) => {

        setConfig(
            previous => ({
                ...previous,
                [key]: value
            })
        );

    };


    /* =====================================================
     * Einstellungen speichern
     * ===================================================== */

    const saveSettings =
        async () => {

            setSaving(
                true
            );

            setMessage(
                null
            );


            try {

                const data = {

                    schemaVersion:
                        1,

                    healthDurationHours:
                        Number(
                            config.healthDurationHours
                        ) || 12,

                    preloadMode:
                        config.preloadMode

                };


                const response = await uploadGlobalFile({
                                
                    file: "settings-cache.json",
        
                    data: data,
                    
                    uploadFunction: {upload: uploadJSONFile, path:"/api/settings/cache"}
                });


                console.log(
                    "Cache Settings:",
                    response.data
                );


                setConfig(
                    previous => ({
                        ...previous,
                        ...data
                    })
                );


                setMessage({

                    type:
                        "success",

                    text:
                        "Cache-Einstellungen gespeichert."

                });

            } catch (error) {

                console.error(
                    "Cache-Einstellungen konnten nicht gespeichert werden:",
                    error
                );


                console.error(
                    "Response:",
                    error.response?.data
                );


                setMessage({

                    type:
                        "error",

                    text:
                        "Cache-Einstellungen konnten nicht gespeichert werden."

                });

            } finally {

                setSaving(
                    false
                );

            }

        };


    /* =====================================================
     * Alle lokalen Cache-Dateien löschen
     * ===================================================== */

    const handleClearCache =
        async () => {


            setClearing(
                true
            );

            setMessage(
                null
            );


            try {

                await invalidateAllProjects();


                setMessage({

                    type:
                        "success",

                    text:
                        "Alle lokalen Cache-Dateien wurden gelöscht."

                });

            } catch (error) {

                console.error(
                    "Lokaler Cache konnte nicht gelöscht werden:",
                    error
                );


                setMessage({

                    type:
                        "error",

                    text:
                        "Der lokale Cache konnte nicht gelöscht werden."

                });

            } finally {

                setClearing(
                    false
                );

            }

        };


    /* =====================================================
     * Cache jetzt aufbauen
     *
     * Der Backend-Endpunkt kann später beispielsweise:
     *
     * POST /api/cache/preload
     *
     * { mode: "active" }
     *
     * bzw.
     *
     * { mode: "selected" }
     *
     * entgegennehmen.
     * ===================================================== */

    const handlePreload =
        async () => {

            setPreloading(
                true
            );

            setMessage(
                null
            );


            try {

                const response =
                    await axios.post(
                        "/api/cache/preload",
                        {
                            mode:
                                config.preloadMode
                        },
                        {
                            withCredentials:
                                true,

                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );


                console.log(
                    "Cache preload:",
                    response.data
                );


                setMessage({

                    type:
                        "success",

                    text:
                        config.preloadMode ===
                            "active"

                            ? "Der Cache für alle aktiven Projekte wurde gestartet."

                            : "Der Cache für die ausgewählten Projekte wurde gestartet."

                });

            } catch (error) {

                console.error(
                    "Cache konnte nicht aufgebaut werden:",
                    error
                );


                console.error(
                    "Response:",
                    error.response?.data
                );


                setMessage({

                    type:
                        "error",

                    text:
                        "Der Projekt-Cache konnte nicht aufgebaut werden."

                });

            } finally {

                setPreloading(
                    false
                );

            }

        };


    if (
        loading
    ) {

        return (

            <div className="
                h-full
                overflow-y-auto
                p-6
            ">

                <div className="
                    text-sm
                    text-gray-500
                ">

                    Cache-Einstellungen werden geladen...

                </div>

            </div>

        );

    }


    return (

        <div className="
            h-full
            overflow-y-auto
            p-6
        ">

            <div className="
                max-w-4xl
                space-y-6
            ">


                {/* =================================================
                 * Header
                 * ================================================= */}

                <div>

                    <h1 className="
                        text-xl
                        font-semibold
                    ">
                        Cache
                    </h1>

                    <p className="
                        mt-1
                        text-sm
                        text-gray-500
                    ">
                        Einstellungen für Projekt-Cache,
                        Offline-Daten und Healthchecks
                    </p>

                </div>


                {/* =================================================
                 * Meldung
                 * ================================================= */}

                {
                    message && (

                        <div
                            className={`
                                rounded-lg
                                border
                                px-4
                                py-3
                                text-sm

                                ${
                                    message.type ===
                                        "success"

                                        ? "border-green-800 bg-green-950/40 text-green-300"

                                        : "border-red-800 bg-red-950/40 text-red-300"
                                }
                            `}
                        >

                            {
                                message.text
                            }

                        </div>

                    )
                }


                {/* =================================================
                 * Healthcheck
                 * ================================================= */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                    ">

                        Cache Health

                    </div>


                    <div className="
                        mt-4
                        grid
                        grid-cols-2
                        gap-4
                    ">

                        <label>

                            <span className="
                                mb-1
                                block
                                text-xs
                                text-gray-500
                            ">

                                Cache Health Dauer

                            </span>

                            <div className="
                                flex
                                items-center
                                gap-2
                            ">

                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={
                                        config.healthDurationHours
                                    }
                                    onChange={
                                        event =>
                                            updateConfig(
                                                "healthDurationHours",
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

                                <span className="
                                    text-sm
                                    text-gray-500
                                ">

                                    Stunden

                                </span>

                            </div>

                            <div className="
                                mt-2
                                text-xs
                                text-gray-600
                            ">

                                Nach Ablauf dieser Zeit kann
                                der Client beim nächsten
                                Healthcheck prüfen, ob der
                                lokale Cache aktualisiert
                                werden muss.

                            </div>

                        </label>

                    </div>

                </section>


                {/* =================================================
                 * Projekt Preload
                 * ================================================= */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                    ">

                        Projekt-Cache

                    </div>


                    <div className="
                        mt-3
                        text-sm
                        text-gray-300
                    ">

                        Lege fest, welche Projekte automatisch
                        für Offline-Arbeiten vorbereitet werden.

                    </div>


                    <div className="
                        mt-4
                        space-y-2
                    ">


                        {/* =================================================
                         * Ausgewählte Projekte
                         * ================================================= */}

                        <label className="
                            flex
                            cursor-pointer
                            items-start
                            gap-3
                            rounded-lg
                            border
                            border-gray-700
                            bg-gray-900
                            p-3
                            hover:bg-gray-750
                        ">

                            <input
                                type="radio"
                                name="preloadMode"
                                value="selected"
                                checked={
                                    config.preloadMode ===
                                    "selected"
                                }
                                onChange={
                                    event =>
                                        updateConfig(
                                            "preloadMode",
                                            event.target.value
                                        )
                                }
                                className="
                                    mt-1
                                    h-4
                                    w-4
                                "
                            />


                            <div>

                                <div className="
                                    text-sm
                                    text-gray-200
                                ">

                                    Ausgewählte Projekte

                                </div>

                                <div className="
                                    mt-1
                                    text-xs
                                    text-gray-500
                                ">

                                    Nur Projekte, die in der
                                    Projektverwaltung ausgewählt
                                    wurden.

                                </div>

                            </div>

                        </label>


                        {/* =================================================
                         * Aktive Projekte
                         * ================================================= */}

                        <label className="
                            flex
                            cursor-pointer
                            items-start
                            gap-3
                            rounded-lg
                            border
                            border-gray-700
                            bg-gray-900
                            p-3
                            hover:bg-gray-750
                        ">

                            <input
                                type="radio"
                                name="preloadMode"
                                value="active"
                                checked={
                                    config.preloadMode ===
                                    "active"
                                }
                                onChange={
                                    event =>
                                        updateConfig(
                                            "preloadMode",
                                            event.target.value
                                        )
                                }
                                className="
                                    mt-1
                                    h-4
                                    w-4
                                "
                            />


                            <div>

                                <div className="
                                    text-sm
                                    text-gray-200
                                ">

                                    Alle aktiven Projekte

                                </div>

                                <div className="
                                    mt-1
                                    text-xs
                                    text-gray-500
                                ">

                                    Alle aktiven Projekte werden
                                    für die Offline-Verwendung
                                    vorbereitet.

                                </div>

                            </div>

                        </label>

                    </div>


                    <div className="
                        mt-4
                        flex
                        justify-end
                    ">

                        <button
                            type="button"
                            onClick={
                                handlePreload
                            }
                            disabled={
                                preloading
                            }
                            className="
                                rounded
                                bg-gray-700
                                px-4
                                py-2
                                text-sm
                                text-gray-200
                                hover:bg-gray-600
                                disabled:opacity-50
                            "
                        >

                            {
                                preloading
                                    ? "Cache wird aufgebaut..."
                                    : "Cache jetzt aufbauen"
                            }

                        </button>

                    </div>

                </section>


                {/* =================================================
                 * Cache löschen
                 * ================================================= */}

                <section className="
                    rounded-xl
                    border
                    border-red-900/60
                    bg-gray-800
                    p-5
                ">

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-red-400
                    ">

                        Cache verwalten

                    </div>


                    <div className="
                        mt-3
                        text-sm
                        text-gray-400
                    ">

                        Löscht alle lokal gespeicherten
                        Projektdateien aus dem Browser.
                        Beim nächsten Zugriff müssen die
                        Dateien erneut geladen werden.

                    </div>


                    <div className="
                        mt-4
                        flex
                        justify-end
                    ">

                        <button
                            type="button"
                            onClick={
                                handleClearCache
                            }
                            disabled={
                                clearing
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
                                disabled:opacity-50
                            "
                        >

                            {
                                clearing
                                    ? "Cache wird gelöscht..."
                                    : "Alle Cache-Dateien löschen"
                            }

                        </button>

                    </div>

                </section>


                {/* =================================================
                 * Speichern
                 * ================================================= */}

                <div className="
                    flex
                    justify-end
                    border-t
                    border-gray-800
                    pt-5
                ">

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
                            px-5
                            py-2.5
                            text-sm
                            font-medium
                            text-white
                            hover:bg-blue-700
                            disabled:opacity-50
                        "
                    >

                        {
                            saving
                                ? "Speichern..."
                                : "Einstellungen speichern"
                        }

                    </button>

                </div>

            </div>

        </div>

    );

}
