import React, {useState, useEffect, useRef} from "react";
import { useLocation, useParams } from "react-router";
import CabinetViewport from "./components/view/cabinetViewport.jsx";
import ProjectBar from '../../../components/projectBar.jsx';
import SideBar from '../../../components/sideBar.jsx';
import { createInitialSections } from "./engine/sektions/interior/createInitialSections.js"
import { generateFronts } from "./engine/sektions/front/generateFronts.js"
import { splitFront } from "./engine/sektions/front/splitFront.js";
import { splitSection } from "./engine/sektions/splitSections.js";
import { mergeSectionChildren, findSection, findParent } from "./engine/sektions/interior/mergeSectionChildren.js";
import { frontsToSections } from "./engine/sektions/functions/parseFrontSections.js";
import { findFrontParent, mergeFrontChildren } from "./engine/sektions/front/mergeFrontChildren.js";
import CabinetSidebar from "./components/editor/sidebar/CabinetSidebar.jsx";
import PropertiesSidebar from "./components/editor/properties/PropertiesSidebar.jsx";
import { ProjectSave } from "./engine/projectSave.js";
import { buildPartList } from "./engine/partList/buildPartList.js";
import { useNavigate } from 'react-router';
import {getProjectFile} from "../../../services/projectMemoryCache.js";
import {downloadFile, uploadJSONFile} from "../../../services/apiTemplates.js";
import { getGlobalFile, uploadGlobalFile } from "../../../services/globalMemoryCache.js";
import axios from "axios";
import { DEFAULT_CNC } from "./engine/cnc/cncDefaults.js";
import CabinetPresetModal from "./components/editor/CabinetPresetModal.jsx";
import { useAuth } from "../../../routes/AuthContext.jsx";


export function createId() {
        return Date.now() + Math.random();
    }

function cloneCabinetWithFreshIds(cabinet) {
    const idMap = new Map();

    const cloneValue = (value) => {
        if (Array.isArray(value)) {
            return value.map(cloneValue);
        }

        if (value && typeof value === "object") {
            return Object.fromEntries(
                Object.entries(value).map(([key, nestedValue]) => {
                    if (key === "id" && nestedValue != null) {
                        const newId = createId();
                        idMap.set(nestedValue, newId);
                        return [key, newId];
                    }

                    return [key, cloneValue(nestedValue)];
                })
            );
        }

        return value;
    };

    const remapReferences = (value) => {
        if (Array.isArray(value)) {
            value.forEach(remapReferences);
            return;
        }

        if (!value || typeof value !== "object") {
            return;
        }

        Object.entries(value).forEach(([key, nestedValue]) => {
            if (key.endsWith("Id") && idMap.has(nestedValue)) {
                value[key] = idMap.get(nestedValue);
                return;
            }

            remapReferences(nestedValue);
        });
    };

    const clone = cloneValue(cabinet);
    remapReferences(clone);
    return clone;
}


