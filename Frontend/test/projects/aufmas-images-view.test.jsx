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
});
