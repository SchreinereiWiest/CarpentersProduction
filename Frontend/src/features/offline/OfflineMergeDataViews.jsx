const asArray = value => Array.isArray(value) ? value : [];
const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const emptyLabel = value => value === undefined || value === null || value === "" ? "–" : String(value);
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

const listFields = [
    ["Objektname", "Bezeichnung"],
    ["MID", "Material"],
    ["L", "Länge"],
    ["B", "Breite"],
    ["T", "Dicke"],
    ["Anzahl", "Menge"],
    ["Kante", "Kanten"],
    ["Maserung", "Maserung"],
    ["Notiz", "Notiz"]
];

const semanticListKey = (item, parentName, kind) => [
    kind,
    parentName,
    item?.Objektname,
    item?.MID,
    item?.Plattentyp
].map(value => String(value ?? "")).join("|");

function flattenPartList(data) {
    const occurrences = new Map();
    const rows = [];

    const add = (item, parentName, kind, index) => {
        const stableId = item?._generatedId ?? item?.id;
        const semanticKey = semanticListKey(item, parentName, kind);
        const occurrence = occurrences.get(semanticKey) ?? 0;
        occurrences.set(semanticKey, occurrence + 1);
        rows.push({
            key: stableId != null ? `id:${stableId}` : `${semanticKey}|${occurrence}`,
            item,
            kind,
            parentName,
            index
        });
    };

    asArray(data).forEach((item, index) => {
        const children = asArray(item?.Children);
        if (children.length) {
            add(item, "", "group", index);
            children.forEach((child, childIndex) => add(
                child,
                item?.Objektname || `Gruppe ${index + 1}`,
                "part",
                childIndex
            ));
        } else {
            add(item, "Einzelteile", "part", index);
        }
    });

    return rows;
}

const comparablePart = item => {
    if (!item) return item;
    return Object.fromEntries(Object.entries(item).filter(
        ([field]) => !["color", "PID", "Children"].includes(field)
    ));
};

function createPartListComparison(local, remote) {
    const localRows = flattenPartList(local);
    const remoteRows = flattenPartList(remote);
    const localMap = new Map(localRows.map(row => [row.key, row]));
    const remoteMap = new Map(remoteRows.map(row => [row.key, row]));
    const keys = [...new Set([...localRows.map(row => row.key), ...remoteRows.map(row => row.key)])];

    return keys.map(key => {
        const localRow = localMap.get(key);
        const remoteRow = remoteMap.get(key);
        return {
            key,
            local: localRow,
            remote: remoteRow,
            changed: !localRow || !remoteRow || !sameValue(
                comparablePart(localRow.item),
                comparablePart(remoteRow.item)
            )
        };
    });
}

const summarizePartList = data => {
    const rows = flattenPartList(data);
    const parts = rows.filter(row => row.kind === "part");
    return {
        groups: rows.filter(row => row.kind === "group").length,
        parts: parts.length,
        quantity: parts.reduce((sum, row) => sum + number(row.item?.Anzahl), 0)
    };
};