export default function CabinetEditor() {

    // conmstant Section alle Editor daten
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const isAdmin = !authLoading && user?.role === "admin";

    const { projectId } = useParams();
    const { userId } = useParams();
    const location = useLocation();

    const cadData = location.state?.cadData;

    let mode = location.state?.mode !== "create"
        ? "edit"
        : "create";

    if(userId) {mode="create";}

    const [selectedCustomer, setSelectedCustomer] = useState(
    location.state?.selectedCustomer ?? null
    );

    const [files, setFiles] = useState(
        location.state?.files ?? []
    );

    const [projectDescription, setProjectDescription] =
    useState(
        location.state?.projectDescription ?? ""
    );

    const [projectName, setProjectName] =
    useState(
        location.state?.projectName ?? ""
    );

    const [materials, setMaterials] = useState([]);

    const [loadingMaterials, setLoadingMaterials] = useState(false);

    const [materialError, setMaterialError] = useState(null);

    const [project, setProject] = useState();

    const [viewMode, setViewMode] = useState("interior");

    const [sectionCount, setSectionCount] = useState(1);

    const [cabinets, setCabinets] = useState([]);

    const [cabinetPresets, setCabinetPresets] = useState([]);

    const [presetEditorCabinet, setPresetEditorCabinet] = useState(null);

    const [showPresetInsertModal, setShowPresetInsertModal] = useState(false);

    const [selectedPresetId, setSelectedPresetId] = useState("");

    const [activeCabinetId, setActiveCabinetId] = useState();

    const activeCabinet = cabinets.find(
        cabinet =>
            cabinet.id === activeCabinetId
    );

    const [frontSplitSpec, setFrontSplitSpec] = useState("1:1");
    const [frontSplitDirection, setFrontSplitDirection] = useState("vertical");

    const [sectionSplitSpec, setSectionSplitSpec] = useState("1:1");
    const [sectionSplitDirection, setSectionSplitDirection] = useState("vertical");

    const [saving, setSaving] = useState(false);
    const [loadingGeneratedData, setLoadingGeneratedData] = useState(false);
    const [showAbsoluteSaveWarning, setShowAbsoluteSaveWarning] = useState(false);
    const longPressTimer = useRef(null);
    const suppressSaveClick = useRef(false);

    useEffect(() => () => clearTimeout(longPressTimer.current), []);

    const [defaultConfig, setDefaultConfig] = useState(DEFAULT_CNC);

    const [defaultCabinet, setDefaultCabinet] = useState({

    width: 600,
    height: 720,
    depth: 535,
    quantity: 1,

    thickness: 19,

    topOffset: 0,
    bottomOffset: 0,

    topExists: true,
    bottomExists: true,

    frontGap: 3,

    frontGapLeft: 0,
    frontGapRight: 0,
    frontGapTop: 0,
    frontGapBottom: 0,

    backPanel: {
        construction: "butt",
        continuous: "side"
    },

    spax: true,

    partListSettings: {
        grouping: "cabinet",

        separate: {
            fronts: false,
            shelves: false,
            middleWalls: false,
            legrabox: false
    }
},


    sections: [],
    fronts: []
});

    const addCabinet = () => {

    const newCabinet = {
    id: createId(),

    name:
        `Korpus ${cabinets.length + 1}`,

    ...defaultCabinet
};


    setCabinets(
        prev => [
            ...prev,
            newCabinet
        ]

    );

    selectCabinet(newCabinet.id);
    };

    const duplicateCabinet = (cabinetId) => {
        const sourceCabinet = cabinets.find(
            cabinet => cabinet.id === cabinetId
        );

        if (!sourceCabinet) {
            return;
        }

        const duplicate = cloneCabinetWithFreshIds(sourceCabinet);
        duplicate.name = `${sourceCabinet.name || "Korpus"} (Kopie)`;
        duplicate.quantity = 1;

        setCabinets(prev => [...prev, duplicate]);
        setActiveCabinetId(duplicate.id);
        setSectionCount(duplicate.sections?.length ?? 1);
        setSelectedElement(null);
    };

    const [selectedElement, setSelectedElement] = useState(null);

    const createAvailableSection = (
    cabinet
) => {

    const thickness =
        Number(cabinet.thickness) || 0;

    const width =
        Number(cabinet.width) || 0;

    const height =
        Number(cabinet.height) || 0;

    const topOffset =
        Number(
            cabinet.topOffset ?? 0
        );

    const bottomOffset =
        Number(
            cabinet.bottomOffset ?? 0
        );

    const topExists =
        cabinet.topExists ?? true;

    const bottomExists =
        cabinet.bottomExists ?? true;


    /*
     * Oberkante der verfügbaren Section
     */

    const sectionTop =
        topOffset +
        (
            topExists
                ? thickness
                : 0
        );


    /*
     * Unterkante der verfügbaren Section
     */

    const sectionBottom =
        height -
        bottomOffset -
        (
            bottomExists
                ? thickness
                : 0
        );


    const sectionHeight =
        sectionBottom -
        sectionTop;


    if (
        width <= 2 * thickness ||
        sectionHeight <= 0
    ) {
        return null;
    }


    return {

        id:
            createId(),

        type:
            "section",

        parentId:
            null,

        name:
            "Section 1",

        x:
            thickness,

        y:
            sectionTop,

        width:
            width -
            2 * thickness,

        height:
            sectionHeight,

        functionType:
            "none",

        functionConfig:
            {},

        children:
            []
    };
    };

    const updateCabinetLayout = (
    changes
) => {

    setCabinets(
        prev =>
            prev.map(
                cabinet => {

                    if (
                        cabinet.id !==
                        activeCabinetId
                    ) {
                        return cabinet;
                    }


                    const updatedCabinet = {
                        ...cabinet,
                        ...changes
                    };


                    const newSection =
                        createAvailableSection(
                            updatedCabinet
                        );


                    return {
                        ...updatedCabinet,

                        sections:
                            newSection
                                ? [newSection]
                                : []
                    };

                }
            )
    );

    setSectionCount(1);
    setSelectedElement(null);
    };

    const saveCabinetPresets = async nextPresets => {
        await uploadGlobalFile({
            file: "settings-cabinetPreset.json",
            data: nextPresets,
            uploadFunction: {
                upload: uploadJSONFile,
                path: "/api/settings/cabinetPreset"
            }
        });

        setCabinetPresets(nextPresets);
    };

    const saveCabinetAsPreset = cabinet => {
        if (!isAdmin) return;
        setPresetEditorCabinet({ cabinet, presetId: null });
    };

    const handleSaveCabinetPreset = async ({ name, cabinet }) => {
        const presetId = presetEditorCabinet?.presetId;
        const nextPresets = presetId
            ? cabinetPresets.map(preset => preset.id === presetId
                ? { ...preset, name, cabinet }
                : preset)
            : [...cabinetPresets, {
                id: createId(),
                name,
                cabinet
            }];

        await saveCabinetPresets(nextPresets);
        setPresetEditorCabinet(null);
    };

    const insertSelectedCabinetPreset = () => {
        const preset = cabinetPresets.find(item => String(item.id) === String(selectedPresetId));
        if (!preset?.cabinet) return;

        const cabinet = cloneCabinetWithFreshIds(preset.cabinet);
        cabinet.name = preset.name || "Korpus aus Preset";
        cabinet.quantity = 1;

        setCabinets(previous => [...previous, cabinet]);
        setActiveCabinetId(cabinet.id);
        setSectionCount(cabinet.sections?.length ?? 1);
        setSelectedElement(null);
        setShowPresetInsertModal(false);
    };

    const updateActiveCabinet = (
        changesOrUpdater
    ) => {

        setCabinets(prev =>

            prev.map(cabinet => {

                if (
                    cabinet.id !== activeCabinetId
                ) {
                    return cabinet;
                }


                const changes =
                    typeof changesOrUpdater === "function"
                        ? changesOrUpdater(cabinet)
                        : changesOrUpdater;


                return {
                    ...cabinet,
                    ...changes
                };
            })
        );
    };

    const updateCabinetQuantity = (cabinetId, quantity) => {
        setCabinets(prev => prev.map(cabinet =>
            cabinet.id === cabinetId
                ? { ...cabinet, quantity }
                : cabinet
        ));
    };

    const selectCabinet = (id) => {

        setActiveCabinetId(id);

        const cabinet = cabinets.find(cabinet => cabinet.id === id);

        setSectionCount(cabinet?.sections?.length ?? 1);

        setSelectedElement(null);
    };

    const deleteCabinet = () => {

        if (cabinets.length <= 1) {
            return;
        }

        const index = cabinets.findIndex(
            cabinet => cabinet.id === activeCabinetId
        );

        const remainingCabinets = cabinets.filter(
            cabinet => cabinet.id !== activeCabinetId
        );

        setCabinets(remainingCabinets);

        // nächsten Korpus auswählen
        const newIndex = Math.min(index, remainingCabinets.length - 1);
        const newActiveCabinet = remainingCabinets[newIndex];

        setActiveCabinetId(newActiveCabinet.id);
        setSelectedElement(null);
        setSectionCount(newActiveCabinet.sections?.length ?? 1);
    };

    const toggleViewMode = (nextMode) => {

    setViewMode(prev =>
        prev === nextMode
            ? "interior"
            : nextMode
    );

    setSelectedElement(null);
    };

    const createSectionsFromFronts = () => {

    if (!activeCabinet) {
        return;
    }

    const newSections =
        frontsToSections(
            activeCabinet.fronts ?? [],
            activeCabinet
        );

    updateActiveCabinet({
        sections: newSections
    });

    setSelectedElement(null);
    };

    const loadDefualt = () => {
        const newID = createId();
        setCabinets([{
            id: newID,
            name: "Korpus 1",
            ...defaultCabinet
        }]);
            setActiveCabinetId(newID);
    }

    const handleSave = async (overwriteManual = false) => {
        if (mode !== "edit") {
        return;
    }

        try {
            setSaving(true);

            await ProjectSave(
                cabinets,
                materials,
                selectedCustomer,
                files,
                projectDescription,
                projectName,
                mode,
                projectId,
                defaultConfig,
                overwriteManual
            );

            console.log("Projekt erfolgreich gespeichert");
        } catch (error) {
            console.error(
                "Fehler beim Speichern des Projekts:",
                error
            );
        } finally {
            setSaving(false);
        }
    };

    const startSaveLongPress = () => {
        if (mode !== "edit" || saving) return;

        clearTimeout(longPressTimer.current);
        suppressSaveClick.current = false;
        longPressTimer.current = setTimeout(() => {
            suppressSaveClick.current = true;
            setShowAbsoluteSaveWarning(true);
        }, 850);
    };

    const cancelSaveLongPress = () => {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    };

    const handleSaveButtonClick = () => {
        if (suppressSaveClick.current) {
            suppressSaveClick.current = false;
            return;
        }

        handleSave();
    };

    const handleNext = async () => {

    if (mode !== "create") {
        return;
    }

    try {

        // ==========================================
        // PARTLIST ERZEUGEN
        // ==========================================

        const partList =
                await buildPartList(
                    cabinets,
                    materials,
                    defaultConfig
                );
        
        
            console.log(
                "Generierte Part List:",
                partList
            );

        // ==========================================
        // ZUR NÄCHSTEN SEITE
        // ==========================================

        navigate(
            "/projects/create/list",
            {
                state: {

                    mode: "create",

                    cabinets,

                    partList,

                    userId

                }
            }
        );

    } catch (error) {

        console.error(
            "PartList konnte nicht erstellt werden:",
            error
        );

    }
};

    //---------------------------------------------
    //initial settings, project laden, material laden, customer laden
    //---------------------------------------------

    //fetchProject + customer data
    useEffect(() => {

        if (mode !== "edit" || !projectId) {
            return;
        }

        const fetchProject = async () => {

            try {

                const { data } = await axios.get(
                    `/api/projects/get/${projectId}`
                );

                const project = data.project;

                setProject(project);

                setProjectName(
                    project.title ?? ""
                );

                setProjectDescription(
                    project.description ?? ""
                );

                const customerResponse =
                    await axios.get(
                        `/api/customers/get/${project.customerId}`
                    );

                setSelectedCustomer(
                    customerResponse.data.customer
                );

            } catch (error) {

                console.error(
                    "Projekt konnte nicht geladen werden:",
                    error
                );

            }
        };

        fetchProject();

    }, [mode, projectId]);

    //load Materials
    useEffect(() => {

        const loadMaterials =
            async () => {

            try {

                setLoadingMaterials(true);

                const response =
                    await axios.get(
                        "/api/materials/get"
                    );

                setMaterials(
                    response.data.materials
                );

            } catch (error) {

                console.error(
                    "Materialien konnten nicht geladen werden:",
                    error
                );

                setMaterialError(
                    "Materialien konnten nicht geladen werden."
                );

            } finally {

                setLoadingMaterials(false);

            }

        };

        loadMaterials();

    }, []);

    //fetch cabinet json file
    useEffect(() => {

        if (!projectId) {
            loadDefualt();
            return;
        }

        const loadGeneratedData = async () => {

            setLoadingGeneratedData(true);

            try {
                const data =
                    await getProjectFile({

                        projectId,

                        file: "cabinet.json",

                        loadFromServer: {download: downloadFile, path:`/api/projects/generated/${projectId}/cabinet`}

                    });

                // Datei existiert bereits
                if (data) {

                    setCabinets(data);
                    setActiveCabinetId(data[0].id);

                    return;

                }

                loadDefualt();

            } catch (error) {

                console.error(
                    "Generated data konnte nicht geladen werden",
                    error
                );

            } finally {

                setLoadingGeneratedData(false);

            }

        };


        loadGeneratedData();

    }, [projectId, project, defaultCabinet]);

    //fetch cabinet default config file
    useEffect(() => {

        const loadGeneratedData = async () => {

            try {

                const [data, presetData] = await Promise.all([
                    getGlobalFile({
                        file: "settings-cabinet.json",
                        loadFromServer: {download: downloadFile, path:"/api/settings/cabinet"}
                    }),
                    getGlobalFile({
                        file: "settings-cabinetPreset.json",
                        loadFromServer: {download: downloadFile, path:"/api/settings/cabinetPreset"}
                    })
                ]);


                const legacyPresets = Array.isArray(data?.presets)
                    ? data.presets
                    : null;

                // Datei existiert bereits
                if (data) {
                    const cabinetDefaults = { ...data };
                    delete cabinetDefaults.presets;
                    setDefaultCabinet(prev => ({
                        ...prev,
                        ...cabinetDefaults
                    }));
                }

                setCabinetPresets(
                    Array.isArray(presetData)
                        ? presetData
                        : Array.isArray(presetData?.presets)
                            ? presetData.presets
                            : legacyPresets
                                ? legacyPresets
                                : []
                );

            } catch (error) {

                console.error(
                    "Generated data konnte nicht geladen werden",
                    error
                );

            }

        };


        loadGeneratedData();


    }, []);

    //fetch cnc default config file
    useEffect(() => {
        const loadGeneratedData = async () => {
        
                try {
        
                    const response = await axios.get(
        
                        `/api/settings/cnc`,
        
                        {
                            withCredentials: true
                        }
        
                    );

                    const data =
                        await getGlobalFile({
    
                            file: "settings-cnc.json",
    
                            loadFromServer: {download: downloadFile, path:"/api/settings/cnc"}
    
                        });
               
        
                    // Datei existiert bereits
                    if (data) {
        
                        setDefaultConfig(data.cncDefault ?? data);
    
                        return;
                               
                    }
        
                } catch (error) {
        
                    console.error(
                        "Generated data konnte nicht geladen werden",
                        error
                    );
        
                }
        
            };

        loadGeneratedData();
    }, []);


    return (
        <div className="bg-gray-900 text-white h-screen flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {mode != "create" && ( <div className="shrink-0 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={2} />
        </div>)}
        

        <div className="flex-1 min-h-0">

            <div className="
                grid
                h-full
                min-h-0
                grid-cols-[260px_1fr_660px]
            ">

                {/* LINKS */}
                <CabinetSidebar
                    cabinets={cabinets}
                    activeCabinetId={activeCabinetId}
                    activeCabinet={activeCabinet}

                    addCabinet={addCabinet}
                    duplicateCabinet={duplicateCabinet}
                    selectCabinet={selectCabinet}
                    deleteCabinet={deleteCabinet}
                    updateCabinetQuantity={updateCabinetQuantity}
                    saveCabinetAsPreset={isAdmin ? saveCabinetAsPreset : undefined}

                    updateActiveCabinet={updateActiveCabinet}

                    sectionSplitSpec={sectionSplitSpec}
                    setSectionSplitSpec={setSectionSplitSpec}

                    sectionSplitDirection={sectionSplitDirection}
                    setSectionSplitDirection={setSectionSplitDirection}

                    createInitialSections={createInitialSections}
                    setSectionCount={setSectionCount}

                    setSelectedElement={setSelectedElement}
                />

                {/* MITTE */}
                <main className="
        min-w-0
        min-h-0
        flex
        flex-col
        bg-gray-900
    ">

                    {/* ====================================
                    TOOLBAR
                    ==================================== */}

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
                        <button
                            type="button"
                            onClick={() => toggleViewMode("front")}
                            className={`
                                rounded
                                border
                                px-3
                                py-2
                                text-sm
                                transition

                                ${
                                    viewMode === "front"
                                        ? "border-green-700 bg-green-900 text-green-300 hover:bg-green-800"
                                        : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                                }
                            `}
                        >
                            Fronten
                        </button>

                        <button
                            type="button"
                            onClick={() => toggleViewMode("combined")}
                            className={`
                                rounded
                                border
                                px-3
                                py-2
                                text-sm
                                transition

                                ${
                                    viewMode === "combined"
                                        ? "border-green-700 bg-green-900 text-green-300 hover:bg-green-800"
                                        : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                                }
                            `}
                        >
                            Fronten + Innenraum
                        </button>
                        

                        <button
                                        type="button"
                                        onClick={createSectionsFromFronts}
                                        className="
                                            rounded
                                            border
                                            border-gray-700
                                            bg-gray-800/90
                                            px-3
                                            py-2
                                            text-sm
                                            text-gray-200
                                            shadow-lg
                                            backdrop-blur
                                            hover:bg-gray-700
                                        "
                                    >
                                        ParseFront
                                    </button>

                        <button
                            type="button"
                            onClick={() => {
                                setSelectedPresetId(String(cabinetPresets[0]?.id ?? ""));
                                setShowPresetInsertModal(true);
                            }}
                            className="rounded border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm text-gray-200 shadow-lg hover:bg-gray-700"
                        >
                            Preset einfügen
                        </button>

                        <div className="mx-2 h-6 w-px bg-gray-700" />

                        {/* <button type="button" className="
                rounded
                bg-gray-800
                border
                border-gray-700
                px-3
                py-2
                text-sm
                hover:bg-gray-700
            ">
                            Maße
                        </button> */}

                        <button
                            type="button"
                            onClick={
                                mode === "create"
                                    ? handleNext
                                    : handleSaveButtonClick
                            }
                            onPointerDown={startSaveLongPress}
                            onPointerUp={cancelSaveLongPress}
                            onPointerLeave={cancelSaveLongPress}
                            onPointerCancel={cancelSaveLongPress}
                            onContextMenu={event => event.preventDefault()}
                            title={mode === "edit" ? "Gedrückt halten, um manuelle Listeneinträge vollständig zu überschreiben" : undefined}
                            disabled={saving}
                            className="ml-auto rounded border border-blue-700 bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {mode === "create"
                                ? "Weiter"
                                : saving
                                    ? "Speichern..."
                                    : "Speichern"
                            }
                        </button>

                    </div>

                    {/* ====================================
                    VIEWPORT
                    ==================================== */}

                    <div className="
            flex-1
            min-h-0
        ">

                        <div className="relative h-full w-full overflow-hidden">

                            <CabinetViewport
                                cabinet={activeCabinet}
                                cncConfig={defaultConfig}
                                mode={viewMode}
                                selectedElement={selectedElement}
                                onSelect={setSelectedElement}
                                showGrid={false}
                            />


                            {/* Floating Controls */}
                            <div
                                className="
                                    absolute
                                    right-3
                                    top-3
                                    z-20
                                "
                            >

                                <div className="flex flex-col gap-2">

                                    {/* <button
                                        type="button"
                                        onClick={createSectionsFromFronts}
                                        className="
                                            rounded
                                            border
                                            border-gray-700
                                            bg-gray-800/90
                                            px-3
                                            py-2
                                            text-sm
                                            text-gray-200
                                            shadow-lg
                                            backdrop-blur
                                            hover:bg-gray-700
                                        "
                                    >
                                        ParseFront
                                    </button> */}

                                </div>

                            </div>

                        </div>

                    </div>

                </main>

                {/* RECHTS */}
                <PropertiesSidebar
    selectedElement={selectedElement}
    setSelectedElement={setSelectedElement}

    activeCabinet={activeCabinet}
    updateActiveCabinet={updateActiveCabinet}

    viewMode={viewMode}

    frontSplitSpec={frontSplitSpec}
    setFrontSplitSpec={setFrontSplitSpec}

    frontSplitDirection={frontSplitDirection}
    setFrontSplitDirection={
        setFrontSplitDirection
    }

    splitFront={splitFront}
    mergeFrontChildren={
        mergeFrontChildren
    }
    findFrontParent={
        findFrontParent
    }

    generateFronts={generateFronts}

    sectionSplitSpec={sectionSplitSpec}
    setSectionSplitSpec={
        setSectionSplitSpec
    }

    sectionSplitDirection={
        sectionSplitDirection
    }
    setSectionSplitDirection={
        setSectionSplitDirection
    }

    splitSection={splitSection}
    mergeSectionChildren={
        mergeSectionChildren
    }
    findParent={findParent}

    materials={materials}
    loadingMaterials={
        loadingMaterials
    }
    materialError={materialError}

    updateCabinetLayout={updateCabinetLayout}
