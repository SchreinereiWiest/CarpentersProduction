import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "react-router";
import SideBar from "../../../shared/components/sideBar.jsx";
import ProjectBar from "../../../shared/components/projectBar.jsx";
import MobileWorkspaceGuard from "../../../shared/components/MobileWorkspaceGuard.jsx";
import { getProjectFile, uploadProjectFile } from "../../../shared/cache/project-cache.js";
import { getGlobalFile } from "../../../shared/cache/global-cache.js";
import { downloadFile, uploadJSONFile } from "../../../shared/api/file-api.js";
import { getProjectRecord } from "../../../shared/projects/project-records.js";
import CutScene from "./cutScene.jsx";
import EticketPrintDialog from "../nesting/EticketPrintDialog.jsx";
import { createNestingEticketData } from "../nesting/eticketData.js";
import { getStripLayout } from "@Engine/nesting/placement/manualStripPlacement.js";
import { DEFAULT_ETICKET_SETTINGS, normalizeEticketSettings } from "@Engine/eticket/index.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getCutStripLayout(strip, settings) {
    const stripRotation = Number(strip.rotation) === 90 ? 90 : 0;
    let plateRotation = 0;
    if (strip.packingMode === "2d") {
        plateRotation = Number(strip.plates?.[0]?.nestingRotation) === 90 ? 90 : 0;
    } else if ((strip.layoutType ?? strip.type) === "horizontal") {
        plateRotation = 90;
    }
    const isHorizontallyOriented = (plateRotation + stripRotation) % 180 === 90;
    const cutRotation = isHorizontallyOriented
        ? (stripRotation + 90) % 180
        : stripRotation;

    // Die Cut-Ansicht zeigt die Außenbreite quer und die Strip-Länge längs.
    return getStripLayout(strip, { ...settings, rotation: cutRotation });
}

function updatePlateFinishedTag(value, plateId, finished) {
    if (Array.isArray(value)) {
        return value.map((item) => updatePlateFinishedTag(item, plateId, finished));
    }
    if (!value || typeof value !== "object") return value;

    return Object.fromEntries(Object.entries(value).map(([key, child]) => {
        if (key === "plates" && Array.isArray(child)) {
            return [key, child.map((plate) => plate?.id === plateId
                ? { ...plate, finished }
                : updatePlateFinishedTag(plate, plateId, finished))];
        }
        return [key, updatePlateFinishedTag(child, plateId, finished)];
    }));
}

function getFinishedPartKeys(nestingData = []) {
    const finishedKeys = new Set();
    const collectFromStrip = (strip) => {
        (strip.plates ?? []).forEach((plate, index) => {
            if (plate.finished) {
                finishedKeys.add(`${strip.id}-${plate.id ?? index}-${index}`);
            }
        });
    };

    nestingData.forEach((sheet) => {
        (sheet.strips ?? []).forEach(collectFromStrip);
        (sheet.nestingPlates ?? []).forEach((nestingPlate) => {
            (nestingPlate.strips ?? []).forEach(collectFromStrip);
        });
    });

    return finishedKeys;
}

function getStripStacks(strips = [], settings = {}) {
    const stacksByWidth = new Map();

    strips.forEach((strip, originalIndex) => {
        const layout = getCutStripLayout(strip, settings);
        const width = Number(layout.placedWidth) || 0;
        const length = Number(layout.placedHeight) || 0;
        const widthKey = (Math.round(width * 1000) / 1000).toFixed(3);

        if (!stacksByWidth.has(widthKey)) {
            stacksByWidth.set(widthKey, {
                width: Number(widthKey),
                strips: []
            });
        }

        stacksByWidth.get(widthKey).strips.push({
            strip,
            layout,
            originalIndex,
            width,
            length
        });
    });

    return [...stacksByWidth.values()]
        .map((stack) => ({
            ...stack,
            strips: [...stack.strips].sort((left, right) => (
                left.length - right.length || left.originalIndex - right.originalIndex
            ))
        }))
        .sort((left, right) => left.width - right.width);
}

