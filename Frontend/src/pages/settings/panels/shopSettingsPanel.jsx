import { useEffect, useState } from "react";
import {
    loadProcurementCatalog,
    loadShopSettings,
    saveShopSettings
} from "../../purchasing/procurementApi.js";
import {
    LEGRABOX_COLORS,
    LEGRABOX_VARIANTS,
    normalizeCatalog,
    normalizeShopSettings
} from "../../purchasing/procurementUtils.js";

const COLOR_LABELS = {
    white: "Weiß",
    gray: "Grau"
};

export default function ShopSettingsPanel() {
    const [config, setConfig] = useState(() => normalizeShopSettings(null));
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        let active = true;

        Promise.all([
            loadShopSettings(),
            loadProcurementCatalog()
        ]).then(([settings, catalog]) => {
            if (!active) return;
            setConfig(normalizeShopSettings(settings));
            setArticles(normalizeCatalog(catalog).articles);
        }).catch(error => {
            console.error("Shop-Einstellungen konnten nicht geladen werden", error);
            if (active) setMessage({ type: "error", text: "Die Shop-Einstellungen konnten nicht geladen werden." });
        }).finally(() => {
            if (active) setLoading(false);
        });

        return () => { active = false; };
    }, []);

    const updateMapping = (variant, color, articleId) => {
        setConfig(current => ({
            ...current,
            legraboxArticleIds: {
                ...current.legraboxArticleIds,
                [variant]: {
                    ...current.legraboxArticleIds[variant],
                    [color]: articleId
                }
            }
        }));
        setMessage(null);
    };

    const save = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const payload = {
                ...config,
                version: 1,
                updatedAt: new Date().toISOString()
            };
            await saveShopSettings(payload);
            setConfig(payload);
            setMessage({ type: "success", text: "Shop-Zuordnungen wurden gespeichert." });
        } catch (error) {
            console.error("Shop-Einstellungen konnten nicht gespeichert werden", error);
            setMessage({ type: "error", text: "Die Shop-Zuordnungen konnten nicht gespeichert werden." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="h-full overflow-y-auto p-6 text-sm text-gray-500">Shop-Einstellungen werden geladen …</div>;
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-5xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold">Shop</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            Legrabox-Ausführungen mit Artikeln aus dem internen Shop verknüpfen. Artikelnummer und Nettopreis werden anschließend im Projekt-Einkaufswagen übernommen.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Speichert …" : "Zuordnungen speichern"}
                    </button>
                </div>

                {message && (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-800 bg-emerald-950/40 text-emerald-300" : "border-red-800 bg-red-950/40 text-red-300"}`}>
                        {message.text}
                    </div>
                )}

                {articles.length === 0 && (
                    <div className="rounded-lg border border-amber-800 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
                        Im internen Shop sind noch keine Artikel angelegt. Lege dort zuerst die benötigten Legrabox-Artikel an.
                    </div>
                )}

                <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                    <div className="border-b border-gray-700 px-5 py-4">
                        <h2 className="font-semibold">Legrabox-Artikel</h2>
                        <p className="mt-1 text-sm text-gray-400">Je Variante kann für Weiß und Grau ein eigener Shop-Artikel gewählt werden.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left">
                            <thead className="bg-gray-900/60 text-xs uppercase tracking-wide text-gray-400">
                                <tr>
                                    <th className="w-36 px-5 py-3">Typ</th>
                                    <th className="px-4 py-3">Weiß</th>
                                    <th className="px-5 py-3">Grau</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {LEGRABOX_VARIANTS.map(variant => (
                                    <tr key={variant}>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-gray-700 font-bold text-blue-300">{variant}</span>
                                        </td>
                                        {LEGRABOX_COLORS.map(color => (
                                            <td key={color} className="px-4 py-4 last:px-5">
                                                <label>
                                                    <span className="sr-only">Legrabox {variant} {COLOR_LABELS[color]}</span>
                                                    <select
                                                        value={config.legraboxArticleIds[variant]?.[color] || ""}
                                                        onChange={event => updateMapping(variant, color, event.target.value)}
                                                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                                    >
                                                        <option value="">Nicht zugeordnet</option>
                                                        {articles.map(article => (
                                                            <option key={article.id} value={article.id}>
                                                                {[article.sku, article.name].filter(Boolean).join(" – ")}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
