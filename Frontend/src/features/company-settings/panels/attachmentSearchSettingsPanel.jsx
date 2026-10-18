import { useEffect, useState } from "react";
import axios from "axios";

import { uploadJSONFile } from "../../../shared/api/file-api.js";
import { loadCompanySettings, normalizeCompanySettings } from "../../../shared/settings/company-settings.js";
import { uploadGlobalFile } from "../../../shared/cache/global-cache.js";

const newWebsite = () => ({
    id: `manufacturer-${Date.now()}`,
    name: "",
    baseUrl: "",
    searchUrlTemplate: "",
    downloadsApproved: false,
    licenseNote: ""
});

function Input({ label, value, onChange, placeholder, type = "text" }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-300">{label}</span>
            <input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500" />
        </label>
    );
}

export default function AttachmentSearchSettingsPanel() {
    const [companySettings, setCompanySettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingCredential, setSavingCredential] = useState(false);
    const [message, setMessage] = useState(null);
    const [apiKey, setApiKey] = useState("");
    const [credentialStatus, setCredentialStatus] = useState({ configured: false, updatedAt: null });

    useEffect(() => {
        let active = true;
        Promise.all([
            loadCompanySettings(),
            axios.get("/api/settings/attachment-search-credential")
        ])
            .then(([settings, credentialResponse]) => {
                if (!active) return;
                setCompanySettings(settings);
                setCredentialStatus(credentialResponse.data);
            })
            .catch(error => {
                console.error("AttachementSearch-Einstellungen konnten nicht geladen werden", error);
                if (active) setMessage({ type: "error", text: "Die AI-Einstellungen konnten nicht geladen werden." });
            })
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, []);

    const update = (key, value) => setCompanySettings(previous => ({
        ...previous,
        attachmentSearch: { ...previous.attachmentSearch, [key]: value }
    }));

    const updateWebsite = (id, key, value) => update("manufacturerWebsites", companySettings.attachmentSearch.manufacturerWebsites.map(website => (
        website.id === id ? { ...website, [key]: value } : website
    )));

    const validate = settings => {
        if (!settings.openWebUiEndpoint || !settings.model) return "Open-WebUI-Endpunkt und Modell sind erforderlich.";
        if (settings.manufacturerWebsites.some(website => website.downloadsApproved && !website.licenseNote.trim())) {
            return "Für jeden freigegebenen Hersteller-Download muss die rechtliche Grundlage dokumentiert werden.";
        }
        if (settings.manufacturerWebsites.some(website => website.searchUrlTemplate && !website.searchUrlTemplate.includes("{articleNumber}"))) {
            return "Jede optionale Such-URL muss den Platzhalter {articleNumber} enthalten.";
        }
        return null;
    };

    const saveCredential = async () => {
        if (apiKey.trim().length < 16) {
            setMessage({ type: "error", text: "Bitte einen gültigen Open-WebUI-API-Key eingeben." });
            return;
        }
        setSavingCredential(true);
        setMessage(null);
        try {
            const { data } = await axios.post("/api/settings/attachment-search-credential", { apiKey });
            setApiKey("");
            setCredentialStatus(data);
            setMessage({ type: "success", text: "Der Open-WebUI-API-Key wurde sicher gespeichert. Er kann nicht wieder ausgelesen werden." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Der API-Key konnte nicht gespeichert werden." });
        } finally {
            setSavingCredential(false);
        }
    };

    const removeCredential = async () => {
        if (!window.confirm("Den hinterlegten Open-WebUI-API-Key wirklich entfernen? AttachementSearch funktioniert danach erst wieder mit einem neuen Key.")) return;
        setSavingCredential(true);
        setMessage(null);
        try {
            const { data } = await axios.delete("/api/settings/attachment-search-credential");
            setApiKey("");
            setCredentialStatus(data);
            setMessage({ type: "success", text: "Der Open-WebUI-API-Key wurde entfernt." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Der API-Key konnte nicht entfernt werden." });
        } finally {
            setSavingCredential(false);
        }
    };

    const save = async () => {
        const normalized = normalizeCompanySettings(companySettings);
        const error = validate(normalized.attachmentSearch);
        if (error) {
            setMessage({ type: "error", text: error });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            await uploadGlobalFile({
                file: "settings-company.json",
                data: normalized,
                uploadFunction: { upload: uploadJSONFile, path: "/api/settings/company" }
            });
            setCompanySettings(normalized);
            setMessage({ type: "success", text: "AttachementSearch-Einstellungen gespeichert." });
        } catch (error_) {
            console.error("AttachementSearch-Einstellungen konnten nicht gespeichert werden", error_);
            setMessage({ type: "error", text: error_.response?.data?.message || "Die AI-Einstellungen konnten nicht gespeichert werden." });
        } finally {
            setSaving(false);
        }
    };

    if (loading || !companySettings) return <div className="h-full overflow-y-auto p-6 text-sm text-gray-500">AI-Einstellungen werden geladen …</div>;
    const settings = companySettings.attachmentSearch;

    return (
        <div className="responsive-settings-panel h-full overflow-y-auto p-6">
            <div className="max-w-5xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">AI</div>
                        <h1 className="mt-1 text-xl font-semibold">AttachementSearch</h1>
                        <p className="mt-1 text-sm text-gray-500">Remote Open WebUI, Herstellerquellen, Suchanweisungen und Downloadfreigaben verwalten.</p>
                    </div>
                    <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{saving ? "Speichert …" : "Einstellungen speichern"}</button>
                </div>

                {message && <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-green-800 bg-green-950/40 text-green-300" : "border-red-800 bg-red-950/40 text-red-300"}`}>{message.text}</div>}

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={settings.enabled} onChange={event => update("enabled", event.target.checked)} className="h-4 w-4" />AttachementSearch aktivieren</label>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Input label="Open-WebUI-Endpunkt" value={settings.openWebUiEndpoint} placeholder="http://host.docker.internal:3000" onChange={value => update("openWebUiEndpoint", value)} />
                        <Input label="Open-WebUI-Modell-ID" value={settings.model} placeholder="carpenters-qwen3627b" onChange={value => update("model", value)} />
                    </div>
                    <p className="mt-3 text-xs text-gray-500">Das Backend ergänzt automatisch <code>/api/chat/completions</code>. Läuft Open WebUI wie in deinem Beispiel auf Port 3000 desselben Hosts, verwende aus Docker <code>http://host.docker.internal:3000</code> statt localhost. Öffentliche Remote-Endpunkte benötigen HTTPS.</p>

                    <div className="mt-5 rounded-lg border border-gray-700 bg-gray-900 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="font-semibold">Open-WebUI-API-Key</h2>
                                <p className="mt-1 text-xs text-gray-500">Der Schlüssel wird separat verschlüsselt gespeichert und niemals an das Frontend zurückgegeben.</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs ${credentialStatus.configured ? "bg-green-950 text-green-300" : "bg-amber-950 text-amber-300"}`}>
                                {credentialStatus.configured ? "Konfiguriert" : "Nicht konfiguriert"}
                            </span>
                        </div>
                        {credentialStatus.configured && credentialStatus.updatedAt && <p className="mt-2 text-xs text-gray-500">Zuletzt gesetzt: {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(credentialStatus.updatedAt))}</p>}
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <label className="min-w-0 flex-1">
                                <span className="sr-only">Neuer Open-WebUI-API-Key</span>
                                <input
                                    type="password"
                                    value={apiKey}
                                    autoComplete="new-password"
                                    placeholder={credentialStatus.configured ? "Neuen Key zum Ersetzen eingeben" : "API-Key einmalig eingeben"}
                                    onChange={event => setApiKey(event.target.value)}
                                    className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                                />
                            </label>
                            <button type="button" disabled={savingCredential || apiKey.trim().length < 16} onClick={saveCredential} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50">
                                {savingCredential ? "Speichert …" : credentialStatus.configured ? "Key ersetzen" : "Key sicher speichern"}
                            </button>
                            {credentialStatus.configured && <button type="button" disabled={savingCredential} onClick={removeCredential} className="rounded-lg border border-red-900 px-4 py-2.5 text-sm text-red-300 hover:bg-red-950/60 disabled:opacity-50">Key entfernen</button>}
                        </div>
                    </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div><h2 className="font-semibold">Herstellerwebsites</h2><p className="mt-1 text-sm text-gray-500">Freigaben gelten nur für Dateien auf derselben Hersteller-Domain.</p></div>
                        <button type="button" onClick={() => update("manufacturerWebsites", [...settings.manufacturerWebsites, newWebsite()])} className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600">Hersteller hinzufügen</button>
                    </div>
                    <div className="mt-4 space-y-4">
                        {settings.manufacturerWebsites.length === 0 && <div className="rounded-lg border border-dashed border-gray-600 p-5 text-center text-sm text-gray-500">Noch keine Herstellerquelle eingerichtet.</div>}
                        {settings.manufacturerWebsites.map(website => (
                            <div key={website.id} className="rounded-lg bg-gray-900 p-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Input label="Hersteller" value={website.name} placeholder="z. B. Blum" onChange={value => updateWebsite(website.id, "name", value)} />
                                    <Input label="Website" value={website.baseUrl} placeholder="https://www.hersteller.de" onChange={value => updateWebsite(website.id, "baseUrl", value)} />
                                    <div className="md:col-span-2"><Input label="Such-URL (optional)" value={website.searchUrlTemplate} placeholder="https://www.hersteller.de/suche?q={articleNumber}" onChange={value => updateWebsite(website.id, "searchUrlTemplate", value)} /></div>
                                    <label className="flex items-start gap-3 rounded-lg border border-amber-900/60 bg-amber-950/20 p-3 text-sm text-amber-100 md:col-span-2">
                                        <input type="checkbox" checked={website.downloadsApproved} onChange={event => updateWebsite(website.id, "downloadsApproved", event.target.checked)} className="mt-0.5 h-4 w-4" />
                                        <span><span className="block font-semibold">Downloads rechtlich freigegeben</span><span className="mt-1 block text-xs text-amber-200/70">Nur aktivieren, wenn die interne Nutzung der öffentlich angebotenen Herstellerdateien geprüft wurde.</span></span>
                                    </label>
                                    <div className="md:col-span-2"><Input label="Lizenz-/Freigabevermerk" value={website.licenseNote} placeholder="Prüfgrundlage, Lizenz oder Freigabe mit Datum" onChange={value => updateWebsite(website.id, "licenseNote", value)} /></div>
                                </div>
                                <div className="mt-4 flex justify-end"><button type="button" onClick={() => update("manufacturerWebsites", settings.manufacturerWebsites.filter(item => item.id !== website.id))} className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950/60">Entfernen</button></div>
                            </div>
                        ))}
                    </div>
                    <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.allowOpenWebFallback} onChange={event => update("allowOpenWebFallback", event.target.checked)} className="h-4 w-4" />Open Web durchsuchen, wenn Herstellerquellen keine Datei liefern</label>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <h2 className="font-semibold">AI-Prompts</h2>
                    <p className="mt-1 text-sm text-gray-500">Webinhalte werden als nicht vertrauenswürdige Daten gekennzeichnet; die Sicherheits- und Lizenzprüfung bleibt unabhängig vom Modell.</p>
                    <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium text-gray-300">Such- und Relevanzprompt</span><textarea rows="4" value={settings.searchPrompt} onChange={event => update("searchPrompt", event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500" /></label>
                    <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium text-gray-300">Filterprompt für Fertigungsdaten</span><textarea rows="4" value={settings.filterPrompt} onChange={event => update("filterPrompt", event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500" /></label>
                </section>
            </div>
        </div>
    );
}
