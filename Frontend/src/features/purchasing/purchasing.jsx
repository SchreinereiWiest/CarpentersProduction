import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import SideBar from "../../shared/components/sideBar.jsx";
import { useAuth } from "../../app/providers/AuthContext.js";
import {
    addArticleToProcurement,
    createCatalogPayload,
    createProcurementPayload,
    normalizeCatalog,
    normalizeProcurementDocument,
    normalizeShopSettings
} from "@Engine/procurement/procurement.js";
import {
    loadProcurementCatalog,
    loadProjectProcurement,
    loadShopSettings,
    loadShopImageUrl,
    saveProcurementCatalog,
    saveProjectProcurement,
    uploadShopImage
} from "./procurementApi.js";
import {
    ArticleModal,
    GroupArticlesModal,
    GroupModal,
    ShopArticle,
    ShopGroup
} from "./shopComponents.jsx";

const money = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
});

const dateTime = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
});

const getSupplierName = (item, suppliers) => (
    suppliers.find(supplier => supplier.id === item.supplierId)?.name ||
    item.supplierName ||
    "Ohne Lieferant"
);

const sortBySupplier = (items, suppliers) => [...items].sort((left, right) => (
    getSupplierName(left, suppliers).localeCompare(getSupplierName(right, suppliers), "de") ||
    String(left.name || "").localeCompare(String(right.name || ""), "de")
));

