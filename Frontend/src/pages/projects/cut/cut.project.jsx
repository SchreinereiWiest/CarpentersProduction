import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useParams } from "react-router";
import SideBar from "../../../components/sideBar.jsx";
import ProjectBar from "../../../components/projectBar.jsx";
import { getProjectFile, uploadProjectFile } from "../../../services/projectMemoryCache.js";
import { downloadFile, uploadJSONFile } from "../../../services/apiTemplates.js";
import CutScene from "./cutScene.project.jsx";
import { getStripLayout } from "../nesting/algorythm/placement/manualStripPlacement.js";

function PanControls({ controlsRef, onBackgroundClick }) {
    const { camera, gl } = useThree();
    const touchPan = useRef(null);

    const panByPixels = useCallback((deltaX, deltaY) => {
        const controls = controlsRef.current;
        if (!controls || !gl.domElement.clientWidth || !gl.domElement.clientHeight) return;

        const visibleWorldWidth = (camera.right - camera.left) / camera.zoom;
        const visibleWorldHeight = (camera.top - camera.bottom) / camera.zoom;
        const cameraDeltaX = -deltaX * visibleWorldWidth / gl.domElement.clientWidth;
        const cameraDeltaY = deltaY * visibleWorldHeight / gl.domElement.clientHeight;
        controls.target.x += cameraDeltaX;
        controls.target.y += cameraDeltaY;
        camera.position.x += cameraDeltaX;
        camera.position.y += cameraDeltaY;
        controls.update();
    }, [camera, controlsRef, gl]);

    useEffect(() => {
        const element = gl.domElement;
        let mousePan = null;

        const handlePointerDown = (event) => {
            if (event.pointerType !== "mouse" || event.button !== 0 || !event.ctrlKey) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            mousePan = {
                pointerId: event.pointerId,
                lastX: event.clientX,
                lastY: event.clientY
            };
            element.setPointerCapture?.(event.pointerId);
        };

        const handlePointerMove = (event) => {
            if (!mousePan || mousePan.pointerId !== event.pointerId) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            panByPixels(
                event.clientX - mousePan.lastX,
                event.clientY - mousePan.lastY
            );
            mousePan.lastX = event.clientX;
            mousePan.lastY = event.clientY;
        };

        const finishMousePan = (event) => {
            if (!mousePan || mousePan.pointerId !== event.pointerId) return;

            event.preventDefault();
            element.releasePointerCapture?.(event.pointerId);
            mousePan = null;
        };

        element.addEventListener("pointerdown", handlePointerDown, true);
        element.addEventListener("pointermove", handlePointerMove, true);
        element.addEventListener("pointerup", finishMousePan, true);
        element.addEventListener("pointercancel", finishMousePan, true);

        return () => {
            element.removeEventListener("pointerdown", handlePointerDown, true);
            element.removeEventListener("pointermove", handlePointerMove, true);
            element.removeEventListener("pointerup", finishMousePan, true);
            element.removeEventListener("pointercancel", finishMousePan, true);
        };
    }, [gl, panByPixels]);

    const startTouchPan = (event) => {
        const nativeEvent = event.nativeEvent;
        if (nativeEvent.pointerType !== "touch") return;
        event.stopPropagation();
        if (!nativeEvent.isPrimary) return;

        touchPan.current = {
            pointerId: nativeEvent.pointerId,
            lastX: nativeEvent.clientX,
            lastY: nativeEvent.clientY
        };
        event.target.setPointerCapture?.(nativeEvent.pointerId);
    };

    const moveTouchPan = (event) => {
        const nativeEvent = event.nativeEvent;
        if (!touchPan.current || touchPan.current.pointerId !== nativeEvent.pointerId) return;

        event.stopPropagation();
        panByPixels(
            nativeEvent.clientX - touchPan.current.lastX,
            nativeEvent.clientY - touchPan.current.lastY
        );
        touchPan.current.lastX = nativeEvent.clientX;
        touchPan.current.lastY = nativeEvent.clientY;
    };

    const finishTouchPan = (event) => {
        const nativeEvent = event.nativeEvent;
        if (!touchPan.current || touchPan.current.pointerId !== nativeEvent.pointerId) return;

        event.stopPropagation();
        event.target.releasePointerCapture?.(nativeEvent.pointerId);
        touchPan.current = null;
    };

    return (
        <mesh
            position={[0, 0, -50]}
            onClick={(event) => {
                event.stopPropagation();
                onBackgroundClick?.();
            }}
            onPointerDown={startTouchPan}
            onPointerMove={moveTouchPan}
            onPointerUp={finishTouchPan}
            onPointerCancel={finishTouchPan}
        >
            <planeGeometry args={[100000, 100000]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
    );
}

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
    const orbitControlsRef = useRef(null);

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

    const changeSheet = (index) => {
        setActiveSheetIndex(index);
        setActiveStackIndex(0);
        setSelectedPart(null);
    };

    const changeStack = (index) => {
        setActiveStackIndex(index);
        setSelectedPart(null);
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

    console.log(activeStack);

    return (
        <div className="bg-gray-900 text-white h-screen flex overflow-hidden">
            <SideBar selected={2} />

            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
                    <ProjectBar selected={5} />
                </div>

                <div className="relative flex-1 overflow-hidden">
                    <div className="absolute top-2 xl:top-4 left-2 xl:left-4 right-2 xl:right-4 z-20">
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
                                                className={`flex items-center gap-2 xl:gap-3 px-2 xl:px-4 py-1 xl:py-2 rounded-lg border transition-all duration-200 whitespace-nowrap ${isActive
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

                    <div className="absolute top-17 xl:top-24 right-2 xl:right-4 z-20">
                        <div className="flex items-center gap-1 xl:gap-3 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg px-2 xl:px-4 py-1 xl:py-3 shadow-lg">
                            <span className="rounded-lg border border-gray-700 bg-gray-900 px-2 xl:px-4 py-1 xl:py-2 whitespace-nowrap text-gray-400 text-xs xl:text-sm">
                                Stapel {stacks.length ? activeStackIndex + 1 : 0} | {stacks.length}
                            </span>
                            <button
                                onClick={() => changeStack(Math.max(0, activeStackIndex - 1))}
                                disabled={activeStackIndex <= 0}
                                className="rounded-lg border border-gray-700 bg-gray-900 px-2 xl:px-4 py-1 xl:py-2 whitespace-nowrap text-gray-400 transition hover:bg-gray-700 hover:text-white disabled:opacity-40 disabled:hover:bg-gray-900 disabled:hover:text-gray-400"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => changeStack(Math.min(stacks.length - 1, activeStackIndex + 1))}
                                disabled={activeStackIndex >= stacks.length - 1}
                                className="rounded-lg border border-gray-700 bg-gray-900 px-2 xl:px-4 py-1 xl:py-2 whitespace-nowrap text-gray-400 transition hover:bg-gray-700 hover:text-white disabled:opacity-40 disabled:hover:bg-gray-900 disabled:hover:text-gray-400"
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    <div className="absolute top-17 xl:top-24 left-2 xl:left-4 z-20 max-w-[min(24rem,calc(100%-1rem))]">
                        <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg px-2 xl:px-4 py-2 xl:py-3 shadow-lg max-h-[calc(100vh-12rem)] overflow-y-auto">
                            {activeStack ? (
                                <>
                                    <div className="text-xs text-gray-400 mb-1">
                                        {isDirect2DNesting ? "Bauteil-Stapel" : "Strip-Stapel"}
                                    </div>
                                    <div className="font-semibold text-white text-sm xl:text-lg">
                                        Außenbreite {activeStack.strips[0].strip.plates[0].originalWidth} mm
                                    </div>
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
                                                    <div>Kante Oben: {selectedPart.plate.EdgeT || "–"}</div>
                                                    <div>Kante Rechts: {selectedPart.plate.EdgeR || "–"}</div>
                                                    <div>Kante Links: {selectedPart.plate.EdgeL || "–"}</div>
                                                    <div>Kante Unten: {selectedPart.plate.EdgeB || "–"}</div>
                                                </div>
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

                    <div className="absolute inset-0">
                        <Canvas
                            orthographic
                            camera={{ zoom: 25, position: [0, 0, 20] }}
                            onPointerMissed={() => setSelectedPart(null)}
                        >
                            <CutScene
                                stack={activeStack}
                                onSelectPart={setSelectedPart}
                                selectedPartKey={selectedPart?.key}
                                finishedPartKeys={finishedPartKeys}
                            />
                            <OrbitControls
                                ref={orbitControlsRef}
                                enableRotate={false}
                                enablePan={false}
                                enableZoom
                            />
                            <PanControls
                                controlsRef={orbitControlsRef}
                                onBackgroundClick={() => setSelectedPart(null)}
                            />
                        </Canvas>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default CutingView;
