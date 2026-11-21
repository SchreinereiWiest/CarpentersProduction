import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DocumentLayoutEditor from "../src/features/company-settings/panels/DocumentLayoutEditor.jsx";
import { createDefaultDocumentLayout } from "../src/features/commercial/document-layout/documentLayout.js";

describe("Belegvorlagen-Editor", () => {
  it("läuft ausschließlich im Vollbild und skaliert nur die Belegansicht", () => {
    const onClose = vi.fn();
    render(<DocumentLayoutEditor value={createDefaultDocumentLayout()} onChange={vi.fn()} logoDataUrl="data:image/png;base64,AAAA" templateName="Angebot" onTemplateNameChange={vi.fn()} documentType="quote" documentTypes={[{ value: "quote", label: "Angebot" }]} onClose={onClose}/>);

    const fullscreenEditor = screen.getByRole("region", { name: "Belegvorlage im Vollbild bearbeiten" });
    expect(fullscreenEditor).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Statischer Text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eingabefeld" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Firmenlogo" })[0]).toBeEnabled();
    expect(screen.getByLabelText("Skalierung der Belegansicht")).toHaveValue("100");
    fireEvent.click(screen.getByRole("button", { name: "Belegansicht vergrößern" }));
    expect(screen.getByLabelText("Skalierung der Belegansicht")).toHaveValue("110");
    fireEvent.wheel(screen.getByRole("region", { name: "Skalierbare Beleg-Arbeitsfläche" }), { deltaY: 100 });
    expect(screen.getByLabelText("Skalierung der Belegansicht")).toHaveValue("105");
    const workspace = screen.getByRole("region", { name: "Skalierbare Beleg-Arbeitsfläche" });
    fireEvent.touchStart(workspace, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 }] });
    fireEvent.touchMove(workspace, { touches: [{ clientX: 0, clientY: 0 }, { clientX: 120, clientY: 0 }] });
    expect(screen.getByLabelText("Skalierung der Belegansicht")).toHaveValue("126");
    expect(fireEvent.wheel(fullscreenEditor, { deltaY: 100 })).toBe(false);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
