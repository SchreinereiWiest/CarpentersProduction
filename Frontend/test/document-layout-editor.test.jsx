import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DocumentLayoutEditor from "../src/features/company-settings/panels/DocumentLayoutEditor.jsx";
import { createDefaultDocumentLayout } from "../src/features/commercial/document-layout/documentLayout.js";

describe("Belegvorlagen-Editor", () => {
  it("läuft ausschließlich im Vollbild und skaliert nur die Belegansicht", () => {
    const onClose = vi.fn();
    render(<DocumentLayoutEditor value={createDefaultDocumentLayout()} onChange={vi.fn()} logoDataUrl="data:image/png;base64,AAAA" templateName="Angebot" onTemplateNameChange={vi.fn()} documentType="quote" documentTypes={[{ value: "quote", label: "Angebot" }]} onClose={onClose}/>);

    expect(screen.getByRole("region", { name: "Belegvorlage im Vollbild bearbeiten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Statischer Text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eingabefeld" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Firmenlogo" })[0]).toBeEnabled();
    expect(screen.getByLabelText("Skalierung der Belegansicht")).toHaveValue("100");
    fireEvent.click(screen.getByRole("button", { name: "Belegansicht vergrößern" }));
    expect(screen.getByLabelText("Skalierung der Belegansicht")).toHaveValue("110");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
