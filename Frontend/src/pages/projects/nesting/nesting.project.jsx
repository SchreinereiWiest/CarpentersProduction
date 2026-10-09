import { useCallback, useRef, useState } from 'react'
import SideBar from '../../../components/sideBar.jsx';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";
import ProjectBar from '../../../components/projectBar.jsx';
import { loadCadFile } from '../cad/cadLoader.project.js';
import { processContent } from '../list/listProcess.project.js';
import { calculateNesting } from './algorythm/nestingAlgorythm.js';
import { findStorageMaterial } from './algorythm/helper/parseStorageMaterial.js';
import NestingScene from './nestingscene.project.jsx';
import { defaultSettings } from './algorythm/helper/defaults.js';
import {
    canPlaceStrip,
    configureStripPlacement
} from './algorythm/placement/manualStripPlacement.js';
import { createEmptyNestingPlate, nestStrips } from './algorythm/placement/nestingPlate.js';
import { placeStrip as placeStripOnNestingPlate } from './algorythm/placement/placeStrip.js';
import NestingSettingsModal from "./nestingSettingsModal.project.jsx"
import { TOUCH } from "three";

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {getProjectFile, uploadProjectFile} from "../../../services/projectMemoryCache.js";
import {downloadFile, uploadJSONFile} from "../../../services/apiTemplates.js";

