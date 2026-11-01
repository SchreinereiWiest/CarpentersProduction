import React, {
    useEffect,
    useState
} from "react";

import axios from "axios";

import {
    useLocation,
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
    generateCncMachineCode
} from "@Engine/postprocessor/index.js";

import ProjectBar
    from "../../../shared/components/projectBar.jsx";

import SideBar
    from "../../../shared/components/sideBar.jsx";
import MobileWorkspaceGuard
    from "../../../shared/components/MobileWorkspaceGuard.jsx";
import {getProjectFile} from "../../../shared/cache/project-cache.js";
import {getGlobalFile} from "../../../shared/cache/global-cache.js";
import {downloadFile, uploadJSONFile} from "../../../shared/api/file-api.js";

const XILOG3_POSTPROCESSOR_ID = "scm-xilog3-routolink";


export default function CncEditor() {

    const {
        projectId
    } = useParams();


    const [partList, setPartList] =
        useState([]);


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
        xilogPostprocessor,
        setXilogPostprocessor
    ] = useState(null);

    const [
        exportNotice,
        setExportNotice
    ] = useState(null);

    const operations =
        Array.isArray(
            selectedPart?.CNC?.operations
        )
            ? selectedPart.CNC.operations
            : [];


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

                    setPartList(
                            data
                        );


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
     * Xilog-Postprozessor laden
     * =====================================================
     */

    useEffect(() => {

        const loadXilogPostprocessor = async () => {

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
                const configured = active?.pluginId === XILOG3_POSTPROCESSOR_ID && active.enabled !== false
                    ? active
                    : instances.find(item => (
                        item.pluginId === XILOG3_POSTPROCESSOR_ID &&
                        item.enabled !== false
                    ));

                setXilogPostprocessor(configured ?? null);

            } catch (error) {

                console.error(
                    "Xilog-Postprozessor konnte nicht geladen werden:",
                    error
                );

                setXilogPostprocessor(null);

            }

        };

        loadXilogPostprocessor();

    }, []);


    /*
     * =====================================================
     * Xilog-XXL exportieren
     * =====================================================
     */

    const exportXilogProgram = () => {

        if (!selectedPart || !xilogPostprocessor) {
            return;
        }

        try {

            const result = generateCncMachineCode(
                xilogPostprocessor,
                {
                    part: selectedPart,
                    fileName: selectedPart.PID ?? selectedPart.Objektname
                }
            );

            if (!result.supported || !result.code) {

                const message = result.diagnostics
                    ?.filter(entry => entry.level === "error")
                    .map(entry => entry.message)
                    .join(" ");

                setExportNotice({
                    type: "error",
                    message: message || "Das Bauteil kann noch nicht als Xilog-Programm exportiert werden."
                });

                return;

            }

            const blob = new Blob(
                [result.code],
                {type: "text/plain;charset=windows-1252"}
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
                message: `${result.fileName} exportiert. Vor der Produktion in Xilog 3 importieren und grafisch prüfen.`
            });

        } catch (error) {

            console.error(
                "Xilog-Export fehlgeschlagen:",
                error
            );

            setExportNotice({
                type: "error",
                message: "Der Xilog-Export ist fehlgeschlagen."
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
                                            onClick={exportXilogProgram}
                                            disabled={!selectedPart || !xilogPostprocessor}
                                            title={xilogPostprocessor
                                                ? "Bauteil als Xilog-3-XXL exportieren"
                                                : "Xilog-3-Postprozessor zuerst in den Firmeneinstellungen hinzufügen und aktivieren"
                                            }
                                            className="rounded border border-blue-700 bg-blue-900/40 px-3 py-1.5 text-xs font-medium text-blue-200 transition hover:bg-blue-800/60 disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                                        >

                                            Xilog XXL

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
                                                selectedPart
                                            }

                                            selectedOperationId={
                                                selectedOperation?.id
                                            }

                                            onSelectPart={
                                                handleSelectPart
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
                                        selectedPart
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
