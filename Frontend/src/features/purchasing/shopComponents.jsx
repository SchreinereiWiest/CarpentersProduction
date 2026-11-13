import { useEffect, useState } from "react";
import { createArticleId } from "@Engine/procurement/procurement.js";

const money = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
});

const ARTICLE_GRID_CLASSES = {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
};

const EMPTY_ARTICLE = {
    name: "",
    sku: "",
    category: "",
    description: "",
    unit: "Stk.",
    netPrice: "",
    groupId: "",
    supplierId: "",
    imageUrl: ""
};

const normalizeExternalImageUrl = value => {
    const text = String(value || "").trim();
    if (!text) return "";

    try {
        const url = new URL(text);
        return url.protocol === "http:" || url.protocol === "https:" ? text : null;
    } catch {
        return null;
    }
};

const getArticleCategories = value => {
    const seen = new Set();
    return String(value || "")
        .split(",")
        .map(category => category.trim())
        .filter(category => {
            if (!category) return false;
            const normalized = category.toLocaleLowerCase("de");
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
};

const normalizeArticleCategories = value => {
    const categories = getArticleCategories(value);
    return categories.length > 0 ? categories.join(", ") : "Sonstiges";
};

export function ArticleModal({ article, groups, suppliers = [], imageUrl, onClose, onSave }) {
    const [form, setForm] = useState({ ...EMPTY_ARTICLE, ...(article || {}) });
    const [imageFile, setImageFile] = useState(null);
    const [imageInputKey, setImageInputKey] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(imageUrl || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => () => {
        if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    const selectImage = event => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError("Das Bild darf maximal 5 MB groß sein.");
            return;
        }

        if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        setImageFile(file);
        setForm(current => ({ ...current, imageUrl: "" }));
        setPreviewUrl(URL.createObjectURL(file));
        setError("");
    };

    const setExternalImageUrl = event => {
        const value = event.target.value;
        const normalizedUrl = normalizeExternalImageUrl(value);
        if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        setImageFile(null);
        setImageInputKey(current => current + 1);
        setForm(current => ({ ...current, imageUrl: value }));
        setPreviewUrl(normalizedUrl || "");
        setError("");
    };

    const submit = async event => {
        event.preventDefault();
        const normalizedImageUrl = normalizeExternalImageUrl(form.imageUrl);
        if (normalizedImageUrl === null) {
            setError("Bitte einen gültigen Bild-Link mit http:// oder https:// eingeben.");
            return;
        }
        setSaving(true);
        setError("");

        try {
            await onSave({
                ...form,
                id: form.id || createArticleId(),
                name: form.name.trim(),
                sku: form.sku.trim(),
                category: normalizeArticleCategories(form.category),
                description: form.description.trim(),
                unit: form.unit.trim() || "Stk.",
                groupId: form.groupId || null,
                supplierId: form.supplierId || null,
                imageFileId: normalizedImageUrl ? null : form.imageFileId,
                imageUrl: normalizedImageUrl,
                netPrice: Math.max(0, Number(form.netPrice) || 0)
            }, imageFile);
        } catch (saveError) {
            setError(saveError?.message || "Der Artikel konnte nicht übernommen werden.");
        } finally {
            setSaving(false);
        }
    };

    const field = (name, label, options = {}) => (
        <label className={options.wide ? "sm:col-span-2" : ""}>
            <span className="mb-1.5 block text-sm text-gray-300">{label}</span>
            {options.textarea ? (
                <textarea
                    value={form[name]}
                    onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))}
                    rows="3"
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500"
                />
            ) : (
                <input
                    required={options.required}
                    type={options.type || "text"}
                    min={options.min}
                    step={options.step}
                    value={form[name]}
                    onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500"
                />
            )}
            {options.help && <span className="mt-1.5 block text-xs text-gray-500">{options.help}</span>}
        </label>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={event => {
            if (event.target === event.currentTarget && !saving) onClose();
        }}>
            <form onSubmit={submit} className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">{article?.id ? "Artikel bearbeiten" : "Artikel anlegen"}</h2>
                        <p className="mt-1 text-sm text-gray-400">Artikelstammdaten für den internen Projekt-Shop.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} className="text-2xl text-gray-400 hover:text-white disabled:opacity-50" aria-label="Dialog schließen">×</button>
                </div>

                <label className="mt-6 block">
                    <span className="mb-1.5 block text-sm text-gray-300">Artikelbild</span>
                    <span className="relative flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-600 bg-gray-900 hover:border-blue-500">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Artikelvorschau" className="h-full w-full object-contain" />
                        ) : (
                            <span className="text-sm text-gray-500">Bild auswählen · JPG, PNG, WebP oder GIF · max. 5 MB</span>
                        )}
                        <input key={imageInputKey} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={selectImage} className="absolute inset-0 cursor-pointer opacity-0" />
                    </span>
                </label>

                <div className="my-3 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-500">
                    <span className="h-px flex-1 bg-gray-700" />
                    oder per Link
                    <span className="h-px flex-1 bg-gray-700" />
                </div>

                <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-300">Bild-Link</span>
                    <input
                        type="url"
                        maxLength="2048"
                        aria-label="Bild-Link"
                        aria-describedby="article-image-url-help"
                        placeholder="https://example.de/artikelbild.jpg"
                        value={form.imageUrl || ""}
                        onChange={setExternalImageUrl}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500"
                    />
                    <span id="article-image-url-help" className="mt-1.5 block text-xs text-gray-500">Ein Link ersetzt ein zuvor ausgewähltes oder hochgeladenes Bild.</span>
                </label>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {field("name", "Bezeichnung", { required: true, wide: true })}
                    {field("sku", "Artikelnummer")}
                    {field("category", "Kategorien", { help: "Mehrere Kategorien mit Komma trennen, z. B. Küche, Hänger." })}
                    {field("unit", "Einheit", { required: true })}
                    {field("netPrice", "Nettopreis in €", { required: true, type: "number", min: "0", step: "0.01" })}
                    <label className="sm:col-span-2">
                        <span className="mb-1.5 block text-sm text-gray-300">Lieferant</span>
                        <select
                            value={form.supplierId || ""}
                            onChange={event => setForm(current => ({ ...current, supplierId: event.target.value }))}
                            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500"
                        >
                            <option value="">Ohne Lieferant</option>
                            {form.supplierId && !suppliers.some(supplier => supplier.id === form.supplierId) && (
                                <option value={form.supplierId}>Nicht mehr verfügbar ({form.supplierId})</option>
                            )}
                            {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                        </select>
                    </label>
                    <label className="sm:col-span-2">
                        <span className="mb-1.5 block text-sm text-gray-300">Artikelgruppe</span>
                        <select
                            value={form.groupId || ""}
                            onChange={event => setForm(current => ({ ...current, groupId: event.target.value }))}
                            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500"
                        >
                            <option value="">Keine Gruppe</option>
                            {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                        </select>
                    </label>
                    {field("description", "Beschreibung", { textarea: true, wide: true })}
                </div>

                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700 disabled:opacity-50">Abbrechen</button>
                    <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500 disabled:opacity-50">{saving ? "Artikel wird gespeichert …" : "Artikel übernehmen"}</button>
                </div>
            </form>
        </div>
    );
}

