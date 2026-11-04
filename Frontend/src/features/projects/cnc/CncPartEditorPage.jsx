import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import {
    AVAILABLE_POSTPROCESSORS,
    DEFAULT_MACHINING_ASSIGNMENTS,
    translatePartForCncViewer
} from "@Engine/postprocessor/index.js";
import { createStringId } from "@Engine/shared/id.js";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import { getCncPartKey, storePartCncInCabinet } from "@Engine/cabinet/cnc/manualPrograms.js";

import SideBar from "../../../shared/components/sideBar.jsx";
import ProjectBar from "../../../shared/components/projectBar.jsx";
import MobileWorkspaceGuard from "../../../shared/components/MobileWorkspaceGuard.jsx";
import { getProjectFile, uploadProjectFile } from "../../../shared/cache/project-cache.js";
import { getGlobalFile } from "../../../shared/cache/global-cache.js";
import { downloadFile, uploadJSONFile } from "../../../shared/api/file-api.js";
import CncViewport from "./cncViewport.jsx";
import ManualOperationDialog, { FilletDialog } from "./ManualOperationDialog.jsx";
import MacroOperationDialog from "./MacroOperationDialog.jsx";
import {
    CNC_MACRO_DEFINITIONS,
    MANUAL_TOOL_GROUPS,
    createEmptyCnc,
    createCompensatedMillingPaths,
    createMacroDraft,
    createMacroOperations,
    createManualOperation,
    findPartById,
    findPartByKey,
    getAvailableCncMacros,
    insertFilletAfter,
    insertOperationAfter,
    insertOperationsAfter,
    operationTitle,
    updatePartByKey
} from "./manualCncModel.js";

const DEFAULT_TOOL_DATABASE = [
    { id: "drill-5", name: "Bohrer 5 mm", category: "drilling", diameter: 5, toolNumber: 5 },
    { id: "router-8", name: "Schaftfräser 8 mm", category: "milling", diameter: 8, toolNumber: 114 },
    { id: "groove-8", name: "Nutwerkzeug 8,3 mm", category: "milling", diameter: 8.3, toolNumber: 81 }
];

const createViewerFallback = () => ({
    id: "builtin-legacy-viewer",
    pluginId: "legacy-viewer-bridge",
    name: "CNC Viewer",
    enabled: true,
    configuration: {}
});

const historyReducer = (state, action) => {
    if (action.type === "load") return { past: [], present: action.operations, future: [] };
    if (action.type === "commit") return { past: [...state.past, state.present], present: action.operations, future: [] };
    if (action.type === "undo" && state.past.length) return { past: state.past.slice(0, -1), present: state.past.at(-1), future: [state.present, ...state.future] };
    if (action.type === "redo" && state.future.length) return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) };
    return state;
};

const operationSummary = operation => {
    if (operation.x !== undefined && operation.y !== undefined) return `X ${operation.x} · Y ${operation.y}`;
    if (operation.motion === "rapid") return `X ${operation.target?.x} · Y ${operation.target?.y}`;
    if (operation.motion === "linear" || operation.motion === "arc") return `${operation.start?.x}/${operation.start?.y} → ${operation.target?.x}/${operation.target?.y}`;
    if (operation.start && operation.end && typeof operation.start === "object") return `${operation.start.x}/${operation.start.y} → ${operation.end.x}/${operation.end.y}`;
    if (operation.start !== undefined && operation.end !== undefined) return `${operation.start} → ${operation.end}`;
    return operation.intentId;
};

