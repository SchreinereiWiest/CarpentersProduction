import test from "node:test";
import assert from "node:assert/strict";

import {
    applyStoredCncPrograms,
    createCncProgramPreviewSvg,
    getCncProgramConfig,
    storePartCncHeaderInCabinet,
    storePartCncInCabinet
} from "../src/cabinet/cnc/manualPrograms.js";
import { createFunctionPreset, applyFunctionPreset } from "../src/cabinet/sektions/functionPresets.js";
import { resizeCabinetContents } from "../src/cabinet/geometry/resizeCabinetContents.js";
import { MACHINING_INTENT_IDS, MACHINING_KINDS } from "../src/postprocessor/machiningModel.js";

const coordinateSystem = {
    unit: "mm",
    origin: "top-left",
    xAxis: "right",
    yAxis: "down",
    depthDirection: "into-material"
};

const cabinet = {
    id: "cabinet-1",
    width: 600,
    height: 720,
    depth: 560,
    thickness: 19,
    functionConfig: [],
    sections: [{
        id: "section-1",
        x: 19,
        y: 19,
        width: 562,
        height: 682,
        functionConfig: [{
            id: "shelf-function",
            type: "shelf",
            compartmentCount: 2,
            holeRow: { spacing: 32, frontOffset: 37, backOffset: 37, startFromBottom: 100, endFromTop: 100 }
        }],
        children: []
    }]
};

const editedRow = {
    id: "row-edited",
    kind: MACHINING_KINDS.DRILL_ROW,
    intentId: MACHINING_INTENT_IDS.SHELF_PIN_ROW,
    face: "A",
    start: 83,
    end: 620,
    spacing: 64,
    crossPositions: [45, 515],
    diameter: 5,
    depth: 14,
    source: { type: "section", role: "shelf", sectionId: "section-1", functionId: "shelf-function" }
};

const manualDrill = {
    id: "manual-drill",
    kind: MACHINING_KINDS.DRILL_POINT,
    intentId: MACHINING_INTENT_IDS.MANUAL_DRILLING,
    face: "A",
    x: 100,
    y: 120,
    diameter: 5,
    depth: 12,
    source: { type: "manualCncEditor", toolId: "drill.point" }
};

test("CNC editor programs are stored in the parent cabinet function config and reapplied", () => {
    const part = {
        PID: "000002",
        _generatedId: "cabinet-1:part:1",
        _cabinetId: "cabinet-1",
        Objektname: "Seite links",
        L: 720,
        B: 560,
        T: 19,
        Source: { role: "side", continuous: true },
        CNC: { version: 2, coordinateSystem, operations: [manualDrill, editedRow] }
    };

    const stored = storePartCncInCabinet(cabinet, part, part.CNC.operations);
    const registry = getCncProgramConfig(stored);
    assert.equal(registry.recognizedProfiles.length, 1);
    assert.equal(registry.customPrograms.length, 1);
    assert.equal(registry.recognizedProfiles[0].scope, "section");
    assert.equal(registry.customPrograms[0].scope, "global");
    assert.match(registry.customPrograms[0].previewSvg, /^<svg/);
    assert.equal(stored.sections[0].functionConfig[0].holeRow.spacing, 64);
    assert.equal(stored.sections[0].functionConfig[0].holeRow.frontOffset, 45);

    const regenerated = {
        ...part,
        CNC: {
            version: 2,
            coordinateSystem,
            operations: [{ ...editedRow, id: "regenerated-row", spacing: 32 }]
        }
    };
    applyStoredCncPrograms(stored, [regenerated]);
    assert.deepEqual(regenerated.CNC.operations.map(operation => operation.id), ["manual-drill", "row-edited"]);
    assert.equal(regenerated.CNC.operations[1].spacing, 64);

    const resized = resizeCabinetContents(stored, { width: 650 });
    assert.equal(getCncProgramConfig(resized).customPrograms[0].operations[0].id, "manual-drill");
});

test("removed recognized operations stay suppressed after cabinet regeneration", () => {
    const part = {
        PID: "000002",
        _generatedId: "cabinet-1:part:1",
        _cabinetId: "cabinet-1",
        Objektname: "Seite links",
        L: 720,
        B: 560,
        T: 19,
        CNC: { version: 2, coordinateSystem, operations: [editedRow] }
    };

    const stored = storePartCncInCabinet(cabinet, part, []);
    const registry = getCncProgramConfig(stored);
    assert.equal(registry.recognizedProfiles.length, 1);
    assert.equal(registry.recognizedProfiles[0].suppressed, true);
    assert.deepEqual(registry.recognizedProfiles[0].operations, []);

    const regenerated = {
        ...part,
        CNC: {
            version: 2,
            coordinateSystem,
            operations: [{ ...editedRow, id: "regenerated-row" }]
        }
    };
    applyStoredCncPrograms(stored, [regenerated]);
    assert.deepEqual(regenerated.CNC.operations, []);

    const storedAgain = storePartCncInCabinet(stored, regenerated, []);
    assert.equal(getCncProgramConfig(storedAgain).recognizedProfiles[0].suppressed, true);
});

