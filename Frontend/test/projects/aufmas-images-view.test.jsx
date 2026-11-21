import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImagesView from "../../src/features/projects/measurement/views/images/ImagesView.jsx";

describe("Aufmaß project images", () => {
  it("opens a project image in fullscreen", () => {
    const photo = {
      id: "photo-1",
      fileName: "schrankwand.jpg",
      url: "blob:schrankwand"
    };
    render(
      <ImagesView
        photos={[photo]}
        onUpload={vi.fn()}
        uploading={false}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /schrankwand\.jpg/i })
    );
    expect(screen.getByRole("dialog", { name: "schrankwand.jpg im Vollbild" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vollbild schließen" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps fullscreen viewing available in read-only mode", () => {
    render(
      <ImagesView
        photos={[{ id: "photo-1", fileName: "raum.png", url: "blob:raum" }]}
        onUpload={vi.fn()}
        uploading={false}
        readOnly
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /raum\.png/i }));
    expect(screen.getByRole("dialog", { name: "raum.png im Vollbild" })).toBeInTheDocument();
  });

  it("setzt im Auswahlmodus ein Bild direkt in das Exposé ein", () => {
    const photo = { id: "photo-1", fileName: "raum.png", url: "blob:raum" };
    const onSelectPhoto = vi.fn();
    const onCancelSelection = vi.fn();

    render(
      <ImagesView
        photos={[photo]}
        onUpload={vi.fn()}
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
