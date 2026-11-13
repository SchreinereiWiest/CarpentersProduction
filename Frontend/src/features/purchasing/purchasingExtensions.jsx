import { useId, useMemo, useState } from "react";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

const groupBy = (items, getKey) => items.reduce((groups, item) => {
    const key = getKey(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
}, {});

const filterCatalogArticles = (articles, suppliers, search) => {
    const needle = search.trim().toLocaleLowerCase("de");
    return [...articles]
        .filter(article => !needle || [
            article.name,
            article.sku,
            article.category,
            article.description,
            suppliers.find(supplier => supplier.id === article.supplierId)?.name
        ].some(value => String(value || "").toLocaleLowerCase("de").includes(needle)))
        .sort((left, right) => left.name.localeCompare(right.name, "de"));
};

function CatalogArticleSelect({ value, articles, suppliers, disabled = false, onChange }) {
    const inputId = useId();
    const listboxId = useId();
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const selectedArticle = articles.find(article => String(article.id) === String(value || ""));
    const selectedLabel = selectedArticle
        ? [selectedArticle.name, selectedArticle.sku].filter(Boolean).join(" · ")
        : "";
    const suggestions = useMemo(
        () => filterCatalogArticles(articles, suppliers, query).slice(0, 10),
        [articles, query, suppliers]
    );

    const selectArticle = article => {
        onChange(article.id);
        setQuery("");
        setOpen(false);
        setActiveIndex(0);
    };

    return (
        <div
            className="relative"
            onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setOpen(false);
                    setQuery("");
                }
            }}
        >
            <div className="relative">
                <input
                    id={inputId}
                    type="text"
                    role="combobox"
                    aria-label="Shop-Artikel"
                    aria-autocomplete="list"
                    aria-controls={listboxId}
                    aria-expanded={open}
                    aria-activedescendant={open && suggestions[activeIndex] ? `${listboxId}-${suggestions[activeIndex].id}` : undefined}
                    autoComplete="off"
                    disabled={disabled}
                    placeholder="Artikel suchen …"
                    value={open ? query : selectedLabel}
                    onFocus={event => {
                        setQuery(selectedLabel);
                        setOpen(true);
                        setActiveIndex(0);
                        event.currentTarget.select();
                    }}
                    onChange={event => {
                        setQuery(event.target.value);
                        setOpen(true);
                        setActiveIndex(0);
                    }}
                    onKeyDown={event => {
                        if (event.key === "Escape") {
                            setOpen(false);
                            setQuery("");
                            return;
                        }
                        if (!suggestions.length) return;
                        if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setOpen(true);
                            setActiveIndex(index => Math.min(index + 1, suggestions.length - 1));
                        }
                        if (event.key === "ArrowUp") {
                            event.preventDefault();
                            setActiveIndex(index => Math.max(index - 1, 0));
                        }
                        if (event.key === "Enter" && open) {
                            event.preventDefault();
                            selectArticle(suggestions[activeIndex]);
                        }
                    }}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 pr-16 text-sm text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {value && !disabled && (
                    <button
                        type="button"
                        aria-label="Shop-Artikel entfernen"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => {
                            onChange("");
                            setQuery("");
                            setOpen(false);
                        }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 px-1 text-gray-500 hover:text-red-300"
                    >
                        ×
                    </button>
                )}
                <button
                    type="button"
                    aria-label="Artikelvorschläge öffnen"
                    disabled={disabled}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                        setQuery("");
                        setOpen(current => !current);
                        setActiveIndex(0);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 disabled:opacity-50"
                >
                    ▾
                </button>
            </div>

            {open && !disabled && (
                <div id={listboxId} role="listbox" className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 p-1 shadow-xl">
                    {suggestions.map((article, index) => (
                        <button
                            id={`${listboxId}-${article.id}`}
                            key={article.id}
                            type="button"
                            role="option"
                            aria-selected={String(article.id) === String(value || "")}
                            onMouseDown={event => event.preventDefault()}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => selectArticle(article)}
                            className={`block w-full rounded px-3 py-2 text-left ${index === activeIndex ? "bg-blue-900 text-blue-100" : "text-gray-200 hover:bg-gray-700"}`}
                        >
                            <span className="block text-sm font-medium">{article.name}</span>
                            <span className="mt-0.5 block text-xs text-gray-400">
                                {[article.sku, article.category, suppliers.find(supplier => supplier.id === article.supplierId)?.name].filter(Boolean).join(" · ") || "Ohne weitere Angaben"}
                            </span>
                        </button>
                    ))}
                    {suggestions.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">Keine Artikel gefunden</div>}
                    {suggestions.length === 10 && <div className="border-t border-gray-700 px-3 py-2 text-xs text-gray-500">Die ersten 10 Treffer werden angezeigt. Suche weiter eingrenzen.</div>}
                </div>
            )}
        </div>
    );
}