test("part program headers are stored with the cabinet and restored during compilation", () => {
    const part = {
        PID: "000002",
        _generatedId: "cabinet-1:part:1",
        _cabinetId: "cabinet-1",
        L: 720,
        B: 560,
        T: 19,
        CNC: { version: 2, coordinateSystem, operations: [] }
    };
    const header = { stopId: "DA", edgeAtStop: "back", sx: true, sy: false, comment: "Linke Seite" };
    const stored = storePartCncInCabinet(cabinet, part, [], { header });
    assert.deepEqual(getCncProgramConfig(stored).partHeaders[0].header, header);

    const regenerated = { ...part, CNC: { version: 2, coordinateSystem, operations: [] } };
    applyStoredCncPrograms(stored, [regenerated]);
    assert.deepEqual(regenerated.CNC.header, header);
});

test("saving only a part header preserves the stored CNC programs", () => {
    const part = {
        PID: "000002",
        _generatedId: "cabinet-1:part:1",
        _cabinetId: "cabinet-1",
        L: 720,
        B: 560,
        T: 19,
        CNC: { version: 2, coordinateSystem, operations: [manualDrill, editedRow] }
    };
    const storedPrograms = storePartCncInCabinet(cabinet, part, part.CNC.operations);
    const before = getCncProgramConfig(storedPrograms);
    const header = { stopId: "AD", edgeAtStop: "front", sx: false, sy: true, comment: "Viewer" };
    const storedHeader = storePartCncHeaderInCabinet(storedPrograms, part, header);
    const after = getCncProgramConfig(storedHeader);

    assert.deepEqual(after.recognizedProfiles, before.recognizedProfiles);
    assert.deepEqual(after.customPrograms, before.customPrograms);
    assert.deepEqual(after.partOrders, before.partOrders);
    assert.deepEqual(after.partHeaders, [{ partKey: "part:1", partId: "000002", header }]);
});

test("function presets preserve CNC program headers and remap section references", () => {
    const part = {
        PID: "000002",
        _generatedId: "cabinet-1:part:1",
        Objektname: "Seite",
        L: 720,
        B: 560,
        T: 19
    };
    const stored = storePartCncInCabinet(cabinet, part, [editedRow]);
    const preset = createFunctionPreset(stored);
    const applied = applyFunctionPreset({ ...cabinet, id: "cabinet-2", functionConfig: [], sections: [] }, preset);
    const registry = getCncProgramConfig(applied);
    const functionId = applied.sections[0].functionConfig[0].id;
    assert.equal(registry.recognizedProfiles[0].functionId, functionId);
    assert.equal(registry.recognizedProfiles[0].partKey, "part:1");
    assert.equal(registry.partOrders[0].operationIds[0], registry.recognizedProfiles[0].operations[0].id);
    assert.notEqual(registry.partOrders[0].operationIds[0], editedRow.id);
});

test("SVG previews expand drilling patterns and show the compensated cutter path", () => {
    const svg = createCncProgramPreviewSvg({ L: 300, B: 200 }, [
        {
            id: "row",
            kind: MACHINING_KINDS.DRILL_LINEAR_PATTERN,
            intentId: MACHINING_INTENT_IDS.MANUAL_DRILLING,
            face: "A",
            x: 40,
            y: 30,
            count: 3,
            spacing: 32,
            diameter: 5,
            depth: 15
        },
        {
            id: "line",
            kind: MACHINING_KINDS.MILL_PATH,
            intentId: MACHINING_INTENT_IDS.MANUAL_MILLING,
            face: "A",
            motion: "linear",
            start: { x: 0, y: 100, z: 8 },
            target: { x: 200, y: 100, z: 8 },
            compensation: "left",
            toolId: "router-10"
        }
    ], [{ id: "router-10", category: "milling", diameter: 10 }]);

    assert.equal((svg.match(/<circle/g) ?? []).length, 3);
    assert.match(svg, /y1="95"/);
    assert.match(svg, /stroke="#38bdf8"/);
});
