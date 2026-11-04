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
    from "./cncViewport.jsx";

import CncPropertiesSidebar
    from "./cncPropertiesSidebar.jsx";

import {
    groupCncParts
} from "@Engine/cnc/groupCncParts.js";
import {
    AVAILABLE_POSTPROCESSORS,
    DEFAULT_MACHINING_ASSIGNMENTS,
    generateCncMachineCode,
    translatePartForCncViewer
} from "@Engine/postprocessor/index.js";

import ProjectBar
    from "../../../shared/components/projectBar.jsx";

import SideBar
    from "../../../shared/components/sideBar.jsx";
import MobileWorkspaceGuard
    from "../../../shared/components/MobileWorkspaceGuard.jsx";
import {getProjectFile} from "../../../shared/cache/project-cache.js";
import {getGlobalFile} from "../../../shared/cache/global-cache.js";
import {downloadFile} from "../../../shared/api/file-api.js";

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

                    const data =
                        await getProjectFile({

                            projectId,

                            file: "list.json",

                            loadFromServer: { download: downloadFile, path: `/api/projects/generated/${projectId}/list` }

                        });


                    if (!data) {
                        return;
                    }

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


    /*
     * =====================================================
     * Maschinencode über den aktiven Postprozessor exportieren
     * =====================================================
     */

    const exportMachineProgram = () => {

        if (!selectedPart || !activePostprocessor || !activePostprocessorDescriptor?.capabilities?.machineCode) {
            return;
        }

        try {

            const result = generateCncMachineCode(
                activePostprocessor,
                {
                    part: selectedPart,
                    fileName: selectedPart.PID ?? selectedPart.Objektname,
                    assignments: machiningAssignments
                }
            );

            if (!result.supported || (result.content == null && result.code == null)) {

                const message = result.diagnostics
                    ?.filter(entry => entry.level === "error")
                    .map(entry => entry.message)
                    .join(" ");

                setExportNotice({
                    type: "error",
                    message: message || "Das Bauteil kann mit dem aktiven Postprozessor nicht exportiert werden."
                });

                return;

            }

            const artifact = result.content ?? result.code;
            const blob = new Blob(
                [artifact],
                {type: result.mimeType ?? "application/octet-stream"}
            );
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = result.fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(
                () => URL.revokeObjectURL(url),
                0
            );

            setExportNotice({
                type: "success",
                message: `${result.fileName} mit ${activePostprocessor.name} exportiert.`
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
                                                    gap-1
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
                                            onClick={() => selectedPart?.PID && navigate(`/Projects/Cnc/${projectId}/Edit/${encodeURIComponent(selectedPart.PID)}`)}
                                            disabled={!selectedPart?.PID}
                                            className="rounded border border-violet-700 bg-violet-950/40 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-900/60 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                                        >
                                            Bauteil bearbeiten
                                        </button>

                                        <button
                                            type="button"
                                            onClick={exportMachineProgram}
                                            disabled={!selectedPart || !activePostprocessorDescriptor?.capabilities?.machineCode}
                                            title={activePostprocessorDescriptor?.capabilities?.machineCode
                                                ? `Bauteil mit ${activePostprocessor.name} exportieren`
                                                : "Der aktive Postprozessor stellt keinen Maschinencode-Export bereit"
                                            }
                                            className="rounded border border-blue-700 bg-blue-900/40 px-3 py-1.5 text-xs font-medium text-blue-200 transition hover:bg-blue-800/60 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                                        >

                                            {activePostprocessorDescriptor?.sourceFormat ?? "Maschinencode exportieren"}

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

        </div>

    );

}
