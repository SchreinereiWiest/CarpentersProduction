import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MaterialSelect from "../../src/features/projects/cabinet/components/editor/properties/MaterialSelect.jsx";


const materials = Array.from({ length: 15 }, (_, index) => ({
    id: `material-${index + 1}`,
    materialNumber: `M-${String(index + 1).padStart(2, "0")}`,
    name: `Material ${index + 1}`,
    thickness: 19
}));


describe("MaterialSelect", () => {
    it("shows at most ten suggestions and filters the material database", () => {
        const onChange = vi.fn();

        render(
            <MaterialSelect
                label="Korpusmaterial"
                value=""
                materials={materials}
                onChange={onChange}
            />
        );

        const input = screen.getByRole("combobox", {
            name: "Korpusmaterial"
        });

        fireEvent.focus(input);

        expect(
            within(screen.getByRole("listbox")).getAllByRole("option")
        ).toHaveLength(10);

        fireEvent.change(input, { target: { value: "M-12" } });

        const filteredOptions = within(
            screen.getByRole("listbox")
        ).getAllByRole("option");

        expect(filteredOptions).toHaveLength(1);
        expect(filteredOptions[0]).toHaveTextContent("Material 12");

        fireEvent.click(filteredOptions[0]);

        expect(onChange).toHaveBeenCalledWith("material-12");
    });
});
