import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MeasurementVariablesModal from "../../src/features/projects/cabinet/components/editor/MeasurementVariablesModal.jsx";

describe("Cabinet measurement variables modal", () => {
    it("shows linked variables and saves newly entered project variables", async () => {
        const onSave = vi.fn().mockResolvedValue(undefined);
        render(
            <MeasurementVariablesModal
                linkedVariables={[{ name: "RH", value: 2400, unit: "mm", label: "Raumhöhe" }]}
                variables={[]}
                onCancel={vi.fn()}
                onSave={onSave}
            />
        );

        expect(screen.getByText("RH")).toBeInTheDocument();
        expect(screen.getByText("2400 mm")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "+ Variable hinzufügen" }));
        fireEvent.change(screen.getByPlaceholderText("z. B. sockel_hoehe"), {
            target: { value: "SOCKEL" }
        });
        fireEvent.change(screen.getByPlaceholderText("0"), {
            target: { value: "120,5" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Variablen speichern" }));

        await waitFor(() => expect(onSave).toHaveBeenCalledWith([
            { name: "SOCKEL", value: 120.5, unit: "mm", label: "SOCKEL", status: "manual" }
        ]));
    });

    it("rejects names that already belong to a linked Aufmaß object", async () => {
        const onSave = vi.fn();
        render(
            <MeasurementVariablesModal
                linkedVariables={[{ name: "RH", value: 2400, unit: "mm", label: "Raumhöhe" }]}
                variables={[]}
                onCancel={vi.fn()}
                onSave={onSave}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "+ Variable hinzufügen" }));
        fireEvent.change(screen.getByPlaceholderText("z. B. sockel_hoehe"), {
            target: { value: "rh" }
        });
        fireEvent.change(screen.getByPlaceholderText("0"), {
            target: { value: "100" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Variablen speichern" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("bereits vorhanden");
        expect(onSave).not.toHaveBeenCalled();
    });
});
