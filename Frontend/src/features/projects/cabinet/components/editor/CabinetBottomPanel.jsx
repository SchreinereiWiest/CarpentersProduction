import { useEffect, useMemo, useState } from "react";
import { buildPartList } from "@Engine/cabinet/partList/buildPartList.js";
import CncViewport from "../../../cnc/shared/cncViewport.jsx";
import { CarcassLayer } from "../view/corpus.view.jsx";
import { InteriorLayer } from "../view/interiorLayer.view.jsx";
import { attachmentsForCabinet } from "../../../attachments/attachmentLinks.js";

const flattenParts = roots => (roots ?? []).flatMap(root =>
    (root.Children ?? []).map(part => ({
        ...part,
        cabinetName: root.Objektname
    }))
);

const TabButton = ({ active, children, ...props }) => (
    <button
        type="button"
        className={`border-b-2 px-4 py-2 text-xs font-medium ${active ? "border-amber-500 text-amber-200" : "border-transparent text-gray-500 hover:text-gray-300"}`}
        {...props}
    >
        {children}
    </button>
);

const CabinetPresetThumbnail = ({ cabinet, cncConfig }) => {
    const width = Math.max(1, Number(cabinet?.width) || 600);
    const height = Math.max(1, Number(cabinet?.height) || 720);
    const padding = Math.max(width, height) * 0.04;
    return (
        <svg
            viewBox={`${-padding} ${-padding} ${width + padding * 2} ${height + padding * 2}`}
            className="mx-auto h-20 w-24 rounded border border-white/10 bg-[#111315]"
            aria-label={`Vorschau ${cabinet?.name ?? "Korpus"}`}
            style={{ pointerEvents: "none" }}
        >
            <CarcassLayer cabinet={cabinet} />
            <InteriorLayer cabinet={cabinet} cncConfig={cncConfig} onSelect={() => {}} />
        </svg>
    );
};

