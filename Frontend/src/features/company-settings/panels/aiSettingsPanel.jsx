import { useEffect, useState } from "react";
import axios from "axios";

import { uploadJSONFile } from "../../../shared/api/file-api.js";
import { uploadGlobalFile } from "../../../shared/cache/global-cache.js";
import {
    loadCompanySettings,
    normalizeCompanySettings
} from "../../../shared/settings/company-settings.js";

const Input = ({ label, value, onChange, placeholder, type = "text" }) => (
    <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-300">{label}</span>
        <input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500" />
    </label>
);

export default function AiSettingsPanel() {
    const [companySettings, setCompanySettings] = useState(null);
    const [credentialStatus, setCredentialStatus] = useState({ configured: false, updatedAt: null });
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingCredential, setSavingCredential] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        let active = true;
        Promise.all([
            loadCompanySettings(),
            axios.get("/api/settings/ai-credential")
        ]).then(([settings, credential]) => {
            if (!active) return;
            setCompanySettings(settings);
            setCredentialStatus(credential.data);
        }).catch(error => {
            console.error("AI-Einstellungen konnten nicht geladen werden", error);
            if (active) setMessage({ type: "error", text: "Die AI-Einstellungen konnten nicht geladen werden." });
        }).finally(() => active && setLoading(false));
        return () => { active = false; };
    }, []);

    const update = (key, value) => setCompanySettings(previous => ({
        ...previous,
        aiIntegration: { ...previous.aiIntegration, [key]: value }
    }));

    const save = async () => {
        const normalized = normalizeCompanySettings(companySettings);
        if (normalized.aiIntegration.enabled && !normalized.aiIntegration.endpoint) {
            setMessage({ type: "error", text: "Für eine aktive AI-Verknüpfung ist ein Endpunkt erforderlich." });
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
            setMessage({ type: "success", text: "AI-Verknüpfung gespeichert." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Die AI-Verknüpfung konnte nicht gespeichert werden." });
        } finally {
            setSaving(false);
        }
    };

    const saveCredential = async () => {
        setSavingCredential(true);
        setMessage(null);
        try {
            const { data } = await axios.post("/api/settings/ai-credential", { apiKey });
            setApiKey("");
            setCredentialStatus(data);
            setMessage({ type: "success", text: "Der optionale API-Key wurde verschlüsselt gespeichert." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Der API-Key konnte nicht gespeichert werden." });
        } finally {
            setSavingCredential(false);
        }
    };

    const removeCredential = async () => {
        if (!window.confirm("Den hinterlegten AI-API-Key wirklich entfernen?")) return;
        setSavingCredential(true);
        try {
            const { data } = await axios.delete("/api/settings/ai-credential");
            setCredentialStatus(data);
            setApiKey("");
            setMessage({ type: "success", text: "Der AI-API-Key wurde entfernt." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Der API-Key konnte nicht entfernt werden." });
        } finally {
            setSavingCredential(false);
        }
    };

    if (loading || !companySettings) return <div className="h-full overflow-y-auto p-6 text-sm text-gray-500">AI-Einstellungen werden geladen …</div>;
    const settings = companySettings.aiIntegration;

    return (
        <div className="responsive-settings-panel h-full overflow-y-auto p-6">
            <div className="max-w-4xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">AI</div>
                        <h1 className="mt-1 text-xl font-semibold">AI- und Ollama-Verknüpfung</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">Neutraler Anschluss für eine spätere AI-Nutzung. Derzeit greift keine Carpenters-Funktion automatisch auf diese Verbindung zu.</p>
                    </div>
                    <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{saving ? "Speichert …" : "Einstellungen speichern"}</button>
                </div>

                {message && <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-green-800 bg-green-950/40 text-green-300" : "border-red-800 bg-red-950/40 text-red-300"}`}>{message.text}</div>}

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={settings.enabled} onChange={event => update("enabled", event.target.checked)} className="size-4 accent-blue-500" />AI-Verknüpfung aktivieren</label>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-300">Verbindungstyp</span><select value={settings.provider} onChange={event => update("provider", event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"><option value="ollama">Ollama</option><option value="openai-compatible">OpenAI-kompatibler Endpunkt</option></select></label>
                        <Input label="Modell" value={settings.model} placeholder={settings.provider === "ollama" ? "z. B. llama3.2" : "Modell-ID"} onChange={value => update("model", value)} />
                        <div className="sm:col-span-2"><Input label="Verknüpfungs-Endpunkt" value={settings.endpoint} placeholder={settings.provider === "ollama" ? "http://ollama:11434" : "https://ai.example.com/v1"} onChange={value => update("endpoint", value)} /></div>
                    </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Optionaler API-Key</h2><p className="mt-1 text-sm text-gray-500">Für lokales Ollama normalerweise nicht erforderlich. Der Wert wird verschlüsselt gespeichert und nicht zurückgegeben.</p></div><span className={`rounded-full px-3 py-1 text-xs ${credentialStatus.configured ? "bg-green-950 text-green-300" : "bg-gray-900 text-gray-400"}`}>{credentialStatus.configured ? "Konfiguriert" : "Nicht konfiguriert"}</span></div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <input type="password" value={apiKey} autoComplete="new-password" placeholder={credentialStatus.configured ? "Neuen Key zum Ersetzen eingeben" : "API-Key"} onChange={event => setApiKey(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500" />
                        <button type="button" disabled={savingCredential || apiKey.trim().length < 8} onClick={saveCredential} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50">{savingCredential ? "Speichert …" : credentialStatus.configured ? "Key ersetzen" : "Key speichern"}</button>
                        {credentialStatus.configured && <button type="button" disabled={savingCredential} onClick={removeCredential} className="rounded-lg border border-red-900 px-4 py-2.5 text-sm text-red-300 hover:bg-red-950/60 disabled:opacity-50">Key entfernen</button>}
                    </div>
                </section>
            </div>
        </div>
    );
}
