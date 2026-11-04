import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { MACHINING_INTENT_IDS, MACHINING_KINDS } from "@Engine/postprocessor/index.js";
import ManualOperationDialog from "../../src/features/projects/cnc/ManualOperationDialog.jsx";

describe("manual CNC operation dialog", () => {
    it("calculates numeric parameters with DX, DY and DZ variables", () => {
        const saved = vi.fn();
        const draft = {
            id: "drill",
            kind: MACHINING_KINDS.DRILL_POINT,
            intentId: MACHINING_INTENT_IDS.MANUAL_DRILLING,
            face: "A",
            x: 10,
            y: 20,
            diameter: 5,
            depth: 12
        };
        const variables = [
            { name: "DX", value: 600, unit: "mm" },
            { name: "DY", value: 400, unit: "mm" },
            { name: "DZ", value: 19, unit: "mm" }
        ];

        function Harness() {
            const [current, setCurrent] = useState(draft);
            return <ManualOperationDialog draft={current} onChange={setCurrent} onCancel={() => {}} onSave={saved} variables={variables} tools={[]} onPickRequest={() => {}} />;
        }

        const { container } = render(<Harness />);
        fireEvent.change(container.querySelector("input"), { target: { value: "DX / 2 - DZ" } });
        fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

        expect(saved).toHaveBeenCalledWith(expect.objectContaining({
            x: 281,
            parameterExpressions: expect.objectContaining({ x: "DX / 2 - DZ" })
        }));
    });
});