export default function CabinetBottomPanel({
    cabinets,
    materials,
    cncConfig,
    cabinetPresets,
    functionPresets,
    activeCabinet,
    attachments = [],
    attachmentLinks = { links: {} },
    onInsertCabinetPreset,
    onInsertFunctionPreset,
    onSavePreset,
    canSavePreset
}) {
    const [tab, setTab] = useState("presets");
    const [parts, setParts] = useState([]);
    const [selectedPartId, setSelectedPartId] = useState(null);
    const [partError, setPartError] = useState("");
    const [collapsed, setCollapsed] = useState(false);
    const [selectedFace, setSelectedFace] = useState("A");
    const [selectedAttachment, setSelectedAttachment] = useState(null);

    useEffect(() => {
        let cancelled = false;
        if (!cabinets.length) {
            return undefined;
        }
        buildPartList(cabinets, materials, cncConfig)
            .then(result => {
                if (cancelled) return;
                const nextParts = flattenParts(result);
                setParts(nextParts);
                setSelectedPartId(current => nextParts.some(part => part._generatedId === current)
                    ? current
                    : nextParts[0]?._generatedId ?? null);
                setPartError("");
            })
            .catch(error => {
                if (cancelled) return;
                console.error("Bauteile konnten nicht erzeugt werden", error);
                setPartError("Bauteile konnten nicht erzeugt werden.");
            });
        return () => { cancelled = true; };
    }, [cabinets, cncConfig, materials]);

    const selectedPart = useMemo(
        () => parts.find(part => part._generatedId === selectedPartId) ?? null,
        [parts, selectedPartId]
    );
    const operations = selectedPart?.CNC?.operations ?? [];
    const linkedAttachments = useMemo(
        () => attachmentsForCabinet(attachments, attachmentLinks, activeCabinet?.id),
        [activeCabinet?.id, attachmentLinks, attachments]
    );
    const faceCount = face => operations.filter(operation => (operation.face ?? "A") === face).length;

    useEffect(() => {
        if (!selectedAttachment) return undefined;
        const close = event => event.key === "Escape" && setSelectedAttachment(null);
        window.addEventListener("keydown", close);
        return () => window.removeEventListener("keydown", close);
    }, [selectedAttachment]);

    return (
        <>
        <section className={`${collapsed ? "h-9" : "h-[220px]"} shrink-0 border-t border-white/10 bg-[#151719] transition-[height]`}>
            <div className="flex h-9 items-center border-b border-white/10 px-2">
                <button
                    type="button"
                    onClick={() => setCollapsed(value => !value)}
                    className="mr-1 flex h-7 w-7 items-center justify-center rounded border border-white/10 text-xs text-gray-400 hover:bg-white/5 hover:text-white"
                    aria-label={collapsed ? "Unteres Panel aufklappen" : "Unteres Panel zusammenklappen"}
                    title={collapsed ? "Panel aufklappen" : "Panel zusammenklappen"}
                >
                    {collapsed ? "⌃" : "⌄"}
                </button>
                {!collapsed && <>
                    <TabButton active={tab === "presets"} onClick={() => setTab("presets")}>Preset-Liste</TabButton>
                    <TabButton active={tab === "functions"} onClick={() => setTab("functions")}>Function Presets</TabButton>
                    <TabButton active={tab === "parts"} onClick={() => setTab("parts")}>Bauteile <span className="ml-1 text-gray-600">{parts.length}</span></TabButton>
                    <TabButton active={tab === "attachments"} onClick={() => setTab("attachments")}>Anlagen <span className="ml-1 text-gray-600">{linkedAttachments.length}</span></TabButton>
                </>}
                {!collapsed && tab === "presets" && canSavePreset && (
                    <button
                        type="button"
                        disabled={!activeCabinet}
                        onClick={onSavePreset}
                        className="ml-auto rounded-md border border-amber-700/60 px-3 py-1 text-xs text-amber-200 hover:bg-amber-950/40 disabled:opacity-40"
                    >
                        Aktuellen Korpus als Preset speichern
                    </button>
                )}
                {collapsed && <span className="ml-2 text-xs text-gray-500">Ansichten</span>}
            </div>

            {!collapsed && tab === "presets" && (
                <div className="flex h-[180px] gap-3 overflow-x-auto p-3">
                    {cabinetPresets.length === 0 && <p className="text-sm text-gray-500">Noch keine Korpus-Presets vorhanden.</p>}
                    {cabinetPresets.map(preset => (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => onInsertCabinetPreset(preset.id)}
                            className="h-36 w-40 shrink-0 rounded-lg border border-white/10 bg-[#1d2023] p-3 text-left hover:border-amber-600/70 hover:bg-[#24282c]"
                        >
                            <CabinetPresetThumbnail cabinet={preset.cabinet} cncConfig={cncConfig} />
                            <div className="mt-2 truncate text-sm text-gray-200">{preset.name}</div>
                            <div className="text-xs text-gray-500">Einfügen</div>
                        </button>
                    ))}
                </div>
            )}

            {!collapsed && tab === "functions" && (
                <div className="flex h-[180px] gap-3 overflow-x-auto p-3">
                    {functionPresets.length === 0 && <p className="text-sm text-gray-500">Noch keine Function Presets vorhanden.</p>}
                    {functionPresets.map(preset => (
                        <button
                            key={preset.id}
                            type="button"
                            disabled={!activeCabinet}
                            onClick={() => onInsertFunctionPreset(preset.id)}
                            className="h-28 w-48 shrink-0 rounded-lg border border-white/10 bg-[#1d2023] p-3 text-left hover:border-cyan-700/70 disabled:opacity-40"
                        >
                            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Function Preset</div>
                            <div className="mt-2 truncate text-sm text-gray-200">{preset.name}</div>
                            <div className="mt-1 text-xs text-gray-500">Auf aktuellen Korpus anwenden</div>
                        </button>
                    ))}
                </div>
            )}

            {!collapsed && tab === "parts" && (
                <div className="grid h-[180px] grid-cols-[minmax(260px,0.9fr)_1.1fr]">
                    <div className="overflow-y-auto border-r border-white/10 p-2">
                        {partError && <p className="p-2 text-xs text-red-300">{partError}</p>}
                        {parts.map(part => (
                            <button
                                key={part._generatedId ?? part.PID}
                                type="button"
                                onClick={() => setSelectedPartId(part._generatedId)}
                                className={`mb-1 grid w-full grid-cols-[1fr_auto] rounded-md px-3 py-2 text-left text-xs ${selectedPart?._generatedId === part._generatedId ? "bg-amber-500/15 text-amber-100" : "text-gray-400 hover:bg-white/5"}`}
                            >
                                <span className="truncate">{part.Objektname} <span className="text-gray-600">· {part.cabinetName}</span></span>
                                <span className="ml-3 text-gray-500">{part.L} × {part.B} × {part.T}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative min-h-0 bg-[#101214]">
                        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-white/10 bg-[#17191b]/95 p-1 shadow-lg">
                            <span className="px-1 text-[10px] text-gray-500">CNC {operations.length}</span>
                            {["A", "B"].map(face => (
                                <button
                                    key={face}
                                    type="button"
                                    onClick={() => setSelectedFace(face)}
                                    className={`rounded px-2 py-1 text-[10px] ${selectedFace === face ? "bg-amber-500/20 text-amber-200" : "text-gray-500 hover:bg-white/5"}`}
                                >
                                    Seite {face} ({faceCount(face)})
                                </button>
                            ))}
                        </div>
                        <CncViewport
                            part={selectedPart}
                            operations={operations}
                            selectedOperationIds={[]}
                            selectedFace={selectedFace}
                        />
                    </div>
                </div>
            )}

            {!collapsed && tab === "attachments" && (
                <div className="flex h-[180px] gap-3 overflow-x-auto p-3">
                    {!activeCabinet && <p className="text-sm text-gray-500">Wähle einen Korpus aus, um seine Anlagen zu sehen.</p>}
                    {activeCabinet && linkedAttachments.length === 0 && <p className="text-sm text-gray-500">Mit diesem Korpus sind noch keine Anlagen verknüpft.</p>}
                    {linkedAttachments.map(attachment => (
                        <button key={attachment.id} type="button" onClick={() => setSelectedAttachment(attachment)} className="h-36 w-52 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#1d2023] text-left hover:border-blue-600/70 hover:bg-[#24282c]">
                            <div className="flex h-24 items-center justify-center overflow-hidden bg-[#0f1113]">
                                {attachment.mimeType === "application/pdf" ? <span className="rounded bg-red-950 px-3 py-2 text-xs font-semibold text-red-300">PDF</span> : <img src={attachment.url} alt="" className="h-full w-full object-cover" />}
                            </div>
                            <div className="truncate px-3 py-2 text-xs text-gray-300">{attachment.fileName}</div>
                        </button>
                    ))}
                </div>
            )}
        </section>
        {selectedAttachment && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-5" role="dialog" aria-modal="true" aria-label={`${selectedAttachment.fileName} im Vollbild`} onMouseDown={event => event.target === event.currentTarget && setSelectedAttachment(null)}>
                <button type="button" onClick={() => setSelectedAttachment(null)} className="absolute right-5 top-5 rounded-lg border border-white/20 bg-black/60 px-4 py-2 text-sm text-white hover:bg-black/80">Schließen</button>
                {selectedAttachment.mimeType === "application/pdf" ? (
                    <iframe src={selectedAttachment.url} title={selectedAttachment.fileName} className="h-[calc(100dvh-5rem)] w-[min(1100px,calc(100vw-3rem))] bg-white" />
                ) : (
                    <img src={selectedAttachment.url} alt={selectedAttachment.fileName} className="max-h-[calc(100dvh-3rem)] max-w-[calc(100vw-3rem)] object-contain" />
                )}
            </div>
        )}
        </>
    );
}
