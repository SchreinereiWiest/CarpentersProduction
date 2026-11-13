import { useMemo, useState } from "react";

const FETCH_TYPES = new Set(["datanorm", "av-firefox-extension"]);

const toggleSetValue = (current, value) => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
};

export default function ShopFetchSelectionModal({ entries, suppliers, articles, groups, onClose, onStart }) {
    const fetchSuppliers = useMemo(
        () => suppliers.filter(supplier => FETCH_TYPES.has(supplier.procurementType)),
        [suppliers]
    );
    const eligibleEntries = useMemo(() => {
        const supplierIds = new Set(fetchSuppliers.map(supplier => supplier.id));
        return entries.filter(entry => supplierIds.has(entry.supplierId));
    }, [entries, fetchSuppliers]);
    const [supplierIds, setSupplierIds] = useState(() => new Set(fetchSuppliers.map(supplier => supplier.id)));
    const [entryIds, setEntryIds] = useState(() => new Set(eligibleEntries.map(entry => entry.id)));
    const [search, setSearch] = useState("");

    const articlesById = useMemo(() => new Map(articles.map(article => [article.id, article])), [articles]);
    const groupsById = useMemo(() => new Map(groups.map(group => [group.id, group])), [groups]);
    const entriesByGroup = useMemo(() => {
        const result = new Map();
        for (const entry of eligibleEntries) {
            const groupId = articlesById.get(entry.shopArticleId)?.groupId || "__ungrouped__";
            if (!result.has(groupId)) result.set(groupId, []);
            result.get(groupId).push(entry);
        }
        return result;
    }, [articlesById, eligibleEntries]);

    const visibleEntries = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase("de");
        return eligibleEntries.filter(entry => {
            if (!supplierIds.has(entry.supplierId)) return false;
            if (!needle) return true;
            const supplier = fetchSuppliers.find(item => item.id === entry.supplierId);
            return [entry.sku, entry.name, supplier?.name]
                .some(value => String(value || "").toLocaleLowerCase("de").includes(needle));
        });
    }, [eligibleEntries, fetchSuppliers, search, supplierIds]);

    const selectedEntries = eligibleEntries.filter(entry => supplierIds.has(entry.supplierId) && entryIds.has(entry.id));
    const toggleGroup = groupEntries => {
        const selectable = groupEntries.filter(entry => supplierIds.has(entry.supplierId));
        const select = selectable.some(entry => !entryIds.has(entry.id));
        setEntryIds(current => {
            const next = new Set(current);
            for (const entry of selectable) {
                if (select) next.add(entry.id);
                else next.delete(entry.id);
            }
            return next;
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="shop-fetch-title">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-gray-700 px-5 py-4">
                    <div>
                        <h2 id="shop-fetch-title" className="text-lg font-semibold">Shop-Daten fetchen</h2>
                        <p className="mt-1 text-sm text-gray-400">Lieferanten und anschließend Artikel oder ganze Artikelgruppen auswählen.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Dialog schließen">✕</button>
                </div>

                <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.5fr)]">
                    <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="font-semibold">Lieferanten</h3>
                            <button type="button" onClick={() => setSupplierIds(new Set(fetchSuppliers.map(supplier => supplier.id)))} className="text-xs text-blue-300 hover:text-blue-200">Alle</button>
                        </div>
                        <div className="space-y-2">
                            {fetchSuppliers.map(supplier => {
                                const count = eligibleEntries.filter(entry => entry.supplierId === supplier.id).length;
                                return (
                                    <label key={supplier.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-700 bg-gray-800 p-3 hover:border-gray-600">
                                        <input type="checkbox" checked={supplierIds.has(supplier.id)} onChange={() => setSupplierIds(current => toggleSetValue(current, supplier.id))} className="mt-0.5 size-4 accent-blue-600" />
                                        <span className="min-w-0">
                                            <strong className="block truncate text-sm">{supplier.name}</strong>
                                            <span className="mt-1 block text-xs text-gray-500">{supplier.procurementType === "datanorm" ? "DATANORM" : "Firefox-Erweiterung"} · {count} Artikel</span>
                                        </span>
                                    </label>
                                );
                            })}
                            {fetchSuppliers.length === 0 && <p className="rounded-xl border border-dashed border-gray-700 p-4 text-sm text-gray-500">In den Shop-Einstellungen ist noch kein Fetch-Plugin aktiviert.</p>}
                        </div>
                    </section>

                    <section className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                            <label className="min-w-56 flex-1">
                                <span className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Artikel suchen</span>
                                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nummer, Name oder Lieferant" className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 outline-none focus:border-blue-500" />
                            </label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setEntryIds(new Set(eligibleEntries.filter(entry => supplierIds.has(entry.supplierId)).map(entry => entry.id)))} className="rounded-lg border border-gray-600 px-3 py-2 text-xs hover:bg-gray-800">Alle Artikel</button>
                                <button type="button" onClick={() => setEntryIds(new Set())} className="rounded-lg border border-gray-600 px-3 py-2 text-xs hover:bg-gray-800">Keine</button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className="mb-2 text-sm font-semibold">Artikelgruppen</h3>
                            <div className="flex flex-wrap gap-2">
                                {[...entriesByGroup.entries()].map(([groupId, groupEntries]) => {
                                    const selectable = groupEntries.filter(entry => supplierIds.has(entry.supplierId));
                                    if (selectable.length === 0) return null;
                                    const selected = selectable.every(entry => entryIds.has(entry.id));
                                    const label = groupId === "__ungrouped__" ? "Ohne Gruppe" : groupsById.get(groupId)?.name || "Unbekannte Gruppe";
                                    return <button key={groupId} type="button" onClick={() => toggleGroup(groupEntries)} className={`rounded-full border px-3 py-1.5 text-xs ${selected ? "border-blue-500 bg-blue-950 text-blue-200" : "border-gray-600 text-gray-400 hover:bg-gray-800"}`}>{label} · {selectable.length}</button>;
                                })}
                            </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-700">
                            {visibleEntries.map(entry => {
                                const supplier = fetchSuppliers.find(item => item.id === entry.supplierId);
                                const group = groupsById.get(articlesById.get(entry.shopArticleId)?.groupId);
                                return (
                                    <label key={entry.id} className="flex cursor-pointer items-start gap-3 border-b border-gray-800 px-3 py-2.5 last:border-0 hover:bg-gray-800/70">
                                        <input type="checkbox" checked={entryIds.has(entry.id)} onChange={() => setEntryIds(current => toggleSetValue(current, entry.id))} className="mt-0.5 size-4 accent-blue-600" />
                                        <span className="min-w-0 flex-1">
                                            <strong className="block truncate text-sm">{entry.sku} · {entry.name}</strong>
                                            <span className="block truncate text-xs text-gray-500">{supplier?.name || "Ohne Lieferant"}{group ? ` · ${group.name}` : " · Ohne Gruppe"}</span>
                                        </span>
                                    </label>
                                );
                            })}
                            {visibleEntries.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Keine Artikel für diese Auswahl.</p>}
                        </div>
                    </section>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-700 bg-gray-950/60 px-5 py-4">
                    <span className="text-sm text-gray-400">{selectedEntries.length} Artikel von {supplierIds.size} Lieferanten ausgewählt</span>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-800">Abbrechen</button>
                        <button type="button" disabled={selectedEntries.length === 0} onClick={() => onStart({ supplierIds: [...supplierIds], entryIds: selectedEntries.map(entry => entry.id) })} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">{selectedEntries.length} Artikel fetchen</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
