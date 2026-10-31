import { useMemo } from "react";

export default function ArticleCatalogView({ entries, suppliers, search, canEdit, onChange, onRemove }) {
    const visibleEntries = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase("de");
        return entries
            .filter(entry => !needle || [
                entry.sku,
                entry.name,
                suppliers.find(supplier => supplier.id === entry.supplierId)?.name
            ].some(value => String(value || "").toLocaleLowerCase("de").includes(needle)))
            .sort((left, right) => {
                const leftSupplier = suppliers.find(supplier => supplier.id === left.supplierId)?.name || "";
                const rightSupplier = suppliers.find(supplier => supplier.id === right.supplierId)?.name || "";
                return leftSupplier.localeCompare(rightSupplier, "de") ||
                    String(left.sku || "").localeCompare(String(right.sku || ""), "de", { numeric: true }) ||
                    String(left.name || "").localeCompare(String(right.name || ""), "de");
            });
    }, [entries, search, suppliers]);

    if (visibleEntries.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/60 p-12 text-center text-gray-400">
                {entries.length === 0
                    ? "Der Katalog ist noch leer. Artikel aus dem internen Shop werden beim Laden automatisch übernommen."
                    : "Keine passenden Katalogartikel gefunden."}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
            <div className="overflow-x-auto">
                <table className="responsive-card-table w-full min-w-[760px] text-left">
                    <thead className="bg-gray-900/60 text-xs uppercase tracking-wide text-gray-400">
                        <tr>
                            <th className="px-5 py-3">Artikelnummer</th>
                            <th className="px-4 py-3">Bezeichnung</th>
                            <th className="px-5 py-3">Lieferant</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {visibleEntries.map(entry => (
                            <tr key={entry.id} className="hover:bg-gray-700/30">
                                <td data-label="Artikelnummer" className="px-5 py-3">
                                    {canEdit ? (
                                        <input
                                            value={entry.sku}
                                            onChange={event => onChange(entry.id, "sku", event.target.value)}
                                            placeholder="Artikelnummer"
                                            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                    ) : <span className="font-mono text-sm text-gray-200">{entry.sku || "–"}</span>}
                                </td>
                                <td data-label="Bezeichnung" className="px-4 py-3">
                                    {canEdit ? (
                                        <input
                                            value={entry.name}
                                            onChange={event => onChange(entry.id, "name", event.target.value)}
                                            placeholder="Bezeichnung"
                                            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                    ) : <span>{entry.name}</span>}
                                </td>
                                <td data-label="Lieferant" className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                        {canEdit ? (
                                            <select
                                                value={entry.supplierId || ""}
                                                onChange={event => onChange(entry.id, "supplierId", event.target.value || null)}
                                                className="min-w-0 flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                            >
                                                <option value="">Ohne Lieferant</option>
                                                {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                                            </select>
                                        ) : (
                                            <span>{suppliers.find(supplier => supplier.id === entry.supplierId)?.name || "Ohne Lieferant"}</span>
                                        )}
                                        {canEdit && !entry.shopArticleId && (
                                            <button
                                                type="button"
                                                onClick={() => onRemove(entry.id)}
                                                className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-700 hover:text-red-400"
                                                aria-label={`${entry.name || "Katalogartikel"} entfernen`}
                                                title="Nur aus dem Katalog entfernen"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 7h12m-9 0V5h6v2m-7 0 1 13h6l1-13" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