/>

            </div>

        </div>

        {showAbsoluteSaveWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="absolute-save-title"
                    className="w-full max-w-lg rounded-xl border border-red-700 bg-gray-800 p-6 shadow-2xl"
                >
                    <h2 id="absolute-save-title" className="text-xl font-semibold text-white">
                        Partliste vollständig überschreiben?
                    </h2>
                    <p className="mt-3 text-gray-300">
                        Die Liste wird neu aus den Korpussen erzeugt. Alle manuell hinzugefügten oder geänderten Positionen in der bestehenden Liste gehen dabei verloren.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowAbsoluteSaveWarning(false)}
                            className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                                setShowAbsoluteSaveWarning(false);
                                handleSave(true);
                            }}
                            className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                        >
                            {saving ? "Speichern..." : "Vollständig überschreiben"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isAdmin && presetEditorCabinet && (
            <CabinetPresetModal
                key={`${presetEditorCabinet.presetId ?? "new"}:${presetEditorCabinet.cabinet.id}`}
                cabinet={presetEditorCabinet.cabinet}
                initialName={presetEditorCabinet.name ?? presetEditorCabinet.cabinet.name ?? ""}
                materials={materials}
                defaultConfig={defaultConfig}
                onCancel={() => setPresetEditorCabinet(null)}
                onSave={handleSaveCabinetPreset}
            />
        )}

        {showPresetInsertModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
                <section role="dialog" aria-modal="true" aria-labelledby="insert-preset-title" className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
                    <h2 id="insert-preset-title" className="text-lg font-semibold text-white">
                        Cabinet-Preset einfügen
                    </h2>
                    {cabinetPresets.length > 0 ? (
                        <>
                            <label className="mt-5 block">
                                <span className="mb-1 block text-xs text-gray-400">Preset auswählen</span>
                                <select value={selectedPresetId} onChange={event => setSelectedPresetId(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
                                    {cabinetPresets.map(preset => (
                                        <option key={preset.id} value={String(preset.id)}>{preset.name}</option>
                                    ))}
                                </select>
                            </label>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowPresetInsertModal(false)} className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Abbrechen</button>
                                <button type="button" onClick={insertSelectedCabinetPreset} disabled={!selectedPresetId} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Korpus laden</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="mt-3 text-sm text-gray-400">Es sind noch keine Cabinet-Presets gespeichert.</p>
                            <div className="mt-6 flex justify-end">
                                <button type="button" onClick={() => setShowPresetInsertModal(false)} className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Schließen</button>
                            </div>
                        </>
                    )}
                </section>
            </div>
        )}

    </main>

</div>


    );

}