function CutingView() {
    const { projectId } = useParams();
    const [nestingResult, setNestingResult] = useState(null);
    const [loadingGeneratedData, setLoadingGeneratedData] = useState(false);
    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const [activeStackIndex, setActiveStackIndex] = useState(0);
    const [selectedPart, setSelectedPart] = useState(null);
    const [finishedPartKeys, setFinishedPartKeys] = useState(() => new Set());
    const [savingFinishedPart, setSavingFinishedPart] = useState(false);
    const [finishedSaveError, setFinishedSaveError] = useState("");
    const [materialCatalog, setMaterialCatalog] = useState(null);
    const [materialLoadError, setMaterialLoadError] = useState("");
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [showEticket, setShowEticket] = useState(false);
    const [cncSettings, setCncSettings] = useState(() => ({
        eticket: { ...normalizeEticketSettings(DEFAULT_ETICKET_SETTINGS), printerConfigured: false }
    }));

    useEffect(() => {
        const controller = new AbortController();

        const loadMaterials = async () => {
            setMaterialLoadError("");
            try {
                const response = await axios.get("/api/materials/get", {
                    signal: controller.signal
                });
                setMaterialCatalog(
                    Array.isArray(response.data?.materials) ? response.data.materials : []
                );
            } catch (error) {
                if (error.code === "ERR_CANCELED") return;
                console.error("Materialien konnten nicht geladen werden", error);
                setMaterialCatalog([]);
                setMaterialLoadError("Kantenmaterialien konnten nicht geladen werden.");
            }
        };

        loadMaterials();
        return () => controller.abort();
    }, []);

    useEffect(() => {
        let isCurrentRequest = true;
        Promise.allSettled([
            getGlobalFile({
                file: "settings-cnc.json",
                loadFromServer: { download: downloadFile, path: "/api/settings/cnc" }
            }),
            axios.get("/api/etickets/settings")
        ]).then(([cncResult, eticketResult]) => {
            if (!isCurrentRequest) return;
            const data = cncResult.status === "fulfilled" ? cncResult.value : null;
            const publicEticket = eticketResult.status === "fulfilled" ? eticketResult.value.data : null;
            const source = publicEticket ?? data?.eticket ?? DEFAULT_ETICKET_SETTINGS;
            setCncSettings({
                ...(data ?? {}),
                eticket: {
                    ...normalizeEticketSettings(source),
                    printerConfigured: publicEticket?.printerConfigured ?? Boolean(data?.eticket?.printer?.host)
                }
            });
        });
        return () => {
            isCurrentRequest = false;
        };
    }, []);

    useEffect(() => {
        if (!projectId) return undefined;
        let isCurrentRequest = true;

        const loadProject = async () => {
            try {
                const loadedProject = await getProjectRecord(projectId);
                if (!isCurrentRequest) return;
                setProject(loadedProject);
                if (loadedProject?.customer) {
                    setCustomer(loadedProject.customer);
                } else if (loadedProject?.customerId) {
                    const response = await axios.get(`/api/customers/get/${loadedProject.customerId}`);
                    if (isCurrentRequest) setCustomer(response.data.customer ?? null);
                } else {
                    setCustomer(null);
                }
            } catch (error) {
                console.error("Projektinformationen für das Eticket konnten nicht geladen werden", error);
                if (isCurrentRequest) {
                    setProject(null);
                    setCustomer(null);
                }
            }
        };

        loadProject();
        return () => {
            isCurrentRequest = false;
        };
    }, [projectId]);

    useEffect(() => {
        if (!projectId) return undefined;

        let isCurrentRequest = true;
        setNestingResult(null);
        setActiveSheetIndex(0);
        setActiveStackIndex(0);
        setSelectedPart(null);
        setFinishedPartKeys(new Set());
        const loadGeneratedData = async () => {
            setLoadingGeneratedData(true);

            try {
                const data = await getProjectFile({
                    projectId,
                    file: "nesting.json",
                    loadFromServer: {
                        download: downloadFile,
                        path: `/api/projects/generated/${projectId}/nesting`
                    }
                });

                if (isCurrentRequest && data) {
                    setNestingResult(data);
                    setFinishedPartKeys(getFinishedPartKeys(data));
                }
            } catch (error) {
                console.error("Generated data konnte nicht geladen werden", error);
            } finally {
                if (isCurrentRequest) setLoadingGeneratedData(false);
            }
        };

        loadGeneratedData();
        return () => {
            isCurrentRequest = false;
        };
    }, [projectId]);

    const activeSheet = nestingResult?.[activeSheetIndex];
    const settings = activeSheet?.settings ?? {};
    const stacks = useMemo(
        () => getStripStacks(activeSheet?.strips ?? [], settings),
        [activeSheet, settings]
    );
    const activeStack = stacks[activeStackIndex] ?? null;
    const isDirect2DNesting = activeStack?.strips.some(
        ({ strip }) => strip.packingMode === "2d"
    ) ?? false;
    const selectedStripEntry = useMemo(() => {
        if (!activeStack || !selectedPart) return null;

        return activeStack.strips.find(({ strip, originalIndex }) => (
            selectedPart.stripOriginalIndex != null
                ? originalIndex === selectedPart.stripOriginalIndex
                : strip.id === selectedPart.stripId
        )) ?? null;
    }, [activeStack, selectedPart]);
    const displayedStripEntry = selectedStripEntry ?? activeStack?.strips[0] ?? null;
    const materialsByReference = useMemo(() => {
        const references = new Map();
        (materialCatalog ?? []).forEach((material) => {
            if (material.id) references.set(String(material.id), material);
            if (material.materialNumber) {
                references.set(String(material.materialNumber), material);
            }
        });
        return references;
    }, [materialCatalog]);
    const activeEticketData = selectedPart?.plate?.original?.PID
        ? createNestingEticketData({
            projectId,
            project,
            customer,
            plate: selectedPart.plate,
            productionPath: selectedStripEntry?.strip?.packingMode === "2d" ? "2d" : "1d"
        })
        : null;

    const getEdgeMaterialNumber = (reference) => {
        if (!reference) return "–";

        const normalizedReference = String(reference);
        const material = materialsByReference.get(normalizedReference);
        if (material) return material.materialNumber || material.name || "–";
        if (materialCatalog === null) return "Wird geladen …";
        return UUID_PATTERN.test(normalizedReference) ? "Material nicht gefunden" : normalizedReference;
    };

    const selectStripPart = (stripEntry, itemLayout, itemIndex) => {
        const { strip, originalIndex } = stripEntry;
        const { plate, width, height } = itemLayout;

        setSelectedPart({
            key: `${strip.id}-${plate.id ?? itemIndex}-${itemIndex}`,
            stripId: strip.id,
            stripOriginalIndex: originalIndex,
            plate,
            width,
            height
        });
    };

    const changeSheet = (index) => {
        setActiveSheetIndex(index);
        setActiveStackIndex(0);
        setSelectedPart(null);
        setShowEticket(false);
    };

    const changeStack = (index) => {
        setActiveStackIndex(index);
        setSelectedPart(null);
        setShowEticket(false);
    };

    const toggleSelectedPartFinished = async () => {
        if (!selectedPart?.key || selectedPart.plate.id == null || savingFinishedPart) return;

        const finished = !finishedPartKeys.has(selectedPart.key);
        const updatedResult = updatePlateFinishedTag(
            nestingResult,
            selectedPart.plate.id,
            finished
        );

        setSavingFinishedPart(true);
        setFinishedSaveError("");
        try {
            await uploadProjectFile({
                projectId,
                file: "nesting.json",
                data: updatedResult,
                uploadFunction: {
                    upload: uploadJSONFile,
                    path: `/api/projects/generated/${projectId}/nesting`
                }
            });

            setNestingResult(updatedResult);
            setFinishedPartKeys(getFinishedPartKeys(updatedResult));
        } catch (error) {
            console.error("Fertig-Status konnte nicht gespeichert werden", error);
            setFinishedSaveError("Fertig-Status konnte nicht gespeichert werden.");
        } finally {
            setSavingFinishedPart(false);
        }
    };

    return (
        <div className="bg-gray-900 text-white h-screen flex overflow-hidden">
            <SideBar selected={2} />
            <MobileWorkspaceGuard title="Zuschnittansicht" />

            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
                    <ProjectBar selected={5} />
                </div>

                <div className="relative flex-1 overflow-hidden">
                    <div data-tour="project-cut-sheets" className="absolute top-2 xl:top-4 left-2 xl:left-4 right-2 xl:right-4 z-20">
                        <div className="bg-gray-800/95 backdrop-blur border border-gray-700 rounded-xl shadow-xl p-2 xl:p-3">
                            <div className="flex items-center gap-2 xl:gap-3">
                                <div className="text-xs xl:text-sm text-gray-400 whitespace-nowrap">
                                    Hauptplatten
                                </div>
                                <div className="h-5 w-px bg-gray-700" />
                                <div className="flex gap-2 overflow-x-auto">
                                    {nestingResult?.map((sheetPlate, index) => {
                                        const isActive = index === activeSheetIndex;
                                        return (
                                            <button
                                                key={`${sheetPlate.MID}-${sheetPlate.T}-${index}`}
                                                onClick={() => changeSheet(index)}
                                                className={`flex items-center gap-2 xl:gap-3 px-2 xl:px-4 py-2 rounded-lg border transition-all duration-200 whitespace-nowrap ${isActive
                                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30"
                                                    : "bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white"
                                                    }`}
                                            >
                                                <span className="text-xs text-gray-400">#{index + 1}</span>
                                                <span className="font-medium text-sm">{sheetPlate.MID}</span>
                                                <span className="text-xs opacity-70">{sheetPlate.T} mm</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div data-tour="project-cut-stack" className="absolute top-20 xl:top-24 right-2 xl:right-4 z-20 flex w-[min(24rem,calc(100%-1rem))] flex-col gap-2 xl:gap-3">
                        <div className="flex items-center gap-1 xl:gap-3 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg px-2 xl:px-4 py-2 xl:py-3 shadow-lg">
                            <span className="rounded-lg border border-gray-700 bg-gray-900 px-2 xl:px-4 py-2 whitespace-nowrap text-gray-400 text-xs xl:text-sm">
                                Stapel {stacks.length ? activeStackIndex + 1 : 0} | {stacks.length}
                            </span>
                            <button
                                onClick={() => changeStack(Math.max(0, activeStackIndex - 1))}
                                disabled={activeStackIndex <= 0}
                                className="rounded-lg border border-gray-700 bg-gray-900 px-2 xl:px-4 py-2 whitespace-nowrap text-gray-400 transition hover:bg-gray-700 hover:text-white disabled:opacity-40 disabled:hover:bg-gray-900 disabled:hover:text-gray-400"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => changeStack(Math.min(stacks.length - 1, activeStackIndex + 1))}
                                disabled={activeStackIndex >= stacks.length - 1}
                                className="rounded-lg border border-gray-700 bg-gray-900 px-2 xl:px-4 py-2 whitespace-nowrap text-gray-400 transition hover:bg-gray-700 hover:text-white disabled:opacity-40 disabled:hover:bg-gray-900 disabled:hover:text-gray-400"
                            >
                                Next
                            </button>
                        </div>

                        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto rounded-lg border border-gray-700 bg-gray-800/90 px-2 py-2 shadow-lg backdrop-blur xl:px-4 xl:py-3">
                            <div className="text-xs text-gray-400">Bauteile im Strip</div>
                            {selectedStripEntry ? (
                                <>
                                    <div className="mt-1 text-sm font-semibold text-white xl:text-base">
                                        {selectedStripEntry.layout.items.length} Bauteile
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {selectedStripEntry.layout.items.map((itemLayout, itemIndex) => {
                                            const plate = itemLayout.plate;
                                            const origin = plate.original?.Herkunftsobjekt ?? plate.Herkunftsobjekt;
                                            const partKey = `${selectedStripEntry.strip.id}-${plate.id ?? itemIndex}-${itemIndex}`;
                                            const isSelected = selectedPart?.key === partKey;
                                            const isFinished = finishedPartKeys.has(partKey);

                                            return (
                                                <button
                                                    key={partKey}
                                                    type="button"
                                                    onClick={() => selectStripPart(selectedStripEntry, itemLayout, itemIndex)}
                                                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${isSelected
                                                        ? "border-blue-500 bg-blue-600/30"
                                                        : "border-gray-700 bg-gray-900 hover:border-gray-600 hover:bg-gray-700"
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-medium text-white">
                                                                <span>
                                                                    {plate.original?.Objektname ?? plate.Objektname ?? `Bauteil ${itemIndex + 1}`}
                                                                </span>
                                                                {origin && (
                                                                    <span className="ml-2 text-xs font-normal text-gray-400">
                                                                        ({origin})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-0.5 text-xs text-gray-400">
                                                                {itemLayout.width} × {itemLayout.height} mm
                                                            </div>
                                                        </div>
                                                        {isFinished && (
                                                            <span className="shrink-0 rounded bg-emerald-900/70 px-2 py-0.5 text-[11px] text-emerald-300">
                                                                Fertig
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {activeEticketData && (
                                        <button
                                            type="button"
                                            onClick={() => setShowEticket(true)}
                                            className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500"
                                        >
                                            Eticket drucken
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="mt-2 text-sm text-gray-400">
                                    Bauteil anklicken, um alle Bauteile des zugehörigen Strips anzuzeigen.
                                </div>
                            )}
                        </div>
                    </div>

                    <div data-tour="project-cut-part" className="absolute top-20 xl:top-24 left-2 xl:left-4 z-20 max-w-[min(24rem,calc(100%-1rem))]">
                        <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg px-2 xl:px-4 py-2 xl:py-3 shadow-lg max-h-[calc(100vh-12rem)] overflow-y-auto">
                            {activeStack ? (
                                <>
                                    <div className="text-xs text-gray-400 mb-1">
                                        {isDirect2DNesting ? "Bauteil-Stapel" : "Strip-Stapel"}
                                    </div>
                                    <div className="font-semibold text-white text-sm xl:text-lg">
                                        Außenbreite {activeStack.strips[0].strip.plates[0].originalWidth} mm
                                    </div>
                                    {displayedStripEntry && (
                                        <div className="mt-1 text-sm text-gray-300">
                                            Strip-Außenmaße {displayedStripEntry.width} × {displayedStripEntry.length} mm
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-400 mt-1">
                                        {activeStack.strips.length} {isDirect2DNesting ? "Bauteile" : "Strips"}, nach Länge sortiert
                                    </div>

                                    <div className="border-t border-gray-700 mt-3 pt-3">
                                        {selectedPart ? (
                                            <>
                                                <div className="text-xs text-blue-300 mb-1">Aktuelles Bauteil</div>
                                                <div className="font-semibold text-white text-sm xl:text-base">
                                                    {selectedPart.plate.original?.Objektname ?? selectedPart.plate.Objektname ?? "Bauteil"}
                                                </div>
                                                <div className="text-sm text-gray-300 mt-1">
                                                    {selectedPart.width} × {selectedPart.height} mm
                                                </div>
                                                {selectedPart.plate.original?.PID && (
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        PID: {selectedPart.plate.original.PID}
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-400 mt-2 space-y-1">
                                                    <div>Kante Oben: {getEdgeMaterialNumber(selectedPart.plate.EdgeT)}</div>
                                                    <div>Kante Rechts: {getEdgeMaterialNumber(selectedPart.plate.EdgeR)}</div>
                                                    <div>Kante Links: {getEdgeMaterialNumber(selectedPart.plate.EdgeL)}</div>
                                                    <div>Kante Unten: {getEdgeMaterialNumber(selectedPart.plate.EdgeB)}</div>
                                                </div>
                                                {materialLoadError && (
                                                    <div className="mt-2 text-xs text-amber-300">
                                                        {materialLoadError}
                                                    </div>
                                                )}
                                                {finishedSaveError && (
                                                    <div className="mt-2 text-xs text-red-300">
                                                        {finishedSaveError}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={toggleSelectedPartFinished}
                                                    disabled={savingFinishedPart}
                                                    className={`mt-3 w-full rounded border px-3 py-2 text-sm transition ${finishedPartKeys.has(selectedPart.key)
                                                        ? "border-gray-500 bg-gray-700 text-gray-200 hover:bg-gray-600"
                                                        : "border-emerald-600 bg-emerald-700 text-white hover:bg-emerald-600"
                                                        } disabled:cursor-wait disabled:opacity-60`}
                                                >
                                                    {savingFinishedPart
                                                        ? "Speichert …"
                                                        : finishedPartKeys.has(selectedPart.key)
                                                        ? "Als offen markieren"
                                                        : "Als fertig markieren"}
                                                </button>
                                            </>
                                        ) : (
                                            <div className="text-sm text-gray-400">
                                                Strip oder Bauteil anklicken, um die Informationen anzuzeigen.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm text-gray-400">
                                    {loadingGeneratedData
                                        ? "Nesting-Daten werden geladen …"
                                        : "Keine Strips für diese Hauptplatte vorhanden."}
                                </div>
                            )}
                        </div>
                    </div>

                    <div data-tour="project-cut-canvas" className="absolute inset-0">
                        <CutScene
                            key={`${activeSheetIndex}-${activeStackIndex}`}
                            stack={activeStack}
                            onSelectPart={setSelectedPart}
                            onBackgroundClick={() => setSelectedPart(null)}
                            selectedPartKey={selectedPart?.key}
                            finishedPartKeys={finishedPartKeys}
                            cncSettings={cncSettings}
                        />
                    </div>
                </div>
            </main>
            {showEticket && activeEticketData && (
                <EticketPrintDialog
                    ticket={activeEticketData}
                    configuredSettings={cncSettings.eticket}
                    onClose={() => setShowEticket(false)}
                />
            )}
        </div>
    );
}

export default CutingView;
