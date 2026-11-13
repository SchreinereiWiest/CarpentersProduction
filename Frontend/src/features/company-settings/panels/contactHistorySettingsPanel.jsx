import { useEffect, useState } from "react";
import axios from "axios";

const emptySettings = {
    configured: false,
    connected: false,
    enabled: false,
    host: "",
    port: 993,
    username: "",
    accountEmail: "",
    mailbox: "INBOX",
    sentMailbox: null,
    initialSyncDays: 90,
    syncIntervalMinutes: 5,
    passwordConfigured: false,
    lastConnectedAt: null,
    lastSyncAt: null,
    lastSyncError: null,
    consecutiveFailures: 0
};

const formatDateTime = value => value ? new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
}).format(new Date(value)) : "Noch nie";

const Message = ({ value }) => value ? (
    <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${value.type === "success" ? "border-emerald-800 bg-emerald-950/40 text-emerald-200" : "border-red-800 bg-red-950/40 text-red-200"}`}>
        {value.text}
    </div>
) : null;

export default function ContactHistorySettingsPanel() {
    const [settings, setSettings] = useState(emptySettings);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        let active = true;
        axios.get("/api/contact-history/settings")
            .then(({ data }) => active && setSettings({ ...emptySettings, ...data }))
            .catch(error => active && setMessage({ type: "error", text: error.response?.data?.message || "Die Kontaktverlauf-Einstellungen konnten nicht geladen werden." }))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, []);

    const update = (key, value) => setSettings(previous => ({ ...previous, [key]: value }));

    const save = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const { data } = await axios.put("/api/contact-history/settings", {
                enabled: settings.enabled,
                host: settings.host,
                port: Number(settings.port),
                username: settings.username,
                accountEmail: settings.accountEmail,
                initialSyncDays: Number(settings.initialSyncDays),
                syncIntervalMinutes: Number(settings.syncIntervalMinutes),
                password: password.trim() || undefined
            });
            setSettings({ ...emptySettings, ...data });
            setPassword("");
            setMessage({ type: "success", text: "Kontaktverlauf-Einstellungen gespeichert. Bitte die Verbindung anschließend testen." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Die Kontaktverlauf-Einstellungen konnten nicht gespeichert werden." });
        } finally {
            setBusy(false);
        }
    };

    const testConnection = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const { data } = await axios.post("/api/contact-history/settings/test");
            setSettings(previous => ({ ...previous, connected: true, sentMailbox: data.sentMailbox || null, lastConnectedAt: data.connectedAt, lastSyncError: null, consecutiveFailures: 0 }));
            setMessage({ type: "success", text: `Sichere Verbindung hergestellt · ${data.messages ?? 0} Nachrichten in ${data.mailbox}${data.sentMailbox ? ` · ${data.sentMessages ?? 0} in ${data.sentMailbox}` : " · Gesendet-Ordner nicht erkannt"}.` });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Die IMAP-Verbindung konnte nicht hergestellt werden." });
        } finally {
            setBusy(false);
        }
    };

    const syncNow = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const { data } = await axios.post("/api/contact-history/sync");
            setMessage({ type: "success", text: data.message || "Der Abruf wurde im Hintergrund eingeplant." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Der Abruf konnte nicht eingeplant werden." });
        } finally {
            setBusy(false);
        }
    };

    const disconnect = async () => {
        if (!window.confirm("IMAP-Konto trennen? Bereits importierte CRM-Einträge bleiben erhalten.")) return;
        setBusy(true);
        try {
            const { data } = await axios.delete("/api/contact-history/settings/password");
            setSettings({ ...emptySettings, ...data });
            setPassword("");
            setMessage({ type: "success", text: "Das App-Passwort wurde entfernt und der automatische Abruf deaktiviert." });
        } catch (error) {
            setMessage({ type: "error", text: error.response?.data?.message || "Das IMAP-Konto konnte nicht getrennt werden." });
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div className="h-full overflow-y-auto p-6 text-sm text-gray-500">Kontaktverlauf-Einstellungen werden geladen …</div>;

    return (
        <div className="responsive-settings-panel h-full overflow-y-auto p-6">
            <div className="max-w-5xl space-y-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">Advanced · Kontaktverlauf</div>
                        <h1 className="mt-1 text-xl font-semibold">Automatischer E-Mail-Kontaktverlauf</h1>
                        <p className="mt-1 max-w-3xl text-sm text-gray-500">Posteingang und Gesendet-Ordner werden lesend geprüft. Absender und Empfänger werden mit bekannten Kunden-E-Mail-Adressen abgeglichen und als vollständiger Gesprächsverlauf im CRM dokumentiert.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {settings.configured && settings.passwordConfigured && <button type="button" disabled={busy} onClick={testConnection} className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm hover:bg-gray-700 disabled:opacity-50">Verbindung testen</button>}
                        {settings.enabled && settings.passwordConfigured && <button type="button" disabled={busy} onClick={syncNow} className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm hover:bg-gray-700 disabled:opacity-50">Jetzt abrufen</button>}
                        <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{busy ? "Bitte warten …" : "Speichern"}</button>
                    </div>
                </header>

                <Message value={message} />

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={settings.enabled} onChange={event => update("enabled", event.target.checked)} className="h-4 w-4" />Automatischen Kontaktverlauf aktivieren</label>
                        <span className={`rounded-full px-3 py-1 text-xs ${settings.connected ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-300"}`}>{settings.connected ? "Verbunden" : "Nicht verbunden"}</span>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-300">IMAP-Server</span><input aria-label="IMAP-Server" value={settings.host} onChange={event => update("host", event.target.value)} placeholder="imap.example.de" autoCapitalize="none" spellCheck="false" className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 outline-none focus:border-blue-500" /></label>
                        <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-300">Port</span><input aria-label="Port" type="number" value={settings.port} readOnly className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-gray-400" /><span className="mt-1.5 block text-xs text-gray-500">Fest auf IMAPS/TLS 993 begrenzt.</span></label>
                        <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-300">Benutzername</span><input aria-label="Benutzername" value={settings.username} onChange={event => update("username", event.target.value)} autoCapitalize="none" autoComplete="off" className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 outline-none focus:border-blue-500" /></label>
                        <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-300">E-Mail-Adresse des Kontos</span><input aria-label="E-Mail-Adresse des Kontos" type="email" value={settings.accountEmail} onChange={event => update("accountEmail", event.target.value)} autoCapitalize="none" autoComplete="off" className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 outline-none focus:border-blue-500" /></label>
                        <label className="block md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-gray-300">App-Passwort</span><input aria-label="App-Passwort" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" placeholder={settings.passwordConfigured ? "Neues App-Passwort zum Ersetzen eingeben" : "Separates App-Passwort des Mailanbieters"} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 outline-none focus:border-blue-500" /><span className="mt-1.5 block text-xs text-gray-500">Das Passwort wird mandantenbezogen verschlüsselt und nach dem Speichern nie wieder ausgegeben.</span></label>
                    </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                        <h2 className="font-semibold">Abruf</h2>
                        <div className="mt-4 space-y-4">
                            <label className="block"><span className="mb-1.5 block text-sm text-gray-300">Intervall</span><select aria-label="Intervall" value={settings.syncIntervalMinutes} onChange={event => update("syncIntervalMinutes", Number(event.target.value))} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5"><option value={5}>Alle 5 Minuten</option><option value={10}>Alle 10 Minuten</option><option value={15}>Alle 15 Minuten</option><option value={30}>Alle 30 Minuten</option><option value={60}>Stündlich</option></select></label>
                            <label className="block"><span className="mb-1.5 block text-sm text-gray-300">Zeitraum beim ersten Abruf</span><select aria-label="Zeitraum beim ersten Abruf" value={settings.initialSyncDays} onChange={event => update("initialSyncDays", Number(event.target.value))} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5"><option value={30}>Letzte 30 Tage</option><option value={90}>Letzte 90 Tage</option><option value={180}>Letzte 180 Tage</option><option value={365}>Letztes Jahr</option></select></label>
                            <div className="rounded-lg bg-gray-900 p-3 text-xs text-gray-400"><div>Posteingang: <span className="text-gray-200">INBOX (nur lesen)</span></div><div className="mt-1">Gesendet: <span className={settings.sentMailbox ? "text-gray-200" : "text-amber-300"}>{settings.sentMailbox || "Noch nicht erkannt – Verbindung testen"}</span></div><div className="mt-1">Letzter Abruf: <span className="text-gray-200">{formatDateTime(settings.lastSyncAt)}</span></div><div className="mt-1">Letzte Verbindung: <span className="text-gray-200">{formatDateTime(settings.lastConnectedAt)}</span></div></div>
                            {settings.lastSyncError && <p className="rounded-lg border border-amber-900 bg-amber-950/30 p-3 text-xs text-amber-200">{settings.lastSyncError}</p>}
                        </div>
                    </div>

                    <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5">
                        <h2 className="font-semibold text-emerald-200">Kontosicherheit</h2>
                        <ul className="mt-4 space-y-3 text-sm text-emerald-100/75">
                            <li>• Beim Mailanbieter ein separates App-Passwort anlegen, niemals das normale Login-Passwort verwenden.</li>
                            <li>• Der Abruf nutzt ausschließlich TLS 1.2+ und prüft das Serverzertifikat.</li>
                            <li>• Nachrichten werden weder als gelesen markiert noch verschoben oder gelöscht.</li>
                            <li>• Anhänge werden nicht doppelt gespeichert. Im CRM erscheint eine Paperless-Suchverknüpfung, sofern Paperless verbunden ist.</li>
                        </ul>
                        {settings.passwordConfigured && <button type="button" disabled={busy} onClick={disconnect} className="mt-5 rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/60 disabled:opacity-50">IMAP-Konto trennen</button>}
                    </div>
                </section>
            </div>
        </div>
    );
}