function ReleasedTable({ rows, suppliers, showProject, selectedKeys, processing, onToggle }) {
    return (
        <div className="overflow-x-auto">
            <table className="responsive-card-table w-full min-w-[920px] text-left">
                <thead className="bg-gray-900/60 text-xs uppercase tracking-wide text-gray-400">
                    <tr>
                        <th className="px-5 py-3">Artikel</th>
                        {showProject && <th className="px-4 py-3">Projekt</th>}
                        {!showProject && <th className="px-4 py-3">Lieferant</th>}
                        <th className="px-4 py-3">Kategorie</th>
                        <th className="px-4 py-3 text-right">Menge</th>
                        <th className="px-4 py-3 text-right">Netto</th>
                        <th className="px-4 py-3 text-right">Summe</th>
                        <th className="px-5 py-3 text-right">Auswahl</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {rows.map(({ item, project }) => {
                        const rowKey = `${project.id}:${item.sourceKey}`;
                        return (
                            <tr key={rowKey} className="hover:bg-gray-700/40">
                                <td data-label="Artikel" className="px-5 py-4">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="mt-1 text-sm text-gray-500">{[item.sku, item.description].filter(Boolean).join(" · ")}</div>
                                </td>
                                {showProject ? (
                                    <td data-label="Projekt" className="px-4 py-4">
                                        <div className="font-medium text-gray-200">{project.title}</div>
                                        <div className="mt-1 text-xs text-gray-500">{project.projectNumber || "Ohne Projektnummer"}</div>
                                    </td>
                                ) : <td data-label="Lieferant" className="px-4 py-4 text-gray-300">{getSupplierName(item, suppliers)}</td>}
                                <td data-label="Kategorie" className="px-4 py-4 text-gray-300">{item.category}</td>
                                <td data-label="Menge" className="px-4 py-4 text-right">{item.quantity} {item.unit}</td>
                                <td data-label="Netto" className="px-4 py-4 text-right">{item.netPrice === null ? "–" : money.format(Number(item.netPrice))}</td>
                                <td data-label="Summe" className="px-4 py-4 text-right font-medium">{item.netPrice === null ? "–" : money.format(Number(item.netPrice) * Number(item.quantity || 0))}</td>
                                <td data-label="Auswahl" className="px-5 py-4 text-right">
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={selectedKeys.has(rowKey)}
                                            disabled={processing}
                                            onChange={() => onToggle(rowKey)}
                                            className="size-4 accent-blue-600 disabled:opacity-50"
                                        />
                                        Auswählen
                                    </label>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function ReleasedPurchases({ groups, suppliers, view, loading, selectedKeys, processing, onToggle }) {
    if (loading) {
        return <div className="rounded-xl border border-gray-700 bg-gray-800 p-10 text-center text-gray-400">Freigaben werden geladen …</div>;
    }

    if (groups.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/60 p-12 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gray-700 text-gray-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-6" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M5 5h2l1.5 9h8l2-6H8m2 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                    </svg>
                </div>
                <h2 className="mt-4 font-semibold">Keine freigegebenen Artikel</h2>
                <p className="mt-1 text-sm text-gray-400">Freigaben erfolgen im Einkaufswagen des jeweiligen Projekts.</p>
            </div>
        );
    }

    if (view === "supplier") {
        const supplierGroups = new Map();
        for (const group of groups) {
            for (const item of group.items) {
                const name = getSupplierName(item, suppliers);
                const key = item.supplierId || `name:${name}`;
                if (!supplierGroups.has(key)) supplierGroups.set(key, { key, name, rows: [] });
                supplierGroups.get(key).rows.push({ item, project: group.project });
            }
        }

        return (
            <div className="space-y-5">
                {[...supplierGroups.values()].sort((left, right) => left.name.localeCompare(right.name, "de")).map(group => (
                    <section key={group.key} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                        <div className="flex items-center justify-between gap-3 border-b border-gray-700 px-5 py-4">
                            <div><p className="text-xs uppercase tracking-wide text-gray-500">Lieferant</p><h2 className="mt-1 font-semibold">{group.name}</h2></div>
                            <span className="text-sm text-gray-400">{group.rows.length} Positionen</span>
                        </div>
                        <ReleasedTable rows={group.rows.sort((left, right) => left.project.title.localeCompare(right.project.title, "de"))} suppliers={suppliers} showProject selectedKeys={selectedKeys} processing={processing} onToggle={onToggle} />
                    </section>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {groups.map(group => {
                const total = group.items.reduce((sum, item) => {
                    const price = Number(item.netPrice);
                    return sum + (Number.isFinite(price) ? price * Number(item.quantity || 0) : 0);
                }, 0);

                return (
                    <section key={group.project.id} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 bg-gray-800 px-5 py-4">
                            <div>
                                <h2 className="font-semibold">{group.project.title}</h2>
                                <p className="mt-1 text-sm text-gray-400">
                                    {[group.project.projectNumber, group.project.customer?.companyName || group.project.customer?.lastName].filter(Boolean).join(" · ") || "Projekt"}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-400">{group.items.length} Positionen</div>
                                <div className="font-semibold">{money.format(total)} netto</div>
                            </div>
                        </div>
                        <ReleasedTable rows={sortBySupplier(group.items, suppliers).map(item => ({ item, project: group.project }))} suppliers={suppliers} selectedKeys={selectedKeys} processing={processing} onToggle={onToggle} />
                    </section>
                );
            })}
        </div>
    );
}

function PurchasedHistory({ groups, suppliers, loading }) {
    if (loading) {
        return <div className="rounded-xl border border-gray-700 bg-gray-800 p-10 text-center text-gray-400">Einkaufsverlauf wird geladen …</div>;
    }

    const supplierGroups = new Map();
    for (const group of groups) {
        for (const item of group.items) {
            const name = getSupplierName(item, suppliers);
            const key = item.supplierId || `name:${name}`;
            if (!supplierGroups.has(key)) supplierGroups.set(key, { key, name, rows: [] });
            supplierGroups.get(key).rows.push({ item, project: group.project });
        }
    }

    if (supplierGroups.size === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/60 p-12 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400">✓</div>
                <h2 className="mt-4 font-semibold">Noch keine gekauften Artikel</h2>
                <p className="mt-1 text-sm text-gray-400">Als gekauft markierte Positionen werden hier dauerhaft zur Nachverfolgung angezeigt.</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {[...supplierGroups.values()]
                .sort((left, right) => left.name.localeCompare(right.name, "de"))
                .map(group => {
                    const rows = group.rows.sort((left, right) => (
                        String(right.item.purchasedAt || "").localeCompare(String(left.item.purchasedAt || "")) ||
                        left.project.title.localeCompare(right.project.title, "de")
                    ));
                    const total = rows.reduce((sum, { item }) => {
                        const price = Number(item.netPrice);
                        return sum + (Number.isFinite(price) ? price * Number(item.quantity || 0) : 0);
                    }, 0);

                    return (
                        <section key={group.key} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 px-5 py-4">
                                <div><p className="text-xs uppercase tracking-wide text-gray-500">Lieferant</p><h2 className="mt-1 font-semibold">{group.name}</h2></div>
                                <div className="text-right"><div className="text-sm text-gray-400">{rows.length} Positionen</div><div className="font-semibold">{money.format(total)} netto</div></div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="responsive-card-table w-full min-w-[980px] text-left">
                                    <thead className="bg-gray-900/60 text-xs uppercase tracking-wide text-gray-400">
                                        <tr>
                                            <th className="px-5 py-3">Artikel</th>
                                            <th className="px-4 py-3">Projekt / Kommission</th>
                                            <th className="px-4 py-3 text-right">Menge</th>
                                            <th className="px-4 py-3 text-right">Netto</th>
                                            <th className="px-4 py-3 text-right">Summe</th>
                                            <th className="px-5 py-3 text-right">Gekauft am</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {rows.map(({ item, project }) => {
                                            const purchasedDate = item.purchasedAt ? new Date(item.purchasedAt) : null;
                                            const validPurchasedDate = purchasedDate && !Number.isNaN(purchasedDate.getTime());
                                            return (
                                                <tr key={`${project.id}:${item.sourceKey}`} className="bg-emerald-950/10 hover:bg-emerald-950/20">
                                                    <td data-label="Artikel" className="px-5 py-4"><div className="font-medium">{item.name}</div><div className="mt-1 text-sm text-gray-500">{[item.sku, item.description].filter(Boolean).join(" · ")}</div></td>
                                                    <td data-label="Projekt" className="px-4 py-4"><div className="font-medium text-gray-200">{project.title}</div><div className="mt-1 text-xs text-gray-500">{project.projectNumber || "Ohne Kommissionsnummer"}</div></td>
                                                    <td data-label="Menge" className="px-4 py-4 text-right">{item.quantity} {item.unit}</td>
                                                    <td data-label="Netto" className="px-4 py-4 text-right">{item.netPrice === null ? "–" : money.format(Number(item.netPrice))}</td>
                                                    <td data-label="Summe" className="px-4 py-4 text-right font-medium">{item.netPrice === null ? "–" : money.format(Number(item.netPrice) * Number(item.quantity || 0))}</td>
                                                    <td data-label="Gekauft am" className="px-5 py-4 text-right text-sm text-gray-300">{validPurchasedDate ? dateTime.format(purchasedDate) : "Kein Zeitstempel"}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    );
                })}
        </div>
    );
}

export default function Purchasing() {
    const { user } = useAuth();
    const canEdit = ["manager", "admin"].includes(user?.role);
    const [activeTab, setActiveTab] = useState("released");
    const [projects, setProjects] = useState([]);
    const [releasedGroups, setReleasedGroups] = useState([]);
    const [purchasedGroups, setPurchasedGroups] = useState([]);
    const [articles, setArticles] = useState([]);
    const [articleGroups, setArticleGroups] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [imageUrls, setImageUrls] = useState({});
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [search, setSearch] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);
    const [showArticleModal, setShowArticleModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [openGroupId, setOpenGroupId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [catalogSaving, setCatalogSaving] = useState(false);
    const [addingArticleId, setAddingArticleId] = useState(null);
    const [selectedReleaseKeys, setSelectedReleaseKeys] = useState(() => new Set());
    const [processingAction, setProcessingAction] = useState(null);
    const [releasedView, setReleasedView] = useState("project");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                const [projectResponse, catalogResponse, settingsResponse] = await Promise.all([
                    axios.get("/api/projects/getAll"),
                    loadProcurementCatalog(),
                    loadShopSettings()
                ]);
                const loadedProjects = projectResponse.data.projects || [];
                const procurementDocuments = await Promise.all(
                    loadedProjects.map(project => loadProjectProcurement(project.id))
                );

                if (!active) return;
                const procurementByProject = procurementDocuments.map(document => normalizeProcurementDocument(document));
                const groups = loadedProjects
                    .map((project, index) => ({
                        project,
                        items: procurementByProject[index].items.filter(item => item.released && !item.purchased)
                    }))
                    .filter(group => group.items.length > 0)
                    .sort((left, right) => left.project.title.localeCompare(right.project.title, "de"));
                const purchased = loadedProjects
                    .map((project, index) => ({
                        project,
                        items: procurementByProject[index].items.filter(item => item.purchased)
                    }))
                    .filter(group => group.items.length > 0);

                const normalizedCatalog = normalizeCatalog(catalogResponse);
                const normalizedSettings = normalizeShopSettings(settingsResponse);
                const imageEntries = await Promise.all(
                    [...new Set(normalizedCatalog.articles.map(article => article.imageFileId).filter(Boolean))]
                        .map(async fileId => {
                            try {
                                return [fileId, await loadShopImageUrl(fileId)];
                            } catch (imageError) {
                                console.warn("Artikelbild konnte nicht geladen werden", imageError);
                                return [fileId, null];
                            }
                        })
                );

                if (!active) return;
                setProjects(loadedProjects);
                setSelectedProjectId(loadedProjects[0]?.id || "");
                setArticles(normalizedCatalog.articles);
                setArticleGroups(normalizedCatalog.groups);
                setSuppliers(normalizedSettings.suppliers);
                setImageUrls(Object.fromEntries(imageEntries));
                setReleasedGroups(groups);
                setPurchasedGroups(purchased);
            } catch (loadError) {
                console.error("Einkauf konnte nicht geladen werden", loadError);
                if (active) setError("Der Einkauf konnte nicht vollständig geladen werden.");
            } finally {
                if (active) setLoading(false);
            }
        };

        load();
        return () => { active = false; };
    }, []);

    const shopEntries = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase("de");
        const groupIds = new Set(articleGroups.map(group => group.id));
        const matchesArticle = article => !needle || [article.name, article.sku, article.category, article.description, suppliers.find(supplier => supplier.id === article.supplierId)?.name]
            .some(value => String(value || "").toLocaleLowerCase("de").includes(needle));
        const groups = articleGroups.filter(group => (
            !needle ||
            [group.name, group.description].some(value => String(value || "").toLocaleLowerCase("de").includes(needle)) ||
            articles.some(article => article.groupId === group.id && matchesArticle(article))
        ));
        const ungroupedArticles = articles.filter(article => (
            (!article.groupId || !groupIds.has(article.groupId)) && matchesArticle(article)
        ));

        return { groups, ungroupedArticles };
    }, [articleGroups, articles, search, suppliers]);

    const totalReleased = releasedGroups.reduce((count, group) => count + group.items.length, 0);
    const totalNet = releasedGroups.reduce((sum, group) => sum + group.items.reduce((groupSum, item) => {
        const price = Number(item.netPrice);
        return groupSum + (Number.isFinite(price) ? price * Number(item.quantity || 0) : 0);
    }, 0), 0);
    const totalPurchased = purchasedGroups.reduce((count, group) => count + group.items.length, 0);
    const totalPurchasedNet = purchasedGroups.reduce((sum, group) => sum + group.items.reduce((groupSum, item) => {
        const price = Number(item.netPrice);
        return groupSum + (Number.isFinite(price) ? price * Number(item.quantity || 0) : 0);
    }, 0), 0);
    const releaseKeys = releasedGroups.flatMap(group => group.items.map(item => `${group.project.id}:${item.sourceKey}`));
    const allReleasedSelected = releaseKeys.length > 0 && releaseKeys.every(key => selectedReleaseKeys.has(key));

    const upsertArticle = async (article, imageFile) => {
        let nextArticle = article;

        if (imageFile) {
            const fileEntry = await uploadShopImage(imageFile);
            nextArticle = { ...article, imageFileId: fileEntry.id };
            try {
                const imageUrl = await loadShopImageUrl(fileEntry.id);
                setImageUrls(current => ({ ...current, [fileEntry.id]: imageUrl }));
            } catch (imageError) {
                console.warn("Das neue Artikelbild wird erst nach dem Neuladen angezeigt", imageError);
            }
        }

        setArticles(current => current.some(item => item.id === nextArticle.id)
            ? current.map(item => item.id === nextArticle.id ? nextArticle : item)
            : [...current, nextArticle]);
        setShowArticleModal(false);
        setEditingArticle(null);
        setMessage("Katalog geändert. Zum Abschließen bitte speichern.");
    };

    const upsertGroup = (group, selectedArticleIds) => {
        setArticleGroups(current => current.some(item => item.id === group.id)
            ? current.map(item => item.id === group.id ? group : item)
            : [...current, group]);
        setArticles(current => current.map(article => {
            if (selectedArticleIds.has(article.id)) return { ...article, groupId: group.id };
            if (article.groupId === group.id) return { ...article, groupId: null };
            return article;
        }));
        setShowGroupModal(false);
        setEditingGroup(null);
        setMessage("Artikelgruppe geändert. Zum Abschließen bitte den Katalog speichern.");
    };

    const saveCatalog = async () => {
        setCatalogSaving(true);
        setError("");
        try {
            await saveProcurementCatalog(createCatalogPayload(articles, articleGroups));
            setMessage("Shop-Katalog wurde gespeichert.");
        } catch (saveError) {
            console.error("Katalog konnte nicht gespeichert werden", saveError);
            setError("Der Shop-Katalog konnte nicht gespeichert werden.");
        } finally {
            setCatalogSaving(false);
        }
    };

    const addToProject = async (article, quantity) => {
        if (!selectedProjectId) return;
        setAddingArticleId(article.id);
        setMessage("");
        setError("");

        try {
            const current = normalizeProcurementDocument(await loadProjectProcurement(selectedProjectId));
            const supplierName = suppliers.find(supplier => supplier.id === article.supplierId)?.name || "";
            const nextItems = addArticleToProcurement(current.items, { ...article, supplierName }, quantity);
            await saveProjectProcurement(selectedProjectId, createProcurementPayload(nextItems));
            const project = projects.find(item => item.id === selectedProjectId);
            setMessage(`${quantity} × ${article.name} wurde zu „${project?.title || "Projekt"}“ hinzugefügt.`);
        } catch (addError) {
            console.error("Artikel konnte nicht hinzugefügt werden", addError);
            setError("Der Artikel konnte nicht zum Projekt hinzugefügt werden.");
        } finally {
            setAddingArticleId(null);
        }
    };

    const toggleReleasedSelection = rowKey => {
        setSelectedReleaseKeys(current => {
            const next = new Set(current);
            if (next.has(rowKey)) next.delete(rowKey);
            else next.add(rowKey);
            return next;
        });
    };

    const toggleAllReleased = () => {
        setSelectedReleaseKeys(allReleasedSelected ? new Set() : new Set(releaseKeys));
    };

    const processSelectedReleases = async action => {
        if (selectedReleaseKeys.size === 0 || processingAction) return;
        setProcessingAction(action);
        setMessage("");
        setError("");

        const selectionsByProject = releasedGroups.reduce((result, group) => {
            const sourceKeys = group.items
                .filter(item => selectedReleaseKeys.has(`${group.project.id}:${item.sourceKey}`))
                .map(item => item.sourceKey);
            if (sourceKeys.length > 0) result.push({ projectId: group.project.id, sourceKeys });
            return result;
        }, []);
        const completedKeys = new Set();
        const completedPurchases = [];
        let failedProjects = 0;
        const timestamp = new Date().toISOString();

        for (const selection of selectionsByProject) {
            try {
                const selectedSources = new Set(selection.sourceKeys);
                const current = normalizeProcurementDocument(await loadProjectProcurement(selection.projectId));
                const nextItems = current.items.map(item => {
                    if (!selectedSources.has(item.sourceKey)) return item;
                    return action === "purchased"
                        ? { ...item, purchased: true, purchasedAt: timestamp, rejectedAt: null, released: false }
                        : { ...item, purchased: false, purchasedAt: null, rejectedAt: timestamp, released: false };
                });
                await saveProjectProcurement(selection.projectId, createProcurementPayload(nextItems));
                selection.sourceKeys.forEach(sourceKey => completedKeys.add(`${selection.projectId}:${sourceKey}`));
                if (action === "purchased") {
                    completedPurchases.push({
                        projectId: selection.projectId,
                        items: nextItems.filter(item => selectedSources.has(item.sourceKey))
                    });
                }
            } catch (processError) {
                failedProjects += 1;
                console.error("Freigaben konnten nicht verarbeitet werden", processError);
            }
        }

        if (completedKeys.size > 0) {
            setReleasedGroups(groups => groups
                .map(group => ({
                    ...group,
                    items: group.items.filter(item => !completedKeys.has(`${group.project.id}:${item.sourceKey}`))
                }))
                .filter(group => group.items.length > 0));
            setSelectedReleaseKeys(current => new Set([...current].filter(key => !completedKeys.has(key))));
            if (completedPurchases.length > 0) {
                setPurchasedGroups(current => {
                    const next = current.map(group => ({ ...group, items: [...group.items] }));
                    for (const purchase of completedPurchases) {
                        const project = projects.find(item => item.id === purchase.projectId);
                        if (!project) continue;
                        const existing = next.find(group => group.project.id === purchase.projectId);
                        if (existing) {
                            const purchasedKeys = new Set(purchase.items.map(item => item.sourceKey));
                            existing.items = [
                                ...existing.items.filter(item => !purchasedKeys.has(item.sourceKey)),
                                ...purchase.items
                            ];
                        } else {
                            next.push({ project, items: purchase.items });
                        }
                    }
                    return next;
                });
            }
            setMessage(action === "purchased"
                ? `${completedKeys.size} Positionen wurden als gekauft markiert.`
                : `${completedKeys.size} Positionen wurden abgelehnt und im Projekt wieder zur Bearbeitung freigegeben.`);
        }
        if (failedProjects > 0) {
            setError(`${failedProjects} Projekt${failedProjects === 1 ? "" : "e"} konnte${failedProjects === 1 ? "" : "n"} nicht aktualisiert werden.`);
        }
        setProcessingAction(null);
    };

    const openArticleEditor = article => {
        setOpenGroupId(null);
        setEditingArticle(article);
        setShowArticleModal(true);
    };

    const deleteArticle = id => {
        setArticles(current => current.filter(item => item.id !== id));
        setMessage("Artikel entfernt. Zum Abschließen bitte den Katalog speichern.");
    };

    const deleteGroup = id => {
        setArticleGroups(current => current.filter(group => group.id !== id));
        setArticles(current => current.map(article => article.groupId === id ? { ...article, groupId: null } : article));
        setOpenGroupId(current => current === id ? null : current);
        setMessage("Gruppe entfernt; ihre Artikel sind jetzt ungruppiert. Zum Abschließen bitte speichern.");
    };

    const openGroup = articleGroups.find(group => group.id === openGroupId) || null;
    const openGroupArticles = openGroup
        ? articles.filter(article => article.groupId === openGroup.id)
        : [];

    return (
        <div className="flex h-screen overflow-hidden bg-gray-900 text-white">
            <SideBar selected={10} />

            <main className="min-w-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-[1500px] p-3 sm:p-5 xl:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-widest text-blue-400">Zentraler Einkauf</p>
                            <h1 className="mt-1 text-2xl font-bold xl:text-3xl">Einkauf & interner Shop</h1>
                            <p className="mt-2 text-gray-400">Projektfreigaben bündeln und häufig verwendete Artikel verwalten.</p>
                        </div>
                        {activeTab === "released" && (
                            <div className="flex gap-3">
                                <div className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3"><div className="text-xs uppercase text-gray-500">Positionen</div><div className="mt-1 text-lg font-semibold">{totalReleased}</div></div>
                                <div className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3"><div className="text-xs uppercase text-gray-500">Gesamt netto</div><div className="mt-1 text-lg font-semibold">{money.format(totalNet)}</div></div>
                            </div>
                        )}
                        {activeTab === "purchased" && (
                            <div className="flex gap-3">
                                <div className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3"><div className="text-xs uppercase text-gray-500">Gekaufte Positionen</div><div className="mt-1 text-lg font-semibold">{totalPurchased}</div></div>
                                <div className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3"><div className="text-xs uppercase text-gray-500">Gesamt netto</div><div className="mt-1 text-lg font-semibold">{money.format(totalPurchasedNet)}</div></div>
                            </div>
                        )}
                    </div>

                    <div className="mt-7 flex overflow-x-auto border-b border-gray-700">
                        <button type="button" onClick={() => setActiveTab("released")} className={`border-b-2 px-5 py-3 font-medium ${activeTab === "released" ? "border-blue-500 text-white" : "border-transparent text-gray-400 hover:text-white"}`}>Freigegebene Artikel</button>
                        <button type="button" onClick={() => setActiveTab("shop")} className={`border-b-2 px-5 py-3 font-medium ${activeTab === "shop" ? "border-blue-500 text-white" : "border-transparent text-gray-400 hover:text-white"}`}>Interner Shop</button>
                        <button type="button" onClick={() => setActiveTab("purchased")} className={`border-b-2 px-5 py-3 font-medium ${activeTab === "purchased" ? "border-blue-500 text-white" : "border-transparent text-gray-400 hover:text-white"}`}>Gekaufte Artikel</button>
                    </div>

                    {message && <div className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-emerald-300">{message}</div>}
                    {error && <div className="mt-5 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-red-300">{error}</div>}

                    <div className="mt-6">
                        {activeTab === "released" ? (
                            <>
                                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-700 bg-gray-800 p-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700">
                                            <input type="checkbox" checked={allReleasedSelected} disabled={releaseKeys.length === 0 || Boolean(processingAction)} onChange={toggleAllReleased} className="size-4 accent-blue-600" />
                                            Alle auswählen
                                        </label>
                                        <span className="text-sm text-gray-400">{selectedReleaseKeys.size} ausgewählt</span>
                                        <button
                                            type="button"
                                            onClick={() => processSelectedReleases("rejected")}
                                            disabled={selectedReleaseKeys.size === 0 || Boolean(processingAction)}
                                            className="rounded-lg border border-red-800 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {processingAction === "rejected" ? "Lehnt ab …" : "Ausgewählte ablehnen"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => processSelectedReleases("purchased")}
                                            disabled={selectedReleaseKeys.size === 0 || Boolean(processingAction)}
                                            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {processingAction === "purchased" ? "Speichert …" : "Ausgewählte als gekauft markieren"}
                                        </button>
                                    </div>
                                    <div className="inline-flex rounded-lg border border-gray-600 bg-gray-900 p-1">
                                        <button type="button" onClick={() => setReleasedView("project")} className={`rounded-md px-3 py-2 text-sm font-medium ${releasedView === "project" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>Nach Projekt</button>
                                        <button type="button" onClick={() => setReleasedView("supplier")} className={`rounded-md px-3 py-2 text-sm font-medium ${releasedView === "supplier" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>Alle nach Lieferant</button>
                                    </div>
                                </div>
                                <ReleasedPurchases groups={releasedGroups} suppliers={suppliers} view={releasedView} loading={loading} selectedKeys={selectedReleaseKeys} processing={Boolean(processingAction)} onToggle={toggleReleasedSelection} />
                            </>
                        ) : activeTab === "purchased" ? (
                            <PurchasedHistory groups={purchasedGroups} suppliers={suppliers} loading={loading} />
                        ) : (
                            <>
                                <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-gray-700 bg-gray-800 p-4">
                                    <div className="flex flex-1 flex-wrap items-end gap-4">
                                        <label className="min-w-64 flex-1">
                                            <span className="mb-1.5 block text-xs uppercase tracking-wide text-gray-500">Artikel suchen</span>
                                            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, Nummer oder Kategorie" className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 outline-none focus:border-blue-500" />
                                        </label>
                                        <label className="min-w-64 flex-1">
                                            <span className="mb-1.5 block text-xs uppercase tracking-wide text-gray-500">Zielprojekt</span>
                                            <select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 outline-none focus:border-blue-500">
                                                {projects.length === 0 && <option value="">Keine Projekte verfügbar</option>}
                                                {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
                                            </select>
                                        </label>
                                    </div>

                                    {canEdit && (
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setEditMode(current => !current)} className={`rounded-lg border px-4 py-2 font-medium ${editMode ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-gray-600 text-gray-300 hover:bg-gray-700"}`}>{editMode ? "Editiermodus aktiv" : "Editieren"}</button>
                                            {editMode && (
                                                <>
                                                    <button type="button" onClick={() => { setEditingArticle(null); setShowArticleModal(true); }} className="rounded-lg border border-gray-600 px-4 py-2 text-gray-200 hover:bg-gray-700">+ Artikel</button>
                                                    <button type="button" onClick={() => { setEditingGroup(null); setShowGroupModal(true); }} className="rounded-lg border border-gray-600 px-4 py-2 text-gray-200 hover:bg-gray-700">+ Gruppe</button>
                                                    <button type="button" onClick={saveCatalog} disabled={catalogSaving} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500 disabled:opacity-50">{catalogSaving ? "Speichert …" : "Katalog speichern"}</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800 p-10 text-center text-gray-400">Shop wird geladen …</div>
                                ) : shopEntries.groups.length === 0 && shopEntries.ungroupedArticles.length === 0 ? (
                                    <div className="mt-6 rounded-xl border border-dashed border-gray-700 bg-gray-800/60 p-12 text-center text-gray-400">
                                        {articles.length === 0 && articleGroups.length === 0 ? "Der Shop ist noch leer. Im Editiermodus kann der erste Artikel oder eine Gruppe angelegt werden." : "Keine passenden Artikel oder Gruppen gefunden."}
                                    </div>
                                ) : (
                                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                        {shopEntries.groups.map(group => (
                                            <ShopGroup
                                                key={group.id}
                                                group={group}
                                                articleCount={articles.filter(article => article.groupId === group.id).length}
                                                editMode={editMode}
                                                onOpen={() => setOpenGroupId(group.id)}
                                                onEdit={item => { setEditingGroup(item); setShowGroupModal(true); }}
                                                onDelete={deleteGroup}
                                            />
                                        ))}
                                        {shopEntries.ungroupedArticles.map(article => (
                                            <ShopArticle
                                                key={article.id}
                                                article={article}
                                                imageUrl={imageUrls[article.imageFileId]}
                                                supplierName={suppliers.find(supplier => supplier.id === article.supplierId)?.name}
                                                projectId={selectedProjectId}
                                                editMode={editMode}
                                                adding={addingArticleId === article.id}
                                                onAdd={addToProject}
                                                onEdit={openArticleEditor}
                                                onDelete={deleteArticle}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {showArticleModal && (
                <ArticleModal
                    article={editingArticle}
                    groups={articleGroups}
                    suppliers={suppliers}
                    imageUrl={imageUrls[editingArticle?.imageFileId]}
                    onClose={() => { setShowArticleModal(false); setEditingArticle(null); }}
                    onSave={upsertArticle}
                />
            )}

            {showGroupModal && (
                <GroupModal
                    group={editingGroup}
                    articles={articles}
                    onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
                    onSave={upsertGroup}
                />
            )}

            {openGroup && (
                <GroupArticlesModal
                    group={openGroup}
                    articles={openGroupArticles}
                    imageUrls={imageUrls}
                    suppliers={suppliers}
                    projectId={selectedProjectId}
                    editMode={editMode}
                    addingArticleId={addingArticleId}
                    onClose={() => setOpenGroupId(null)}
                    onAdd={addToProject}
                    onEdit={openArticleEditor}
                    onDelete={deleteArticle}
                />
            )}
        </div>
    );
}
