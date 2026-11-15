import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImagesView from "../../src/features/projects/measurement/views/images/ImagesView.jsx";

describe("Aufmaß project images", () => {
  it("creates a named editable view from a selected project image", () => {
    const photo = {
      id: "photo-1",
      fileName: "schrankwand.jpg",
      url: "blob:schrankwand"
    };
    const onCreateView = vi.fn();

    render(
      <ImagesView
        photos={[photo]}
        onUpload={vi.fn()}
        onCreateView={onCreateView}
        uploading={false}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /schrankwand\.jpg/i })
    );
    const nameInput = screen.getByLabelText("Name der Ansicht");
    expect(nameInput).toHaveValue("schrankwand");

    fireEvent.change(nameInput, { target: { value: "Front Schrankwand" } });
    fireEvent.click(screen.getByRole("button", { name: "Ansicht hinzufügen" }));

    expect(onCreateView).toHaveBeenCalledWith(photo, "Front Schrankwand");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not offer view creation in read-only mode", () => {
    render(
      <ImagesView
        photos={[{ id: "photo-1", fileName: "raum.png", url: "blob:raum" }]}
        onUpload={vi.fn()}
        onCreateView={vi.fn()}
        uploading={false}
        readOnly
      />
    );

    expect(screen.getByRole("button", { name: /raum\.png/i })).toBeDisabled();
  });

  it("setzt im Auswahlmodus ein Bild direkt in das Exposé ein", () => {
    const photo = { id: "photo-1", fileName: "raum.png", url: "blob:raum" };
    const onSelectPhoto = vi.fn();
    const onCancelSelection = vi.fn();

    render(
      <ImagesView
        photos={[photo]}
        onUpload={vi.fn()}
        onCreateView={vi.fn()}
        uploading={false}
        selectionMode
        onSelectPhoto={onSelectPhoto}
        onCancelSelection={onCancelSelection}
      />
    );

    expect(screen.getByText("Bild für das Exposé auswählen")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /raum\.png/i }));
    expect(onSelectPhoto).toHaveBeenCalledWith(photo);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(onCancelSelection).toHaveBeenCalledTimes(1);
  });
});
