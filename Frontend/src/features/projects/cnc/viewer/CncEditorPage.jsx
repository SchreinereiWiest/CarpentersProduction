import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useNavigate,
    useParams
} from "react-router";

import CncPartSidebar
    from "./cncPartsSidebar.jsx";

import CncViewport
    from "../shared/cncViewport.jsx";

import CncPropertiesSidebar
    from "./cncPropertiesSidebar.jsx";

import {
    groupCncParts
} from "@Engine/cnc/groupCncParts.js";
import {
    expandCncMachiningVariants,
    getStoredCncVariantHeader,
    updateCncMachiningVariantHeader
} from "@Engine/cnc/machiningVariants.js";
import {
    getCncPartKey,
    storePartCncHeaderInCabinet
} from "@Engine/cabinet/cnc/manualPrograms.js";
import {
    AVAILABLE_POSTPROCESSORS,
    DEFAULT_MACHINING_ASSIGNMENTS,
    generateCncMachineCode,
    resolveCncProgramHeader,
    translatePartForCncViewer
} from "@Engine/postprocessor/index.js";
import CncCodeDialog from "./CncCodeDialog.jsx";
import ProgramHeaderDialog from "../editor/ProgramHeaderDialog.jsx";
import { updatePartByKey } from "../editor/manualCncModel.js";
import { createZipArchive } from "../shared/cncArchive.js";
import {
    getPartMachineCodeFaces,
    resolveMachineCodeFace
} from "../shared/machineCodeFaces.js";

import ProjectBar
    from "../../../../shared/components/projectBar.jsx";

import SideBar
    from "../../../../shared/components/sideBar.jsx";
import MobileWorkspaceGuard
    from "../../../../shared/components/MobileWorkspaceGuard.jsx";
import {getProjectFile, uploadProjectFile} from "../../../../shared/cache/project-cache.js";
import {getGlobalFile} from "../../../../shared/cache/global-cache.js";
import {downloadFile, uploadJSONFile} from "../../../../shared/api/file-api.js";

const createViewerFallback = () => ({
    id: "builtin-legacy-viewer",
    pluginId: "legacy-viewer-bridge",
    name: "CNC Viewer",
    enabled: true,
    configuration: {}
});


