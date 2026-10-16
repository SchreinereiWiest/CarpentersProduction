import { useState } from "react";
import AufmasIcon from "../common/AufmasIcon.jsx";

const TOOLS = [
  {
    id: "measurement",
    label: "Maßlinie erstellen",
    description: "Zwei Fangpunkte wählen",
    icon: "measure",
    shortcut: "M"
  },
  {
    id: "angle",
    label: "Winkeleintrag",
    description: "Drei Punkte wählen",
    icon: "angle",
    shortcut: "W"
  },
  {
    id: "point",
    label: "Punkt / Installation",
    description: "Setzt einen neuen Fangpunkt",
    icon: "point",
    shortcut: "P"
  },
  {
    id: "cabinet",
    label: "Korpus verknüpfen",
    description: "Auswahlrechteck aufziehen",
    icon: "cabinet",
    shortcut: "K"
  }
];

const LAYERS = [
  { id: "plan", label: "PDF-Plan", swatch: "bg-[#c9b27b]" },
  { id: "dxf", label: "DXF-Raster", swatch: "bg-[#7ca0b8]" },
  { id: "objects", label: "Aufmaßobjekte", swatch: "bg-[#d99b52]" },
  { id: "snapPoints", label: "Fangpunkte", swatch: "bg-[#63aee0]" },
  { id: "objectLabels", label: "Punkt- & Korpustexte", swatch: "bg-[#8c70b5]" }
];

