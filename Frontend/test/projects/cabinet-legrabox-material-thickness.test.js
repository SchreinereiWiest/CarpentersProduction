import { describe, expect, it } from "vitest";

import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import { buildPartList } from "@Engine/cabinet/partList/buildPartList.js";
import { generateLegraboxParts } from "@Engine/cabinet/partList/geometry/generate/generateLegraboxParts.js";

const materials = [
    { id: "body-19", materialNumber: "BODY-19", thickness: 19 },
    { id: "drawer-white-16", materialNumber: "DRAWER-WHITE-16", thickness: "16" },
    { id: "drawer-gray-12", materialNumber: "DRAWER-GRAY-12", thickness: 12 }
];

const cabinet = {
    depth: 560,
    thickness: 19,
    materialId: "body-19",
    sections: [{
        id: "drawer-section",
        width: 562,
        children: [],
        functionConfig: [
            { id: "drawer-white", type: "legrabox", variant: "M", materialColor: "white" },
            { id: "drawer-gray", type: "legrabox", variant: "M", materialColor: "gray" }
        ]
    }]
};

const assignedCncConfig = {
    ...DEFAULT_CNC,
    legrabox: {
        ...DEFAULT_CNC.legrabox,
        materials: {
            whiteMaterialId: "drawer-white-16",
            grayMaterialId: "drawer-gray-12"
        }
    }
};

describe("Legrabox-Materialstärke", () => {
    it("übernimmt die Stärke des in den CNC-Einstellungen zugewiesenen Materials", () => {
        let pid = 0;
        const parts = generateLegraboxParts({
            cabinet,
            materials,
            nextPID: () => String(++pid).padStart(6, "0"),
            color: "#fff",
            cncConfig: assignedCncConfig
        });

        const whiteParts = parts.filter(part => part.Source.functionId === "drawer-white");
        const grayParts = parts.filter(part => part.Source.functionId === "drawer-gray");

        expect(whiteParts).toHaveLength(2);
        expect(whiteParts.every(part => part.T === 16 && part.MID === "DRAWER-WHITE-16")).toBe(true);
        expect(grayParts).toHaveLength(2);
        expect(grayParts.every(part => part.T === 12 && part.MID === "DRAWER-GRAY-12")).toBe(true);
    });

    it("führt die zugewiesene Stärke bis in die gespeicherte Cabinet-Bauteilliste", async () => {
        const [root] = await buildPartList([{
            ...cabinet,
            id: "cabinet-1",
            name: "Legrabox-Schrank",
            quantity: 1,
            width: 600,
            height: 720,
            topExists: true,
            bottomExists: true,
            continuous: "side",
            fronts: [],
            backPanel: { construction: "butt", materialId: "body-19", thickness: 19 }
        }], materials, assignedCncConfig);

        const drawerParts = root.Children.filter(part => part.Source?.type === "legrabox");
        expect(drawerParts).toHaveLength(4);
        expect(drawerParts.filter(part => part.Source.functionId === "drawer-white").every(part => part.T === 16)).toBe(true);
        expect(drawerParts.filter(part => part.Source.functionId === "drawer-gray").every(part => part.T === 12)).toBe(true);
    });

    it("verwendet die Korpusstärke nur als Fallback ohne gültige Materialstärke", () => {
        let pid = 0;
        const parts = generateLegraboxParts({
            cabinet: {
                ...cabinet,
                sections: [{
                    ...cabinet.sections[0],
                    functionConfig: [{ id: "drawer-white", type: "legrabox", variant: "M", materialColor: "white" }]
                }]
            },
            materials,
            nextPID: () => String(++pid).padStart(6, "0"),
            color: "#fff",
            cncConfig: DEFAULT_CNC
        });

        expect(parts).toHaveLength(2);
        expect(parts.every(part => part.T === 19 && part.MID === "BODY-19")).toBe(true);
    });
});