export default function CncEditor() {

    const {
        projectId
    } = useParams();

    const navigate = useNavigate();


    const [groups, setGroups] =
        useState([]);


    const [
        selectedGroupId,
        setSelectedGroupId
    ] = useState(null);


    const [
        selectedPart,
        setSelectedPart
    ] = useState(null);


    const [
        selectedOperation,
        setSelectedOperation
    ] = useState(null);

    const [
        activePostprocessor,
        setActivePostprocessor
    ] = useState(createViewerFallback);

    const [machiningAssignments, setMachiningAssignments] = useState(DEFAULT_MACHINING_ASSIGNMENTS);

    const [
        exportNotice,
        setExportNotice
    ] = useState(null);
    const [codeResult, setCodeResult] = useState(null);
    const [partList, setPartList] = useState(null);
    const [cabinets, setCabinets] = useState([]);
    const [headerDraft, setHeaderDraft] = useState(null);
    const [headerSaving, setHeaderSaving] = useState(false);

    const viewerResult = useMemo(() => {
        if (!selectedPart || !activePostprocessor) {
            return { operations: [], diagnostics: [] };
        }
        try {
            return translatePartForCncViewer(activePostprocessor, {
                part: selectedPart,
                assignments: machiningAssignments
            });
        } catch (error) {
            return {
                operations: [],
                diagnostics: [{ level: "error", code: "VIEWER_TRANSLATION_FAILED", message: error.message }]
            };
        }
    }, [activePostprocessor, machiningAssignments, selectedPart]);

    const operations = useMemo(
        () => Array.isArray(viewerResult.operations) ? viewerResult.operations : [],
        [viewerResult]
    );

    const viewerPart = useMemo(() => selectedPart
        ? {
            ...selectedPart,
            CNC: {
                ...(selectedPart.CNC ?? {}),
                operations
            }
        }
        : null, [operations, selectedPart]);

    const activePostprocessorDescriptor = AVAILABLE_POSTPROCESSORS.find(
        item => item.id === activePostprocessor?.pluginId
    ) ?? null;
    const resolvedProgramHeader = useMemo(() => {
        if (!selectedPart || !activePostprocessor) return null;
        try {
            return resolveCncProgramHeader(activePostprocessor, { part: selectedPart });
        } catch {
            return null;
        }
    }, [activePostprocessor, selectedPart]);
    const allParts = useMemo(() => groups.flatMap(group => group.parts ?? []), [groups]);


    const faceAOperations =
        operations.filter(
            operation =>
                (
                    operation.face ??
                    "A"
                ) === "A"
        );


    const faceBOperations =
        operations.filter(
            operation =>
                (
                    operation.face ??
                    "A"
                ) === "B"
        );

    const [
        selectedFace,
        setSelectedFace
    ] = useState("A");


    /*
     * =====================================================
     * Aktuelle Gruppe
     * =====================================================
     */

    const selectedGroup =
        groups.find(
            group =>
                group.id ===
                selectedGroupId
        ) ?? null;


    /*
     * =====================================================
     * Bauteil auswählen
     *
     * Beim Wechsel des Bauteils wird die vorherige
     * Operationsauswahl gelöscht.
     * =====================================================
     */

    const handleSelectPart = (
        part
    ) => {

        setSelectedPart(
            part
        );

        setSelectedOperation(
            null
        );

        setExportNotice(
            null
        );
        setCodeResult(null);

    };


    /*
     * =====================================================
     * Operation auswählen
     * =====================================================
     */

    const handleSelectOperation = (
        operation
    ) => {

        setSelectedOperation(
            operation
        );

    };


    /*
     * =====================================================
     * Gruppe wechseln
     *
     * Operation und Bauteil zurücksetzen.
     * =====================================================
     */

    const handleSelectGroup = (
        groupId
    ) => {

        setSelectedGroupId(
            groupId
        );


        setSelectedOperation(
            null
        );

        setExportNotice(
            null
        );
        setCodeResult(null);


        const group =
            groups.find(
                candidate =>
                    candidate.id ===
                    groupId
            );


        if (
            group?.parts?.length
        ) {

            setSelectedPart(
                group.parts[0]
            );

        } else {

            setSelectedPart(
                null
            );

        }

    };


    /*
     * =====================================================
     * PartList laden
     * =====================================================
     */

    //fetch list .json from server and set partList and groups
    useEffect(() => {

        if (
            !projectId
        ) {
            return;
        }


        const loadPartList =
            async () => {

                try {

                    const [data, cabinetData] = await Promise.all([
                        getProjectFile({
                            projectId,
                            file: "list.json",
                            loadFromServer: { download: downloadFile, path: `/api/projects/generated/${projectId}/list` }
                        }),
                        getProjectFile({
                            projectId,
                            file: "cabinet.json",
                            loadFromServer: { download: downloadFile, path: `/api/projects/generated/${projectId}/cabinet` }
                        })
                    ]);


                    if (!data) {
                        return;
                    }

                    setPartList(data);
                    setCabinets(Array.isArray(cabinetData) ? cabinetData : []);

                    const grouped =
                        groupCncParts(
                            data
                        );


                    setGroups(
                        grouped
                    );


                    /*
                        * Erste Gruppe auswählen
                        */

                    if (
                        grouped.length > 0
                    ) {

                        const firstGroup =
                            grouped[0];


                        setSelectedGroupId(
                            firstGroup.id
                        );

                        /*
                         * Erstes Bauteil auswählen
                         */

                        if (
                            firstGroup.parts?.length > 0
                        ) {

                            setSelectedPart(
                                firstGroup.parts[0]
                            );

                        } else {

                            setSelectedPart(
                                null
                            );

                        }

                    } else {

                        setSelectedGroupId(
                            null
                        );

                        setSelectedPart(
                            null
                        );

                    }


                    setSelectedOperation(
                        null
                    );


                    return;



                } catch (error) {

                    console.error(
                        "PartList konnte nicht geladen werden:",
                        error
                    );

                }

            };


        loadPartList();

    }, [
        projectId
    ]);


    /*
     * =====================================================
     * Aktiven Postprozessor laden
     * =====================================================
     */

    useEffect(() => {

        const loadActivePostprocessor = async () => {

            try {

                const settings = await getGlobalFile({

                    file: "settings-cnc.json",

                    loadFromServer: {
                        download: downloadFile,
                        path: "/api/settings/cnc"
                    }

                });

                const instances = Array.isArray(settings?.postprocessors)
                    ? settings.postprocessors
                    : [];
                const active = instances.find(
                    item => item.id === settings?.activePostprocessorId
                );
                const configured = active?.enabled !== false
                    ? active
                    : instances.find(item => item.enabled !== false);

                setActivePostprocessor(configured ?? createViewerFallback());
                setMachiningAssignments({
                    ...DEFAULT_MACHINING_ASSIGNMENTS,
                    ...(settings?.cncDefault?.machiningAssignments ?? settings?.machiningAssignments ?? {})
                });

            } catch (error) {

                console.error(
                    "Aktiver Postprozessor konnte nicht geladen werden:",
                    error
                );

                setActivePostprocessor(createViewerFallback());

            }

        };

        loadActivePostprocessor();

    }, []);

    const currentProgramHeader = useMemo(() => selectedPart?.CNC?.header ?? ({
        stopId: activePostprocessor?.configuration?.workingFields ?? "A",
        edgeAtStop: "front",
        sx: false,
        sy: false,
        comment: ""
    }), [activePostprocessor, selectedPart]);

    const persistProgramHeader = async effectiveHeader => {
        if (!partList || !selectedPart) return false;

        const cabinetId = selectedPart._cncCabinetId ?? selectedPart._cabinetId;
        const parentCabinet = cabinets.find(cabinet => String(cabinet.id) === String(cabinetId));
        if (!parentCabinet) {
            setExportNotice({ type: "error", message: "Der Elternkorpus des Bauteils konnte nicht ermittelt werden." });
            return false;
        }

        setHeaderSaving(true);
        setExportNotice(null);

        try {
            const variant = selectedPart._cncMachiningVariant ?? null;
            const storedHeader = getStoredCncVariantHeader(effectiveHeader, variant);
            const basePartKey = getCncPartKey(selectedPart);
            const updatedList = updatePartByKey(partList, basePartKey, cabinetId, current =>
                updateCncMachiningVariantHeader(current, variant?.id, effectiveHeader)
            );
            const headerPart = variant
                ? {
                    ...selectedPart,
                    PID: variant.partId ?? selectedPart.PID,
                    _generatedId: variant.generatedId ?? selectedPart._generatedId,
                    _cabinetId: variant.cabinetId ?? cabinetId
                }
                : selectedPart;
            const updatedCabinet = storePartCncHeaderInCabinet(parentCabinet, headerPart, storedHeader);
            const updatedCabinets = cabinets.map(cabinet =>
                String(cabinet.id) === String(cabinetId) ? updatedCabinet : cabinet
            );

            await Promise.all([
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

            const nextGroups = groupCncParts(updatedList);
            const nextGroup = nextGroups.find(group => group.parts.some(part => part.PID === selectedPart.PID));
            const nextSelectedPart = nextGroup?.parts.find(part => part.PID === selectedPart.PID) ?? null;

            setPartList(updatedList);
            setCabinets(updatedCabinets);
            setGroups(nextGroups);
            setSelectedGroupId(nextGroup?.id ?? null);
            setSelectedPart(nextSelectedPart);
            setCodeResult(null);
            setExportNotice({ type: "success", message: "CNC-Header gespeichert." });
            return true;
        } catch (error) {
            console.error("CNC-Header konnte nicht gespeichert werden:", error);
            setExportNotice({ type: "error", message: "Der CNC-Header konnte nicht gespeichert werden." });
            return false;
        } finally {
            setHeaderSaving(false);
        }
    };


    /*
     * =====================================================
     * Maschinencode über den aktiven Postprozessor exportieren
     * =====================================================
     */

    const generatePartCode = (part, face = "A") => generateCncMachineCode(
        activePostprocessor,
        {
            part,
            face,
            fileName: part.PID ?? part.Objektname,
            assignments: machiningAssignments
        }
    );

    const showSelectedPartCode = () => {
        if (!selectedPart || !activePostprocessorDescriptor?.capabilities?.machineCode) return;
        try {
            const face = resolveMachineCodeFace(activePostprocessorDescriptor, selectedFace);
            const result = generatePartCode(selectedPart, face);
            if (!result.supported || (result.content == null && result.code == null)) {
                const message = result.diagnostics?.filter(entry => entry.level === "error").map(entry => entry.message).join(" ");
                setExportNotice({ type: "error", message: message || "Der Postprozessor konnte keinen Code für dieses Bauteil erzeugen." });
                return;
            }
            setCodeResult(result);
        } catch (error) {
            console.error("Codeansicht konnte nicht erzeugt werden:", error);
            setExportNotice({ type: "error", message: "Die Codeansicht konnte nicht erzeugt werden." });
        }
    };

    const exportMachineProgram = () => {

        if (!allParts.length || !activePostprocessor || !activePostprocessorDescriptor?.capabilities?.machineCode) {
            return;
        }

        try {

            const exportParts = allParts.flatMap(expandCncMachiningVariants);
            const generated = exportParts.flatMap(part => getPartMachineCodeFaces(part, activePostprocessorDescriptor)
                .map(face => ({ part, face, result: generatePartCode(part, face) })));
            const failed = generated.filter(({ result }) => !result.supported || (result.content == null && result.code == null));

            if (failed.length) {
                const message = failed.flatMap(({ part, face, result }) => result.diagnostics
                    ?.filter(entry => entry.level === "error")
                    .map(entry => `${part.PID ?? part.Objektname} · Seite ${face}: ${entry.message}`) ?? []).join(" ");

                setExportNotice({
                    type: "error",
                    message: message || `${failed.length} Bauteile können mit dem aktiven Postprozessor nicht exportiert werden.`
                });

                return;

            }

            const usedNames = new Set();
            const files = generated.map(({ result }) => {
                const originalName = result.fileName ?? "PROGRAM.DAT";
                const dot = originalName.lastIndexOf(".");
                const base = dot > 0 ? originalName.slice(0, dot) : originalName;
                const extension = dot > 0 ? originalName.slice(dot) : "";
                let name = originalName;
                let suffix = 2;
                while (usedNames.has(name.toLowerCase())) {
                    name = `${base}_${suffix}${extension}`;
                    suffix += 1;
                }
                usedNames.add(name.toLowerCase());
                return { name, data: result.content ?? result.code, encoding: result.encoding };
            });
            const blob = createZipArchive(files);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `cnc-${String(projectId ?? "projekt").replace(/[^A-Za-z0-9_-]/g, "_")}.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(
                () => URL.revokeObjectURL(url),
                0
            );

            setExportNotice({
                type: "success",
                message: `${files.length} CNC-Programmdateien mit ${activePostprocessor.name} als ZIP exportiert.`
            });

        } catch (error) {

            console.error(
                "Maschinencode-Export fehlgeschlagen:",
                error
            );

            setExportNotice({
                type: "error",
                message: "Der Export über den aktiven Postprozessor ist fehlgeschlagen."
            });

        }

    };


    return (

        <div className="
            bg-gray-900
            text-white
            h-screen
            flex
            overflow-hidden
        ">

            {/* =================================================
             * Linke Hauptnavigation
             * ================================================= */}

            <SideBar
                selected={2}
            />

            <MobileWorkspaceGuard title="CNC-Editor" />


            <main className="
                flex-1
                flex
                flex-col
                min-w-0
                overflow-hidden
            ">


                {/* =================================================
                 * ProjectBar
                 * ================================================= */}

                <div className="
                    shrink-0
                    bg-gray-900
                    border-b
                    border-gray-700
                ">

                    <ProjectBar
                        selected={6}
                    />

                </div>


                {/* =================================================
                 * CNC Bereich
                 * ================================================= */}

                <div className="
                    flex-1
                    min-h-0
                ">

                    <div className="
                        grid
                        h-full
                        min-h-0
                        grid-cols-[280px_minmax(0,1fr)]
                    ">


                        {/* =================================================
                         * Bauteil-/Gruppensidebar
                         * ================================================= */}

                        <CncPartSidebar

                            groups={
                                groups
                            }

                            selectedGroupId={
                                selectedGroupId
                            }

                            setSelectedGroupId={
                                handleSelectGroup
                            }

                            selectedPart={
                                selectedPart
                            }

                            setSelectedPart={
                                handleSelectPart
                            }

                        />


                        {/* =================================================
                         * Hauptbereich
                         * ================================================= */}

                        <main className="
                            min-w-0
                            min-h-0
                            grid
                            grid-rows-[minmax(0,1fr)_minmax(0,1fr)]
                            bg-gray-900
                        ">


                            {/* =================================================
                             * Viewport
                             * ================================================= */}

                            <section className="
                                min-w-0
                                min-h-0
                                flex
                                flex-col
                                overflow-hidden
                                border-b
                                border-gray-700
                            ">


                                <div className="
                                    h-14
                                    shrink-0
                                    border-b
                                    border-gray-700
                                    bg-gray-900
                                    flex
                                    items-center
                                    gap-2
                                    px-3
                                ">



                                    {/* =================================================
                                                 * Seiten A / B
                                                 * ================================================= */}

                                    <div className="
                                                    
                                                    top-3
                                                    left-3
                                                    z-10
                                                    flex
                                                    items-center
                                                    gap-1
                                                    overflow-x-auto
                                                    rounded-lg
                                                    border
                                                    border-gray-700
                                                    bg-gray-900
                                                    p-1
                                                ">

                                        <button
                                            type="button"

                                            onClick={() =>
                                                setSelectedFace(
                                                    "A"
                                                )
                                            }

                                            className={`
                                                            rounded
                                                            px-3
                                                            py-1.5
                                                            text-xs
                                                            font-medium
                                                            transition
                                    
                                                            ${selectedFace === "A"
                                                    ? "bg-blue-600 text-white"
                                                    : "text-gray-400 hover:bg-gray-800"
                                                }
                                                        `}
                                        >

                                            Seite A

                                            <span className="ml-1 text-gray-400">

                                                ({faceAOperations.length})

                                            </span>

                                        </button>


                                        <button
                                            type="button"

                                            onClick={() =>
                                                setSelectedFace(
                                                    "B"
                                                )
                                            }

                                            className={`
                                                            rounded
                                                            px-3
                                                            py-1.5
                                                            text-xs
                                                            font-medium
                                                            transition
                                    
                                                            ${selectedFace === "B"
                                                    ? "bg-blue-600 text-white"
                                                    : "text-gray-400 hover:bg-gray-800"
                                                }
                                                        `}
                                        >

                                            Seite B

                                            <span className="ml-1 text-gray-400">

                                                ({faceBOperations.length})

                                            </span>

                                        </button>

                                        {resolvedProgramHeader && <>
                                            <span className="ml-2 whitespace-nowrap text-[11px] text-gray-400">
                                                Anschlag <span className="font-semibold text-emerald-300">{resolvedProgramHeader.stopLabel}</span> · {resolvedProgramHeader.cornerLabel} · {resolvedProgramHeader.edgeAtStop === "back" ? "Rücken" : "Frontkante"}
                                            </span>
                                            <button type="button" disabled={headerSaving} onClick={() => void persistProgramHeader({ ...currentProgramHeader, sx: currentProgramHeader.sx !== true })} className={`rounded border px-2 py-1 text-[11px] font-semibold disabled:opacity-50 ${currentProgramHeader.sx ? "border-emerald-500 bg-emerald-900/50 text-emerald-300" : "border-gray-700 bg-gray-900 text-gray-500"}`}>SX</button>
                                            <button type="button" disabled={headerSaving} onClick={() => void persistProgramHeader({ ...currentProgramHeader, sy: currentProgramHeader.sy !== true })} className={`rounded border px-2 py-1 text-[11px] font-semibold disabled:opacity-50 ${currentProgramHeader.sy ? "border-emerald-500 bg-emerald-900/50 text-emerald-300" : "border-gray-700 bg-gray-900 text-gray-500"}`}>SY</button>
                                            <button type="button" disabled={headerSaving} onClick={() => setHeaderDraft({ ...currentProgramHeader })} className="whitespace-nowrap rounded border border-emerald-900 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-950/50 disabled:opacity-50">Header ändern</button>
                                            {resolvedProgramHeader.comment && <span className="max-w-40 truncate text-[10px] text-gray-600" title={resolvedProgramHeader.comment}>{resolvedProgramHeader.comment}</span>}
                                            {headerSaving && <span className="whitespace-nowrap text-[10px] text-amber-300">Speichert…</span>}
                                        </>}

                                    </div>


                                    {
                                        selectedPart && (

                                            <div className="
                                                ml-2
                                                text-xs
                                                text-gray-500
                                            ">

                                                {selectedPart.Objektname}

                                            </div>

                                        )
                                    }

                                    <div className="ml-auto flex items-center gap-3">

                                        {
                                            exportNotice && (

                                                <div className={`max-w-xl text-xs ${exportNotice.type === "error"
                                                    ? "text-red-400"
                                                    : "text-amber-300"
                                                }`}>

                                                    {exportNotice.message}

                                                </div>

                                            )
                                        }

                                        <button
                                            type="button"
                                            onClick={showSelectedPartCode}
                                            disabled={!selectedPart || !activePostprocessorDescriptor?.capabilities?.machineCode}
                                            className="rounded border border-emerald-800 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                                        >
                                            Code ansehen
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const editablePid = selectedPart?._cncBasePid ?? selectedPart?.PID;
                                                if (editablePid) navigate(`/Projects/Cnc/${projectId}/Edit/${encodeURIComponent(editablePid)}`);
                                            }}
                                            disabled={!selectedPart?.PID}
                                            className="rounded border border-violet-700 bg-violet-950/40 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-900/60 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                                        >
                                            Bauteil bearbeiten
                                        </button>

                                        <button
                                            type="button"
                                            onClick={exportMachineProgram}
                                            disabled={!allParts.length || !activePostprocessorDescriptor?.capabilities?.machineCode}
                                            title={activePostprocessorDescriptor?.capabilities?.machineCode
                                                ? `Alle ${allParts.length} Bauteile mit ${activePostprocessor.name} als ZIP exportieren`
                                                : "Der aktive Postprozessor stellt keinen Maschinencode-Export bereit"
                                            }
                                            className="rounded border border-blue-700 bg-blue-900/40 px-3 py-1.5 text-xs font-medium text-blue-200 transition hover:bg-blue-800/60 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                                        >

                                            Alle Programme als ZIP

                                        </button>

                                    </div>

                                </div>


                                <div className="
                                    flex-1
                                    min-h-0
                                ">

                                    <div className="
                                        relative
                                        h-full
                                        w-full
                                        overflow-hidden
                                    ">

                                        <CncViewport

                                            part={
                                                viewerPart
                                            }

                                            selectedOperationId={
                                                selectedOperation?.id
                                            }

                                            onSelectPart={
                                                () => handleSelectPart(selectedPart)
                                            }

                                            onSelectOperation={
                                                handleSelectOperation
                                            }

                                            operations={operations}


                                            selectedFace={
                                                selectedFace
                                            }

                                            programHeader={resolvedProgramHeader}


                                        />

                                    </div>

                                </div>

                            </section>


                            {/* =================================================
                             * Eigenschaften
                             * ================================================= */}

                            <section className="
                                min-w-0
                                min-h-0
                                overflow-hidden
                            ">

                                <CncPropertiesSidebar

                                    part={
                                        viewerPart
                                    }

                                    group={
                                        selectedGroup
                                    }

                                    selectedOperation={
                                        selectedOperation
                                    }

                                    onSelectOperation={
                                        handleSelectOperation
                                    }

                                />

                            </section>


                        </main>

                    </div>

                </div>

            </main>

            {codeResult && <CncCodeDialog
                part={selectedPart}
                postprocessor={activePostprocessor}
                result={codeResult}
                onClose={() => setCodeResult(null)}
            />}
            {headerDraft && <ProgramHeaderDialog
                header={headerDraft}
                locations={activePostprocessorDescriptor?.machiningLocations ?? []}
                onChange={setHeaderDraft}
                onCancel={() => setHeaderDraft(null)}
                onSave={async () => {
                    if (await persistProgramHeader(headerDraft)) setHeaderDraft(null);
                }}
            />}

        </div>

    );

}