function HorizontalPanControls({ controlsRef }) {
    const { camera, gl } = useThree();
    const touchPan = useRef(null);

    // Verschiebt Kamera und Ziel ausschließlich entlang der X-Achse.
    const panByPixels = useCallback((deltaX) => {
        const controls = controlsRef.current;
        if (!controls || !gl.domElement.clientWidth) return;

        const visibleWorldWidth = (camera.right - camera.left) / camera.zoom;
        const cameraDeltaX = -deltaX * visibleWorldWidth / gl.domElement.clientWidth;
        controls.target.x += cameraDeltaX;
        camera.position.x += cameraDeltaX;
        controls.update();
    }, [camera, controlsRef, gl]);

    // Ctrl + Mausziehen wird vor den R3F-Drag-Handlern als horizontales Pan verarbeitet.
    useEffect(() => {
        const element = gl.domElement;
        let mousePan = null;

        const handlePointerDown = (event) => {
            if (event.pointerType !== "mouse" || event.button !== 0 || !event.ctrlKey) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            mousePan = { pointerId: event.pointerId, lastX: event.clientX };
            element.setPointerCapture?.(event.pointerId);
        };

        const handlePointerMove = (event) => {
            if (!mousePan || mousePan.pointerId !== event.pointerId) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            panByPixels(event.clientX - mousePan.lastX);
            mousePan.lastX = event.clientX;
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

    // Touch-Pan beginnt auf der leeren Hintergrundfläche, damit Strip-Touches Drag bleiben.
    const startTouchPan = (event) => {
        const nativeEvent = event.nativeEvent;
        if (nativeEvent.pointerType !== "touch") return;
        event.stopPropagation();
        if (!nativeEvent.isPrimary) return;

        touchPan.current = { pointerId: nativeEvent.pointerId, lastX: nativeEvent.clientX };
        event.target.setPointerCapture?.(nativeEvent.pointerId);
    };

    const moveTouchPan = (event) => {
        const nativeEvent = event.nativeEvent;
        if (!touchPan.current || touchPan.current.pointerId !== nativeEvent.pointerId) return;

        event.stopPropagation();
        panByPixels(nativeEvent.clientX - touchPan.current.lastX);
        touchPan.current.lastX = nativeEvent.clientX;
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


function NestingView() {
    const navigate = useNavigate();
    const { projectId } = useParams();

    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);

    const [cadfiles, setcadfiles] = useState([]);
    const [content, setContent] = useState([]);
    const [processedContent, setProcessedContent] = useState();

    const [nestingResult, setNestingResult] = useState();

    const [loadingGeneratedData, setLoadingGeneratedData] = useState(false);
    const [loadingListData, setLoadingListData] = useState(false);

    const [settings, setSettings] = useState([defaultSettings]);
    const [showSettings, setShowSettings] = useState(false);
    const orbitControlsRef = useRef(null);

    async function loadStorageMaterials() {
        try {
            const response = await axios.get("/api/materials/get");
            const materials = Array.isArray(response.data?.materials)
                ? response.data.materials
                : [];
            return materials;
        } catch (error) {
            console.error("Storage-Materialien konnten nicht geladen werden", error);
            return [];
        }
    }

    const loadListData = async () => {

            setLoadingListData(true);

            try {

                const data =
                    await getProjectFile({

                        projectId,

                        file: "list.json",

                        loadFromServer: {download: downloadFile, path:`/api/projects/generated/${projectId}/list`}

                    });


                // Datei existiert bereits
                if (data) {
                    setProcessedContent(data);                       

                    return data;
                }

                //datei existiert nicht -> neu erstellen und hochladen
                console.warn("Keine datei vorhanden!");

            } catch (error) {

                console.error(
                    "Generated data konnte nicht geladen werden",
                    error
                );

            } finally {

                setLoadingListData(false);

            }

        };

    async function createdata(userSettings, materialCatalog) {
        if (!projectId) {
            return;
        }

        const processedData = await loadListData();

        if (!processedData) return;

        // 3. Wieder mit der lokalen Variable weiterarbeiten
        const materials = Array.isArray(materialCatalog)
            ? materialCatalog
            : await loadStorageMaterials();
        const nestingData = calculateNesting(processedData, userSettings, materials);
        nestingData.forEach((plate, index) => {
            setSettings(prev => {
                const newSettings = [...prev];

                newSettings[index] = {
                    ...newSettings[index],
                    ...plate.settings
                };
                return newSettings;
            });
        });
        
        setNestingResult(nestingData);


        return nestingData;
    }

    async function UploadData(materialCatalog) {
        // Datei existiert nicht
                const generatedData = await createdata(settings, materialCatalog);
                
                setNestingResult(generatedData);

                if (!generatedData) return;

                const response = await uploadProjectFile({
                
                    projectId,
        
                    file: "nesting.json",
        
                    data: generatedData,
                    
                    uploadFunction: {upload: uploadJSONFile, path:`/api/projects/generated/${projectId}/nesting`}
                });

            }

    async function saveNestingLayout() {
        if (!projectId || !nestingResult) return;

        try {
            await uploadProjectFile({
                projectId,
                file: "nesting.json",
                data: nestingResult,
                uploadFunction: {
                    upload: uploadJSONFile,
                    path: `/api/projects/generated/${projectId}/nesting`
                }
            });
        } catch (error) {
            console.error("Nesting-Layout konnte nicht gespeichert werden", error);
        }
    }

    //fetch project and customer data
    useEffect(() => {
        const fetchProject = async () => {
            const { data } = await axios.get(`/api/projects/get/${projectId}`);
            const projectData = data.project;
            setProject(data.project);

            const customerdata = await axios.get(`/api/customers/get/${data.project.customerId}`);
            setCustomer(customerdata.data.customer);

        };

        fetchProject();
    }, [projectId]);

    //fetch nesting json file
    useEffect(() => {

        if (!projectId) {
            return;
        }

        const loadGeneratedData = async () => {

            setLoadingGeneratedData(true);

            try {

                const materials = await loadStorageMaterials();

                const data =
                    await getProjectFile({

                        projectId,

                        file: "nesting.json",

                        loadFromServer: {download: downloadFile, path:`/api/projects/generated/${projectId}/nesting`}

                    });


                // Datei existiert bereits
                if (data) {

                    data.forEach((sheet) => {
                        const storageMaterial = findStorageMaterial(
                            sheet.MID,
                            sheet.T,
                            materials
                        );
                        sheet.storageMaterialFound = Boolean(storageMaterial);
                        sheet.storageMaterialFallback = !storageMaterial;
                        sheet.storageMaterialName = storageMaterial?.name ?? null;
                    });

                    setNestingResult(data);

                    setSettings(prev => {
                        const newSettings = [...prev];

                        data.forEach((sheet, index) => {
                            newSettings[index] = {
                                ...defaultSettings,
                                ...sheet.settings
                            };
                        });

                        return newSettings;
                    });

                    return;

                }

                //datei existiert nicht -> neu erstellen un hochladen
                await UploadData(materials);


            } catch (error) {

                console.error(
                    "Generated data konnte nicht geladen werden",
                    error
                );

            } finally {

                const processedData = await loadListData();

                if (!processedData) return;

                setContent(processedData);

                setLoadingGeneratedData(false);

            }


        };


        loadGeneratedData();

        

    }, [projectId, project]);


    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const activeSheet = nestingResult?.[activeSheetIndex];
    const activeSettingsForSheet = settings[activeSheetIndex] ?? activeSheet?.settings ?? defaultSettings;
    const isDirect2DNesting = activeSettingsForSheet.nestingMode === "2d";

    const [activeStrip, setActiveStrip] = useState(null);
    const [placementMessage, setPlacementMessage] = useState("");
    const activePoolStrip = activeSheet?.emptyStrips?.find(
        (strip) => strip.id === activeStrip?.id
    );
    const selectStrip = (strip) => {
        setActiveStrip(strip);
        setPlacementMessage("");
    };

    const removeStrip = (stripToRemove) => {
        setPlacementMessage("");
        const pooledStrip = {
            ...stripToRemove,
            cutOrientation: stripToRemove.cutOrientation ?? stripToRemove.type ?? "vertical",
            rotation: stripToRemove.rotation ?? 0
        };
        const activeSettings = settings[activeSheetIndex] ?? activeSheet?.settings ?? defaultSettings;
        setActiveStrip(pooledStrip);

        if (activeSettings.nestingMode === "2d") {
            // 2D erhält die Positionen der übrigen Teile und gibt nur den entfernten Footprint frei.
            setNestingResult((currentResult) =>
                currentResult?.map((sheet, index) => {
                    if (index !== activeSheetIndex) return sheet;

                    const removed = sheet.strips.find(
                        (candidate) => candidate.id === stripToRemove.id
                    );
                    if (!removed) return sheet;

                    const nestingPlates = (sheet.nestingPlates ?? []).map((plate) => {
                        if (plate.id !== removed.sheet) return plate;

                        const restoredSpace = {
                            sheet: plate.id,
                            x: removed.x,
                            y: removed.y,
                            width: removed.placedWidth,
                            height: removed.placedHeight
                        };
                        const alreadyFree = (plate.freeSpaces ?? []).some((space) => (
                            space.x === restoredSpace.x &&
                            space.y === restoredSpace.y &&
                            space.width === restoredSpace.width &&
                            space.height === restoredSpace.height
                        ));

                        return {
                            ...plate,
                            strips: (plate.strips ?? []).filter(
                                (candidate) => candidate.id !== removed.id
                            ),
                            plates: (plate.plates ?? []).filter(
                                (part) => part.placementId !== removed.id
                            ),
                            freeSpaces: alreadyFree
                                ? plate.freeSpaces
                                : [...(plate.freeSpaces ?? []), restoredSpace]
                        };
                    });

                    return {
                        ...sheet,
                        strips: sheet.strips.filter(
                            (candidate) => candidate.id !== removed.id
                        ),
                        nestingPlates,
                        emptyStrips: [...(sheet.emptyStrips ?? []), pooledStrip]
                    };
                })
            );
            return;
        }

        // 1D legt nach dem Entfernen die übrigen Strips weiterhin neu.
        setNestingResult((currentResult) =>
            currentResult?.map((sheet, index) => {
                if (index !== activeSheetIndex) return sheet;

                const strip = sheet.strips.find(
                    (candidate) => candidate.id === stripToRemove.id
                );
                if (!strip) return sheet;

                const activeSettings = settings[index] ?? sheet.settings ?? defaultSettings;
                const remainingStrips = sheet.strips
                    .filter((candidate) => candidate.id !== stripToRemove.id)
                    .map((candidate) => ({
                        ...candidate,
                        layoutType: candidate.layoutType ?? candidate.type,
                        cutOrientation: candidate.cutOrientation ?? candidate.type
                    }));
                const nestingPlates = nestStrips(
                    remainingStrips,
                    activeSettings.defaultSheet,
                    activeSettings
                )
                    .filter((nestingPlate) => nestingPlate.strips.length > 0)
                    .map((nestingPlate, id) => ({
                        ...nestingPlate,
                        id,
                        strips: nestingPlate.strips.map((placedStrip) => ({
                            ...placedStrip,
                            sheet: id
                        })),
                        plates: (nestingPlate.plates ?? []).map((placedPlate) => ({
                            ...placedPlate,
                            sheet: id
                        })),
                        freeSpaces: nestingPlate.freeSpaces.map((space) => ({
                            ...space,
                            sheet: id
                        })),
                        cuts: (nestingPlate.cuts ?? []).map((cut) => ({
                            ...cut,
                            sheet: id
                        }))
                    }));
                const placedStripIds = new Set(
                    nestingPlates.flatMap((nestingPlate) =>
                        nestingPlate.strips.map((placedStrip) => placedStrip.id)
                    )
                );
                const unplacedStrips = remainingStrips.filter(
                    (candidate) => !placedStripIds.has(candidate.id)
                );

                const pooledStrip = {
                    ...strip,
                    layoutType: strip.layoutType ?? strip.type,
                    cutOrientation: strip.cutOrientation ?? strip.type ?? "vertical",
                    rotation: strip.rotation ?? 0
                };

                const nextNestingPlates = nestingPlates.length > 0
                    ? nestingPlates
                    : [createEmptyNestingPlate(activeSettings.defaultSheet, activeSettings, 0)];

                return {
                    ...sheet,
                    strips: nextNestingPlates.flatMap((nestingPlate) => nestingPlate.strips),
                    nestingPlates: nextNestingPlates,
                    emptyStrips: [...(sheet.emptyStrips ?? []), pooledStrip, ...unplacedStrips]
                };
            })
        );
    };

    const updatePoolStripPlacement = (option, value) => {
        // Rotation verändert die Geometrie; Schnittlage bleibt davon unabhängig.
        if (!activePoolStrip) return;

        const options = {
            cutOrientation: option === "cutOrientation"
                ? value
                : activePoolStrip.cutOrientation ?? activePoolStrip.type,
            rotation: option === "rotation" ? value : activePoolStrip.rotation ?? 0
        };
        const configuredStrip = configureStripPlacement(activePoolStrip, options, settings[activeSheetIndex]);

        setNestingResult((currentResult) =>
            currentResult?.map((sheet, index) => {
                if (index !== activeSheetIndex) return sheet;
                return {
                    ...sheet,
                    emptyStrips: (sheet.emptyStrips ?? []).map((strip) =>
                        strip.id === configuredStrip.id ? configuredStrip : strip
                    )
                };
            })
        );
        setPlacementMessage("");
        setActiveStrip(configuredStrip);
    };

    const placePoolStrip = (stripId, placement) => {
        // Prüft den manuellen Drop und legt bei Bedarf die neue Platte dauerhaft an.
        const poolStrip = activeSheet?.emptyStrips?.find((strip) => strip.id === stripId);
        const existingTargetPlate = activeSheet?.nestingPlates?.find(
            (plate) => plate.id === placement.sheet
        );
        const activeSettings = settings[activeSheetIndex] ?? defaultSettings;
        const targetPlate = existingTargetPlate ?? (
            placement.createNewPlate
                ? createEmptyNestingPlate(activeSettings.defaultSheet, activeSettings, placement.sheet)
                : null
        );
        const sourceNestingPlates = existingTargetPlate
            ? activeSheet.nestingPlates
            : targetPlate
                ? [...(activeSheet?.nestingPlates ?? []), targetPlate]
                : [];
        const targetSpace = targetPlate?.freeSpaces?.find(
            (space) => space.x === placement.x && space.y === placement.y
        );

        if (
            !poolStrip ||
            !targetPlate ||
            !targetSpace ||
            poolStrip.placedWidth > targetSpace.width ||
            poolStrip.placedHeight > targetSpace.height ||
            !canPlaceStrip(targetPlate, poolStrip, placement.x, placement.y, activeSettings.cutGap)
        ) {
            setPlacementMessage("Dort ist nicht genug freie Fläche für diesen Strip.");
            return false;
        }

        const placedStrip = {
            ...poolStrip,
            sheet: targetPlate.id,
            x: placement.x,
            y: placement.y
        };

        const nestingPlates = sourceNestingPlates.map((plate) => ({
            ...plate,
            strips: [...(plate.strips ?? [])],
            plates: [...(plate.plates ?? [])],
            cuts: [...(plate.cuts ?? [])],
            freeSpaces: [...(plate.freeSpaces ?? [])]
        }));
        const availableSpaces = nestingPlates.flatMap((plate) => plate.freeSpaces);
        const placeSpace = availableSpaces.find(
            (space) => space.sheet === targetPlate.id && space.x === placement.x && space.y === placement.y
        );

        placeStripOnNestingPlate(
            placedStrip,
            { x: placement.x, y: placement.y, space: placeSpace },
            nestingPlates,
            availableSpaces,
            activeSettings
        );

        for (const plate of nestingPlates) {
            plate.freeSpaces = availableSpaces.filter((space) => space.sheet === plate.id);
        }

        setNestingResult((currentResult) =>
            currentResult?.map((sheet, index) => {
                if (index !== activeSheetIndex) return sheet;

                return {
                    ...sheet,
                    strips: [...sheet.strips, placedStrip],
                    emptyStrips: (sheet.emptyStrips ?? []).filter((strip) => strip.id !== stripId),
                    nestingPlates
                };
            })
        );
        setPlacementMessage("");
        setActiveStrip(null);
        return true;
    };

    // console.log(content);

    return (
    <div className="bg-gray-900 text-white h-screen flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={4} />
        </div>

            {/* Content-Bereich */} <div className="relative flex-1 overflow-hidden"> {/* Navigation der Hauptplatten
                */} <div className="absolute xl:top-4 top-2 xl:left-4 left-2 xl:right-4 right-2 z-20">
                    <div className="bg-gray-800/95 backdrop-blur border border-gray-700 rounded-xl shadow-xl xl:p-3 p-2">
                        <div className="flex items-center xl:gap-3 gap-2">
                            <div className="xl:text-sm text-xs text-gray-400 whitespace-nowrap"> Hauptplatten </div>
                            <div className="flex gap-2 overflow-x-auto"> {nestingResult?.map( (sheetPlate, index) => {
                                const
                                isActive = index === activeSheetIndex; return ( <button key={index} onClick={()=> {
                                    setActiveSheetIndex(index);
                                    setActiveStrip(null);
                                    setPlacementMessage("");
                                }} className={` flex items-center xl:gap-3 gap-2 xl:px-4 px-2 xl:py-2 py-1
                                    rounded-lg border transition-all duration-200 whitespace-nowrap ${ isActive ?
                                    "bg-blue-600 border-blue-500 text-white xl:shadow-lg shadow-md shadow-blue-900/30" : "bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white" } `} > <span
                                        className="text-xs text-gray-400"> #{index + 1}
                                    </span>
                                    <span
                                        className="font-medium xl:text-md text-sm"
                                        title={sheetPlate.storageMaterialFallback
                                            ? "Storage-Material nicht gefunden; Standard-Plattenmaße werden verwendet"
                                            : "Plattenmaße aus dem Storage"}
                                    >
                                        {sheetPlate.MID}{sheetPlate.storageMaterialFallback ? "*" : ""}
                                    </span> #
                                    <span className="text-xs opacity-70"> {sheetPlate.T} mm </span>
                                </button> ); } )}
                            </div>
                        </div>
                    </div>

                </div>

                {activeSheet && ( <div className="absolute xl:top-24 xl:left-4 top-17 left-2 z-20">
                    <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg xl:px-4 px-2 py-3 shadow-lg">
                        <div className="text-xs text-gray-400 mb-1"> Aktive Hauptplatte </div>
                        <div className="font-semibold text-white xl:text-md text-sm"> Platte #{activeSheetIndex + 1} </div>
                        <div className="xl:text-sm text-xs text-gray-400 mt-1"> {activeSheet.MID} </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500"> <span>
                                {activeSheet.nestingPlates?.length ?? 0} {""}Nesting-Platten </span>
                            <span> {activeSheet.strips?.length ?? 0} {isDirect2DNesting ? "Bauteile" : "Strips"} </span>
                            <span> {activeSheet.emptyStrips?.length ?? 0} im Pool </span>
                        </div>
                    </div>
                </div> )}

                {activeStrip && ( <div className="absolute xl:top-56 xl:left-4 top-47 left-2 z-20">
                    <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg xl:px-4 px-2 py-3 shadow-lg">
                        <div className="text-gray-400 mb-1"><span className="xl:text-sm text-xs">{isDirect2DNesting ? "Aktives Bauteil" : "Aktiver Strip"}</span> <span className="ml-8 font-semibold text-white xl:text-l text-sm">{activeStrip.id}</span></div>
                        <div className="font-semibold text-white xl:text-lg text-sm"> {activeStrip.placedWidth} x {activeStrip.placedHeight} </div>
                        {activeStrip?.plates?.map((plate, index) => (
                        <div className="flex gap-4 mt-2 xl:text-lm text-sm text-gray-500" key={plate.id}> <span> {plate.originalWidth} x {plate.originalHeight} | {plate.original.Objektname} </span> </div>
                        ))}
                        {!isDirect2DNesting && (
                            <div className="text-gray-500 xl:text-lm text-sm pt-1"> Rest: {activeStrip.remainingHeight} </div>
                        )}
                        {activePoolStrip && (
                            <div className="mt-3 space-y-2 text-xs">
                                <div>
                                    <div className="mb-1 text-gray-400">Schnittlage auf der Nesting-Platte</div>
                                    <div className="flex gap-2">
                                        {["vertical", "horizontal"].map((orientation) => (
                                            <button
                                                key={orientation}
                                                onClick={() => updatePoolStripPlacement("cutOrientation", orientation)}
                                                className={`rounded border px-2 py-1 ${activePoolStrip.cutOrientation === orientation || (!activePoolStrip.cutOrientation && activePoolStrip.type === orientation) ? "border-blue-500 bg-blue-600 text-white" : "border-gray-700 bg-gray-900 text-gray-400 hover:text-white"}`}
                                            >
                                                {orientation === "vertical" ? "Vertikal" : "Horizontal"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 text-gray-400">{isDirect2DNesting ? "Bauteil-Drehung" : "Strip-Drehung"}</div>
                                    <div className="flex gap-2">
                                        {[0, 90].map((rotation) => (
                                            <button
                                                key={rotation}
                                                onClick={() => updatePoolStripPlacement("rotation", rotation)}
                                                className={`rounded border px-2 py-1 ${Number(activePoolStrip.rotation ?? 0) === rotation ? "border-blue-500 bg-blue-600 text-white" : "border-gray-700 bg-gray-900 text-gray-400 hover:text-white"}`}
                                            >
                                                {rotation}°
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {placementMessage && <div className="text-amber-300">{placementMessage}</div>}
                            </div>
                        )}
                    </div>

                </div> )}

                <div className="absolute xl:top-24 top-17 right-4 z-20">
    <div className="
        flex
        items-center
        xl:gap-3 gap-2
        bg-gray-800/90
        backdrop-blur
        border
        border-gray-700
        rounded-lg
        xl:px-4 px-2
        xl:py-3 py-1
        shadow-lg
    ">

        <button
            onClick={() => setShowSettings(true)}
            className="
                flex
                items-center
                xl:gap-3 gap-2
                rounded-lg
                border
                border-gray-700
                bg-gray-900
                xl:px-4 px-2
                xl:py-2 py-1
                whitespace-nowrap
                text-gray-400
                transition-all
                duration-200
                hover:bg-gray-700
                hover:text-white
            "
        >
            Einstellungen
        </button>

        <button
            className="flex items-center rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 whitespace-nowrap text-gray-400 transition hover:bg-gray-700 hover:text-white"
            onClick={saveNestingLayout}
        >
            Speichern
        </button>

        <button
            className="
                flex
                items-center
                xl:gap-3 gap-2
                rounded-lg
                border
                border-gray-700
                bg-gray-900
                xl:px-4 px-2
                xl:py-2 py-1
                whitespace-nowrap
                text-gray-400
                transition-all
                duration-200
                hover:bg-gray-700
                hover:text-white
            "
            onClick={UploadData}
        >
            <span className="xl:font-medium">
                Neu berechnen
            </span>
        </button>

    </div>
</div>

                {( <div className="absolute xl:top-44 top-30 right-4 z-20">
                    <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg xl:px-4 px-2 xl:py-3 py-1 shadow-lg">
                        <div className="text-gray-400 mb-1"><span className="text-sm"> Legende: </span> </div>
                        
                        {content?.map((list, index) => (
                            
                        <div className="flex gap-4 xl:mt-2 mt-1 xl:text-lm text-sm text-white" key={list.PID}> 
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded-sm"
                                    style={{ backgroundColor: list.color }}
                                />

                                <span>
                                    {list.Objektname}
                                </span>
                            </div>
                        </div>
                        ))}
                    </div>

                </div> )}

                {showSettings && (

                    <NestingSettingsModal
                        settings={settings[activeSheetIndex]}
                        activeSheet={activeSheetIndex}
                        setSettings={setSettings}
                        onClose={() => setShowSettings(false)}
                    />

                )}

                <div className="absolute inset-0">
                    <Canvas orthographic camera={{ zoom: 6, position: [0, 0, 2] }}>
                        <group scale={[0.01,-0.01,0.01]} position={[-75, 9,0]}>
                            <NestingScene result={activeSheet} setActiveStrip={selectStrip}
                                activeStrip={activeStrip}
                                settings={settings[activeSheetIndex] ?? defaultSettings}
                                onRemoveStrip={removeStrip}
                                onPlaceStrip={placePoolStrip}
                                onInvalidPlacement={() => setPlacementMessage("Dort ist nicht genug freie Fläche für diesen Strip.")}/>
                        </group>

                        <OrbitControls
    ref={orbitControlsRef}
    enableRotate={false}
    enablePan={false}
    enableZoom={true}
    touches={{
        ONE: TOUCH.ROTATE,
        TWO: TOUCH.DOLLY_PAN,
    }}
/>
                        <HorizontalPanControls controlsRef={orbitControlsRef} />

                    </Canvas>

                </div>
            </div>

    </main>

</div>);
}
export default NestingView
