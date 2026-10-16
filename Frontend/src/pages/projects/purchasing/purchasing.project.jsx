import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "react-router";
import SideBar from "../../../components/sideBar.jsx";
import ProjectBar from "../../../components/projectBar.jsx";
import { downloadFile } from "../../../services/apiTemplates.js";
import { getProjectFile } from "../../../services/projectMemoryCache.js";
import {
    applyEdgeQuantityMode,
    buildEdgeItems,
    buildHardwareItems,
    buildPlateItems,
    createProcurementPayload,
    mergeGeneratedItems,
    normalizeCatalog,
    normalizeProcurementDocument,
    normalizeShopSettings
} from "../../purchasing/procurementUtils.js";
import {
    loadProcurementCatalog,
    loadProjectProcurement,
    loadShopSettings,
    saveProjectProcurement
} from "../../purchasing/procurementApi.js";

const money = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
});

const safeProjectFile = async (projectId, name) => {
    try {
        return await getProjectFile({
            projectId,
            file: `${name}.json`,
            loadFromServer: {
                download: downloadFile,
                path: `/api/projects/generated/${projectId}/${name}`
            }
        });
    } catch (error) {
        console.warn(`${name}.json konnte nicht geladen werden`, error);
        return null;
    }
};

function SourceBadge({ source }) {
    const labels = {
        nesting: "Nesting",
        hardware: "Cabinet",
        shop: "Shop"
    };

    return (
        <span className="inline-flex rounded-full border border-gray-600 bg-gray-900 px-2.5 py-1 text-xs text-gray-300">
            {labels[source] || source}
        </span>
    );
}

