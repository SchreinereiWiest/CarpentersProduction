import { useEffect, useState } from "react";
import { activateLicense, loadLicense } from "../../../shared/api/license-api.js";

const dateLabel = value => value
    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(value))
    : "Unbegrenzt";

const statusStyle = status => status === "active"
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-red-500/15 text-red-300 border-red-500/30";

function Info({ label, value }) {
    return (
        <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
            <div className="mt-1 break-words text-sm text-gray-100">{value ?? "–"}</div>
        </div>
    );
}

export default function ProgramSettingsPanel() {
    const [data, setData] = useState(null);
    const [licenseKey, setLicenseKey] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const refresh = async (force = false) => {
        setLoading(true);
        setError("");
        try {
            setData(await loadLicense({ refresh: force }));
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Lizenzinformationen konnten nicht geladen werden.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        loadLicense()
            .then(result => { if (active) setData(result); })
            .catch(requestError => {
                if (active) setError(requestError.response?.data?.message || "Lizenzinformationen konnten nicht geladen werden.");
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const save = async event => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");
        try {
            setData(await activateLicense(licenseKey));
            setLicenseKey("");
            setMessage("Die Lizenz wurde geprüft und aktiviert.");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Der Lizenzschlüssel konnte nicht aktiviert werden.");
        } finally {
            setSaving(false);
        }
    };

    const license = data?.license;
    const development = license?.provider === "development";
    const remote = license?.provider === "remote";
    const providerLabel = development
        ? "Entwicklungsmodus"
        : remote ? "Lizenzserver" : "Lokales Zertifikat";

    return (
        <div className="responsive-settings-panel h-full overflow-y-auto p-6">
            <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold">Programmeinstellungen</h1>
                        <p className="mt-1 text-sm text-gray-400">Lizenz und freigeschaltete Programmmodule dieses Unternehmens.</p>
                    </div>
                    <button type="button" onClick={() => refresh(true)} disabled={loading} className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 disabled:opacity-50">
                        Neu prüfen
                    </button>
                </div>

                {error && <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
                {message && <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div>}

                {loading && !license ? (
                    <div className="text-sm text-gray-400">Lizenzinformationen werden geladen …</div>
                ) : license && (
                    <>
                        <section className="rounded-xl border border-gray-700 bg-gray-800/40 p-5">
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm text-gray-400">Lizenz für</div>
                                    <div className="text-lg font-medium">{data.tenant.name}</div>
                                </div>
                                <span className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusStyle(license.status)}`}>{license.status}</span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <Info label="Lizenz-ID" value={license.licenseId} />
                                <Info label="Lizenzschlüssel" value={license.licenseKey || "Nicht gespeichert"} />
                                <Info label="Lizenzmodell" value={license.plan} />
                                <Info label="Maximale Benutzer" value={license.maxUsers ?? "Unbegrenzt"} />
                                <Info label="Gültig bis" value={dateLabel(license.validUntil)} />
                                <Info label="Prüfquelle" value={providerLabel} />
                            </div>
                        </section>

                        <section className="mt-5 rounded-xl border border-gray-700 bg-gray-800/40 p-5">
                            <h2 className="font-medium">Freigeschaltete Module</h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {license.features.map(feature => (
                                    <span key={feature} className="rounded-md bg-blue-500/15 px-3 py-1.5 text-sm text-blue-200">{feature}</span>
                                ))}
                            </div>
                        </section>

                        <section className="mt-5 rounded-xl border border-gray-700 bg-gray-800/40 p-5">
                            <h2 className="font-medium">Lizenz aktivieren</h2>
                            <p className="mt-1 text-sm text-gray-400">
                                {development
                                    ? "Im Entwicklungsmodus wird automatisch eine lokale Entwicklungslizenz verwendet."
                                    : remote
                                        ? "Der Lizenzschlüssel wird sicher über das Backend an den zentralen Lizenzserver übertragen und dort geprüft."
                                        : "Der signierte Lizenzschlüssel wird lokal geprüft und an den oben angezeigten Firmennamen gebunden."}
                            </p>
                            <form onSubmit={save} className="mt-4 flex flex-col gap-3 sm:flex-row">
                                <input
                                    value={licenseKey}
                                    onChange={event => setLicenseKey(event.target.value)}
                                    disabled={development || saving}
                                    placeholder="Lizenzschlüssel einfügen"
                                    className="min-w-0 flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                                />
                                <button type="submit" disabled={development || saving || !licenseKey.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                                    {saving ? "Prüfe …" : "Aktivieren"}
                                </button>
                            </form>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