export function GroupModal({ group, articles, onClose, onSave }) {
    const [form, setForm] = useState({
        id: group?.id || createArticleId(),
        name: group?.name || "",
        description: group?.description || "",
        imageUrl: group?.imageUrl || ""
    });
    const [error, setError] = useState("");
    const [selectedIds, setSelectedIds] = useState(() => new Set(
        articles.filter(article => article.groupId === group?.id).map(article => article.id)
    ));

    const submit = event => {
        event.preventDefault();
        const normalizedImageUrl = normalizeExternalImageUrl(form.imageUrl);
        if (normalizedImageUrl === null) {
            setError("Bitte einen gültigen Gruppenbild-Link mit http:// oder https:// eingeben.");
            return;
        }
        onSave({
            ...form,
            name: form.name.trim(),
            description: form.description.trim(),
            imageUrl: normalizedImageUrl
        }, selectedIds);
    };

    const groupPreviewUrl = normalizeExternalImageUrl(form.imageUrl);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={event => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">{group ? "Artikelgruppe bearbeiten" : "Artikelgruppe anlegen"}</h2>
                        <p className="mt-1 text-sm text-gray-400">Mehrere Varianten unter einem gemeinsamen Shop-Eintrag bündeln.</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-2xl text-gray-400 hover:text-white" aria-label="Dialog schließen">×</button>
                </div>

                <div className="mt-6 space-y-4">
                    <label>
                        <span className="mb-1.5 block text-sm text-gray-300">Gruppenname</span>
                        <input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500" />
                    </label>
                    <label>
                        <span className="mb-1.5 block text-sm text-gray-300">Beschreibung</span>
                        <textarea rows="3" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500" />
                    </label>
                    <label>
                        <span className="mb-1.5 block text-sm text-gray-300">Gruppenbild-Link</span>
                        <input
                            type="url"
                            maxLength="2048"
                            aria-label="Gruppenbild-Link"
                            placeholder="https://example.de/gruppenbild.jpg"
                            value={form.imageUrl}
                            onChange={event => {
                                setForm(current => ({ ...current, imageUrl: event.target.value }));
                                setError("");
                            }}
                            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500"
                        />
                        <span className="mt-1.5 block text-xs text-gray-500">Direkter Bild-Link mit http:// oder https://.</span>
                    </label>
                    {groupPreviewUrl && (
                        <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-gray-700 bg-gray-900">
                            <img src={groupPreviewUrl} alt="Gruppenvorschau" className="h-full w-full object-contain" />
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <div className="text-sm font-medium text-gray-300">Artikel in dieser Gruppe</div>
                    <div className="mt-2 max-h-64 divide-y divide-gray-700 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900">
                        {articles.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500">Noch keine Artikel vorhanden.</div>
                        ) : articles.map(article => (
                            <label key={article.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-800">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(article.id)}
                                    onChange={event => setSelectedIds(current => {
                                        const next = new Set(current);
                                        if (event.target.checked) next.add(article.id);
                                        else next.delete(article.id);
                                        return next;
                                    })}
                                    className="size-4 accent-blue-600"
                                />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm text-white">{article.name}</span>
                                    <span className="block truncate text-xs text-gray-500">{article.sku || "Ohne Artikelnummer"}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700">Abbrechen</button>
                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">Gruppe übernehmen</button>
                </div>
            </form>
        </div>
    );
}

export function ShopArticle({ article, imageUrl, supplierName, projectId, editMode, listView = false, adding, onAdd, onEdit, onDuplicate, onDelete }) {
    const [quantity, setQuantity] = useState(1);
    const categories = getArticleCategories(article.category);

    return (
        <article className={`flex h-full rounded-lg border border-gray-700 bg-gray-800 p-3.5 shadow-md transition hover:border-gray-600 ${listView ? "flex-col sm:flex-row sm:items-center sm:gap-4" : "flex-col"}`}>
            <div className={`flex min-w-0 gap-3 ${listView ? "sm:flex-1 sm:items-center" : ""}`}>
                <div className="aspect-square size-24 shrink-0 overflow-hidden rounded-md bg-gray-900/50">
                    {imageUrl && <img src={imageUrl} alt={article.name} loading="lazy" className="h-full w-full object-contain" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                        <div className="flex flex-wrap gap-1">
                            {(categories.length > 0 ? categories : ["Sonstiges"]).map(category => (
                                <span key={category.toLocaleLowerCase("de")} className="inline-flex rounded-full bg-gray-700 px-2 py-0.5 text-[11px] text-gray-300">{category}</span>
                            ))}
                        </div>
                        <h3 className="mt-2 truncate font-semibold">{article.name}</h3>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{article.sku || "Ohne Artikelnummer"}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{supplierName || "Ohne Lieferant"}</p>
                        </div>
                        {editMode && (
                            <div className="flex shrink-0 gap-0.5">
                                <button type="button" onClick={() => onEdit(article)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white" aria-label={`${article.name} bearbeiten`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="m4 16-.8 4 4-.8L18 8.4 15.6 6 4 16Zm9.8-8.2 2.4 2.4M14.8 6.8l1.5-1.5a1.7 1.7 0 0 1 2.4 0 1.7 1.7 0 0 1 0 2.4l-1.5 1.5" /></svg>
                                </button>
                                <button type="button" onClick={() => onDuplicate(article)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-blue-300" aria-label={`${article.name} duplizieren`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" strokeWidth="1.7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" /></svg>
                                </button>
                                <button type="button" onClick={() => onDelete(article.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-red-400" aria-label={`${article.name} löschen`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M6 7h12m-9 0V5h6v2m-7 0 1 13h6l1-13" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-8 overflow-hidden text-xs leading-4 text-gray-400">{article.description || "Keine Beschreibung hinterlegt."}</p>
                </div>
            </div>

            <div className={`mt-3 flex items-end justify-between gap-2 border-t border-gray-700 pt-3 ${listView ? "sm:mt-0 sm:min-w-64 sm:shrink-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0" : ""}`}>
                <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">Nettopreis</div>
                    <div className="mt-0.5 text-base font-bold">{money.format(Number(article.netPrice) || 0)} <span className="text-xs font-normal text-gray-500">/ {article.unit}</span></div>
                </div>
                <div className="flex items-center gap-2">
                    <input aria-label={`Menge ${article.name}`} type="number" min="1" step="1" value={quantity} onChange={event => setQuantity(Math.max(1, Number(event.target.value) || 1))} className="w-13 rounded-md border border-gray-600 bg-gray-900 px-1.5 py-1.5 text-center text-sm outline-none focus:border-blue-500" />
                    <button type="button" onClick={() => onAdd(article, quantity)} disabled={!projectId || adding} className="flex size-8.5 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`${article.name} zum Projekt hinzufügen`} title={projectId ? "Zum Projekt hinzufügen" : "Zuerst Zielprojekt wählen"}>
                        {adding ? "…" : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 5h2l1.5 9h8l2-6H8m4 1v5m-2.5-2.5h5M10 18a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" /></svg>
                        )}
                    </button>
                </div>
            </div>
        </article>
    );
}

export function ShopGroup({ group, articleCount, editMode, listView = false, onOpen, onEdit, onDelete }) {
    return (
        <article
            role="button"
            tabIndex="0"
            onClick={onOpen}
            onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen();
                }
            }}
            className={`group flex min-h-40 cursor-pointer flex-col rounded-lg border border-blue-900/60 bg-gray-800 p-3.5 shadow-md transition hover:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${listView ? "sm:min-h-0 sm:flex-row sm:items-center sm:gap-4" : ""}`}
        >
            <div className="flex min-w-0 flex-1 gap-3">
                <div className="flex aspect-square size-24 shrink-0 items-center justify-center rounded-md bg-blue-950/30 text-blue-400">
                    {group.imageUrl ? (
                        <img src={group.imageUrl} alt={`Gruppenbild ${group.name}`} loading="lazy" className="h-full w-full rounded-md object-contain" />
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-9 transition group-hover:scale-105" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Zm0 4.5 8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" /></svg>
                    )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <span className="inline-flex rounded-full bg-blue-950 px-2 py-0.5 text-[11px] text-blue-300">Artikelgruppe</span>
                        <h3 className="mt-2 font-semibold">{group.name}</h3>
                    </div>
                    {editMode && (
                        <div className="flex gap-1">
                            <button type="button" onClick={event => { event.stopPropagation(); onEdit(group); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white" aria-label={`${group.name} bearbeiten`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="m4 16-.8 4 4-.8L18 8.4 15.6 6 4 16Z" /></svg>
                            </button>
                            <button type="button" onClick={event => { event.stopPropagation(); onDelete(group.id); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-red-400" aria-label={`${group.name} löschen`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M6 7h12m-9 0V5h6v2m-7 0 1 13h6l1-13" /></svg>
                            </button>
                        </div>
                    )}
                </div>
                <p className="mt-2 line-clamp-2 flex-1 overflow-hidden text-xs leading-4.5 text-gray-400">{group.description || "Varianten dieser Artikelgruppe anzeigen."}</p>
                </div>
            </div>
            <div className={`mt-3 flex items-center justify-between border-t border-gray-700 pt-3 ${listView ? "sm:mt-0 sm:min-w-48 sm:shrink-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0" : ""}`}>
                <span className="text-xs text-gray-400">{articleCount} Artikel</span>
                <span className="text-xs font-medium text-blue-300">Öffnen →</span>
            </div>
        </article>
    );
}

export function GroupArticlesModal({ group, articles, imageUrls, suppliers = [], projectId, editMode, addingArticleId, columns = 4, onClose, onAdd, onEdit, onDuplicate, onDelete }) {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4" onMouseDown={event => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section className="max-h-[92dvh] w-full max-w-6xl overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <span className="text-xs font-medium uppercase tracking-widest text-blue-400">Artikelgruppe</span>
                        <h2 className="mt-1 text-2xl font-semibold">{group.name}</h2>
                        {group.description && <p className="mt-2 text-gray-400">{group.description}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="text-3xl leading-none text-gray-400 hover:text-white" aria-label="Gruppe schließen">×</button>
                </div>

                {articles.length === 0 ? (
                    <div className="mt-6 rounded-xl border border-dashed border-gray-700 p-10 text-center text-gray-500">Diese Gruppe enthält noch keine Artikel.</div>
                ) : (
                    <div className={`mt-6 grid gap-3 ${ARTICLE_GRID_CLASSES[columns] || ARTICLE_GRID_CLASSES[4]}`}>
                        {articles.map(article => (
                            <ShopArticle key={article.id} article={article} imageUrl={article.imageUrl || imageUrls[article.imageFileId]} supplierName={suppliers.find(supplier => supplier.id === article.supplierId)?.name} projectId={projectId} editMode={editMode} listView={columns === 1} adding={addingArticleId === article.id} onAdd={onAdd} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