function PurchaseTable({ title, description, items, lockedReleasedKeys, onChange, onRemove }) {
    return (
        <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-lg">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-700 px-5 py-4">
                <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="mt-1 text-sm text-gray-400">{description}</p>
                </div>
                <span className="text-sm text-gray-400">{items.length} Positionen</span>
            </div>

            {items.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-500">
                    Noch keine Positionen vorhanden.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="responsive-card-table w-full min-w-[980px] text-left">
                        <thead className="bg-gray-900/60 text-xs uppercase tracking-wide text-gray-400">
                            <tr>
                                <th className="px-5 py-3">Artikel</th>
                                <th className="px-4 py-3">Herkunft</th>
                                <th className="px-4 py-3">Lieferant</th>
                                <th className="px-4 py-3">Menge</th>
                                <th className="px-4 py-3">Netto / Einheit</th>
                                <th className="px-4 py-3">Summe</th>
                                <th className="px-5 py-3 text-right">Freigabe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {items.map(item => {
                                const price = Number(item.netPrice);
                                const lineTotal = Number.isFinite(price) ? price * Number(item.quantity || 0) : null;
                                const releaseLocked = lockedReleasedKeys.has(item.sourceKey);
                                const readOnly = item.purchased || releaseLocked;

                                return (
                                    <tr key={item.sourceKey} className={item.purchased ? "bg-emerald-950/35 hover:bg-emerald-950/50" : releaseLocked ? "bg-amber-950/20 hover:bg-amber-950/30" : "hover:bg-gray-700/40"}>
                                        <td data-label="Artikel" className="px-5 py-4">
                                            <div className="font-medium text-white">{item.name}</div>
                                            <div className="mt-1 text-sm text-gray-400">
                                                {[item.sku, item.description].filter(Boolean).join(" · ") || "Keine weiteren Angaben"}
                                            </div>
                                        </td>
                                        <td data-label="Herkunft" className="px-4 py-4"><SourceBadge source={item.source} /></td>
                                        <td data-label="Lieferant" className="px-4 py-4 text-sm text-gray-300">{item.supplierName || "Ohne Lieferant"}</td>
                                        <td data-label="Menge" className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    aria-label={`Menge ${item.name}`}
                                                    type="number"
                                                    min="0.01"
                                                    step={item.quantityMode === "piece" ? "1" : "0.01"}
                                                    value={item.quantity}
                                                    disabled={readOnly}
                                                    onChange={event => onChange(item.sourceKey, "quantity", event.target.value)}
                                                    className="w-20 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                                />
                                                <span className="text-sm text-gray-400">{item.unit}</span>
                                            </div>
                                            {item.category === "Kanten" && (
                                                <select
                                                    aria-label={`Einkaufseinheit ${item.name}`}
                                                    value={item.quantityMode || "meter"}
                                                    disabled={readOnly}
                                                    onChange={event => onChange(item.sourceKey, "quantityMode", event.target.value)}
                                                    className="mt-2 w-36 rounded-lg border border-gray-600 bg-gray-900 px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <option value="meter">Meter</option>
                                                    <option value="piece">Stück ({item.purchaseLength || 75} m)</option>
                                                </select>
                                            )}
                                        </td>
                                        <td data-label="Netto / Einheit" className="px-4 py-4">
                                            <div className="relative w-32">
                                                <input
                                                    aria-label={`Nettopreis ${item.name}`}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.netPrice ?? ""}
                                                    disabled={readOnly}
                                                    placeholder="0,00"
                                                    onChange={event => onChange(item.sourceKey, "netPrice", event.target.value)}
                                                    className="w-full rounded-lg border border-gray-600 bg-gray-900 py-2 pl-3 pr-8 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                                />
                                                <span className="absolute right-3 top-2 text-gray-500">€</span>
                                            </div>
                                        </td>
                                        <td data-label="Summe" className="px-4 py-4 font-medium text-gray-200">
                                            {lineTotal === null ? "–" : money.format(lineTotal)}
                                        </td>
                                        <td data-label="Freigabe" className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-3">
                                                {item.source === "shop" && !readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onRemove(item.sourceKey)}
                                                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-700 hover:text-red-400"
                                                        aria-label={`${item.name} entfernen`}
                                                        title="Entfernen"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 7h12m-9 0V5h6v2m-7 0 1 13h6l1-13M10 10v7m4-7v7" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {item.purchased ? (
                                                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-900/60 px-3 py-1.5 text-sm font-medium text-emerald-300">
                                                        <span aria-hidden="true">✓</span> Gekauft
                                                    </span>
                                                ) : releaseLocked ? (
                                                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-900/40 px-3 py-1.5 text-sm font-medium text-amber-300">
                                                        <span aria-hidden="true">🔒</span> Freigegeben
                                                    </span>
                                                ) : (
                                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(item.released)}
                                                            onChange={event => onChange(item.sourceKey, "released", event.target.checked)}
                                                            className="size-4 accent-blue-600"
                                                        />
                                                        <span className={item.released ? "text-blue-300" : "text-gray-400"}>
                                                            {item.released ? "Freigegeben" : "Freigeben"}
                                                        </span>
                                                    </label>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export default function ProjectPurchasing() {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [items, setItems] = useState([]);
    const [lockedReleasedKeys, setLockedReleasedKeys] = useState(() => new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                const [projectResponse, nesting, partList, cabinetData, procurement, materialResponse, shopSettings, catalog] = await Promise.all([
                    axios.get(`/api/projects/get/${projectId}`),
                    safeProjectFile(projectId, "nesting"),
                    safeProjectFile(projectId, "list"),
                    safeProjectFile(projectId, "cabinet"),
                    loadProjectProcurement(projectId),
                    axios.get("/api/materials/get"),
                    loadShopSettings(),
                    loadProcurementCatalog()
                ]);

                if (!active) return;
                const saved = normalizeProcurementDocument(procurement);
                const storageMaterials = materialResponse.data?.materials || [];
                const catalogArticles = normalizeCatalog(catalog).articles;
                const suppliersById = new Map(normalizeShopSettings(shopSettings).suppliers.map(supplier => [supplier.id, supplier.name]));
                const generated = [
                    ...buildPlateItems(nesting, storageMaterials, shopSettings),
                    ...buildEdgeItems(nesting, storageMaterials, shopSettings),
                    ...buildHardwareItems(partList, shopSettings, catalogArticles, cabinetData)
                ];

                const mergedItems = mergeGeneratedItems(generated, saved.items).map(item => ({
                    ...item,
                    supplierName: suppliersById.get(item.supplierId) || item.supplierName || ""
                }));

                setProject(projectResponse.data.project);
                setItems(mergedItems);
                setLockedReleasedKeys(new Set(
                    mergedItems.filter(item => item.released && !item.purchased).map(item => item.sourceKey)
                ));
            } catch (loadError) {
                console.error("Einkaufswagen konnte nicht geladen werden", loadError);
                if (active) setError("Der Projekt-Einkaufswagen konnte nicht geladen werden.");
            } finally {
                if (active) setLoading(false);
            }
        };

        load();
        return () => { active = false; };
    }, [projectId]);

    const groupedItems = useMemo(() => ({
        plates: items.filter(item => item.source === "nesting"),
        hardware: items.filter(item => item.source === "hardware"),
        shop: items.filter(item => item.source === "shop")
    }), [items]);

    const purchasableItems = items.filter(item => !item.purchased);
    const editableItems = purchasableItems.filter(item => !lockedReleasedKeys.has(item.sourceKey));
    const releasedItems = purchasableItems.filter(item => item.released);
    const allReleased = purchasableItems.length > 0 && releasedItems.length === purchasableItems.length;
    const releasedTotal = releasedItems.reduce((sum, item) => {
        const price = Number(item.netPrice);
        return sum + (Number.isFinite(price) ? price * Number(item.quantity || 0) : 0);
    }, 0);

    const changeItem = (sourceKey, field, value) => {
        setMessage("");
        setItems(current => current.map(item => {
            if (item.sourceKey !== sourceKey) return item;
            if (item.purchased || lockedReleasedKeys.has(item.sourceKey)) return item;
            if (field === "released") return { ...item, released: value };
            if (field === "quantityMode") return applyEdgeQuantityMode(item, value);
            if (field === "netPrice") {
                const netPrice = value === "" ? null : Number(value);
                if (item.category === "Kanten") {
                    const purchaseLength = Number(item.purchaseLength) || 75;
                    return {
                        ...item,
                        netPrice,
                        pricePerMeter: netPrice === null
                            ? null
                            : item.quantityMode === "piece"
                                ? netPrice / purchaseLength
                                : netPrice
                    };
                }
                return { ...item, netPrice };
            }
            if (field === "quantity") return { ...item, quantity: value };
            return item;
        }));
    };

    const removeItem = sourceKey => {
        setMessage("");
        setItems(current => current.filter(item => item.sourceKey !== sourceKey || item.purchased || lockedReleasedKeys.has(item.sourceKey)));
    };

    const save = async () => {
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const normalizedItems = items.map(item => ({
                ...item,
                quantity: Math.max(0.01, Number(item.quantity) || 1),
                netPrice: item.netPrice === null ? null : Math.max(0, Number(item.netPrice) || 0),
                purchased: Boolean(item.purchased),
                purchasedAt: item.purchasedAt || null,
                released: Boolean(item.released) && !item.purchased
            }));
            await saveProjectProcurement(projectId, createProcurementPayload(normalizedItems));
            setItems(normalizedItems);
            setLockedReleasedKeys(new Set(
                normalizedItems.filter(item => item.released && !item.purchased).map(item => item.sourceKey)
            ));
            setMessage("Einkaufswagen und Freigaben wurden gespeichert.");
        } catch (saveError) {
            console.error("Einkaufswagen konnte nicht gespeichert werden", saveError);
            setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-900 text-white">
            <SideBar selected={2} />

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-gray-700">
                    <ProjectBar selected={9} />
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-[1500px] p-3 sm:p-5 xl:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-5">
                            <div>
                                <p className="text-sm font-medium uppercase tracking-widest text-blue-400">Projekt-Einkaufswagen</p>
                                <h1 className="mt-1 text-2xl font-bold xl:text-3xl">{project?.title || "Projekt"}</h1>
                                <p className="mt-2 max-w-2xl text-gray-400">
                                    Benötigte Platten und Kanten aus dem Nesting sowie Hardware aus der Cabinet-Liste prüfen und für den Einkauf freigeben.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-stretch gap-3">
                                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 hover:border-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={allReleased}
                                        disabled={editableItems.length === 0}
                                        onChange={event => {
                                            const released = event.target.checked;
                                            setMessage("");
                                            setItems(current => current.map(item => (
                                                item.purchased || lockedReleasedKeys.has(item.sourceKey) ? item : { ...item, released }
                                            )));
                                        }}
                                        className="size-5 accent-blue-600"
                                    />
                                    <span>
                                        <span className="block text-xs uppercase tracking-wide text-gray-500">Sammelfreigabe</span>
                                        <span className="mt-1 block font-semibold">Alle Artikel freigeben</span>
                                    </span>
                                </label>
                                <div className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-right">
                                    <div className="text-xs uppercase tracking-wide text-gray-500">Freigegeben</div>
                                    <div className="mt-1 font-semibold">{releasedItems.length} Positionen · {money.format(releasedTotal)} netto</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={loading || saving}
                                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? "Speichert …" : "Freigaben speichern"}
                                </button>
                            </div>
                        </div>

                        {message && <div className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-emerald-300">{message}</div>}
                        {error && <div className="mt-5 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-red-300">{error}</div>}

                        {loading ? (
                            <div className="mt-8 rounded-xl border border-gray-700 bg-gray-800 p-10 text-center text-gray-400">Einkaufswagen wird geladen …</div>
                        ) : (
                            <div className="mt-7 space-y-6">
                                <PurchaseTable
                                    title="Nesting-Material"
                                    description="Benötigte Rohplatten und Kanten aus dem zuletzt gespeicherten Nesting. Kanten enthalten den eingestellten Verschnittzuschlag."
                                    items={groupedItems.plates}
                                    lockedReleasedKeys={lockedReleasedKeys}
                                    onChange={changeItem}
                                    onRemove={removeItem}
                                />
                                <PurchaseTable
                                    title="Hardware"
                                    description="Beschläge und Auszüge aus der Cabinet-Stückliste."
                                    items={groupedItems.hardware}
                                    lockedReleasedKeys={lockedReleasedKeys}
                                    onChange={changeItem}
                                    onRemove={removeItem}
                                />
                                <PurchaseTable
                                    title="Aus dem internen Shop"
                                    description="Manuell im zentralen Einkauf zu diesem Projekt hinzugefügte Artikel."
                                    items={groupedItems.shop}
                                    lockedReleasedKeys={lockedReleasedKeys}
                                    onChange={changeItem}
                                    onRemove={removeItem}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