function StatusBadge({ local, remote }) {
    let text = "Geändert";
    let className = "border-amber-800 bg-amber-950/50 text-amber-300";
    if (!local) {
        text = "Nur Server";
        className = "border-violet-800 bg-violet-950/50 text-violet-300";
    } else if (!remote) {
        text = "Nur lokal";
        className = "border-blue-800 bg-blue-950/50 text-blue-300";
    }
    return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${className}`}>{text}</span>;
}

function ListValue({ row, counterpart }) {
    if (!row) return <div className="py-3 text-sm italic text-gray-500">Nicht vorhanden</div>;
    const item = row.item;
    const additionalData = Object.fromEntries(Object.entries(comparablePart(item)).filter(
        ([field]) => !listFields.some(([visibleField]) => visibleField === field)
    ));
    const counterpartAdditionalData = counterpart
        ? Object.fromEntries(Object.entries(comparablePart(counterpart.item)).filter(
            ([field]) => !listFields.some(([visibleField]) => visibleField === field)
        ))
        : null;
    const additionalChanges = counterpart && !sameValue(additionalData, counterpartAdditionalData);
    return (
        <div className="py-2">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
                {listFields.slice(1).map(([field, label]) => {
                    const changed = counterpart && !sameValue(item?.[field], counterpart.item?.[field]);
                    return (
                        <div key={field} className={`min-w-0 rounded px-1.5 py-1 ${changed ? "bg-amber-950/40" : ""}`}>
                            <dt className="text-[10px] uppercase tracking-wide text-gray-500">{label}</dt>
                            <dd className={`truncate ${changed ? "font-medium text-amber-200" : "text-gray-300"}`} title={emptyLabel(item?.[field])}>
                                {emptyLabel(item?.[field])}
                            </dd>
                        </div>
                    );
                })}
            </dl>
            {additionalChanges && <div className="mt-1 px-1.5 text-[10px] text-amber-300">Weitere Bearbeitungsdaten geändert</div>}
        </div>
    );
}

function VersionChoice({ label, checked, onChange, summary }) {
    return (
        <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 ${checked ? "border-blue-500 bg-blue-950/40" : "border-gray-700 bg-gray-900 hover:border-gray-600"}`}>
            <span className="flex items-center gap-2 text-sm font-medium">
                <input type="radio" name="document-version" checked={checked} onChange={onChange} />
                {label}
            </span>
            {summary && <span className="text-xs text-gray-400">{summary}</span>}
        </label>
    );
}

