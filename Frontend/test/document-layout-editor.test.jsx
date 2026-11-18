import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DocumentLayoutEditor from "../src/features/company-settings/panels/DocumentLayoutEditor.jsx";
import { createDefaultDocumentLayout } from "../src/features/commercial/document-layout/documentLayout.js";

describe("Beleglayout-Editor", () => {
  it("öffnet den Editor im Vollbild und beendet ihn per Escape", () => {
    render(<DocumentLayoutEditor value={createDefaultDocumentLayout()} onChange={vi.fn()}/>);

    fireEvent.click(screen.getByRole("button", { name: "Editor im Vollbild" }));
    expect(screen.getByRole("region", { name: "Beleglayout im Vollbild bearbeiten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vollbild verlassen" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Beleglayout im Vollbild bearbeiten" })).not.toBeInTheDocument();
  });
});
