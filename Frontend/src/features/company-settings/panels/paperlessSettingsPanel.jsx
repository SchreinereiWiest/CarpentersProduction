import { useEffect, useState } from "react";
import axios from "axios";

const emptySettings = {
    configured: false,
    connected: false,
    enabled: false,
    baseUrl: "",
    autoAssignQr: true,
    folders: [],
    tokenConfigured: false,
    webhookConfigured: false,
    webhook: null,
    webhookSecret: null,
    lastConnectedAt: null,
    lastConnectionError: null
};

const Message = ({ value }) => value ? (
    <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${value.type === "success" ? "border-emerald-800 bg-emerald-950/40 text-emerald-200" : "border-red-800 bg-red-950/40 text-red-200"}`}>
        {value.text}
    </div>
) : null;

const CopyButton = ({ value, children = "Kopieren" }) => (
    <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(value)}
        className="shrink-0 rounded-lg border border-gray-600 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700"
    >
        {children}
    </button>
);

export default function PaperlessSettingsPanel() {
    const [settings, setSettings] = useState(emptySettings);
    const [apiToken, setApiToken] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        let active = true;
        axios.get("/api/paperless/settings")
            .then(({ data }) => active && setSettings({ ...emptySettings, ...data }))
            .catch(error => active && setMessage({ type: "error", text: error.response?.data?.message || "Die Dokumenteinstellungen konnten nicht geladen werden." }))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, []);

    const update = (key, value) => setSettings(previous => ({ ...previous, [key]: value }));
    const updateFolder = (index, name) => update("folders", settings.folders.map((folder, folderIndex) => folderIndex === index ? { ...folder, name } : folder));

    const save = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const { data } = await axios.put("/api/paperless/settings", {
                enabled: settings.enabled,
                baseUrl: settings.baseUrl,
                autoAssignQr: settings.autoAssignQr,
                folders: settings.folders.map(folder => ({ id: folder.id, name: folder.name })),
                apiToken: apiToken.trim() || undefined
            });
            setSettings({ ...emptySettings, ...data });
            setApiToken("");
            setMessage({
                type: "success",
                text: data.webhookSecret
                    ? "Paperless wurde gespeichert. Das neue Webhook-Secret wird nur jetzt vollständig angezeigt."
                    : "Paperless-Einstellungen gespeichert."
            });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Die Paperless-Einstellungen konnten nicht gespeichert werden." });
        } finally {
            setBusy(false);
        }
    };

    const testConnection = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const { data } = await axios.post("/api/paperless/settings/test");
            setSettings(previous => ({
                ...previous,
                lastConnectedAt: data.connectedAt,
                lastConnectionError: null,
                connected: previous.enabled && previous.tokenConfigured
            }));
            setMessage({ type: "success", text: `Verbindung erfolgreich${data.paperlessVersion ? ` · Paperless ${data.paperlessVersion}` : ""}${data.apiVersion ? ` · API ${data.apiVersion}` : ""}.` });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Paperless ist nicht erreichbar." });
        } finally {
            setBusy(false);
        }
    };

    const rotateWebhookSecret = async () => {
        if (!window.confirm("Ein neues Webhook-Secret erzeugen? Der bisherige Paperless-Workflow funktioniert danach nicht mehr.")) return;
        setBusy(true);
        try {
            const { data } = await axios.post("/api/paperless/settings/webhook-secret");
            setSettings({ ...emptySettings, ...data });
            setMessage({ type: "success", text: "Neues Webhook-Secret erzeugt. Bitte jetzt in Paperless übernehmen." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Das Webhook-Secret konnte nicht erneuert werden." });
        } finally {
            setBusy(false);
        }
    };

    const removeToken = async () => {
        if (!window.confirm("Paperless trennen? Vorhandene Verknüpfungen bleiben erhalten, können aber bis zu einem neuen Token nicht geöffnet werden.")) return;
        setBusy(true);
        try {
            const { data } = await axios.delete("/api/paperless/settings/token");
            setSettings({ ...emptySettings, ...data });
            setMessage({ type: "success", text: "Der API-Token wurde entfernt und die Integration deaktiviert." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Der API-Token konnte nicht entfernt werden." });
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div className="h-full overflow-y-auto p-6 text-sm text-gray-500">Dokumenteinstellungen werden geladen …</div>;
    const bodyParameter = settings.webhook?.bodyParameter || { name: "document_id", value: "{{doc_id}}" };

    return (
        <div className="responsive-settings-panel h-full overflow-y-auto p-6">
            <div className="max-w-5xl space-y-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">Advanced · Dokumente</div>
                        <h1 className="mt-1 text-xl font-semibold">Paperless-ngx</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">Externe Dokumentablage verknüpfen. Carpenters speichert ausschließlich Referenzen und Zuordnungen; die Dateien bleiben in Paperless.</p>
                    </div>
                    <div className="flex gap-2">
                        {settings.configured && settings.tokenConfigured && <button type="button" disabled={busy} onClick={testConnection} className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm hover:bg-gray-700 disabled:opacity-50">Verbindung testen</button>}
                        <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{busy ? "Bitte warten …" : "Speichern"}</button>
                    </div>
                </header>

                <Message value={message} />

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={settings.enabled} onChange={event => update("enabled", event.target.checked)} className="h-4 w-4" />Paperless-Verknüpfung aktivieren</label>
                        <span className={`rounded-full px-3 py-1 text-xs ${settings.connected ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-300"}`}>{settings.connected ? "Verbunden" : "Nicht verbunden"}</span>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label className="block md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-gray-300">Paperless-Instanz</span><input type="url" value={settings.baseUrl} onChange={event => update("baseUrl", event.target.value)} placeholder="https://paperless.example.com" className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 outline-none focus:border-blue-500" /></label>
                        <label className="block md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-gray-300">API-Token</span><input type="password" value={apiToken} autoComplete="new-password" onChange={event => setApiToken(event.target.value)} placeholder={settings.tokenConfigured ? "Neuen Token zum Ersetzen eingeben" : "Token aus Paperless → Mein Profil"} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 outline-none focus:border-blue-500" /><span className="mt-1.5 block text-xs text-gray-500">Der Token wird mandantenbezogen verschlüsselt und nie wieder an den Browser ausgegeben.</span></label>
                    </div>
                    <label className="mt-5 flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-900 p-4 text-sm"><input type="checkbox" checked={settings.autoAssignQr} onChange={event => update("autoAssignQr", event.target.checked)} className="mt-0.5 h-4 w-4" /><span><span className="block font-semibold">Carpenters-QR-Codes automatisch prüfen</span><span className="mt-1 block text-xs text-gray-500">Die ersten Seiten werden kurz auf signierte CPD1- oder vorhandene CPM1-Aufmaßcodes geprüft und bei eindeutigem Treffer direkt zugeordnet.</span></span></label>
                    {settings.tokenConfigured && <div className="mt-4 flex justify-end"><button type="button" disabled={busy} onClick={removeToken} className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/60 disabled:opacity-50">Verknüpfung trennen</button></div>}
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Manuelle Ordner in Carpenters</h2><p className="mt-1 text-sm text-gray-500">Diese Ordner gruppieren nur Paperless-Referenzen und verändern keine Ablage in Paperless.</p></div><button type="button" onClick={() => update("folders", [...settings.folders, { name: "" }])} className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600">Ordner hinzufügen</button></div>
                    <div className="mt-4 space-y-3">
                        {settings.folders.length === 0 && <div className="rounded-lg border border-dashed border-gray-600 p-5 text-center text-sm text-gray-500">Noch keine manuellen Ordner angelegt.</div>}
                        {settings.folders.map((folder, index) => <div key={folder.id || `new-${index}`} className="flex gap-3"><input value={folder.name} onChange={event => updateFolder(index, event.target.value)} placeholder="z. B. Allgemeine Buchhaltung" className="min-w-0 flex-1 rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 outline-none focus:border-blue-500" /><button type="button" onClick={() => update("folders", settings.folders.filter((_item, itemIndex) => itemIndex !== index))} className="rounded-lg border border-red-900 px-3 text-sm text-red-300 hover:bg-red-950/60">Entfernen</button></div>)}
                    </div>
                </section>

                {settings.webhook && (
                    <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Paperless-Workflow</h2><p className="mt-1 text-sm text-gray-500">In Paperless einen Workflow mit Trigger „Document Added“ und Aktion „Webhook“ anlegen.</p></div><button type="button" disabled={busy} onClick={rotateWebhookSecret} className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-700 disabled:opacity-50">Secret erneuern</button></div>
                        <div className="mt-4 space-y-3 text-sm">
                            <div><span className="mb-1 block text-xs font-semibold uppercase text-gray-500">URL</span><div className="flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-gray-950 px-3 py-2.5 text-blue-200">{settings.webhook.url}</code><CopyButton value={settings.webhook.url} /></div></div>
                            <div><span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Webhook-Parameter · linkes/rechtes Feld</span><div className="grid gap-2 sm:grid-cols-2"><div className="flex gap-2"><code className="min-w-0 flex-1 rounded-lg bg-gray-950 px-3 py-2.5 text-blue-200">{bodyParameter.name}</code><CopyButton value={bodyParameter.name} /></div><div className="flex gap-2"><code className="min-w-0 flex-1 rounded-lg bg-gray-950 px-3 py-2.5 text-blue-200">{bodyParameter.value}</code><CopyButton value={bodyParameter.value} /></div></div></div>
                            <div><span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Webhook-Header · linkes/rechtes Feld</span><div className="grid gap-2 sm:grid-cols-2"><div className="flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-gray-950 px-3 py-2.5 text-blue-200">{settings.webhook.headerName}</code><CopyButton value={settings.webhook.headerName} /></div><div className="flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-gray-950 px-3 py-2.5 text-blue-200">{settings.webhookSecret || (settings.webhookConfigured ? "•••••••• (Secret bereits gespeichert)" : "noch nicht erzeugt")}</code>{settings.webhookSecret && <CopyButton value={settings.webhookSecret}>Secret kopieren</CopyButton>}</div></div></div>
                        </div>
                        {!settings.webhookSecret && settings.webhookConfigured && <p className="mt-3 text-xs text-amber-300">Das Secret kann aus Sicherheitsgründen nicht ausgelesen werden. Falls es in Paperless noch fehlt, „Secret erneuern“ verwenden.</p>}
                    </section>
                )}
            </div>
        </div>
    );
}