export function PartListComparison({ local, remote, choice, onChoice }) {
    const rows = createPartListComparison(local, remote);
    const localSummary = summarizePartList(local);
    const remoteSummary = summarizePartList(remote);
    const changed = rows.filter(row => row.changed).length;

    return (
        <div>
            <div className="mb-3 grid gap-3 md:grid-cols-2">
                <VersionChoice
                    label="Lokale Teileliste übernehmen"
                    checked={choice === "local"}
                    onChange={() => onChoice("local")}
                    summary={`${localSummary.parts} Teile · ${localSummary.quantity} Stk.`}
                />
                <VersionChoice
                    label="Teileliste vom Server übernehmen"
                    checked={choice === "server"}
                    onChange={() => onChoice("server")}
                    summary={`${remoteSummary.parts} Teile · ${remoteSummary.quantity} Stk.`}
                />
            </div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                <span>{changed} abweichende von {rows.length} Positionen</span>
                <span>Gelb markierte Felder unterscheiden sich.</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full min-w-[760px] table-fixed text-left">
                    <thead className="bg-gray-900 text-xs text-gray-400">
                        <tr>
                            <th className="w-48 px-3 py-2 font-medium">Position</th>
                            <th className="border-l border-gray-800 px-3 py-2 font-medium">Lokal</th>
                            <th className="border-l border-gray-800 px-3 py-2 font-medium">Server</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => {
                            const reference = row.local ?? row.remote;
                            return (
                                <tr key={row.key} className={`border-t border-gray-800 align-top ${row.changed ? "bg-gray-950" : "bg-gray-950/50 opacity-70"}`}>
                                    <td className="px-3 py-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="break-words text-sm font-medium text-gray-200">{emptyLabel(reference?.item?.Objektname)}</span>
                                            {row.changed && <StatusBadge local={row.local} remote={row.remote} />}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            {reference?.kind === "group" ? "Baugruppe" : reference?.parentName}
                                        </div>
                                    </td>
                                    <td className="border-l border-gray-800 px-2"><ListValue row={row.local} counterpart={row.remote} /></td>
                                    <td className="border-l border-gray-800 px-2"><ListValue row={row.remote} counterpart={row.local} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PartListView({ data }) {
    const rows = flattenPartList(data);
    const summary = summarizePartList(data);
    return (
        <div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs text-gray-300">
                <span className="rounded bg-gray-800 px-2 py-1">{summary.groups} Baugruppen</span>
                <span className="rounded bg-gray-800 px-2 py-1">{summary.parts} Positionen</span>
                <span className="rounded bg-gray-800 px-2 py-1">{summary.quantity} Teile gesamt</span>
            </div>
            <div className="max-h-[32rem] overflow-auto rounded-lg border border-gray-800">
                <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="sticky top-0 bg-gray-950 text-gray-400">
                        <tr>{["Position", "Material", "L", "B", "T", "Menge", "Kanten"].map(label => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.key} className={`border-t border-gray-800 ${row.kind === "group" ? "bg-gray-800/70" : ""}`}>
                                <td className="px-3 py-2">
                                    <div className="font-medium text-gray-200">{emptyLabel(row.item?.Objektname)}</div>
                                    {row.kind !== "group" && <div className="text-[10px] text-gray-500">{row.parentName}</div>}
                                </td>
                                {["MID", "L", "B", "T", "Anzahl", "Kante"].map(field => <td key={field} className="px-3 py-2 text-gray-300">{emptyLabel(row.item?.[field])}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const nestingGroupKey = (group, index) => `${group?.MID ?? "Material"}|${group?.T ?? "Dicke"}|${index}`;
const placedItems = plate => {
    const parts = asArray(plate?.plates);
    if (parts.length) return parts;
    return asArray(plate?.strips);
};

const summarizeNesting = data => {
    const groups = asArray(data);
    const sheets = groups.flatMap(group => asArray(group?.nestingPlates));
    return {
        materials: groups.length,
        sheets: sheets.length,
        parts: groups.reduce((sum, group) => sum + asArray(group?.plates).length, 0),
        unplaced: groups.reduce((sum, group) => sum + asArray(group?.emptyStrips).length, 0)
    };
};

function NestingPlatePreview({ plate, index, settings }) {
    const width = Math.max(1, number(plate?.placedWidth ?? settings?.defaultSheet?.width ?? plate?.width));
    const height = Math.max(1, number(plate?.placedHeight ?? settings?.defaultSheet?.height ?? plate?.height));
    const items = placedItems(plate);
    const usedArea = items.reduce((sum, item) => sum + number(item?.placedWidth ?? item?.width) * number(item?.placedHeight ?? item?.height), 0);
    const utilization = Math.min(100, Math.round(usedArea / (width * height) * 100));

    return (
        <div className="rounded-lg border border-gray-700 bg-gray-950 p-2">
            <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
                <span>Platte {index + 1} · {emptyLabel(width)} × {emptyLabel(height)}</span>
                <span>{items.length} Belegungen · {utilization}%</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full rounded bg-gray-900" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Nesting-Platte ${index + 1}`}>
                <rect x="0" y="0" width={width} height={height} fill="#111827" stroke="#4b5563" strokeWidth={Math.max(width, height) / 250} />
                {items.map((item, itemIndex) => {
                    const x = number(item?.x ?? item?.nestingX);
                    const y = number(item?.y ?? item?.nestingY);
                    const itemWidth = Math.max(1, number(item?.placedWidth ?? item?.width));
                    const itemHeight = Math.max(1, number(item?.placedHeight ?? item?.height));
                    const title = item?.original?.Objektname ?? item?.Objektname ?? `Belegung ${itemIndex + 1}`;
                    return (
                        <rect
                            key={`${item?.id ?? itemIndex}-${x}-${y}`}
                            x={x}
                            y={y}
                            width={itemWidth}
                            height={itemHeight}
                            fill={item?.color || (itemIndex % 2 ? "#1d4ed8" : "#0f766e")}
                            fillOpacity="0.72"
                            stroke="#d1d5db"
                            strokeWidth={Math.max(width, height) / 500}
                        >
                            <title>{title} · {itemWidth} × {itemHeight}</title>
                        </rect>
                    );
                })}
            </svg>
        </div>
    );
}

function NestingVersion({ data }) {
    const groups = asArray(data);
    const summary = summarizeNesting(data);
    if (!groups.length) return <div className="rounded-lg border border-gray-800 p-4 text-sm text-gray-500">Keine Nesting-Daten vorhanden.</div>;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-[11px] text-gray-300">
                <span className="rounded bg-gray-800 px-2 py-1">{summary.materials} Materialien</span>
                <span className="rounded bg-gray-800 px-2 py-1">{summary.sheets} Platten</span>
                <span className="rounded bg-gray-800 px-2 py-1">{summary.parts} Teile</span>
                {summary.unplaced > 0 && <span className="rounded bg-amber-950 px-2 py-1 text-amber-300">{summary.unplaced} nicht platziert</span>}
            </div>
            {groups.map((group, groupIndex) => {
                const settings = group?.settings ?? {};
                const sheets = asArray(group?.nestingPlates);
                return (
                    <details key={nestingGroupKey(group, groupIndex)} open={groupIndex === 0} className="rounded-lg border border-gray-800 bg-gray-900/70">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-200">
                            {emptyLabel(group?.MID)} · {emptyLabel(group?.T)} mm
                            <span className="ml-2 text-xs font-normal text-gray-500">{sheets.length} Platten · {settings?.nestingMode === "2d" ? "2D" : "Streifen"}</span>
                        </summary>
                        <div className="grid gap-2 border-t border-gray-800 p-2 sm:grid-cols-2">
                            {sheets.map((plate, plateIndex) => <NestingPlatePreview key={plate?.id ?? plateIndex} plate={plate} index={plateIndex} settings={settings} />)}
                            {!sheets.length && <div className="p-2 text-xs text-gray-500">Keine belegten Platten.</div>}
                        </div>
                    </details>
                );
            })}
        </div>
    );
}

export function NestingComparison({ local, remote, choice, onChoice }) {
    const localSummary = summarizeNesting(local);
    const remoteSummary = summarizeNesting(remote);
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <div className={`min-w-0 rounded-xl border p-3 ${choice === "local" ? "border-blue-500 bg-blue-950/20" : "border-gray-700 bg-gray-950"}`}>
                <VersionChoice
                    label="Lokales Nesting übernehmen"
                    checked={choice === "local"}
                    onChange={() => onChoice("local")}
                    summary={`${localSummary.sheets} Platten`}
                />
                <div className="mt-3"><NestingVersion data={local} /></div>
            </div>
            <div className={`min-w-0 rounded-xl border p-3 ${choice === "server" ? "border-blue-500 bg-blue-950/20" : "border-gray-700 bg-gray-950"}`}>
                <VersionChoice
                    label="Nesting vom Server übernehmen"
                    checked={choice === "server"}
                    onChange={() => onChoice("server")}
                    summary={`${remoteSummary.sheets} Platten`}
                />
                <div className="mt-3"><NestingVersion data={remote} /></div>
            </div>
        </div>
    );
}

export function SpecializedDocumentConflict({ file, conflict, choice, onChoice }) {
    if (conflict.path !== "Dokument") return null;
    if (file === "list.json") {
        return <PartListComparison local={conflict.local} remote={conflict.remote} choice={choice} onChoice={onChoice} />;
    }
    if (file === "nesting.json") {
        return <NestingComparison local={conflict.local} remote={conflict.remote} choice={choice} onChoice={onChoice} />;
    }
    return null;
}

export function MergeResultView({ file, data }) {
    if (file === "list.json") return <PartListView data={data} />;
    if (file === "nesting.json") return <NestingVersion data={data} />;
    return <pre className="max-h-96 overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-300">{JSON.stringify(data, null, 2)}</pre>;
}