export function ToolPanel({
  activeTool,
  onToolChange,
  display,
  onDisplayChange,
  activeView,
  objectCount,
  saveStatus
}) {
  const drawingDisabled = ["three", "images"].includes(activeView.type);
  const syncCopy =
    saveStatus === "saving"
      ? { label: "Änderungen werden gespeichert", color: "bg-[#dba45d]" }
      : saveStatus === "local"
        ? { label: "Offline lokal gespeichert", color: "bg-[#dba45d]" }
        : saveStatus === "error"
          ? { label: "Synchronisierung prüfen", color: "bg-[#dc6f67]" }
          : { label: "Lokal & Server synchronisiert", color: "bg-[#5fb090]" };
  return (
    <aside className="flex min-h-0 flex-col border-r border-[#2a3741] bg-[#172029]">
      <div className="border-b border-[#2a3741] px-4 pb-3 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#718391]">
          Aufmaßwerkzeuge
        </p>
        <p className="mt-1 text-xs text-[#91a1ae]">
          {activeView.label} · {objectCount} Objekt
          {objectCount === 1 ? "" : "e"}
        </p>
      </div>
      <div className="space-y-1.5 p-3">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            disabled={drawingDisabled}
            onClick={() =>
              onToolChange(activeTool === tool.id ? null : tool.id)
            }
            className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${activeTool === tool.id ? "border-[#5c8eb4] bg-[#233b4c] text-white shadow-[inset_3px_0_0_#6eb4e6]" : "border-transparent text-[#b3c0ca] hover:border-[#344653] hover:bg-[#1d2a34]"}`}
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-md ${activeTool === tool.id ? "bg-[#31536b] text-[#8dcef7]" : "bg-[#202d37] text-[#8294a2] group-hover:text-[#b8c8d3]"}`}
            >
              <AufmasIcon name={tool.icon} className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">
                {tool.label}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[#6f808d]">
                {tool.description}
              </span>
            </span>
            <kbd className="rounded border border-[#3a4853] bg-[#121a20] px-1.5 py-0.5 text-[9px] text-[#6f808d]">
              {tool.shortcut}
            </kbd>
          </button>
        ))}
      </div>

      <div className="mt-1 border-t border-[#2a3741] px-4 pb-2 pt-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#718391]">
          <AufmasIcon name="layers" className="size-3.5" /> Anzeige
        </div>
      </div>
      <div className="space-y-0.5 px-3 pb-3">
        {LAYERS.map((layer) => (
          <label
            key={layer.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-xs text-[#aebbc5] hover:bg-[#1d2a34]"
          >
            <input
              type="checkbox"
              checked={display[layer.id]}
              onChange={(event) =>
                onDisplayChange({
                  ...display,
                  [layer.id]: event.target.checked
                })
              }
              className="size-3.5 rounded border-[#52616c] bg-[#101820] accent-[#5b9dcc]"
            />
            <span className={`size-1.5 rounded-full ${layer.swatch}`} />
            <span>{layer.label}</span>
          </label>
        ))}
      </div>

      <div className="mt-auto border-t border-[#2a3741] p-3">
        <div className="rounded-lg border border-[#2f3e49] bg-[#111920] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#617381]">
            Status
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#9dafbb]">
            <span className={`size-1.5 rounded-full ${syncCopy.color}`} />{" "}
            {syncCopy.label}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function ObjectOverviewPanel({
  activeView,
  objects,
  selectedId,
  onSelect
}) {
  const measured = objects.filter(
    (object) => object.status === "measured"
  ).length;
  const pending = objects.length - measured;
  return (
    <aside className="flex min-h-0 flex-col border-r border-[#2a3741] bg-[#172029]">
      <div className="border-b border-[#2a3741] px-4 pb-3 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#718391]">
          Objekte dieser Planung
        </p>
        <p className="mt-1 truncate text-xs text-[#91a1ae]">
          {activeView?.label || "Ansicht"} · {objects.length} Objekt
          {objects.length === 1 ? "" : "e"}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {objects.length ? (
          <div className="space-y-1.5">
            {objects.map((object) => (
              <button
                key={object.id}
                type="button"
                onClick={() => onSelect(object.id)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition ${selectedId === object.id ? "border-[#4e7895] bg-[#253746] text-white" : "border-transparent text-[#aebbc5] hover:border-[#344653] hover:bg-[#1d2a34]"}`}
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${object.status === "measured" ? "bg-[#5db599]" : "bg-[#dca356]"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {object.label || object.type}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-[#687b88]">
                    {object.type}
                  </span>
                </span>
                {object.value && (
                  <span className="shrink-0 tabular-nums text-[#8296a3]">
                    {object.value}
                    {object.unit === "°" ? "°" : ` ${object.unit || "mm"}`}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-40 flex-col items-center justify-center px-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-full border border-[#324552] bg-[#1d2a34] text-[#68869a]">
              <AufmasIcon name="measure" className="size-4" />
            </div>
            <p className="mt-3 text-xs font-medium text-[#aebbc5]">
              Keine Objekte vorhanden
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#657783]">
              In dieser Planung wurden noch keine Aufmaßobjekte angelegt.
            </p>
          </div>
        )}
      </div>
      <div className="border-t border-[#2a3741] p-3">
        <div className="flex items-center justify-between rounded-lg border border-[#2f3e49] bg-[#111920] px-3 py-2.5 text-[10px]">
          <span className="flex items-center gap-2 text-[#9dafbb]">
            <span className="size-1.5 rounded-full bg-[#5db599]" />
            {measured} gemessen
          </span>
          <span className="flex items-center gap-2 text-[#9dafbb]">
            <span className="size-1.5 rounded-full bg-[#dca356]" />
            {pending} offen
          </span>
        </div>
      </div>
    </aside>
  );
}

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-[#354550] bg-[#10181f] px-3 py-2 text-xs text-[#e4edf3] outline-none placeholder:text-[#51616d] focus:border-[#5b96bf] focus:ring-1 focus:ring-[#5b96bf]/30";
const READ_ONLY_VALUE_CLASS =
  "mt-1.5 min-h-9 rounded-md border border-[#2e3d47] bg-[#111a21] px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-[#d4dfe6]";

function ReadOnlyField({ label, children, className = "" }) {
  return (
    <div
      className={`text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591] ${className}`}
    >
      {label}
      <div className={READ_ONLY_VALUE_CLASS}>{children || "–"}</div>
    </div>
  );
}

function ReadOnlyObjectDetails({ selected, selectedCabinet, onOpenCabinet }) {
  const status = selected.status === "measured" ? "Gemessen" : "Ausstehend";
  return (
    <div className="space-y-3 p-4">
      <ReadOnlyField label="Typ">{selected.type}</ReadOnlyField>
      {selected.kind === "cabinet" ? (
        <>
          <ReadOnlyField label="Korpus">
            {selectedCabinet?.name || "Nicht verknüpft"}
          </ReadOnlyField>
          <div className="rounded-lg border border-[#30424e] bg-[#111a21] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
              Außenmaße
            </p>
            {selectedCabinet ? (
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Breite", selectedCabinet.width],
                  ["Höhe", selectedCabinet.height],
                  ["Tiefe", selectedCabinet.depth]
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md bg-[#192630] px-2 py-2"
                  >
                    <span className="block text-[9px] uppercase tracking-wide text-[#637684]">
                      {label}
                    </span>
                    <strong className="mt-1 block text-xs font-semibold tabular-nums text-[#dbe6ed]">
                      {value ?? "–"} mm
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#657986]">
                Kein Korpus verknüpft.
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!selectedCabinet}
            onClick={() => onOpenCabinet?.(selectedCabinet.id)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#42657b] bg-[#203847] px-3 py-2.5 text-xs font-semibold text-[#cce5f4] hover:border-[#6594b1] hover:bg-[#29495d] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <AufmasIcon name="link" className="size-4" /> Im Cabinet Editor
            öffnen
          </button>
        </>
      ) : (
        <>
          <ReadOnlyField label="Bezeichnung">{selected.label}</ReadOnlyField>
          {selected.kind !== "point" && (
            <ReadOnlyField label="Maß">
              <span className="text-base font-semibold tabular-nums">
                {selected.value || "–"}
              </span>
              {selected.value ? ` ${selected.unit || "mm"}` : ""}
            </ReadOnlyField>
          )}
          <ReadOnlyField label="Status">
            <span className="inline-flex items-center gap-2">
              <span
                className={`size-1.5 rounded-full ${selected.status === "measured" ? "bg-[#5db599]" : "bg-[#dca356]"}`}
              />
              {status}
            </span>
          </ReadOnlyField>
          <ReadOnlyField label="Maßverknüpfung">
            <span className="font-mono">{selected.variableName || "–"}</span>
          </ReadOnlyField>
        </>
      )}
      <ReadOnlyField label="Notizen">
        <span className="whitespace-pre-wrap">{selected.notes || "–"}</span>
      </ReadOnlyField>
    </div>
  );
}

export function PropertiesPanel({
  selected,
  objects,
  cabinets = [],
  onSelect,
  onUpdate,
  onDelete,
  onOpenCabinet,
  onPhotoUpload,
  uploadingPhoto,
  readOnly = false
}) {
  const selectedCabinet =
    selected?.kind === "cabinet"
      ? cabinets.find(
          (cabinet) => String(cabinet.id) === String(selected.cabinetId)
        )
      : null;
  const selectedTitle =
    selected?.kind === "cabinet"
      ? selectedCabinet?.name || "Korpus auswählen"
      : selected?.label || "Messung";
  return (
    <aside className="flex min-h-0 flex-col bg-[#172029]">
      <div className="flex items-center justify-between border-b border-[#2a3741] px-4 py-3.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#718391]">
            {readOnly ? "Objektdaten" : "Werkzeugdaten"}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-[#e5edf3]">
            {selected ? selectedTitle : "Kein Objekt gewählt"}
          </h3>
        </div>
        {selected && !readOnly && (
          <button
            type="button"
            onClick={() => onDelete(selected.id)}
            className="rounded-md p-2 text-[#9a7371] hover:bg-[#382326] hover:text-[#ef9a96]"
            title="Objekt löschen"
          >
            <AufmasIcon name="trash" className="size-4" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selected ? (
          readOnly ? (
            <ReadOnlyObjectDetails
              selected={selected}
              selectedCabinet={selectedCabinet}
              onOpenCabinet={onOpenCabinet}
            />
          ) : (
            <div className="space-y-3 p-4">
              {selected.kind !== "cabinet" && (
                <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
                  Typ
                  <select
                    value={selected.type}
                    onChange={(event) =>
                      onUpdate(selected.id, { type: event.target.value })
                    }
                    className={INPUT_CLASS}
                  >
                    {selected.kind === "measurement" && (
                      <>
                        <option>Raumbreite</option>
                        <option>Raumhöhe</option>
                        <option>Abstand</option>
                        <option>Öffnungsmaß</option>
                        <option>Installationsmaß</option>
                      </>
                    )}
                    {selected.kind === "angle" && (
                      <>
                        <option>Winkel</option>
                        <option>Eckwinkel</option>
                        <option>Dachschräge</option>
                      </>
                    )}
                    {selected.kind === "point" && (
                      <>
                        <option>Installation</option>
                        <option>Strom</option>
                        <option>Wasser</option>
                        <option>Abluft</option>
                        <option>Referenzpunkt</option>
                      </>
                    )}
                    {selected.kind === "cabinet" && (
                      <>
                        <option>Korpusverknüpfung</option>
                        <option>Schrankbreite</option>
                        <option>Schrankhöhe</option>
                        <option>Einbaulage</option>
                      </>
                    )}
                  </select>
                </label>
              )}
              {selected.kind === "cabinet" ? (
                <>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
                    Korpus
                    <select
                      value={selected.cabinetId ?? ""}
                      onChange={(event) => {
                        const cabinet = cabinets.find(
                          (item) => String(item.id) === event.target.value
                        );
                        onUpdate(selected.id, {
                          cabinetId: cabinet?.id ?? "",
                          label: cabinet?.name ?? "Korpus auswählen",
                          status: cabinet ? "measured" : "pending",
                          variableName: ""
                        });
                      }}
                      className={INPUT_CLASS}
                    >
                      <option value="">Korpus auswählen …</option>
                      {cabinets.map((cabinet) => (
                        <option key={cabinet.id} value={cabinet.id}>
                          {cabinet.name || `Korpus ${cabinet.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-lg border border-[#30424e] bg-[#111a21] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
                      Außenmaße
                    </p>
                    {selectedCabinet ? (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        {[
                          ["Breite", selectedCabinet.width],
                          ["Höhe", selectedCabinet.height],
                          ["Tiefe", selectedCabinet.depth]
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-md bg-[#192630] px-2 py-2"
                          >
                            <span className="block text-[9px] uppercase tracking-wide text-[#637684]">
                              {label}
                            </span>
                            <strong className="mt-1 block text-xs font-semibold tabular-nums text-[#dbe6ed]">
                              {value ?? "–"} mm
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs leading-relaxed text-[#657986]">
                        Wähle einen Korpus aus der cabinet.json aus.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!selectedCabinet}
                    onClick={() => onOpenCabinet?.(selectedCabinet.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#42657b] bg-[#203847] px-3 py-2.5 text-xs font-semibold text-[#cce5f4] hover:border-[#6594b1] hover:bg-[#29495d] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <AufmasIcon name="link" className="size-4" /> Im Cabinet
                    Editor öffnen
                  </button>
                </>
              ) : (
                <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
                  Bezeichnung
                  <input
                    value={selected.label ?? ""}
                    onChange={(event) =>
                      onUpdate(selected.id, { label: event.target.value })
                    }
                    className={INPUT_CLASS}
                    placeholder="z. B. Wand links"
                  />
                </label>
              )}
              {!["point", "cabinet"].includes(selected.kind) && (
                <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
                  Maß
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={selected.value ?? ""}
                      onChange={(event) =>
                        onUpdate(selected.id, { value: event.target.value })
                      }
                      className={`${INPUT_CLASS} pr-12 text-base font-semibold tabular-nums`}
                      placeholder="0"
                    />
                    <span className="absolute bottom-2.5 right-3 text-xs text-[#718391]">
                      {selected.unit || "mm"}
                    </span>
                  </div>
                </label>
              )}
              {selected.kind !== "cabinet" && (
                <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
                  Status
                  <select
                    value={selected.status}
                    onChange={(event) =>
                      onUpdate(selected.id, { status: event.target.value })
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="pending">Ausstehend</option>
                    <option value="measured">Gemessen</option>
                  </select>
                </label>
              )}
              {selected.kind !== "cabinet" && (
                <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
                  Maßverknüpfung
                  <div className="relative">
                    <AufmasIcon
                      name="link"
                      className="absolute left-3 top-4 size-4 text-[#688092]"
                    />
                    <input
                      value={selected.variableName ?? ""}
                      onChange={(event) =>
                        onUpdate(selected.id, {
                          variableName: event.target.value
                            .replace(/\s+/g, "_")
                            .replace(/[^\p{L}\p{N}_]/gu, "")
                            .replace(/^\p{N}+/u, "")
                        })
                      }
                      className={`${INPUT_CLASS} pl-9 font-mono`}
                      placeholder="raum_breite"
                    />
                  </div>
                  <span className="mt-1.5 block normal-case tracking-normal text-[#61727f]">
                    Wird als Variable für den Korpus-Editor gespeichert.
                  </span>
                </label>
              )}
              <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#748591]">
                Notizen
                <textarea
                  rows="3"
                  value={selected.notes ?? ""}
                  onChange={(event) =>
                    onUpdate(selected.id, { notes: event.target.value })
                  }
                  className={`${INPUT_CLASS} resize-none`}
                  placeholder="Besonderheiten vor Ort …"
                />
              </label>
            </div>
          )
        ) : (
          <div className="px-5 py-9 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-full border border-[#324552] bg-[#1d2a34] text-[#68869a]">
              <AufmasIcon name="measure" />
            </div>
            <p className="mt-3 text-sm font-medium text-[#b9c6d0]">
              Objekt auswählen
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#667986]">
              {readOnly
                ? "Wähle ein bestehendes Objekt, um seine Aufmaßdaten anzuzeigen."
                : "Wähle ein bestehendes Objekt oder erstelle mit einem Werkzeug ein neues Aufmaß."}
            </p>
          </div>
        )}

        {!readOnly && objects.length > 0 && (
          <div className="border-t border-[#2a3741] px-3 py-3">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#718391]">
              Objekte dieser Ansicht
            </p>
            <div className="space-y-1">
              {objects.map((object) => (
                <button
                  key={object.id}
                  type="button"
                  onClick={() => onSelect(object.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs ${selected?.id === object.id ? "bg-[#253746] text-white" : "text-[#9cacb8] hover:bg-[#1e2b35]"}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${object.status === "measured" ? "bg-[#5db599]" : "bg-[#dca356]"}`}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {object.label || object.type}
                  </span>
                  {object.value && (
                    <span className="tabular-nums text-[#6f8290]">
                      {object.value}
                      {object.unit === "°" ? "°" : ""}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="border-t border-[#2a3741] p-3">
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#455967] bg-[#121b22] px-3 py-3 text-xs font-medium text-[#9fb0bc] hover:border-[#6591ae] hover:text-white ${uploadingPhoto ? "pointer-events-none opacity-60" : ""}`}
          >
            <AufmasIcon name="photo" className="size-4" />{" "}
            {uploadingPhoto
              ? "Foto wird hochgeladen …"
              : "Baustellenfoto hinzufügen"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              onChange={(event) =>
                event.target.files?.[0] && onPhotoUpload(event.target.files[0])
              }
            />
          </label>
        </div>
      )}
    </aside>
  );
}

const ViewPreview = ({ view }) => {
  if (view.type === "three")
    return <AufmasIcon name="cube" className="size-7" />;
  if (view.type === "images")
    return <AufmasIcon name="image" className="size-7" />;
  if (view.type === "floor")
    return <AufmasIcon name="floor" className="size-7" />;
  return <AufmasIcon name="side" className="size-7" />;
};

export function ViewStrip({ views, activeViewId, onViewChange, objects }) {
  return (
    <div className="min-w-0 border-r border-[#2a3741] bg-[#141d25] px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#718391]">
          Ansichten
        </p>
        <p className="text-[10px] text-[#5f7280]">
          Ansicht wählen, um zu bearbeiten
        </p>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 aufmas-view-scroll">
        {views.map((view, index) => {
          const viewObjects = objects.filter(
            (object) => object.viewId === view.id
          );
          const pending = viewObjects.filter(
            (object) => object.status !== "measured"
          ).length;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onViewChange(view.id)}
              className={`group relative w-36 shrink-0 overflow-hidden rounded-lg border text-left transition ${activeViewId === view.id ? "border-[#6aa8d1] bg-[#223746] shadow-[0_0_0_1px_rgba(106,168,209,.25)]" : "border-[#303f4a] bg-[#19232b] hover:border-[#4d6474]"}`}
            >
              <div
                className={`flex h-16 items-center justify-center border-b ${activeViewId === view.id ? "border-[#42627a] bg-[#1b2b36] text-[#82bfe7]" : "border-[#2b3943] bg-[#111920] text-[#586f80] group-hover:text-[#87a3b6]"}`}
              >
                <ViewPreview view={view} />
                {view.planFileId && (
                  <span className="absolute right-2 top-2 rounded bg-[#b69055]/20 px-1.5 py-0.5 text-[8px] font-semibold text-[#d7b374]">
                    PDF
                  </span>
                )}
                {view.dxfFileId && (
                  <span className="absolute left-2 top-2 rounded bg-[#5b8aab]/20 px-1.5 py-0.5 text-[8px] font-semibold text-[#83b8d9]">
                    DXF
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#c7d2da]">
                    {view.label}
                  </p>
                  <p className="mt-0.5 text-[9px] text-[#627581]">
                    {view.type === "three"
                      ? "Modell"
                      : view.type === "images"
                        ? "Projektbilder"
                        : `Ansicht ${index + 1}`}
                  </p>
                </div>
                {pending > 0 && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#6b4a28] text-[9px] font-bold text-[#f1bd77]">
                    {pending}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProgressPanel({
  objects,
  todos,
  onTodosChange,
  readOnly = false
}) {
  const [draft, setDraft] = useState("");
  const measured = objects.filter(
    (object) => object.status === "measured"
  ).length;
  const pending = objects.length - measured;
  const percent = objects.length
    ? Math.round((measured / objects.length) * 100)
    : 0;

  const addTodo = (event) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    onTodosChange([
      ...todos,
      {
        id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
        title,
        done: false
      }
    ]);
    setDraft("");
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#172029] px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#718391]">
            Fortschritt
          </p>
          <p className="mt-1 text-xs text-[#aab8c2]">
            {pending} Maße offen · {measured} gemessen
          </p>
        </div>
        <div
          className="relative flex size-12 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(#5da98f ${percent * 3.6}deg, #2b3a45 0deg)`
          }}
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-[#172029] text-[10px] font-bold text-[#c9d5dd]">
            {percent}%
          </div>
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#293842]">
        <div
          className="h-full rounded-full bg-[#5da98f] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-[#2a3741] pt-2">
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-center gap-2 rounded-md px-1 py-1 text-[11px] text-[#a8b6c0]"
            >
              {readOnly ? (
                <>
                  <span
                    className={`flex size-3.5 shrink-0 items-center justify-center rounded border ${todo.done ? "border-[#5da98f] bg-[#315e4f] text-[#d5eee4]" : "border-[#52616c]"}`}
                  >
                    {todo.done && (
                      <AufmasIcon name="check" className="size-2.5" />
                    )}
                  </span>
                  <span
                    className={`min-w-0 flex-1 ${todo.done ? "text-[#657681] line-through" : ""}`}
                  >
                    {todo.title}
                  </span>
                </>
              ) : (
                <>
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={(event) =>
                      onTodosChange(
                        todos.map((item) =>
                          item.id === todo.id
                            ? { ...item, done: event.target.checked }
                            : item
                        )
                      )
                    }
                    className="size-3.5 accent-[#5da98f]"
                  />
                  <input
                    value={todo.title}
                    onChange={(event) =>
                      onTodosChange(
                        todos.map((item) =>
                          item.id === todo.id
                            ? { ...item, title: event.target.value }
                            : item
                        )
                      )
                    }
                    className={`min-w-0 flex-1 bg-transparent outline-none ${todo.done ? "text-[#657681] line-through" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onTodosChange(todos.filter((item) => item.id !== todo.id))
                    }
                    className="invisible rounded p-1 text-[#806d6d] hover:text-[#e59691] group-hover:visible"
                    aria-label="Aufgabe löschen"
                  >
                    <AufmasIcon name="close" className="size-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {!readOnly && (
          <form onSubmit={addTodo} className="mt-2 flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-[#344550] bg-[#10181f] px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-[#5b96bf]"
              placeholder="Neue Aufgabe …"
            />
            <button
              type="submit"
              className="flex size-7 items-center justify-center rounded-md bg-[#2d526b] text-[#b9d9ed] hover:bg-[#396b8a]"
              aria-label="Aufgabe hinzufügen"
            >
              <AufmasIcon name="plus" className="size-3.5" />
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
