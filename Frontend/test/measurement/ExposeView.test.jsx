import { useState } from "react";
import axios from "axios";
import QRCode from "qrcode";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExposeView from "../../src/features/projects/measurement/views/expose/ExposeView.jsx";

describe("Exposé-Live-Editor", () => {
  it("wechselt zwischen Gesamt- und Einzelseite und bietet den PDF-Druck an", () => {
    const onPrint = vi.fn();
    render(
      <ExposeView
        value={{}}
        onChange={() => {}}
        project={{ id: "project-1", title: "Empfangstheke" }}
        photos={[]}
        views={[]}
        onPrint={onPrint}
      />
    );

    expect(screen.getByText("1 Seiten · Gesamtansicht")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Titelseite bearbeiten" }));
    expect(screen.getByText("Titelseite · Einzelansicht")).toBeInTheDocument();
    const page = screen.getByLabelText("Titelseite · A4-Seite");
    expect(Number.parseFloat(page.style.width) / Number.parseFloat(page.style.height))
      .toBeCloseTo(297 / 210, 5);

    expect(fireEvent.wheel(screen.getByLabelText("Exposé-Arbeitsfläche"), { deltaY: -100 }))
      .toBe(false);
    expect(screen.getByText("110 %")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seite einpassen" }));
    expect(fireEvent.wheel(screen.getByLabelText("Exposé-Arbeitsfläche"), { deltaX: 24, deltaY: 12 }))
      .toBe(true);
    expect(screen.getByText("100 %")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seite vergrößern" }));
    expect(screen.getByText("125 %")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Drucken" }));
    expect(onPrint).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(screen.getByLabelText("Exposé-Arbeitsfläche"));
    expect(screen.getByText("Titelseite · Einzelansicht")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByLabelText("Bereich neben der A4-Seite"));
    expect(screen.getByText("1 Seiten · Gesamtansicht")).toBeInTheDocument();
  });

  it("öffnet in der Gesamtansicht eine Seite auch beim Klick auf einen belegten Block", () => {
    render(
      <ExposeView
        value={{}}
        onChange={() => {}}
        project={{ id: "project-1", title: "Empfangstheke" }}
        photos={[{ id: "photo-1", url: "data:image/png;base64,AAAA" }]}
        views={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Projektbild auswählen" }));
    expect(screen.getByText("Perspektive 1 · Einzelansicht")).toBeInTheDocument();
  });

  it("speichert einen bewusst geleerten Textblock samt unveränderter Blockgröße", () => {
    function Harness() {
      const [value, setValue] = useState({});
      return (
        <ExposeView
          value={value}
          onChange={setValue}
          project={{ id: "project-1", title: "Empfangstheke" }}
          photos={[{ id: "photo-1", url: "data:image/png;base64,AAAA" }]}
          views={[]}
        />
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Perspektive 1 bearbeiten" }));
    const titleBlock = screen.getByRole("button", { name: "Seitentitel auswählen" });
    const initialSize = { width: titleBlock.style.width, height: titleBlock.style.height };
    fireEvent.click(titleBlock);
    expect(screen.getByLabelText("Schriftgröße")).toHaveValue("12.5");
    fireEvent.change(screen.getByLabelText("Schriftgröße"), { target: { value: "18" } });
    expect(screen.getByLabelText("Schriftgröße")).toHaveValue("18");

    fireEvent.change(screen.getByLabelText("Seitentitel"), { target: { value: "" } });

    expect(screen.getByLabelText("Seitentitel")).toHaveValue("");
    expect(titleBlock.style.width).toBe(initialSize.width);
    expect(titleBlock.style.height).toBe(initialSize.height);
  });

  it("bietet Seitenwerkzeuge an und kann das Bild eines ausgewählten Blocks wechseln", () => {
    const onRequestImage = vi.fn();
    render(
      <ExposeView
        value={{
          customBlocks: {
            cover: [{
              id: "custom:image-1",
              type: "image",
              imageId: null,
              layout: { x: 130, y: 40, width: 80, height: 60, cropX: 50, cropY: 50, zoom: 1 }
            }]
          }
        }}
        onChange={() => {}}
        project={{ id: "project-1", title: "Empfangstheke" }}
        photos={[]}
        views={[]}
        onRequestImage={onRequestImage}
        focusPageId="cover"
      />
    );

    expect(screen.getByText("Werkzeuge")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Textfeld" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bild" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logo" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Projektbild auswählen" }));
    fireEvent.click(screen.getByRole("button", { name: "Bild aus Projektbildern wählen" }));
    expect(onRequestImage).toHaveBeenCalledWith({
      kind: "custom",
      pageId: "cover",
      blockId: "custom:image-1"
    });
  });

  it("zieht mit einem Werkzeug ein neues Textfeld auf der A4-Seite auf", () => {
    function Harness() {
      const [value, setValue] = useState({});
      return (
        <ExposeView
          value={value}
          onChange={setValue}
          project={{ id: "project-1", title: "Empfangstheke" }}
          photos={[]}
          views={[]}
          focusPageId="cover"
        />
      );
    }

    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Textfeld" }));
    const pageContent = container.querySelector(".cursor-crosshair");
    pageContent.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 891,
      height: 630,
      right: 891,
      bottom: 630,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    fireEvent.pointerDown(pageContent, { button: 0, pointerId: 1, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(pageContent, { pointerId: 1, clientX: 330, clientY: 180 });
    fireEvent.pointerUp(pageContent, { pointerId: 1, clientX: 330, clientY: 180 });

    expect(screen.getByRole("button", { name: "Textfeld auswählen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Textfeld" })).toBeInTheDocument();
    expect(screen.getByLabelText("Schriftgröße")).toHaveValue("9");
    fireEvent.change(screen.getByLabelText("Schriftgröße"), { target: { value: "14" } });
    expect(screen.getByLabelText("Schriftgröße")).toHaveValue("14");
  });

  it("deaktiviert das Objekt-Highlighting in der Gesamtansicht und fügt manuelle Vorlagenseiten ein", () => {
    function Harness() {
      const [value, setValue] = useState({});
      return <ExposeView value={value} onChange={setValue} project={{ title: "Projekt" }} photos={[]} views={[]} />;
    }

    render(<Harness />);
    expect(screen.getByRole("button", { name: "Projekttitel auswählen" }).className).not.toContain("hover:ring");
    fireEvent.click(screen.getByRole("button", { name: "Titelseite bearbeiten" }));
    expect(screen.getByLabelText("Seitenvorlage")).toHaveValue("title");
    fireEvent.click(screen.getByRole("button", { name: /Seite$/ }));

    expect(screen.getByText("Neue Zwischenseite · Einzelansicht")).toBeInTheDocument();
    expect(screen.getByLabelText("Seitenvorlage")).toHaveValue("title");
    expect(screen.getByLabelText("Seitenformat")).toHaveValue("landscape");
    expect(screen.getByLabelText("Titel")).toHaveValue("Zwischentitel");
    fireEvent.change(screen.getByLabelText("Seitenformat"), { target: { value: "portrait" } });
    expect(screen.getByLabelText("Seitenformat")).toHaveValue("portrait");
    const portraitPage = screen.getByLabelText("Neue Zwischenseite · A4-Seite");
    expect(Number.parseFloat(portraitPage.style.width) / Number.parseFloat(portraitPage.style.height))
      .toBeCloseTo(210 / 297, 5);
  });

  it("setzt einen signierten Projekt-QR mit Gesamt-PDF-Flag auf Titel- und manuelle Seiten", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue({
      data: {
        value: "CPD1.payload.signature",
        payload: { projectId: "project-1", wholePdf: true }
      }
    });
    vi.spyOn(QRCode, "toDataURL").mockResolvedValue("data:image/png;base64,QR");

    function Harness() {
      const [value, setValue] = useState({});
      return <ExposeView value={value} onChange={setValue} project={{ id: "project-1", title: "Projekt" }} photos={[]} views={[]} focusPageId="cover" />;
    }

    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Projekt-QR" }));
    const pageContent = container.querySelector(".cursor-crosshair");
    pageContent.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 891,
      height: 630,
      right: 891,
      bottom: 630,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    fireEvent.pointerDown(pageContent, { button: 0, pointerId: 1, clientX: 30, clientY: 30 });
    fireEvent.pointerUp(pageContent, { pointerId: 1, clientX: 140, clientY: 140 });

    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/paperless/qr", expect.objectContaining({
      targetType: "project",
      targetId: "project-1",
      documentType: "Exposé",
      wholePdf: true
    })));
    expect(await screen.findByRole("button", { name: "Projekt-QR-Code auswählen" })).toBeInTheDocument();
    const wholePdf = screen.getByRole("checkbox", { name: /Gesamte PDF zuordnen/ });
    expect(wholePdf).toBeChecked();
    fireEvent.click(wholePdf);
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/api/paperless/qr", expect.objectContaining({ wholePdf: false })));
    expect(wholePdf).not.toBeChecked();

    post.mockRestore();
    QRCode.toDataURL.mockRestore();
  });

  it("erzeugt CNC-Seiten und ändert die automatische Programmanzahl", () => {
    function Harness() {
      const [value, setValue] = useState({});
      const part = {
        PID: "P-1",
        Objektname: "Seite links",
        Plattentyp: "TE",
        L: 720,
        B: 560,
        CNC: { operations: [{ type: "BO", x: 37, y: 64, diameter: 5 }] }
      };
      return <ExposeView value={value} onChange={setValue} project={{ title: "Projekt" }} photos={[]} views={[]} partsList={[{ PID: "K-1", Objektname: "Korpus", Plattentyp: "KO", Children: [part] }]} />;
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "CNC-Programme 1–1 bearbeiten" }));
    expect(screen.getByText("Seite links")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("CNC-Programme pro Seite"), { target: { value: "2" } });
    expect(screen.getByLabelText("CNC-Programme pro Seite")).toHaveValue("2");
  });

  it("verwendet für Korpusblätter standardmäßig das farbige Vollformat", () => {
    function Harness() {
      const [value, setValue] = useState({});
      return <><ExposeView value={value} onChange={setValue} project={{ title: "Projekt" }} photos={[]} views={[]} cabinets={[{ id: "cabinet-1", name: "Unterschrank", width: 600, height: 720, depth: 560 }]} /><output data-testid="cabinet-layout">{JSON.stringify(value.pageLayouts ?? {})}</output></>;
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Korpusblätter 1–1 bearbeiten" }));
    expect(screen.getByLabelText("Seitenvorlage")).toHaveValue("cabinet-standard");
    fireEvent.click(screen.getByRole("button", { name: "Korpusansicht 1 auswählen" }));
    expect(screen.getByRole("heading", { name: "Korpusansicht 1" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Breite · mm"), { target: { value: "72" } });
    expect(screen.getByTestId("cabinet-layout")).toHaveTextContent('"cabinetImage:0":{"x":16,"y":56,"width":72');
  });

  it("speichert eine per Drag-and-drop geänderte Seitenreihenfolge", () => {
    function Harness() {
      const [value, setValue] = useState({});
      return <><ExposeView value={value} onChange={setValue} project={{ title: "Projekt" }} photos={[{ id: "photo-1", url: "blob:photo" }]} views={[]} /><output data-testid="page-order">{JSON.stringify(value.pageOrder ?? [])}</output></>;
    }

    const { container } = render(<Harness />);
    const [cover, perspective] = container.querySelectorAll('[draggable="true"]');
    fireEvent.dragStart(perspective, { dataTransfer: { setData: vi.fn(), effectAllowed: "move" } });
    fireEvent.dragOver(cover);
    fireEvent.drop(cover, { dataTransfer: { getData: () => "image:photo-1" } });

    expect(screen.getByTestId("page-order")).toHaveTextContent('["image:photo-1","cover"]');
  });
});
