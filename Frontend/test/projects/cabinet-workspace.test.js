import { describe, expect, it } from "vitest";
import { lockMiddleWallSection } from "@Engine/cabinet/sektions/interior/lockMiddleWallSection.js";
import { reconcileLockedMiddleWalls } from "@Engine/cabinet/sektions/interior/reconcileLockedMiddleWalls.js";
import { mergeSectionChildren } from "@Engine/cabinet/sektions/interior/mergeSectionChildren.js";
import {
    applyGuideToCabinet,
    ensureCabinetSections,
    getGuideVariables,
    movePlacementSelection,
    normalizeWorkspace,
    resolveWorkspaceGuideExpressions,
    resolveWorkspacePlacementExpressions,
    syncCabinetToGuides
} from "../../src/features/projects/cabinet/workspace/cabinetWorkspace.js";

const cabinet = {
    id: "cabinet-1",
    name: "Korpus 1",
    width: 600,
    height: 720,
    depth: 535,
    thickness: 19,
    frontGap: 3,
    fronts: [],
    sections: []
};

describe("cabinet workspace", () => {
    it("gives every cabinet at least one initial section and placement", () => {
        const normalizedCabinet = ensureCabinetSections(cabinet);
        const workspace = normalizeWorkspace(null, [normalizedCabinet]);

        expect(normalizedCabinet.sections).toHaveLength(1);
        expect(normalizedCabinet.sections[0]).toMatchObject({ x: 19, y: 19, width: 562, height: 682 });
        expect(workspace.placements["cabinet-1"]).toMatchObject({ pageId: "cabinet-page-1", x: 0, y: 0 });
    });

    it("migrates legacy top-down placements to bottom-based elevations once", () => {
        const legacy = normalizeWorkspace({
            version: 1,
            activePageId: "page",
            pages: [{ id: "page", name: "Wand" }],
            placements: { "cabinet-1": { pageId: "page", x: 25, y: 80 } },
            guides: { page: { front: [], interior: [] } }
        }, [cabinet]);

        expect(legacy.version).toBe(2);
        expect(legacy.placements["cabinet-1"].y).toBe(-80);
        expect(normalizeWorkspace(legacy, [cabinet]).placements["cabinet-1"].y).toBe(-80);
    });

    it("moves checked cabinets by the active cabinet delta without creating a group", () => {
        const workspace = {
            version: 2,
            activePageId: "page",
            pages: [{ id: "page", name: "Wand" }],
            placements: {
                first: { pageId: "page", x: 100, y: 10, groupId: null },
                second: { pageId: "page", x: 720, y: 30, groupId: null },
                otherPage: { pageId: "other", x: 50, y: 0, groupId: null }
            },
            guides: { page: { front: [], interior: [], dual: [] } }
        };
        const moved = movePlacementSelection({
            workspace,
            activeCabinetId: "first",
            selectedCabinetIds: ["second", "otherPage"],
            axis: "x",
            expression: "START + 50",
            value: 150
        });

        expect(moved.placements.first).toMatchObject({ x: 150, y: 10, groupId: null });
        expect(moved.placements.first.positionExpressions.x).toBe("START + 50");
        expect(moved.placements.second).toMatchObject({ x: 770, y: 30, groupId: null });
        expect(moved.placements.second.positionExpressions.x).toBe("770");
        expect(moved.placements.otherPage.x).toBe(50);

        const resolved = resolveWorkspacePlacementExpressions(moved, [{ name: "START", value: 200 }]);
        expect(resolved.placements.first.x).toBe(250);
        expect(resolved.placements.second.x).toBe(770);
    });

    it("removes persisted placement groups without changing their positions", () => {
        const normalized = normalizeWorkspace({
            version: 2,
            activePageId: "page",
            pages: [{ id: "page", name: "Wand" }],
            placements: {
                "cabinet-1": {
                    pageId: "page",
                    x: 125,
                    y: 40,
                    groupId: "old-group",
                    positionExpressions: { x: "START", y: "SOCKEL" }
                }
            },
            guides: { page: { front: [], interior: [], dual: [] } }
        }, [cabinet]);

        expect(normalized.placements["cabinet-1"]).toMatchObject({
            x: 125,
            y: 40,
            groupId: null,
            positionExpressions: { x: "125", y: "40" }
        });
    });

    it("uses every guide as a named variable measured from the common cabinet base", () => {
        const workspace = normalizeWorkspace({
            activePageId: "page",
            pages: [{ id: "page", name: "Wand" }],
            placements: {},
            guides: {
                page: {
                    front: [
                        { id: "origin", layer: "front", orientation: "horizontal", position: 100, name: "NULL" },
                        { id: "line", layer: "front", orientation: "horizontal", position: 450, name: "FUGE_1" }
                    ],
                    interior: [],
                    origins: { horizontal: "origin" }
                }
            }
        }, []);

        expect(getGuideVariables(workspace)).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: "FUGE_1", value: 450, unit: "mm" })
        ]));
    });

    it("resolves line formulas from measurement variables and other lines", () => {
        const workspace = normalizeWorkspace({
            version: 2,
            activePageId: "page",
            pages: [{ id: "page", name: "Wand" }],
            placements: {},
            guides: {
                page: {
                    front: [{ id: "base", layer: "front", orientation: "horizontal", position: 100, expression: "SOCKEL", name: "BASIS" }],
                    interior: [{ id: "next", layer: "interior", orientation: "horizontal", position: 0, expression: "BASIS + 250", name: "FACH" }],
                    dual: []
                }
            }
        }, []);
        const resolved = resolveWorkspaceGuideExpressions(workspace, [{ name: "SOCKEL", value: 120 }]);

        expect(resolved.guides.page.front[0].position).toBe(120);
        expect(resolved.guides.page.interior[0].position).toBe(370);
    });

    it("keeps cyclic line references stable", () => {
        const workspace = normalizeWorkspace({
            version: 2,
            activePageId: "page",
            pages: [{ id: "page", name: "Wand" }],
            placements: {},
            guides: {
                page: {
                    front: [{ id: "a", layer: "front", orientation: "horizontal", position: 100, expression: "LINIE_B + 10", name: "LINIE_A" }],
                    interior: [{ id: "b", layer: "interior", orientation: "horizontal", position: 200, expression: "LINIE_A + 10", name: "LINIE_B" }],
                    dual: []
                }
            }
        }, []);

        expect(resolveWorkspaceGuideExpressions(workspace)).toBe(workspace);
    });

    it("applies front and interior guides to the generated cabinet geometry", () => {
        const base = ensureCabinetSections(cabinet);
        const placement = { x: 100, y: 50 };
        const withFront = applyGuideToCabinet({
            cabinet: base,
            placement,
            guide: { id: "front-line", layer: "front", orientation: "horizontal", position: 350, name: "FRONT_1" }
        });
        const withWall = applyGuideToCabinet({
            cabinet: withFront,
            placement,
            guide: { id: "wall-line", layer: "interior", orientation: "horizontal", position: 350, name: "WAND_1" }
        });

        expect(withFront.fronts[0].children).toHaveLength(2);
        expect(withWall.sections[0].functionConfig).toEqual([
            expect.objectContaining({ type: "middleWall", orientation: "horizontal", positionOffset: 420, guideId: "wall-line" })
        ]);

        const synced = syncCabinetToGuides({
            cabinet: withWall,
            placement,
            guides: [
                { id: "front-line", layer: "front", orientation: "horizontal", position: 400, name: "FRONT_1" },
                { id: "wall-line", layer: "interior", orientation: "horizontal", position: 400, name: "WAND_1" }
            ]
        });
        expect(synced.fronts[0].children[0].height).toBe(368.5);
        expect(synced.sections[0].functionConfig[0].positionOffset).toBe(370);
    });

    it("locks a wall on a section boundary into its own material-thick section", () => {
        const upper = {
            id: "upper",
            type: "section",
            x: 19,
            y: 19,
            width: 562,
            height: 300,
            functionConfig: [{
                id: "wall",
                type: "middleWall",
                orientation: "horizontal",
                positionReference: "sectionBottom",
                positionOffset: 0,
                measurementExpressions: { "position.sectionBottom": "WAND_POSITION" }
            }],
            children: []
        };
        const lower = {
            id: "lower",
            type: "section",
            x: 19,
            y: 319,
            width: 562,
            height: 382,
            functionConfig: [],
            children: []
        };
        const result = lockMiddleWallSection({
            cabinet: { ...cabinet, sections: [upper, lower] },
            sectionId: "upper",
            functionId: "wall"
        });

        expect(result.cabinet.sections).toHaveLength(3);
        expect(result.wallSection).toMatchObject({
            name: "Mittelwand",
            y: 309.5,
            height: 19,
            lockedMiddleWall: true
        });
        expect(result.cabinet.sections.map(section => section.height)).toEqual([290.5, 19, 372.5]);
        expect(result.wallSection.functionConfig[0]).toMatchObject({ id: "wall", locked: true });
        expect(result.wallSection.functionConfig[0].measurementExpressions).toBeUndefined();
    });

    it("restores the sections created by locking a middle wall", () => {
        const originalSection = {
            id: "section",
            type: "section",
            x: 19,
            y: 19,
            width: 562,
            height: 682,
            functionConfig: [{
                id: "wall",
                type: "middleWall",
                orientation: "horizontal",
                positionReference: "sectionTop",
                positionOffset: 300
            }],
            children: []
        };
        const locked = lockMiddleWallSection({
            cabinet: { ...cabinet, sections: [originalSection] },
            sectionId: originalSection.id,
            functionId: "wall"
        });
        let changes = null;
        let selected = null;

        mergeSectionChildren(
            locked.wallSection.id,
            locked.cabinet,
            next => { changes = next; },
            next => { selected = next; }
        );

        expect(changes.sections).toHaveLength(1);
        expect(changes.sections[0]).toMatchObject({
            id: "section",
            x: 19,
            y: 19,
            width: 562,
            height: 682
        });
        expect(changes.sections[0].lockedMiddleWall).toBeUndefined();
        expect(changes.sections[0].functionConfig).toEqual([
            expect.objectContaining({ id: "wall", type: "middleWall" })
        ]);
        expect(changes.sections[0].functionConfig[0].locked).toBeUndefined();
        expect(selected.id).toBe("section");
    });

    it("resets to one available section when no merge candidate exists", () => {
        const activeCabinet = {
            ...cabinet,
            sections: [
                { id: "first", type: "section", x: 19, y: 19, width: 562, height: 300, functionConfig: [], children: [] },
                { id: "second", type: "section", x: 19, y: 319, width: 562, height: 382, functionConfig: [], children: [] }
            ]
        };
        let changes = null;

        mergeSectionChildren("first", activeCabinet, next => { changes = next; }, () => {});

        expect(changes.sectionLayout).toMatchObject({ spec: "1", direction: "vertical" });
        expect(changes.sections).toHaveLength(1);
        expect(changes.sections[0]).toMatchObject({ x: 19, y: 19, width: 562, height: 682 });
    });

    it("moves a locked wall by resizing only its adjacent sections and clamps at their boundary", () => {
        const locked = {
            ...cabinet,
            sections: [
                { id: "above", x: 19, y: 19, width: 562, height: 290.5, functionConfig: [], children: [] },
                {
                    id: "wall-section",
                    x: 19,
                    y: 309.5,
                    width: 562,
                    height: 19,
                    lockedMiddleWall: true,
                    functionConfig: [{ id: "wall", type: "middleWall", locked: true, orientation: "horizontal", positionReference: "cabinetTop", positionOffset: 1000 }],
                    children: []
                },
                { id: "below", x: 19, y: 328.5, width: 562, height: 372.5, functionConfig: [], children: [] }
            ]
        };
        const moved = reconcileLockedMiddleWalls(locked);

        expect(moved.sections[1]).toMatchObject({ y: 681, height: 19 });
        expect(moved.sections[2]).toMatchObject({ y: 700, height: 1 });
        expect(moved.sections[1].functionConfig[0].positionOffset).toBe(690.5);

        let mergedChanges = null;
        mergeSectionChildren("above", moved, next => { mergedChanges = next; }, () => {});

        expect(mergedChanges.sections).toHaveLength(1);
        expect(mergedChanges.sections[0]).toMatchObject({ y: 19, height: 682 });
        expect(mergedChanges.sections[0].functionConfig[0].locked).toBeUndefined();
    });

    it("keeps the cabinet-bottom reference while reconciling a locked wall", () => {
        const locked = {
            ...cabinet,
            sections: [
                { id: "above", x: 19, y: 19, width: 562, height: 290.5, functionConfig: [], children: [] },
                {
                    id: "wall-section",
                    x: 19,
                    y: 309.5,
                    width: 562,
                    height: 19,
                    lockedMiddleWall: true,
                    functionConfig: [{
                        id: "wall",
                        type: "middleWall",
                        locked: true,
                        orientation: "horizontal",
                        positionReference: "cabinetBottom",
                        positionOffset: 100
                    }],
                    children: []
                },
                { id: "below", x: 19, y: 328.5, width: 562, height: 372.5, functionConfig: [], children: [] }
            ]
        };

        const moved = reconcileLockedMiddleWalls(locked);
        const wall = moved.sections[1].functionConfig[0];

        expect(moved.sections[1]).toMatchObject({ y: 610.5, height: 19 });
        expect(wall).toMatchObject({
            positionReference: "cabinetBottom",
            positionOffset: 100,
            absoluteOffset: 620
        });
    });
});