function ModalShell({ title, eyebrow, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={event => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-blue-400">{eyebrow}</p>
                        <h2 className="mt-1 text-xl font-semibold">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="text-3xl leading-none text-gray-400 hover:text-white" aria-label="Dialog schließen">×</button>
                </div>
                {children}
            </section>
        </div>
    );
}

export function PurchaseListModal({ list, articles, suppliers, onClose, onSave }) {
    const [name, setName] = useState(list?.name || "");
    const [description, setDescription] = useState(list?.description || "");
    const [category, setCategory] = useState(list?.category || "Verbrauchsmaterial");
    const [articleSearch, setArticleSearch] = useState("");
    const [selected, setSelected] = useState(() => Object.fromEntries(
        (list?.items || []).map(item => [item.articleId, Number(item.quantity) || 1])
    ));
    const [validation, setValidation] = useState("");

    const filteredArticles = useMemo(() => {
        const needle = articleSearch.trim().toLocaleLowerCase("de");
        return [...articles]
            .filter(article => !needle || [article.name, article.sku, article.category, suppliers.find(item => item.id === article.supplierId)?.name]
                .some(value => String(value || "").toLocaleLowerCase("de").includes(needle)))
            .sort((left, right) => String(left.category || "").localeCompare(String(right.category || ""), "de") || left.name.localeCompare(right.name, "de"));
    }, [articleSearch, articles, suppliers]);

    const submit = event => {
        event.preventDefault();
        const items = Object.entries(selected).map(([articleId, quantity]) => ({ articleId, quantity: Number(quantity) || 1 }));
        if (!name.trim() || items.length === 0) {
            setValidation("Bitte einen Namen vergeben und mindestens einen Artikel auswählen.");
            return;
        }
        onSave({ name: name.trim(), description: description.trim(), category: category.trim() || "Sonstiges", items });
    };

    return (
        <ModalShell title={list ? "Bestellliste bearbeiten" : "Neue Bestellliste"} eyebrow="Regelmäßiger Bedarf" onClose={onClose}>
            <form onSubmit={submit} className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                        <span className="mb-1.5 block text-sm text-gray-300">Name *</span>
                        <input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="z. B. Werkstatt-Verbrauch" className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 outline-none focus:border-blue-500" />
                    </label>
                    <label>
                        <span className="mb-1.5 block text-sm text-gray-300">Kategorie</span>
                        <input value={category} onChange={event => setCategory(event.target.value)} placeholder="Verbrauchsmaterial" className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 outline-none focus:border-blue-500" />
                    </label>
                </div>
                <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-300">Beschreibung</span>
                    <textarea value={description} onChange={event => setDescription(event.target.value)} rows="2" placeholder="Wofür wird diese Liste verwendet?" className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 outline-none focus:border-blue-500" />
                </label>

                <div className="rounded-xl border border-gray-700 bg-gray-800/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="font-medium">Artikel auswählen</h3>
                            <p className="mt-1 text-sm text-gray-400">{Object.keys(selected).length} Artikel in dieser Liste</p>
                        </div>
                        <input value={articleSearch} onChange={event => setArticleSearch(event.target.value)} placeholder="Artikel suchen …" className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-72" />
                    </div>
                    <div className="mt-4 max-h-80 divide-y divide-gray-700 overflow-y-auto rounded-lg border border-gray-700">
                        {filteredArticles.map(article => {
                            const checked = Object.prototype.hasOwnProperty.call(selected, article.id);
                            return (
                                <div key={article.id} className="flex flex-wrap items-center gap-3 bg-gray-900/50 px-3 py-3">
                                    <input type="checkbox" checked={checked} onChange={event => setSelected(current => {
                                        const next = { ...current };
                                        if (event.target.checked) next[article.id] = 1;
                                        else delete next[article.id];
                                        return next;
                                    })} className="size-4 accent-blue-600" />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium">{article.name}</div>
                                        <div className="text-xs text-gray-500">{[article.category, article.sku, suppliers.find(item => item.id === article.supplierId)?.name].filter(Boolean).join(" · ")}</div>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-gray-400">
                                        Menge
                                        <input type="number" min="0.001" step="0.001" disabled={!checked} value={checked ? selected[article.id] : 1} onChange={event => setSelected(current => ({ ...current, [article.id]: Math.max(0.001, Number(event.target.value) || 1) }))} className="w-24 rounded-md border border-gray-600 bg-gray-950 px-2 py-1.5 text-right text-white disabled:opacity-30" />
                                        {article.unit}
                                    </label>
                                </div>
                            );
                        })}
                        {filteredArticles.length === 0 && <div className="p-6 text-center text-sm text-gray-500">Keine passenden Shop-Artikel gefunden.</div>}
                    </div>
                </div>

                {validation && <p className="text-sm text-red-400">{validation}</p>}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-800">Abbrechen</button>
                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">Liste speichern</button>
                </div>
            </form>
        </ModalShell>
    );
}

export function PurchaseListsView({ lists, search, canEdit, processingId, onCreate, onEdit, onDelete, onRelease }) {
    const categoryGroups = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase("de");
        const matches = lists.filter(list => !needle || [
            list.name,
            list.description,
            list.category,
            ...list.items.flatMap(item => [item.article?.name, item.article?.sku, item.article?.category])
        ].some(value => String(value || "").toLocaleLowerCase("de").includes(needle)));
        return Object.entries(groupBy(matches, list => list.category || "Sonstiges"))
            .sort(([left], [right]) => left.localeCompare(right, "de"));
    }, [lists, search]);

    return (
        <div className="space-y-7">
            {categoryGroups.map(([category, categoryLists]) => (
                <section key={category}>
                    <div className="mb-3 flex items-center gap-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">{category}</h2>
                        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">{categoryLists.length}</span>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {categoryLists.map(list => {
                            const total = list.items.reduce((sum, item) => sum + Number(item.article.netPrice || 0) * Number(item.quantity || 0), 0);
                            return (
                                <article key={list.id} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-md">
                                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-700 p-4">
                                        <div>
                                            <h3 className="text-lg font-semibold">{list.name}</h3>
                                            <p className="mt-1 text-sm text-gray-400">{list.description || "Wiederkehrende, projektfreie Bestellung"}</p>
                                        </div>
                                        {canEdit && (
                                            <div className="flex gap-1">
                                                <button type="button" onClick={() => onEdit(list)} className="rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">Bearbeiten</button>
                                                <button type="button" onClick={() => onDelete(list)} className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-950/40">Löschen</button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="divide-y divide-gray-700/80">
                                        {list.items.map(item => (
                                            <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium text-gray-200">{item.article.name}</div>
                                                    <div className="truncate text-xs text-gray-500">{[item.article.sku, item.article.category].filter(Boolean).join(" · ")}</div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <div>{item.quantity} {item.article.unit}</div>
                                                    <div className="text-xs text-gray-500">{money.format(Number(item.article.netPrice || 0) * Number(item.quantity || 0))}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/40 p-4">
                                        <div><span className="text-sm text-gray-400">{list.items.length} Artikel · </span><span className="font-semibold">{money.format(total)} netto</span></div>
                                        <button type="button" onClick={() => onRelease(list)} disabled={processingId === list.id || list.items.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 5h2l1.5 9h8l2-6H8m4 1v5m-2.5-2.5h5M10 18a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" /></svg>
                                            {processingId === list.id ? "Gibt frei …" : "Alle freigeben"}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            ))}
            {categoryGroups.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/60 p-12 text-center text-gray-400">
                    <h2 className="font-semibold text-gray-200">{lists.length === 0 ? "Noch keine Bestelllisten" : "Keine passende Liste gefunden"}</h2>
                    <p className="mt-2 text-sm">{lists.length === 0 ? "Erstelle eine Liste aus Artikeln des internen Shops." : "Passe den Suchbegriff an."}</p>
                    {canEdit && lists.length === 0 && <button type="button" onClick={onCreate} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">Erste Liste erstellen</button>}
                </div>
            )}
        </div>
    );
}

export function ArticleArchiveModal({ entry, articles, suppliers, onClose, onSave }) {
    const [articleId, setArticleId] = useState(entry?.articleId || articles[0]?.id || "");
    const [supplierId, setSupplierId] = useState(entry?.supplierId || suppliers[0]?.id || "");
    const [sku, setSku] = useState(entry?.sku || "");
    const [netPrice, setNetPrice] = useState(entry?.netPrice ?? 0);
    const [unit, setUnit] = useState(entry?.unit || articles.find(article => article.id === articleId)?.unit || "Stk.");
    const [validation, setValidation] = useState("");

    const submit = event => {
        event.preventDefault();
        if (!articleId || !supplierId || !unit.trim() || Number(netPrice) < 0) {
            setValidation("Bitte Artikel, Lieferant, Preis und Einheit vollständig angeben.");
            return;
        }
        onSave({ articleId, supplierId, sku: sku.trim(), netPrice: Number(netPrice), unit: unit.trim() });
    };

    return (
        <ModalShell title={entry ? "Lieferantenvariante bearbeiten" : "Lieferantenvariante archivieren"} eyebrow="Artikelarchiv" onClose={onClose}>
            <form onSubmit={submit} className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <span className="mb-1.5 block text-sm text-gray-300">Shop-Artikel *</span>
                        <CatalogArticleSelect
                            value={articleId}
                            articles={articles}
                            suppliers={suppliers}
                            disabled={Boolean(entry)}
                            onChange={nextId => {
                                setArticleId(nextId);
                                setUnit(articles.find(article => article.id === nextId)?.unit || "Stk.");
                            }}
                        />
                    </div>
                    <label>
                        <span className="mb-1.5 block text-sm text-gray-300">Alternativer Lieferant *</span>
                        <select value={supplierId} onChange={event => setSupplierId(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 outline-none focus:border-blue-500">
                            {suppliers.length === 0 && <option value="">Keine Lieferanten angelegt</option>}
                            {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                        </select>
                    </label>
                    <label>
                        <span className="mb-1.5 block text-sm text-gray-300">Artikelnummer</span>
                        <input value={sku} onChange={event => setSku(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 outline-none focus:border-blue-500" />
                    </label>
                    <div className="grid grid-cols-[1fr_8rem] gap-3">
                        <label>
                            <span className="mb-1.5 block text-sm text-gray-300">Nettopreis *</span>
                            <input type="number" min="0" step="0.01" value={netPrice} onChange={event => setNetPrice(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 outline-none focus:border-blue-500" />
                        </label>
                        <label>
                            <span className="mb-1.5 block text-sm text-gray-300">Einheit *</span>
                            <input value={unit} onChange={event => setUnit(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 outline-none focus:border-blue-500" />
                        </label>
                    </div>
                </div>
                {validation && <p className="text-sm text-red-400">{validation}</p>}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-800">Abbrechen</button>
                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">Archivieren</button>
                </div>
            </form>
        </ModalShell>
    );
}

export function ArticleArchiveView({ entries, search, canEdit, processingId, onCreate, onEdit, onDelete, onActivate }) {
    const grouped = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase("de");
        const visible = entries.filter(entry => !needle || [entry.article?.name, entry.article?.sku, entry.article?.category, entry.supplierName, entry.sku, entry.unit]
            .some(value => String(value || "").toLocaleLowerCase("de").includes(needle)));
        return Object.entries(groupBy(visible, entry => entry.article?.category || "Sonstiges"))
            .sort(([left], [right]) => left.localeCompare(right, "de"));
    }, [entries, search]);

    return (
        <div className="space-y-6">
            {grouped.map(([category, categoryEntries]) => (
                <section key={category} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
                        <div><p className="text-xs uppercase tracking-wide text-gray-500">Kategorie</p><h2 className="mt-1 font-semibold">{category}</h2></div>
                        <span className="text-sm text-gray-400">{categoryEntries.length} Varianten</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="responsive-card-table w-full min-w-[980px] text-left">
                            <thead className="bg-gray-900/60 text-xs uppercase tracking-wide text-gray-400">
                                <tr><th className="px-5 py-3">Shop-Artikel</th><th className="px-4 py-3">Archiv-Lieferant</th><th className="px-4 py-3">Artikelnummer</th><th className="px-4 py-3">Einheit</th><th className="px-4 py-3 text-right">Netto</th><th className="px-5 py-3 text-right">Aktionen</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {categoryEntries.sort((left, right) => left.article.name.localeCompare(right.article.name, "de") || left.supplierName.localeCompare(right.supplierName, "de")).map(entry => (
                                    <tr key={entry.id} className="hover:bg-gray-700/30">
                                        <td data-label="Shop-Artikel" className="px-5 py-4"><div className="font-medium">{entry.article.name}</div><div className="mt-1 text-xs text-gray-500">Aktiv: {entry.article.sku || "ohne Artikelnummer"}</div></td>
                                        <td data-label="Lieferant" className="px-4 py-4">{entry.supplierName}</td>
                                        <td data-label="Artikelnummer" className="px-4 py-4 text-gray-300">{entry.sku || "–"}</td>
                                        <td data-label="Einheit" className="px-4 py-4 text-gray-300">{entry.unit}</td>
                                        <td data-label="Netto" className="px-4 py-4 text-right font-medium">{money.format(Number(entry.netPrice))}</td>
                                        <td data-label="Aktionen" className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                {canEdit && <button type="button" onClick={() => onEdit(entry)} className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">Bearbeiten</button>}
                                                {canEdit && <button type="button" onClick={() => onDelete(entry)} className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-400 hover:bg-red-950/40">Löschen</button>}
                                                {canEdit && <button type="button" onClick={() => onActivate(entry)} disabled={processingId === entry.id} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">{processingId === entry.id ? "Aktiviert …" : "Aktivieren"}</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}
            {grouped.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/60 p-12 text-center text-gray-400">
                    <h2 className="font-semibold text-gray-200">{entries.length === 0 ? "Noch keine Lieferantenvarianten" : "Keine passende Archivposition gefunden"}</h2>
                    <p className="mt-2 text-sm">Im Archiv bleiben alternative Artikelnummern, Preise und Einheiten jederzeit abrufbar.</p>
                    {canEdit && entries.length === 0 && <button type="button" onClick={onCreate} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">Erste Variante archivieren</button>}
                </div>
            )}
        </div>
    );
}
