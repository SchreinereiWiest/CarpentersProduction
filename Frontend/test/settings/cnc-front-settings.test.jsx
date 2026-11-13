import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import { getDrawerFrontGroups } from "@Engine/cabinet/sektions/front/frontAttachments.js";
import {
    FrontPatternPreview,
    NumberField,
    ToolDatabaseField
} from "../../src/features/company-settings/panels/cncSettingsPanel.jsx";
import { getMachiningParameterSections } from "../../src/features/company-settings/panels/cncSettingsSections.js";

describe("CNC-Fronteneinstellungen", () => {
    it("fasst Bohrverbinder und Spax in einer Parameterseite zusammen", () => {
        const sections = getMachiningParameterSections([
            { id: "connector.drill" },
            { id: "connector.screw" },
            { id: "shelf.row" }
        ]);

        expect(sections.filter(section => section.id === "connector.drill")).toEqual([
            { id: "connector.drill", name: "Bohrverbinder" }
        ]);
        expect(sections.some(section => section.id === "connector.screw")).toBe(false);
        expect(sections.some(section => section.name === "Spax")).toBe(false);
    });

    it("behält ein Minus als Eingabezustand und übernimmt anschließend negative Werte", () => {
        const changed = vi.fn();

        function Harness() {
            const [value, setValue] = useState(13);
            return (
                <NumberField
                    label="Versatz"
                    value={value}
                    onChange={next => {
                        changed(next);
                        setValue(next);
                    }}
                />
            );
        }

        render(<Harness />);
        const input = screen.getByLabelText("Versatz");

        fireEvent.change(input, { target: { value: "" } });
        expect(input).toHaveValue("");
        expect(changed).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { value: "-" } });
        expect(input).toHaveValue("-");
        expect(changed).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { value: "-12,5" } });
        expect(input).toHaveValue("-12,5");
        expect(changed).toHaveBeenLastCalledWith(-12.5);
    });

    it("behält beim Ändern einer Werkzeugkennung den Fokus im Kennungsfeld", () => {
        function Harness() {
            const [tools, setTools] = useState([{ id: "router-8", name: "Fräser", category: "milling", diameter: 8, toolNumber: 114 }]);
            return <ToolDatabaseField field={{ label: "Werkzeugdatenbank" }} value={tools} onChange={setTools} />;
        }

        render(<Harness />);
        const identifier = screen.getByLabelText("Kennung");
        identifier.focus();
        fireEvent.change(identifier, { target: { value: "router-10" } });
        expect(identifier).toHaveValue("router-10");
        expect(document.activeElement).toBe(identifier);
    });

    it("zeigt die Legrabox-Front ungedreht und C mit beiden Bohrgruppen", () => {
        const { container } = render(
            <FrontPatternPreview
                mode="drawer"
                config={DEFAULT_CNC}
                drawerVariant="C"
            />
        );
        const frame = container.querySelector("svg rect");
        const holes = container.querySelectorAll("svg circle");

        expect(Number(frame.getAttribute("width"))).toBeGreaterThan(Number(frame.getAttribute("height")));
        expect(screen.getByText("DX · Frontbreite 600 mm")).toBeInTheDocument();
        expect(holes).toHaveLength(4);
    });

    it("löst frei benannte Kennungen und verknüpfte Basisprogramme auf", () => {
        const drawerConfig = {
            programs: [
                {
                    id: "base-x",
                    name: "System X Basis",
                    matchKeys: "X",
                    groups: [{ id: "x-base", holes: [{ id: "x-1" }] }]
                },
                {
                    id: "system-y",
                    name: "System Y Zusatz",
                    matchKeys: "Y,Z",
                    extendsProgramId: "base-x",
                    groups: [
                        { id: "y-extra-1", holes: [{ id: "y-1" }, { id: "y-2" }] },
                        { id: "y-extra-2", holes: [{ id: "y-3" }] }
                    ]
                }
            ]
        };

        expect(getDrawerFrontGroups(drawerConfig, "Z").map(group => group.id)).toEqual([
            "x-base",
            "y-extra-1",
            "y-extra-2"
        ]);
    });
});