export default function CncPartEditorPage() {
    const { projectId, partId } = useParams();
    const [searchParams] = useSearchParams();
    const requestedPartKey = searchParams.get("partKey");
    const requestedCabinetId = searchParams.get("cabinetId");
    const navigate = useNavigate();
    const [partList, setPartList] = useState(null);
    const [cabinets, setCabinets] = useState([]);
    const [parentCabinetId, setParentCabinetId] = useState(null);
    const [part, setPart] = useState(null);
    const [activePostprocessor, setActivePostprocessor] = useState(createViewerFallback);
    const [machiningAssignments, setMachiningAssignments] = useState(DEFAULT_MACHINING_ASSIGNMENTS);
    const [cncDefault, setCncDefault] = useState(DEFAULT_CNC);
    const [history, dispatch] = useReducer(historyReducer, { past: [], present: [], future: [] });
    const [selectedOperationIds, setSelectedOperationIds] = useState([]);
    const [primaryOperationId, setPrimaryOperationId] = useState(null);
    const [selectedFace, setSelectedFace] = useState("A");
    const [draft, setDraft] = useState(null);
    const [dialogMode, setDialogMode] = useState(null);
    const [macroDraft, setMacroDraft] = useState(null);
    const [filletOpen, setFilletOpen] = useState(false);
    const [pickingPath, setPickingPath] = useState(null);
    const [notice, setNotice] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const selectionAnchorRef = useRef(null);
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);

    const operations = history.present;
    const selectedOperationId = primaryOperationId;
    const selectedKeys = useMemo(() => new Set(selectedOperationIds.map(String)), [selectedOperationIds]);
    const effectiveSelectedOperationIds = useMemo(() => selectedOperationIds.filter(id =>
        operations.some(operation => String(operation.id) === String(id))
    ), [operations, selectedOperationIds]);
    const selectedIndexes = useMemo(() => operations
        .map((operation, index) => selectedKeys.has(String(operation.id)) ? index : -1)
        .filter(index => index >= 0), [operations, selectedKeys]);
    const selectedIndex = operations.findIndex(operation => String(operation.id) === String(primaryOperationId));
    const insertionIndex = selectedIndexes.length ? Math.max(...selectedIndexes) : selectedIndex;
    const insertionOperation = insertionIndex >= 0 ? operations[insertionIndex] : null;
    const tools = useMemo(() => {
        const configured = activePostprocessor?.configuration?.toolDatabase;
        return Array.isArray(configured) && configured.length ? configured : DEFAULT_TOOL_DATABASE;
    }, [activePostprocessor]);
    const activeDescriptor = AVAILABLE_POSTPROCESSORS.find(item => item.id === activePostprocessor?.pluginId);
    const availableMacros = useMemo(() => getAvailableCncMacros({
        descriptor: activeDescriptor,
        assignments: machiningAssignments
    }), [activeDescriptor, machiningAssignments]);
    const formulaVariables = useMemo(() => [
        { name: "DX", label: "Bauteillänge", value: Number(part?.L) || 0, unit: "mm" },
        { name: "DY", label: "Bauteilbreite", value: Number(part?.B) || 0, unit: "mm" },
        { name: "DZ", label: "Bauteildicke", value: Number(part?.T) || 0, unit: "mm" }
    ], [part]);
    const compensationPaths = useMemo(
        () => createCompensatedMillingPaths(operations, tools),
        [operations, tools]
    );

    const selectOnly = id => {
        setSelectedOperationIds(id == null ? [] : [id]);
        setPrimaryOperationId(id ?? null);
        selectionAnchorRef.current = id ?? null;
    };

    const addSelectionRange = id => {
        const targetIndex = operations.findIndex(operation => String(operation.id) === String(id));
        const anchorIndex = operations.findIndex(operation => String(operation.id) === String(selectionAnchorRef.current));
        if (targetIndex < 0 || anchorIndex < 0) {
            setSelectedOperationIds(previous => previous.some(selectedId => String(selectedId) === String(id)) ? previous : [...previous, id]);
        } else {
            const [start, end] = [Math.min(anchorIndex, targetIndex), Math.max(anchorIndex, targetIndex)];
            const range = operations.slice(start, end + 1).map(operation => operation.id);
            setSelectedOperationIds(previous => [...new Map([...previous, ...range].map(value => [String(value), value])).values()]);
        }
        setPrimaryOperationId(id);
    };

    const toggleSelection = id => {
        const included = selectedKeys.has(String(id));
        const next = included
            ? selectedOperationIds.filter(selectedId => String(selectedId) !== String(id))
            : [...selectedOperationIds, id];
        setSelectedOperationIds(next);
        setPrimaryOperationId(included ? next.at(-1) ?? null : id);
        selectionAnchorRef.current = id;
    };

    useEffect(() => () => window.clearTimeout(longPressTimerRef.current), []);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const [list, cabinetData, settings] = await Promise.all([
                    getProjectFile({ projectId, file: "list.json", loadFromServer: { download: downloadFile, path: `/api/projects/generated/${projectId}/list` } }),
                    getProjectFile({ projectId, file: "cabinet.json", loadFromServer: { download: downloadFile, path: `/api/projects/generated/${projectId}/cabinet` } }),
                    getGlobalFile({ file: "settings-cnc.json", loadFromServer: { download: downloadFile, path: "/api/settings/cnc" } }).catch(() => null)
                ]);
                if (cancelled) return;
                const selected = requestedPartKey
                    ? findPartByKey(list, requestedPartKey, requestedCabinetId)
                    : findPartById(list, partId);
                if (!selected) {
                    setNotice({ type: "error", message: "Das ausgewählte Bauteil wurde in der Projektliste nicht gefunden." });
                    return;
                }
                const instances = Array.isArray(settings?.postprocessors) ? settings.postprocessors : [];
                const configured = instances.find(item => item.id === settings?.activePostprocessorId && item.enabled !== false)
                    ?? instances.find(item => item.enabled !== false)
                    ?? createViewerFallback();
                setPartList(list);
                const projectCabinets = Array.isArray(cabinetData) ? cabinetData : [];
                const matchedCabinet = projectCabinets.find(cabinet =>
                    String(requestedCabinetId ?? "") === String(cabinet.id) ||
                    String(selected._cabinetId ?? "") === String(cabinet.id) ||
                    String(selected._generatedId ?? "").startsWith(`${cabinet.id}:part:`)
                );
                setCabinets(projectCabinets);
                setParentCabinetId(matchedCabinet?.id ?? null);
                setPart(selected);
                setActivePostprocessor(configured);
                setCncDefault(settings?.cncDefault ?? DEFAULT_CNC);
                setMachiningAssignments({
                    ...DEFAULT_MACHINING_ASSIGNMENTS,
                    ...(settings?.cncDefault?.machiningAssignments ?? settings?.machiningAssignments ?? {})
                });
                dispatch({ type: "load", operations: Array.isArray(selected.CNC?.operations) ? selected.CNC.operations : [] });
                selectOnly(null);
            } catch (error) {
                console.error("CNC-Bauteil konnte nicht geladen werden:", error);
                if (!cancelled) setNotice({ type: "error", message: "CNC-Bauteil und Einstellungen konnten nicht geladen werden." });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [partId, projectId, requestedCabinetId, requestedPartKey]);

    const viewerResult = useMemo(() => {
        if (!part) return { operations: [], diagnostics: [] };
        const viewerPart = { ...part, CNC: { ...(part.CNC ?? createEmptyCnc()), ...createEmptyCnc(), operations } };
        try {
            return translatePartForCncViewer(activePostprocessor, { part: viewerPart, assignments: machiningAssignments });
        } catch (error) {
            return { operations: [], diagnostics: [{ level: "error", message: error.message }] };
        }
    }, [activePostprocessor, machiningAssignments, operations, part]);

    const commit = nextOperations => {
        dispatch({ type: "commit", operations: nextOperations });
        setNotice(null);
    };

    const openTool = tool => {
        setPickingPath(null);
        if (tool.special === "fillet") {
            setFilletOpen(true);
            return;
        }
        const operation = createManualOperation({ tool, part, cncDefault, tools, previousOperation: insertionOperation });
        setDraft(operation);
        setDialogMode("create");
    };

    const openMacro = macro => {
        setDraft(null);
        setDialogMode(null);
        setPickingPath(null);
        setMacroDraft({
            ...createMacroDraft({ macro, part, cncDefault }),
            face: selectedFace
        });
    };

    const saveMacro = nextDraft => {
        const additions = createMacroOperations({
            macroId: nextDraft.macroId,
            values: nextDraft.values,
            part,
            cncDefault,
            tools
        }).map(operation => ({ ...operation, face: nextDraft.face ?? selectedFace }));
        if (!additions.length) {
            setNotice({ type: "error", message: "Das Makro konnte keine Bearbeitungen erzeugen." });
            return;
        }
        commit(insertOperationsAfter(operations, insertionOperation?.id ?? selectedOperationId, additions));
        setSelectedOperationIds(additions.map(operation => operation.id));
        setPrimaryOperationId(additions.at(-1)?.id ?? null);
        selectionAnchorRef.current = additions[0]?.id ?? null;
        setSelectedFace(nextDraft.face ?? selectedFace);
        setMacroDraft(null);
    };

    const openEdit = operation => {
        setPrimaryOperationId(operation.id);
        setSelectedOperationIds(previous => previous.some(id => String(id) === String(operation.id)) ? previous : [...previous, operation.id]);
        setDraft(JSON.parse(JSON.stringify(operation)));
        setDialogMode("edit");
        setPickingPath(null);
    };

    const saveDraft = operation => {
        if (dialogMode === "edit") {
            commit(operations.map(item => String(item.id) === String(operation.id) ? operation : item));
        } else {
            commit(insertOperationAfter(operations, insertionOperation?.id ?? selectedOperationId, operation));
        }
        selectOnly(operation.id);
        setSelectedFace(operation.face ?? "A");
        setDraft(null);
        setDialogMode(null);
        setPickingPath(null);
    };

    const addFillet = (radius, direction) => {
        try {
            const result = insertFilletAfter(operations, selectedOperationId, radius, direction);
            commit(result.operations);
            selectOnly(result.operation.id);
            setFilletOpen(false);
        } catch (error) {
            setNotice({ type: "error", message: error.message });
        }
    };

    const savePart = async () => {
        if (!partList || !part) return;
        setSaving(true);
        setNotice(null);
        try {
            const parentCabinet = cabinets.find(cabinet => String(cabinet.id) === String(parentCabinetId));
            if (!parentCabinet) {
                throw new Error("Der Elternkorpus des Bauteils konnte nicht ermittelt werden.");
            }
            const cnc = { ...(part.CNC ?? {}), ...createEmptyCnc(), operations };
            const updatedList = updatePartByKey(partList, requestedPartKey ?? getCncPartKey(part), parentCabinetId, current => {
                const generatedPart = { ...current };
                delete generatedPart.manual;
                delete generatedPart._manualOrigin;
                return { ...generatedPart, CNC: cnc };
            });
            const updatedCabinet = storePartCncInCabinet(parentCabinet, part, operations, { tools });
            const updatedCabinets = cabinets.map(cabinet => String(cabinet.id) === String(parentCabinetId) ? updatedCabinet : cabinet);
            const [result] = await Promise.all([
                uploadProjectFile({
                    projectId,
                    file: "list.json",
                    data: updatedList,
                    uploadFunction: { upload: uploadJSONFile, path: `/api/projects/generated/${projectId}/list` }
                }),
                uploadProjectFile({
                    projectId,
                    file: "cabinet.json",
                    data: updatedCabinets,
                    uploadFunction: { upload: uploadJSONFile, path: `/api/projects/generated/${projectId}/cabinet` }
                })
            ]);
            setPartList(updatedList);
            setCabinets(updatedCabinets);
            setPart(current => ({ ...current, CNC: cnc }));
            setNotice({ type: "success", message: result.offline ? "CNC-Programm und Korpuskonfiguration lokal gespeichert." : "CNC-Programm und Korpuskonfiguration gespeichert." });
        } catch (error) {
            console.error("Manuelle CNC-Bearbeitung konnte nicht gespeichert werden:", error);
            setNotice({ type: "error", message: "Die CNC-Bearbeitung konnte nicht gespeichert werden." });
        } finally {
            setSaving(false);
        }
    };

    const deleteSelected = () => {
        if (!selectedIndexes.length) return;
        const firstSelectedIndex = Math.min(...selectedIndexes);
        const next = operations.filter(operation => !selectedKeys.has(String(operation.id)));
        commit(next);
        selectOnly(next[Math.min(firstSelectedIndex, next.length - 1)]?.id ?? null);
    };

    const moveSelected = direction => {
        if (!selectedIndexes.length) return;
        const next = [...operations];
        if (direction < 0) {
            for (let index = 1; index < next.length; index += 1) {
                if (selectedKeys.has(String(next[index].id)) && !selectedKeys.has(String(next[index - 1].id))) {
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                }
            }
        } else {
            for (let index = next.length - 2; index >= 0; index -= 1) {
                if (selectedKeys.has(String(next[index].id)) && !selectedKeys.has(String(next[index + 1].id))) {
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                }
            }
        }
        commit(next);
    };

    const duplicateSelected = () => {
        if (!selectedIndexes.length) return;
        const copies = operations
            .filter(operation => selectedKeys.has(String(operation.id)))
            .map(operation => ({ ...JSON.parse(JSON.stringify(operation)), id: createStringId(), source: { type: "manualCncEditor", toolId: "duplicate" } }));
        const insertAt = Math.max(...selectedIndexes) + 1;
        commit([...operations.slice(0, insertAt), ...copies, ...operations.slice(insertAt)]);
        setSelectedOperationIds(copies.map(operation => operation.id));
        setPrimaryOperationId(copies.at(-1)?.id ?? null);
    };

    useEffect(() => {
        const keydown = event => {
            const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(event.target?.tagName);
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                void savePart();
            } else if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
                event.preventDefault();
                dispatch({ type: event.shiftKey ? "redo" : "undo" });
            } else if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
                event.preventDefault();
                dispatch({ type: "redo" });
            } else if (!typing && event.key === "Delete") deleteSelected();
        };
        window.addEventListener("keydown", keydown);
        return () => window.removeEventListener("keydown", keydown);
    });

    const faceCount = face => operations.filter(operation => (operation.face ?? "A") === face).length;
    const canMoveUp = selectedIndexes.some(index => index > 0 && !selectedKeys.has(String(operations[index - 1]?.id)));
    const canMoveDown = selectedIndexes.some(index => index < operations.length - 1 && !selectedKeys.has(String(operations[index + 1]?.id)));

    return (
        <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
            <SideBar selected={2} />
            <MobileWorkspaceGuard title="CNC-Bauteileditor" />
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-gray-700 bg-gray-900"><ProjectBar selected={6} /></div>
                <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-700 bg-gray-900 px-4">
                    <button type="button" onClick={() => navigate(`/Projects/Cnc/${projectId}`)} className="rounded border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800">← CNC-Übersicht</button>
                    <div className="min-w-0">
                        <h1 className="truncate text-sm font-semibold">{part?.Objektname ?? "Bauteil bearbeiten"}</h1>
                        <p className="truncate text-xs text-gray-500">{part?.PID} · {part?.L} × {part?.B} × {part?.T} mm · {activeDescriptor?.name ?? activePostprocessor?.name}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <button type="button" disabled={!history.past.length} onClick={() => dispatch({ type: "undo" })} className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-300 disabled:opacity-30">Rückgängig</button>
                        <button type="button" disabled={!history.future.length} onClick={() => dispatch({ type: "redo" })} className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-300 disabled:opacity-30">Wiederholen</button>
                        <button type="button" disabled={saving || !part} onClick={savePart} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50">{saving ? "Speichern…" : "Bauteil aktualisieren"}</button>
                    </div>
                </header>

                {notice && <div className={`shrink-0 border-b px-4 py-2 text-xs ${notice.type === "error" ? "border-red-900 bg-red-950/60 text-red-300" : "border-emerald-900 bg-emerald-950/50 text-emerald-300"}`}>{notice.message}</div>}

                <div className="grid min-h-0 flex-1 grid-cols-[310px_minmax(0,1fr)_260px]">
                    <aside className="flex min-h-0 flex-col border-r border-gray-700 bg-gray-900">
                        <div className="shrink-0 border-b border-gray-700 p-3">
                            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Bearbeitungen</h2><span className="text-xs text-gray-500">{effectiveSelectedOperationIds.length ? `${effectiveSelectedOperationIds.length} / ` : ""}{operations.length}</span></div>
                            <p className="mt-1 text-[11px] text-gray-500">Shift-Klick oder langes Drücken erweitert die Auswahl · Doppelklick bearbeitet</p>
                            <div className="mt-3 grid grid-cols-4 gap-1">
                                <button type="button" onClick={() => moveSelected(-1)} disabled={!canMoveUp} className="rounded border border-gray-700 py-1 text-xs disabled:opacity-30">↑</button>
                                <button type="button" onClick={() => moveSelected(1)} disabled={!canMoveDown} className="rounded border border-gray-700 py-1 text-xs disabled:opacity-30">↓</button>
                                <button type="button" onClick={duplicateSelected} disabled={!effectiveSelectedOperationIds.length} className="rounded border border-gray-700 py-1 text-xs disabled:opacity-30">Kopie</button>
                                <button type="button" onClick={deleteSelected} disabled={!effectiveSelectedOperationIds.length} className="rounded border border-red-900 py-1 text-xs text-red-300 disabled:opacity-30">Löschen</button>
                            </div>
                        </div>
                        <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                            {operations.map((operation, index) => {
                                const selected = selectedKeys.has(String(operation.id));
                                return <li key={operation.id ?? index}>
                                    <button
                                        type="button"
                                        onPointerDown={event => {
                                            if (event.pointerType === "mouse") return;
                                            longPressTriggeredRef.current = false;
                                            longPressTimerRef.current = window.setTimeout(() => {
                                                longPressTriggeredRef.current = true;
                                                toggleSelection(operation.id);
                                                setSelectedFace(operation.face ?? "A");
                                                navigator.vibrate?.(30);
                                            }, 550);
                                        }}
                                        onPointerUp={() => window.clearTimeout(longPressTimerRef.current)}
                                        onPointerCancel={() => window.clearTimeout(longPressTimerRef.current)}
                                        onPointerLeave={() => window.clearTimeout(longPressTimerRef.current)}
                                        onContextMenu={event => event.preventDefault()}
                                        onClick={event => {
                                            if (longPressTriggeredRef.current) {
                                                longPressTriggeredRef.current = false;
                                                return;
                                            }
                                            if (event.shiftKey) addSelectionRange(operation.id);
                                            else if (event.ctrlKey || event.metaKey) toggleSelection(operation.id);
                                            else selectOnly(operation.id);
                                            setSelectedFace(operation.face ?? "A");
                                        }}
                                        onDoubleClick={() => openEdit(operation)}
                                        className={`w-full select-none rounded-lg border px-3 py-2 text-left transition ${selected ? "border-blue-600 bg-blue-950/50" : "border-transparent bg-gray-950/40 hover:border-gray-700"}`}
                                    >
                                        <div className="flex items-center gap-2"><span className="w-6 text-[10px] text-gray-600">{index + 1}</span><span className="flex-1 text-xs font-medium">{operationTitle(operation)}</span><span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">{operation.face ?? "A"}</span></div>
                                        <div className="ml-8 mt-1 truncate text-[10px] text-gray-500">{operationSummary(operation)}</div>
                                    </button>
                                </li>;
                            })}
                            {!operations.length && <li className="rounded border border-dashed border-gray-700 p-4 text-center text-xs text-gray-500">Werkzeug rechts auswählen und erste Bearbeitung anlegen.</li>}
                        </ol>
                    </aside>

                    <section className="flex min-h-0 min-w-0 flex-col bg-gray-950">
                        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-700 px-3">
                            {['A', 'B'].map(face => <button key={face} type="button" onClick={() => setSelectedFace(face)} className={`rounded px-3 py-1.5 text-xs ${selectedFace === face ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}>Seite {face} ({faceCount(face)})</button>)}
                            {!!compensationPaths.length && <span className="flex items-center gap-1.5 text-[11px] text-sky-300"><span className="h-0.5 w-5 bg-sky-400" />Korrigierte Werkzeugspur</span>}
                            <span className="ml-auto text-[11px] text-gray-500">{pickingPath ? "Punkt in der Zeichnung wählen" : "Koordinatenursprung oben links · mm"}</span>
                        </div>
                        <div className="min-h-0 flex-1">
                            {loading ? <div className="flex h-full items-center justify-center text-sm text-gray-500">Bauteil wird geladen…</div> : <CncViewport
                                part={part ? { ...part, CNC: { ...(part.CNC ?? createEmptyCnc()), operations: viewerResult.operations } } : null}
                                operations={viewerResult.operations ?? []}
                                selectedOperationId={selectedOperationId}
                                selectedOperationIds={effectiveSelectedOperationIds}
                                onSelectOperation={selectOnly}
                                compensationPaths={compensationPaths}
                                onSelectPart={() => null}
                                selectedFace={selectedFace}
                                pointPicking={Boolean(pickingPath)}
                                onCanvasPoint={point => {
                                    if (!pickingPath) return;
                                    setDraft(current => pickingPath === "$root"
                                        ? { ...current, ...point }
                                        : { ...current, [pickingPath]: { ...(current?.[pickingPath] ?? {}), ...point } });
                                    setPickingPath(null);
                                }}
                            />}
                        </div>
                        {!!viewerResult.diagnostics?.length && <div className="max-h-20 shrink-0 overflow-y-auto border-t border-amber-900 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-300">{viewerResult.diagnostics.map((entry, index) => <div key={index}>{entry.message}</div>)}</div>}
                    </section>

                    <aside className="min-h-0 overflow-y-auto border-l border-gray-700 bg-gray-900 p-3">
                        <h2 className="text-sm font-semibold">Werkzeuge</h2>
                        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">Neue Bearbeitungen werden direkt nach der ausgewählten Zeile eingefügt.</p>
                        {MANUAL_TOOL_GROUPS.map(group => <section key={group.id} className="mt-5">
                            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{group.label}</h3>
                            <div className="space-y-2">{group.tools.map(tool => <button key={tool.id} type="button" onClick={() => openTool(tool)} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-left text-xs text-gray-200 transition hover:border-blue-600 hover:bg-blue-950/30">{tool.label}</button>)}</div>
                        </section>)}
                        <section className="mt-5">
                            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400">Makro</h3>
                            <p className="mb-2 text-[10px] leading-relaxed text-gray-500">Nur Programme, deren Bearbeitungsstrategie der aktive Postprozessor unterstützt.</p>
                            <div className="space-y-2">
                                {availableMacros.map(macro => <button key={macro.id} type="button" onClick={() => openMacro(macro)} className="w-full rounded-lg border border-amber-900/80 bg-amber-950/20 px-3 py-3 text-left transition hover:border-amber-600 hover:bg-amber-950/40"><span className="block text-xs text-amber-100">{macro.label}</span><span className="mt-1 block text-[10px] leading-relaxed text-gray-500">{macro.description}</span></button>)}
                                {!availableMacros.length && <div className="rounded border border-dashed border-gray-700 p-3 text-[10px] text-gray-500">Für die aktuelle Postprozessor-Zuordnung sind keine Makros verfügbar.</div>}
                            </div>
                        </section>
                        <section className="mt-6 rounded-lg border border-gray-700 bg-gray-950/60 p-3">
                            <h3 className="text-xs font-medium text-gray-300">Aktive Werkzeugdatenbank</h3>
                            <p className="mt-1 text-[10px] text-gray-500">Aus dem aktiven Postprozessor. Durchmesser steuern die Radiuskorrektur.</p>
                            <div className="mt-2 space-y-1">{tools.map(tool => <div key={tool.id} className="flex justify-between text-[10px] text-gray-400"><span>{tool.name}</span><span>Ø {tool.diameter}</span></div>)}</div>
                        </section>
                    </aside>
                </div>
            </main>

            {draft && <ManualOperationDialog
                draft={draft}
                onChange={setDraft}
                tools={tools}
                variables={formulaVariables}
                pickingPath={pickingPath}
                onPickRequest={setPickingPath}
                onCancel={() => { setDraft(null); setDialogMode(null); setPickingPath(null); }}
                onSave={saveDraft}
            />}
            {macroDraft && <MacroOperationDialog
                macro={availableMacros.find(macro => macro.id === macroDraft.macroId) ?? CNC_MACRO_DEFINITIONS.find(macro => macro.id === macroDraft.macroId)}
                draft={macroDraft}
                variables={formulaVariables}
                onChange={setMacroDraft}
                onCancel={() => setMacroDraft(null)}
                onSave={saveMacro}
            />}
            {filletOpen && <FilletDialog onCancel={() => setFilletOpen(false)} onSave={addFillet} />}
        </div>
    );
}
