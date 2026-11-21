import {useState, useEffect, useMemo, useRef} from "react";
import { useLocation, useParams } from "react-router";
import CabinetViewport from "./components/view/cabinetViewport.jsx";
import ProjectBar from '../../../shared/components/projectBar.jsx';
import SideBar from '../../../shared/components/sideBar.jsx';
import MobileWorkspaceGuard from '../../../shared/components/MobileWorkspaceGuard.jsx';
import { cloneCabinetWithFreshIds } from "@Engine/cabinet/cabinet.js";
import { DEFAULT_CABINET } from "@Engine/cabinet/cabinetDefaults.js";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import { buildPartList } from "@Engine/cabinet/partList/buildPartList.js";
import { resizeCabinetContents } from "@Engine/cabinet/geometry/resizeCabinetContents.js";
import { reconcileLockedMiddleWalls } from "@Engine/cabinet/sektions/interior/reconcileLockedMiddleWalls.js";
import { applyFunctionPreset, createFunctionPreset } from "@Engine/cabinet/sektions/functionPresets.js";
import { generateFronts } from "@Engine/cabinet/sektions/front/generateFronts.js";
import { splitFront } from "@Engine/cabinet/sektions/front/splitFront.js";
import { toggleFrontRemoved } from "@Engine/cabinet/sektions/front/toggleFrontRemoved.js";
import { splitSection } from "@Engine/cabinet/sektions/splitSections.js";
import { mergeSectionChildren } from "@Engine/cabinet/sektions/interior/mergeSectionChildren.js";
import { frontsToSections } from "@Engine/cabinet/sektions/functions/parseFrontSections.js";
import { findFrontParent, mergeFrontChildren } from "@Engine/cabinet/sektions/front/mergeFrontChildren.js";
import { createId } from "@Engine/shared/id.js";
import CabinetSidebar from "./components/editor/sidebar/CabinetSidebar.jsx";
import PropertiesSidebar from "./components/editor/properties/PropertiesSidebar.jsx";
import { saveCabinetProject } from "./services/projectSave.js";
import { useNavigate } from 'react-router';
import {getProjectFile, uploadProjectFile} from "../../../shared/cache/project-cache.js";
import {downloadFile, uploadJSONFile} from "../../../shared/api/file-api.js";
import { getGlobalFile, uploadGlobalFile } from "../../../shared/cache/global-cache.js";
import axios from "axios";
import CabinetPresetModal from "./components/editor/CabinetPresetModal.jsx";
import MeasurementVariablesModal from "./components/editor/MeasurementVariablesModal.jsx";
import CabinetWorkspaceToolbar from "./components/editor/CabinetWorkspaceToolbar.jsx";
import CabinetBottomPanel from "./components/editor/CabinetBottomPanel.jsx";
import {
    applyGuideToCabinet,
    createEmptyWorkspace,
    ensureCabinetSections,
    getCabinetsOnPage,
    getGuideVariables,
    movePlacementSelection,
    normalizeWorkspace,
    resolveWorkspacePlacementExpressions,
    resolveWorkspaceGuideExpressions,
    syncCabinetToGuides
} from "./workspace/cabinetWorkspace.js";
import {
    expandCabinetVariants,
    resizeCabinetVariantGroup
} from "./workspace/cabinetVariants.js";
import { useAuth } from "../../../app/providers/AuthContext.js";
import {
    extractMeasurementVariables,
    resolveCabinetFunctionExpressions,
    resolveCabinetMeasurementExpressions
} from "./measurementExpressions.js";
import { getAufmasWorkspaceCache, setAufmasWorkspaceCache } from "../measurement/state/workspaceCache.js";
import { createProjectRecord } from "../legacy-editor/uploadProject.js";
import CustomerSearch from "../legacy-editor/customerSearch.jsx";
import { getProjectRecord } from "../../../shared/projects/project-records.js";
import { getProjectAssetUrl } from "../../../shared/cache/project-asset-cache.js";
import {
    isProjectAttachmentFile,
    loadAttachmentLinks
} from "../attachments/attachmentLinks.js";
export default function CabinetEditor() {

    // conmstant Section alle Editor daten
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const isAdmin = !authLoading && user?.role === "admin";

    const { projectId } = useParams();
    const { userId } = useParams();
    const location = useLocation();

    let mode = location.state?.mode !== "create"
        ? "edit"
        : "create";

    if(userId) {mode="create";}

    const [materials, setMaterials] = useState([]);

    const [loadingMaterials, setLoadingMaterials] = useState(false);

    const [materialError, setMaterialError] = useState(null);

    const [project, setProject] = useState();

    const [viewMode, setViewMode] = useState("interior");

    const [, setSectionCount] = useState(1);

    const [cabinets, setCabinets] = useState([]);
    const cabinetsRef = useRef(cabinets);
    useEffect(() => {
        cabinetsRef.current = cabinets;
    }, [cabinets]);

    const [workspace, setWorkspace] = useState(createEmptyWorkspace);

    const [selectedCabinetIds, setSelectedCabinetIds] = useState([]);

    const [guideLayer, setGuideLayer] = useState("interior");

    const [activeGuideTool, setActiveGuideTool] = useState(null);

    const [selectedGuideId, setSelectedGuideId] = useState(null);

    const [measurementVariables, setMeasurementVariables] = useState([]);

    const [linkedMeasurementVariables, setLinkedMeasurementVariables] = useState([]);

    const [manualMeasurementVariables, setManualMeasurementVariables] = useState([]);

    const [aufmasData, setAufmasData] = useState(null);

    const [showMeasurementVariablesModal, setShowMeasurementVariablesModal] = useState(false);

    const [cabinetPresets, setCabinetPresets] = useState([]);

    const [functionPresets, setFunctionPresets] = useState([]);

    const [projectAttachments, setProjectAttachments] = useState([]);

    const [attachmentLinks, setAttachmentLinks] = useState({ version: 1, links: {} });

    const [presetEditorCabinet, setPresetEditorCabinet] = useState(null);

    const [showPresetInsertModal, setShowPresetInsertModal] = useState(false);

    const [selectedPresetId, setSelectedPresetId] = useState("");

    const [selectedFunctionPresetId, setSelectedFunctionPresetId] = useState("");

    const [presetInsertType, setPresetInsertType] = useState("cabinet");

    const [activeCabinetId, setActiveCabinetId] = useState();

    const activeCabinet = cabinets.find(
        cabinet =>
            cabinet.id === activeCabinetId
    );

    const activePageCabinets = getCabinetsOnPage(cabinets, workspace);
    const activePageGuides = workspace.guides?.[workspace.activePageId] ?? { front: [], interior: [], dual: [] };
    const visibleGuides = [...(activePageGuides.front ?? []), ...(activePageGuides.interior ?? []), ...(activePageGuides.dual ?? [])];
    const selectedGuide = visibleGuides.find(guide => guide.id === selectedGuideId) ?? null;
    const guideVariables = useMemo(
        () => getGuideVariables(workspace),
        [workspace]
    );
    const formulaVariables = useMemo(() => {
        const byName = new Map();
        [...measurementVariables, ...guideVariables].forEach(variable => {
            if (variable?.name) byName.set(String(variable.name).toLocaleUpperCase("de-DE"), variable);
        });
        return [...byName.values()];
    }, [guideVariables, measurementVariables]);
    const activePlacement = workspace.placements?.[activeCabinetId];
    const activeSelectionIds = new Set([
        ...(activeCabinetId ? [activeCabinetId] : []),
        ...selectedCabinetIds.filter(id => workspace.placements?.[id]?.pageId === workspace.activePageId)
    ]);
    const activePosition = {
        x: Number(activePlacement?.x ?? 0),
        y: Number(activePlacement?.y ?? 0),
        xExpression: activePlacement?.positionExpressions?.x ?? String(Number(activePlacement?.x ?? 0)),
        yExpression: activePlacement?.positionExpressions?.y ?? String(Number(activePlacement?.y ?? 0)),
        selectionCount: activeSelectionIds.size
    };

    const [frontSplitSpec, setFrontSplitSpec] = useState("1:1");
    const [frontSplitDirection, setFrontSplitDirection] = useState("vertical");

    const loadFrontLayoutControls = (cabinet) => {
        const layout = cabinet?.frontLayout;
        setFrontSplitSpec(layout?.spec ?? "1:1");
        setFrontSplitDirection(
            layout?.direction === "horizontal" ? "horizontal" : "vertical"
        );
    };

    const [sectionSplitSpec, setSectionSplitSpec] = useState("1:1");
    const [sectionSplitDirection, setSectionSplitDirection] = useState("vertical");

    const [saving, setSaving] = useState(false);
    const [, setLoadingGeneratedData] = useState(false);
    const [showAbsoluteSaveWarning, setShowAbsoluteSaveWarning] = useState(false);
    const longPressTimer = useRef(null);
    const suppressSaveClick = useRef(false);
    const skipLongPressTimer = useRef(null);
    const suppressSkipClick = useRef(false);
    const [showEmptyProjectModal, setShowEmptyProjectModal] = useState(false);
    const [emptyProjectCustomer, setEmptyProjectCustomer] = useState(null);
    const [emptyProjectName, setEmptyProjectName] = useState("");
    const [emptyProjectDescription, setEmptyProjectDescription] = useState("");
    const [creatingEmptyProject, setCreatingEmptyProject] = useState(false);
    const [skipError, setSkipError] = useState("");

    useEffect(() => () => {
        clearTimeout(longPressTimer.current);
        clearTimeout(skipLongPressTimer.current);
    }, []);

    const [defaultConfig, setDefaultConfig] = useState(DEFAULT_CNC);

    const [defaultCabinet, setDefaultCabinet] = useState(DEFAULT_CABINET);

    useEffect(() => {
        // Workspace placements are a persisted companion model and must follow cabinet lifecycle changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWorkspace(previous => normalizeWorkspace(previous, cabinets));
        setSelectedCabinetIds(previous => previous.filter(id => cabinets.some(cabinet => cabinet.id === id)));
    }, [cabinets]);

    useEffect(() => {
        // Line expressions can reference measurements and every other named line.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWorkspace(previous => resolveWorkspaceGuideExpressions(previous, measurementVariables));
    }, [measurementVariables, workspace.guides]);

    useEffect(() => {
        // Absolute cabinet/group positions follow measurement and guide variables.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWorkspace(previous => resolveWorkspacePlacementExpressions(previous, formulaVariables));
    }, [formulaVariables]);

    useEffect(() => {
        // Bound geometry follows its guide when either the line or its cabinet is moved.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCabinets(previous => {
            let changed = false;
            const next = previous.map(cabinet => {
                const pageId = workspace.placements?.[cabinet.id]?.pageId;
                const pageGuides = workspace.guides?.[pageId];
                const synced = syncCabinetToGuides({
                    cabinet,
                    placement: workspace.placements?.[cabinet.id],
                    guides: [...(pageGuides?.front ?? []), ...(pageGuides?.interior ?? []), ...(pageGuides?.dual ?? [])]
                });
                if (synced !== cabinet) changed = true;
                return synced;
            });
            return changed ? next : previous;
        });
    }, [workspace.guides, workspace.placements]);

    const placeCabinetOnActivePage = cabinet => {
        setWorkspace(previous => {
            const normalized = normalizeWorkspace(previous, cabinets);
            const pageCabinets = cabinets.filter(item => normalized.placements[item.id]?.pageId === normalized.activePageId);
            const nextX = pageCabinets.reduce((right, item) => Math.max(
                right,
                Number(normalized.placements[item.id]?.x ?? 0) + Number(item.width ?? 0)
            ), 0);
            return {
                ...normalized,
                placements: {
                    ...normalized.placements,
                    [cabinet.id]: {
                        pageId: normalized.activePageId,
                        x: nextX,
                        y: 0,
                        groupId: null
                    }
                }
            };
        });
    };

    const addCabinet = () => {

    const newCabinet = ensureCabinetSections({
    id: createId(),

    name:
        `Korpus ${cabinets.length + 1}`,

    ...defaultCabinet,
    quantity: 1
});


    setCabinets(
        prev => [
            ...prev,
            newCabinet
        ]

    );

    placeCabinetOnActivePage(newCabinet);
    setActiveCabinetId(newCabinet.id);
    setSelectedCabinetIds([]);
    loadFrontLayoutControls(newCabinet);
    };

    const duplicateCabinet = (cabinetId) => {
        const sourceCabinet = cabinets.find(
            cabinet => cabinet.id === cabinetId
        );

        if (!sourceCabinet) {
            return;
        }

        const duplicate = ensureCabinetSections(cloneCabinetWithFreshIds(sourceCabinet));
        duplicate.name = `${sourceCabinet.name || "Korpus"} (Kopie)`;
        duplicate.quantity = 1;
        delete duplicate.linkedCabinetGroupId;
        delete duplicate.linkedCabinetBaseName;
        delete duplicate.linkedCabinetIds;
        delete duplicate.variantIndex;

        setCabinets(prev => [...prev, duplicate]);
        placeCabinetOnActivePage(duplicate);
        setActiveCabinetId(duplicate.id);
        setSelectedCabinetIds([]);
        loadFrontLayoutControls(duplicate);
        setSectionCount(duplicate.sections?.length ?? 1);
        setSelectedElement(null);
    };

    const [selectedElement, setSelectedElement] = useState(null);

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


                    return reconcileLockedMiddleWalls(resizeCabinetContents(
                        cabinet,
                        changes
                    ));

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
        setPresetEditorCabinet({ cabinet, presetId: null, allowTypeSelection: false });
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

    const insertSelectedCabinetPreset = (presetId = selectedPresetId) => {
        const preset = cabinetPresets.find(item => String(item.id) === String(presetId));
        if (!preset?.cabinet) return;

        const cabinet = ensureCabinetSections(cloneCabinetWithFreshIds(preset.cabinet));
        cabinet.name = preset.name || "Korpus aus Preset";
        cabinet.quantity = 1;
        delete cabinet.linkedCabinetGroupId;
        delete cabinet.linkedCabinetBaseName;
        delete cabinet.linkedCabinetIds;
        delete cabinet.variantIndex;

        setCabinets(previous => [...previous, cabinet]);
        placeCabinetOnActivePage(cabinet);
        setActiveCabinetId(cabinet.id);
        setSelectedCabinetIds([]);
        loadFrontLayoutControls(cabinet);
        setSectionCount(cabinet.sections?.length ?? 1);
        setSelectedElement(null);
        setShowPresetInsertModal(false);
    };

    const saveFunctionPresets = async nextPresets => {
        await uploadGlobalFile({
            file: "settings-functionPreset.json",
            data: nextPresets,
            uploadFunction: {
                upload: uploadJSONFile,
                path: "/api/settings/functionPreset"
            }
        });
        setFunctionPresets(nextPresets);
    };

    const handleSaveFunctionPreset = async ({ name, cabinet }) => {
        const hasCncPrograms = cabinet?.functionConfig?.some(entry =>
            entry?.type === "cncPrograms" &&
            ((entry.recognizedProfiles?.length ?? 0) > 0 || (entry.customPrograms?.length ?? 0) > 0)
        );
        if (!isAdmin || (!cabinet?.sections?.length && !hasCncPrograms) || !name.trim()) return;

        await saveFunctionPresets([...functionPresets, {
            id: createId(),
            name: name.trim(),
            data: createFunctionPreset(cabinet)
        }]);
        setPresetEditorCabinet(null);
    };

    const insertSelectedFunctionPreset = (presetId = selectedFunctionPresetId) => {
        const preset = functionPresets.find(item => String(item.id) === String(presetId));
        if (!activeCabinet || !preset?.data) return;

        const functionLayout = applyFunctionPreset(activeCabinet, preset.data);
        updateActiveCabinet(functionLayout);
        setSectionCount(functionLayout.sections.length);
        setSelectedElement(null);
        setShowPresetInsertModal(false);
    };

    const updateActiveCabinet = (
        changesOrUpdater
    ) => {

        const resizesCabinet =
            typeof changesOrUpdater !== "function" &&
            (
                Object.hasOwn(changesOrUpdater, "width") ||
                Object.hasOwn(changesOrUpdater, "height")
            );

        if (resizesCabinet) {
            setSelectedElement(null);
        }

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


                if (
                    Object.hasOwn(changes, "width") ||
                    Object.hasOwn(changes, "height")
                ) {
                    return reconcileLockedMiddleWalls(resizeCabinetContents(
                        cabinet,
                        changes
                    ));
                }


                return reconcileLockedMiddleWalls({
                    ...cabinet,
                    ...changes
                });
            })
        );
    };

    const updateCabinetQuantity = (cabinetId, quantity) => {
        const sourceCabinet = cabinets.find(cabinet => cabinet.id === cabinetId);
        const result = resizeCabinetVariantGroup(cabinets, cabinetId, quantity);
        if (result.cabinets === cabinets) return;
        const sourcePlacement = workspace.placements[cabinetId] ?? {
            pageId: workspace.activePageId,
            x: 0,
            y: 0,
            groupId: null
        };
        const removed = new Set(result.removedIds);
        setCabinets(result.cabinets);
        setWorkspace(previous => {
            const placements = Object.fromEntries(Object.entries(previous.placements)
                .filter(([id]) => !removed.has(id)));
            let nextX = result.cabinets
                .filter(cabinet => placements[cabinet.id]?.pageId === sourcePlacement.pageId)
                .reduce((right, cabinet) => Math.max(
                    right,
                    Number(placements[cabinet.id]?.x ?? 0) + Number(cabinet.width ?? 0)
                ), 0);
            result.added.forEach(cabinet => {
                placements[cabinet.id] = {
                    ...sourcePlacement,
                    x: nextX,
                    groupId: null,
                    positionExpressions: {
                        x: String(nextX),
                        y: String(Number(sourcePlacement.y ?? 0))
                    }
                };
                nextX += Number(cabinet.width ?? 0);
            });
            return { ...previous, placements };
        });
        if (removed.has(activeCabinetId)) {
            const nextActive = result.cabinets.find(cabinet => cabinet.linkedCabinetGroupId === sourceCabinet?.linkedCabinetGroupId)
                ?? result.cabinets[0];
            if (nextActive) setActiveCabinetId(nextActive.id);
        }
        setSelectedCabinetIds(previous => previous.filter(id => !removed.has(id)));
    };

    const selectCabinet = (id) => {

        setActiveCabinetId(id);

        const cabinet = cabinets.find(cabinet => cabinet.id === id);
        const cabinetPageId = workspace.placements?.[id]?.pageId;
        if (cabinetPageId && cabinetPageId !== workspace.activePageId) {
            setWorkspace(previous => ({ ...previous, activePageId: cabinetPageId }));
        }

        loadFrontLayoutControls(cabinet);
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
        setSelectedCabinetIds(previous => previous.filter(id => id !== activeCabinetId));

        // nächsten Korpus auswählen
        const newIndex = Math.min(index, remainingCabinets.length - 1);
        const newActiveCabinet = remainingCabinets[newIndex];

        setActiveCabinetId(newActiveCabinet.id);
        loadFrontLayoutControls(newActiveCabinet);
        setSelectedElement(null);
        setSectionCount(newActiveCabinet.sections?.length ?? 1);
    };

    const getActionCabinetIds = () => {
        const base = selectedCabinetIds.length > 0
            ? selectedCabinetIds
            : activeCabinetId ? [activeCabinetId] : [];
        const onPage = base.filter(id => workspace.placements?.[id]?.pageId === workspace.activePageId);
        if (onPage.length > 0) return onPage;
        return activeCabinetId && workspace.placements?.[activeCabinetId]?.pageId === workspace.activePageId
            ? [activeCabinetId]
            : [];
    };

    const toggleCabinetSelection = cabinetId => {
        setSelectedCabinetIds(previous => previous.includes(cabinetId)
            ? previous.filter(id => id !== cabinetId)
            : [...previous, cabinetId]);
    };

    const updateCabinetPosition = (axis, expression, evaluation) => {
        if (!activeCabinetId) return;
        setWorkspace(previous => movePlacementSelection({
            workspace: previous,
            activeCabinetId,
            selectedCabinetIds,
            axis,
            expression,
            value: evaluation.valid ? Number(evaluation.value) : undefined
        }));
    };

    const swapCabinetPosition = direction => {
        if (!activeCabinetId) return;
        setWorkspace(previous => {
            const units = activePageCabinets.map(cabinet => {
                const placement = previous.placements[cabinet.id];
                const x = Number(placement?.x ?? 0);
                const width = Number(cabinet.width ?? 0);
                return { id: cabinet.id, origin: { x, y: Number(placement?.y ?? 0) }, right: x + width, width };
            });
            const selected = units.find(unit => unit.id === activeCabinetId);
            if (!selected) return previous;
            const rowUnits = units
                .filter(unit => Math.abs(unit.origin.y - selected.origin.y) < 0.5)
                .sort((left, right) => left.origin.x - right.origin.x);
            const selectedIndex = rowUnits.findIndex(unit => unit.id === activeCabinetId);
            const neighbor = rowUnits[selectedIndex + (direction === "left" ? -1 : 1)];
            if (!selected || !neighbor) return previous;

            const leftUnit = direction === "left" ? neighbor : selected;
            const rightUnit = direction === "left" ? selected : neighbor;
            const gap = rightUnit.origin.x - leftUnit.right;
            const selectedTarget = direction === "left"
                ? neighbor.origin.x
                : selected.origin.x + neighbor.width + gap;
            const neighborTarget = direction === "left"
                ? neighbor.origin.x + selected.width + gap
                : selected.origin.x;
            const placements = { ...previous.placements };
            const moveUnit = (unit, targetX) => {
                const delta = targetX - unit.origin.x;
                const placement = placements[unit.id];
                placements[unit.id] = {
                    ...placement,
                    groupId: null,
                    x: Number(placement.x ?? 0) + delta,
                    positionExpressions: {
                        ...(placement.positionExpressions ?? {}),
                        x: String(targetX)
                    }
                };
            };
            moveUnit(selected, selectedTarget);
            moveUnit(neighbor, neighborTarget);
            return { ...previous, placements };
        });
    };

    const assignSelectionToPage = pageId => {
        const ids = getActionCabinetIds();
        if (!workspace.pages.some(page => page.id === pageId)) return;
        let x = 0;
        setWorkspace(previous => ({
            ...previous,
            activePageId: pageId,
            placements: Object.fromEntries(Object.entries(previous.placements).map(([id, placement]) => {
                if (!ids.includes(id)) return [id, placement];
                const cabinet = cabinets.find(item => item.id === id);
                const next = { ...placement, pageId, x, y: 0 };
                x += Number(cabinet?.width ?? 600);
                return [id, next];
            }))
        }));
    };

    const selectPage = pageId => {
        setWorkspace(previous => ({ ...previous, activePageId: pageId }));
        setSelectedGuideId(null);
        setActiveGuideTool(null);
        const pageCabinet = cabinets.find(cabinet => workspace.placements?.[cabinet.id]?.pageId === pageId);
        if (pageCabinet && workspace.placements?.[activeCabinetId]?.pageId !== pageId) {
            setActiveCabinetId(pageCabinet.id);
            loadFrontLayoutControls(pageCabinet);
            setSelectedElement(null);
        }
    };

    const addPage = () => {
        const id = createId();
        setWorkspace(previous => ({
            ...previous,
            activePageId: id,
            pages: [...previous.pages, { id, name: `Seite ${previous.pages.length + 1}` }],
            guides: { ...previous.guides, [id]: { front: [], interior: [], dual: [] } }
        }));
        setSelectedGuideId(null);
    };

    const renamePage = (pageId, name) => {
        setWorkspace(previous => ({
            ...previous,
            pages: previous.pages.map(page => page.id === pageId ? { ...page, name } : page)
        }));
    };

    const deletePage = pageId => {
        if (workspace.pages.length <= 1) return;
        const fallback = workspace.pages.find(page => page.id !== pageId);
        setWorkspace(previous => {
            const guides = { ...previous.guides };
            delete guides[pageId];
            return {
                ...previous,
                activePageId: previous.activePageId === pageId ? fallback.id : previous.activePageId,
                pages: previous.pages.filter(page => page.id !== pageId),
                guides,
                placements: Object.fromEntries(Object.entries(previous.placements).map(([id, placement]) => [
                    id,
                    placement.pageId === pageId ? { ...placement, pageId: fallback.id, groupId: null } : placement
                ]))
            };
        });
    };

    const addGuide = draft => {
        const pageId = workspace.activePageId;
        const existing = workspace.guides?.[pageId]?.[draft.layer] ?? [];
        const prefix = draft.layer === "front" ? "F" : draft.layer === "interior" ? "I" : "D";
        const direction = draft.orientation === "horizontal" ? "H" : "V";
        const guide = {
            id: createId(),
            layer: draft.layer,
            orientation: draft.orientation,
            position: Math.round(Number(draft.position) * 10) / 10,
            expression: String(Math.round(Number(draft.position) * 10) / 10),
            name: `${prefix}_${direction}_${existing.length + 1}`
        };
        setWorkspace(previous => ({
            ...previous,
            guides: {
                ...previous.guides,
                [pageId]: {
                    ...(previous.guides?.[pageId] ?? { front: [], interior: [], dual: [] }),
                    [draft.layer]: [...(previous.guides?.[pageId]?.[draft.layer] ?? []), guide]
                }
            }
        }));
        setSelectedGuideId(guide.id);
        setActiveGuideTool(null);
    };

    const updateGuide = (guideId, changes) => {
        const pageId = workspace.activePageId;
        const normalizedChanges = Object.hasOwn(changes, "name")
            ? {
                ...changes,
                name: /^[\p{L}_]/u.test(changes.name || "")
                    ? changes.name
                    : `_${changes.name || "LINIE"}`
            }
            : changes;
        setWorkspace(previous => ({
            ...previous,
            guides: {
                ...previous.guides,
                [pageId]: {
                    ...previous.guides[pageId],
                    front: (previous.guides[pageId]?.front ?? []).map(guide => guide.id === guideId ? { ...guide, ...normalizedChanges } : guide),
                    interior: (previous.guides[pageId]?.interior ?? []).map(guide => guide.id === guideId ? { ...guide, ...normalizedChanges } : guide),
                    dual: (previous.guides[pageId]?.dual ?? []).map(guide => guide.id === guideId ? { ...guide, ...normalizedChanges } : guide)
                }
            }
        }));
    };

    const deleteGuide = guideId => {
        const pageId = workspace.activePageId;
        setWorkspace(previous => ({
            ...previous,
            guides: {
                ...previous.guides,
                [pageId]: {
                    ...previous.guides[pageId],
                    front: (previous.guides[pageId]?.front ?? []).filter(guide => guide.id !== guideId),
                    interior: (previous.guides[pageId]?.interior ?? []).filter(guide => guide.id !== guideId),
                    dual: (previous.guides[pageId]?.dual ?? []).filter(guide => guide.id !== guideId)
                }
            }
        }));
        setSelectedGuideId(null);
    };

    const applyGuide = guide => {
        const ids = new Set(getActionCabinetIds());
        setCabinets(previous => previous.map(cabinet => ids.has(cabinet.id)
            ? applyGuideToCabinet({ cabinet, guide, placement: workspace.placements[cabinet.id] })
            : cabinet));
        setSelectedElement(null);
    };

    const applyCabinetPropertiesToSelection = () => {
        if (!activeCabinet) return;
        const ids = new Set(getActionCabinetIds());
        const fields = [
            "materialId", "frontMaterialId", "edgeTopMaterialId", "edgeBottomMaterialId",
            "frontEdgeMaterialId", "backPanel", "continuous", "spax"
        ];
        const changes = Object.fromEntries(fields.map(field => [field, activeCabinet[field]]));
        setCabinets(previous => previous.map(cabinet => ids.has(cabinet.id)
            ? { ...cabinet, ...changes }
            : cabinet));
    };

    const toggleViewMode = (nextMode) => {
        setViewMode(nextMode);
        setSelectedElement(null);
    };

    const changeGuideLayer = layer => {
        setGuideLayer(layer);
        toggleViewMode(layer === "dual" ? "combined" : layer === "front" ? "front" : "interior");
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
        sections: newSections,
        sectionLayout: {
            source: "fronts"
        }
    });

    setSelectedElement(null);
    };

    const loadDefualt = () => {
        const newID = createId();
        const cabinet = ensureCabinetSections({
            id: newID,
            name: "Korpus 1",
            ...defaultCabinet,
            quantity: 1
        });
        setCabinets([cabinet]);
            setActiveCabinetId(newID);
            setSelectedCabinetIds([]);
            loadFrontLayoutControls(cabinet);
    }

    const handleSave = async (overwriteManual = false) => {
        if (mode !== "edit") {
        return;
    }

        try {
            setSaving(true);

            await saveCabinetProject({
                cabinets,
                workspace,
                materials,
                projectId,
                defaultConfig,
                overwriteManual
            });

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

                    cabinetWorkspace: workspace,

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

    const handleSkip = () => {
        if (mode !== "create" || creatingEmptyProject) return;

        if (suppressSkipClick.current) {
            suppressSkipClick.current = false;
            return;
        }

        navigate("/projects/create/list", {
            state: {
                mode: "create",
                userId
            }
        });
    };

    const openEmptyProjectModal = async () => {
        setShowEmptyProjectModal(true);
        setSkipError("");

        if (!userId || emptyProjectCustomer) return;

        try {
            const { data } = await axios.get(`/api/customers/get/${userId}`);
            setEmptyProjectCustomer(data.customer);
        } catch (error) {
            console.error("Kunde konnte nicht vorausgewählt werden:", error);
        }
    };

    const createEmptyProjectAndOpenHome = async event => {
        event.preventDefault();

        if (mode !== "create" || creatingEmptyProject) return;

        const trimmedProjectName = emptyProjectName.trim();

        if (!trimmedProjectName) {
            setSkipError("Bitte gib einen Projektnamen ein.");
            return;
        }

        setCreatingEmptyProject(true);
        setSkipError("");

        try {
            const newProjectId = await createProjectRecord({
                customerId: emptyProjectCustomer?.id,
                title: trimmedProjectName,
                description: emptyProjectDescription.trim()
            });

            navigate(`/Projects/${newProjectId}`);
        } catch (error) {
            console.error("Leeres Projekt konnte nicht erstellt werden:", error);
            setSkipError(
                error?.response?.data?.message ??
                "Das leere Projekt konnte nicht erstellt werden. Bitte erneut versuchen."
            );
        } finally {
            setCreatingEmptyProject(false);
        }
    };

    const startSkipLongPress = () => {
        if (mode !== "create" || creatingEmptyProject) return;

        clearTimeout(skipLongPressTimer.current);
        suppressSkipClick.current = false;
        skipLongPressTimer.current = setTimeout(() => {
            suppressSkipClick.current = true;
            openEmptyProjectModal();
        }, 850);
    };

    const cancelSkipLongPress = () => {
        clearTimeout(skipLongPressTimer.current);
        skipLongPressTimer.current = null;
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

                const project = await getProjectRecord(projectId);

                setProject(project);

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
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
                if (Array.isArray(data) && data.length) {

                    const inheritedPartListSettings = {
                        ...DEFAULT_CABINET.partListSettings,
                        ...(defaultCabinet.partListSettings ?? {}),
                        separate: {
                            ...DEFAULT_CABINET.partListSettings.separate,
                            ...(defaultCabinet.partListSettings?.separate ?? {})
                        }
                    };
                    const loadedCabinets = expandCabinetVariants(data.map(cabinet => ensureCabinetSections(
                        cabinet.source === "palette-cad" &&
                        !cabinet.partListSettingsSource
                            ? {
                                ...cabinet,
                                partListSettings: inheritedPartListSettings,
                                partListSettingsSource: "company"
                            }
                            : cabinet
                    )));

                    setCabinets(loadedCabinets);
                    const requestedCabinetId = new URLSearchParams(location.search).get("cabinet");
                    const requestedCabinet = loadedCabinets.find(
                        cabinet => String(cabinet.id) === requestedCabinetId
                    );
                    const selectedCabinet = requestedCabinet ?? loadedCabinets[0];
                    setActiveCabinetId(selectedCabinet.id);
                    setSelectedCabinetIds([]);
                    setFrontSplitSpec(selectedCabinet.frontLayout?.spec ?? "1:1");
                    setFrontSplitDirection(
                        selectedCabinet.frontLayout?.direction === "horizontal"
                            ? "horizontal"
                            : "vertical"
                    );

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

    // loadDefualt intentionally uses the company default captured by this load cycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, project, defaultCabinet, location.search]);

    useEffect(() => {
        if (!projectId) return;
        let cancelled = false;
        getProjectFile({
            projectId,
            file: "cabinetWorkspace.json",
            loadFromServer: {
                download: downloadFile,
                path: `/api/projects/generated/${projectId}/cabinetWorkspace`
            }
        }).then(data => {
            if (!cancelled && data) {
                setWorkspace(cabinetsRef.current.length > 0
                    ? normalizeWorkspace(data, cabinetsRef.current)
                    : data);
            }
        }).catch(error => {
            if (error.response?.status !== 404 && error.code !== "OFFLINE_RESOURCE_UNAVAILABLE") {
                console.warn("Cabinet-Workspace konnte nicht geladen werden", error);
            }
        });
        return () => { cancelled = true; };
    }, [projectId]);

    useEffect(() => {
        if (!projectId || !project?.files) return;
        let cancelled = false;
        Promise.all([
            loadAttachmentLinks(projectId),
            Promise.all(project.files.filter(isProjectAttachmentFile).map(async file => ({
                ...file,
                url: await getProjectAssetUrl(file)
            })))
        ]).then(([links, attachments]) => {
            if (cancelled) return;
            setAttachmentLinks(links);
            setProjectAttachments(attachments);
        }).catch(error => {
            if (!cancelled) console.warn("Verknüpfte Anlagen konnten nicht geladen werden", error);
        });
        return () => { cancelled = true; };
    }, [project?.files, projectId]);

    useEffect(() => {
        if (mode !== "edit" || !projectId) {
            return;
        }

        const applyAufmasData = data => {
            const normalized = data && typeof data === "object" ? data : null;
            const linked = extractMeasurementVariables({ objects: normalized?.objects });
            const manual = Array.isArray(normalized?.variables) ? normalized.variables : [];
            setAufmasData(normalized);
            setLinkedMeasurementVariables(linked);
            setManualMeasurementVariables(manual);
            setMeasurementVariables(extractMeasurementVariables(normalized));
        };

        const cachedAufmas = getAufmasWorkspaceCache(projectId);
        if (Array.isArray(cachedAufmas?.objects)) {
            applyAufmasData(cachedAufmas);
            return;
        }

        let cancelled = false;
        getProjectFile({
            projectId,
            file: "aufmas.json",
            loadFromServer: {
                download: downloadFile,
                path: `/api/projects/generated/${projectId}/aufmas`
            }
        }).then(data => {
            if (!cancelled) applyAufmasData(data);
        }).catch(error => {
            if (error.response?.status !== 404 && error.code !== "OFFLINE_RESOURCE_UNAVAILABLE") {
                console.warn("Aufmaßverknüpfungen konnten nicht geladen werden", error);
            }
            if (!cancelled) applyAufmasData(null);
        });

        return () => { cancelled = true; };
    }, [mode, projectId]);

    const saveMeasurementVariables = async variables => {
        if (mode !== "edit" || !projectId) return;

        const payload = {
            version: 1,
            views: [],
            objects: [],
            todos: [],
            completed: false,
            ...(aufmasData ?? {}),
            variables
        };
        const result = await uploadProjectFile({
            projectId,
            file: "aufmas.json",
            data: payload,
            uploadFunction: {
                upload: uploadJSONFile,
                path: `/api/projects/generated/${projectId}/aufmas`
            }
        });

        const saveStatus = result?.status === "pending" ? "local" : "saved";
        const cachedAufmas = getAufmasWorkspaceCache(projectId);
        if (cachedAufmas) {
            setAufmasWorkspaceCache(projectId, {
                ...cachedAufmas,
                variables,
                saveStatus
            });
        }
        setAufmasData(payload);
        setManualMeasurementVariables(variables);
        setMeasurementVariables(extractMeasurementVariables(payload));
        setShowMeasurementVariablesModal(false);
    };

    useEffect(() => {
        if (!formulaVariables.length || !cabinets.length) return;
        // Formula values are materialized into cabinet geometry after their source variables change.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCabinets(previous => {
            let changed = false;
            const next = previous.map(cabinet => {
                const resolved = resolveCabinetMeasurementExpressions(cabinet, formulaVariables);
                const fields = Object.keys(resolved);
                const dimensionsChanged = fields.some(field => cabinet[field] !== resolved[field]);
                const resized = !dimensionsChanged
                    ? cabinet
                    : Object.hasOwn(resolved, "width") || Object.hasOwn(resolved, "height")
                        ? resizeCabinetContents(cabinet, resolved)
                        : { ...cabinet, ...resolved };
                const withFunctions = resolveCabinetFunctionExpressions(resized, formulaVariables);
                const reconciled = reconcileLockedMiddleWalls(withFunctions);
                const stable = JSON.stringify(reconciled) === JSON.stringify(cabinet) ? cabinet : reconciled;
                if (stable !== cabinet) changed = true;
                return stable;
            });
            return changed ? next : previous;
        });
    }, [cabinets, formulaVariables]);

    //fetch cabinet default config file
    useEffect(() => {

        const loadGeneratedData = async () => {

            try {

                const [data, presetData, functionPresetData] = await Promise.all([
                    getGlobalFile({
                        file: "settings-cabinet.json",
                        loadFromServer: {download: downloadFile, path:"/api/settings/cabinet"}
                    }),
                    getGlobalFile({
                        file: "settings-cabinetPreset.json",
                        loadFromServer: {download: downloadFile, path:"/api/settings/cabinetPreset"}
                    }),
                    getGlobalFile({
                        file: "settings-functionPreset.json",
                        loadFromServer: {download: downloadFile, path:"/api/settings/functionPreset"}
                    })
                ]);

                // Datei existiert bereits
                if (data) {
                    setDefaultCabinet(prev => ({
                        ...prev,
                        ...data
                    }));
                }

                setCabinetPresets(
                    Array.isArray(presetData)
                        ? presetData
                        : []
                );

                setFunctionPresets(Array.isArray(functionPresetData) ? functionPresetData : []);

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
        <div className="flex h-screen overflow-hidden bg-[#111315] text-white">
            <SideBar selected={2} />
            <MobileWorkspaceGuard title="Schrankkonfigurator" />

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {mode !== "create" && (
                    <div className="shrink-0 border-b border-white/10 bg-[#17191b]">
                        <ProjectBar selected={2} />
                    </div>
                )}

                <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[#151719] px-4">
                    <h1 className="text-sm font-semibold text-gray-100">Cabinet Editor</h1>
                    <span className="h-5 w-px bg-white/10" />
                    <span className="truncate text-xs text-gray-500">{project?.title ?? "Korpusplanung"}</span>
                    <div className="ml-auto flex items-center gap-2">
                        {mode === "create" && (
                            <button
                                type="button"
                                onClick={handleSkip}
                                onPointerDown={startSkipLongPress}
                                onPointerUp={cancelSkipLongPress}
                                onPointerLeave={cancelSkipLongPress}
                                onPointerCancel={cancelSkipLongPress}
                                onContextMenu={event => event.preventDefault()}
                                disabled={creatingEmptyProject || showEmptyProjectModal}
                                className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-40"
                            >
                                Überspringen
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={mode === "create" ? handleNext : handleSaveButtonClick}
                            onPointerDown={startSaveLongPress}
                            onPointerUp={cancelSaveLongPress}
                            onPointerLeave={cancelSaveLongPress}
                            onPointerCancel={cancelSaveLongPress}
                            onContextMenu={event => event.preventDefault()}
                            disabled={saving || creatingEmptyProject}
                            className="rounded-md border border-amber-600 bg-amber-600/90 px-4 py-1.5 text-xs font-medium text-black hover:bg-amber-500 disabled:opacity-40"
                        >
                            {mode === "create" ? "Weiter" : saving ? "Speichern …" : "Speichern"}
                        </button>
                    </div>
                </header>

                <div className="min-h-0 flex-1">
                    <div className="cabinet-editor-layout grid h-full min-h-0 grid-cols-[248px_minmax(520px,1fr)_340px]">
                        <CabinetSidebar
                            cabinets={cabinets}
                            activeCabinetId={activeCabinetId}
                            addCabinet={addCabinet}
                            duplicateCabinet={duplicateCabinet}
                            selectCabinet={selectCabinet}
                            deleteCabinet={deleteCabinet}
                            updateCabinetQuantity={updateCabinetQuantity}
                            saveCabinetAsPreset={isAdmin ? saveCabinetAsPreset : undefined}
                            selectedCabinetIds={selectedCabinetIds}
                            onToggleCabinetSelection={toggleCabinetSelection}
                            workspace={workspace}
                            position={activePosition}
                            positionVariables={formulaVariables}
                            onPositionChange={updateCabinetPosition}
                            onSwapPosition={swapCabinetPosition}
                            onAssignSelectionToPage={assignSelectionToPage}
                            onSelectPage={selectPage}
                            onAddPage={addPage}
                            onRenamePage={renamePage}
                            onDeletePage={deletePage}
                        />

                        <section className="flex min-h-0 min-w-0 flex-col bg-[#111315]">
                            <CabinetWorkspaceToolbar
                                pages={workspace.pages}
                                activePageId={workspace.activePageId}
                                onSelectPage={selectPage}
                                guideLayer={guideLayer}
                                onGuideLayerChange={changeGuideLayer}
                                activeGuideTool={activeGuideTool}
                                setActiveGuideTool={setActiveGuideTool}
                                selectedGuide={selectedGuide}
                                onUpdateGuide={updateGuide}
                                onDeleteGuide={deleteGuide}
                                onApplyGuide={applyGuide}
                                measurementVariables={formulaVariables}
                            />

                            <div data-tour="project-cabinet-viewport" className="relative min-h-0 flex-1">
                                <CabinetViewport
                                    cabinets={activePageCabinets}
                                    placements={workspace.placements}
                                    activeCabinetId={activeCabinetId}
                                    selectedCabinetIds={selectedCabinetIds}
                                    cncConfig={defaultConfig}
                                    mode={viewMode}
                                    selectedElement={selectedElement}
                                    onSelect={setSelectedElement}
                                    onActivateCabinet={selectCabinet}
                                    guides={visibleGuides}
                                    selectedGuideId={selectedGuideId}
                                    activeGuideTool={activeGuideTool}
                                    onAddGuide={addGuide}
                                    onSelectGuide={setSelectedGuideId}
                                    onUpdateGuide={updateGuide}
                                    showGrid
                                />
                            </div>

                            <div className="flex h-11 shrink-0 items-center gap-2 border-t border-white/10 bg-[#191b1e] px-3">
                                <button type="button" onClick={createSectionsFromFronts} className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5">Parse Front</button>
                                <button
                                    type="button"
                                    disabled={mode !== "edit" || !projectId}
                                    onClick={() => setShowMeasurementVariablesModal(true)}
                                    className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-35"
                                >
                                    Variablen ({formulaVariables.length})
                                </button>
                                <span className="ml-auto text-[11px] text-gray-600">Leertaste + Ziehen: Ansicht verschieben · Mausrad: Zoom</span>
                            </div>

                            <CabinetBottomPanel
                                cabinets={cabinets}
                                materials={materials}
                                cncConfig={defaultConfig}
                                cabinetPresets={cabinetPresets}
                                functionPresets={functionPresets}
                                activeCabinet={activeCabinet}
                                attachments={projectAttachments}
                                attachmentLinks={attachmentLinks}
                                onInsertCabinetPreset={insertSelectedCabinetPreset}
                                onInsertFunctionPreset={insertSelectedFunctionPreset}
                                onSavePreset={() => setPresetEditorCabinet({ cabinet: activeCabinet, presetId: null, allowTypeSelection: true })}
                                canSavePreset={isAdmin}
                            />
                        </section>

                        <PropertiesSidebar
                            selectedElement={selectedElement}
                            setSelectedElement={setSelectedElement}
                            activeCabinet={activeCabinet}
                            updateActiveCabinet={updateActiveCabinet}
                            viewMode={viewMode}
                            frontSplitSpec={frontSplitSpec}
                            setFrontSplitSpec={setFrontSplitSpec}
                            frontSplitDirection={frontSplitDirection}
                            setFrontSplitDirection={setFrontSplitDirection}
                            splitFront={splitFront}
                            toggleFrontRemoved={toggleFrontRemoved}
                            mergeFrontChildren={mergeFrontChildren}
                            findFrontParent={findFrontParent}
                            generateFronts={generateFronts}
                            sectionSplitSpec={sectionSplitSpec}
                            setSectionSplitSpec={setSectionSplitSpec}
                            sectionSplitDirection={sectionSplitDirection}
                            setSectionSplitDirection={setSectionSplitDirection}
                            splitSection={splitSection}
                            mergeSectionChildren={mergeSectionChildren}
                            materials={materials}
                            loadingMaterials={loadingMaterials}
                            materialError={materialError}
                            cncConfig={defaultConfig}
                            measurementVariables={formulaVariables}
                            projectId={projectId}
                            updateCabinetLayout={updateCabinetLayout}
                            selectedCabinetCount={getActionCabinetIds().length}
                            onApplyCabinetProperties={applyCabinetPropertiesToSelection}
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

        {showEmptyProjectModal && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
                <form
                    onSubmit={createEmptyProjectAndOpenHome}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="empty-project-title"
                    className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl"
                >
                    <h2 id="empty-project-title" className="text-xl font-semibold text-white">
                        Leeres Projekt erstellen
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Das Projekt wird ohne Korpus- und Listeneinträge angelegt.
                    </p>

                    <div className="mt-5">
                        <label className="mb-2 block text-sm text-gray-300">
                            Kunde <span className="text-gray-500">(optional)</span>
                        </label>
                        <CustomerSearch
                            selectedCustomer={emptyProjectCustomer}
                            setSelectedCustomer={setEmptyProjectCustomer}
                        />
                    </div>

                    <label className="mt-4 block">
                        <span className="mb-2 block text-sm text-gray-300">
                            Projektname <span aria-hidden="true" className="text-red-400">*</span>
                        </span>
                        <input
                            type="text"
                            required
                            value={emptyProjectName}
                            onChange={event => setEmptyProjectName(event.target.value)}
                            placeholder="Projektname"
                            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </label>

                    <label className="mt-4 block">
                        <span className="mb-2 block text-sm text-gray-300">Beschreibung</span>
                        <textarea
                            value={emptyProjectDescription}
                            onChange={event => setEmptyProjectDescription(event.target.value)}
                            placeholder="Projektbeschreibung"
                            rows={4}
                            className="w-full resize-y rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </label>

                    {skipError && (
                        <div role="alert" className="mt-4 rounded-lg border border-red-700 bg-red-950/60 p-3 text-sm text-red-200">
                            {skipError}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            disabled={creatingEmptyProject}
                            onClick={() => {
                                setShowEmptyProjectModal(false);
                                setSkipError("");
                            }}
                            className="rounded-lg border border-gray-600 px-4 py-2 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={creatingEmptyProject || !emptyProjectName.trim()}
                            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {creatingEmptyProject ? "Projekt wird erstellt ..." : "Projekt erstellen"}
                        </button>
                    </div>
                </form>
            </div>
        )}

        {isAdmin && presetEditorCabinet && (
            <CabinetPresetModal
                key={`${presetEditorCabinet.presetId ?? "new"}:${presetEditorCabinet.cabinet.id}`}
                cabinet={presetEditorCabinet.cabinet}
                initialName={presetEditorCabinet.name ?? presetEditorCabinet.cabinet.name ?? ""}
                materials={materials}
                defaultConfig={defaultConfig}
                allowPresetTypeSelection={presetEditorCabinet.allowTypeSelection}
                onCancel={() => setPresetEditorCabinet(null)}
                onSave={handleSaveCabinetPreset}
                onSaveFunction={handleSaveFunctionPreset}
            />
        )}

        {showMeasurementVariablesModal && (
            <MeasurementVariablesModal
                linkedVariables={linkedMeasurementVariables}
                guideVariables={guideVariables}
                variables={manualMeasurementVariables}
                onCancel={() => setShowMeasurementVariablesModal(false)}
                onSave={saveMeasurementVariables}
            />
        )}

        {showPresetInsertModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
                <section role="dialog" aria-modal="true" aria-labelledby="insert-preset-title" className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
                    <h2 id="insert-preset-title" className="text-lg font-semibold text-white">
                        Preset einfügen
                    </h2>
                    <div className="mt-5 flex rounded-lg border border-gray-700 bg-gray-950 p-1" role="group" aria-label="Preset-Typ">
                        {[["cabinet", "Cabinet Preset"], ["function", "Function Preset"]].map(([type, label]) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setPresetInsertType(type)}
                                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${presetInsertType === type
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {presetInsertType === "cabinet" ? (
                        cabinetPresets.length > 0 ? (
                            <label className="mt-5 block">
                                <span className="mb-1 block text-xs text-gray-400">Cabinet Preset auswählen</span>
                                <select value={selectedPresetId} onChange={event => setSelectedPresetId(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
                                    {cabinetPresets.map(preset => (
                                        <option key={preset.id} value={String(preset.id)}>{preset.name}</option>
                                    ))}
                                </select>
                            </label>
                        ) : <p className="mt-5 rounded border border-dashed border-gray-700 p-4 text-sm text-gray-500">Es sind noch keine Cabinet Presets gespeichert.</p>
                    ) : (
                        <>
                            <p className="mt-4 text-sm text-gray-400">Sections und Funktionen ersetzen den Inhalt des aktiven Korpus. Maße, Material und Konstruktion bleiben unverändert.</p>
                            {functionPresets.length > 0 ? (
                                <label className="mt-4 block">
                                    <span className="mb-1 block text-xs text-gray-400">Function Preset auswählen</span>
                                    <select value={selectedFunctionPresetId} onChange={event => setSelectedFunctionPresetId(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
                                        {functionPresets.map(preset => (
                                            <option key={preset.id} value={String(preset.id)}>{preset.name}</option>
                                        ))}
                                    </select>
                                </label>
                            ) : <p className="mt-4 rounded border border-dashed border-gray-700 p-4 text-sm text-gray-500">Es sind noch keine Function Presets gespeichert.</p>}
                        </>
                    )}
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={() => setShowPresetInsertModal(false)} className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Abbrechen</button>
                        <button
                            type="button"
                            onClick={() => presetInsertType === "cabinet"
                                ? insertSelectedCabinetPreset()
                                : insertSelectedFunctionPreset()}
                            disabled={presetInsertType === "cabinet" ? !selectedPresetId || cabinetPresets.length === 0 : !activeCabinet || !selectedFunctionPresetId || functionPresets.length === 0}
                            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {presetInsertType === "cabinet" ? "Korpus einfügen" : "Auf Korpus anwenden"}
                        </button>
                    </div>
                </section>
            </div>
        )}

    </main>

</div>


    );

}
