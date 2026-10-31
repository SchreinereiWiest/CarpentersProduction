const clean = value => String(value || "").trim();

export const formatShopFetchFailures = (report, suppliers = []) => {
    const failed = Array.isArray(report?.results)
        ? report.results.filter(result => !result?.ok)
        : [];
    if (failed.length === 0) return "";

    const supplierNames = new Map(
        (Array.isArray(suppliers) ? suppliers : []).map(supplier => [supplier.id, supplier.name])
    );
    const grouped = new Map();

    for (const result of failed) {
        const supplierName = clean(supplierNames.get(result.supplierId)) || "Ohne Lieferant";
        const error = clean(result.error) || "Unbekannter Fehler";
        const key = `${result.supplierId || ""}\u0000${error}`;
        const current = grouped.get(key) || { supplierName, error, count: 0 };
        current.count += 1;
        grouped.set(key, current);
    }

    const details = [...grouped.values()]
        .map(item => `${item.supplierName}: ${item.count} × ${item.error}`)
        .join(" · ");
    return `${failed.length} Artikel konnten nicht geladen werden. ${details}`;
};
