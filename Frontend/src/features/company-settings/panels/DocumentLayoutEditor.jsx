import { useEffect, useRef, useState } from "react";

import { useApp } from "../../../app/providers/AppContext.js";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  DOCUMENT_FIELD_KEYS,
  documentFieldLabel,
  newLayoutObject,
  normalizeDocumentLayout
} from "../../commercial/document-layout/documentLayout.js";

const TOOL_OPTIONS = [
  ["select", "Auswahl"],
  ["text", "Text"],
  ["field", "Datenfeld"],
  ["line", "Linie"],
  ["rect", "Fläche"]
];

const position = item => ({
  left: `${item.x / A4_WIDTH_MM * 100}%`,
  top: `${item.y / A4_HEIGHT_MM * 100}%`,
  width: `${item.width / A4_WIDTH_MM * 100}%`,
  height: `${Math.max(item.height, 0.35) / A4_HEIGHT_MM * 100}%`
});

function PreviewObject({ item, selected, onPointerDown }) {
  const style = {
    ...position(item),
    color: item.color || "#18181b",
    background: item.type === "rect" ? (item.fill || "transparent") : "transparent",
    borderColor: item.stroke || "transparent",
    borderWidth: item.type === "rect" ? `${item.strokeWidth || 0}px` : 0,
    textAlign: item.align || "left",
    fontSize: `${(item.fontSize || 9) * 0.168}cqw`,
    fontWeight: item.fontWeight || 400
  };
  if (item.type === "line") {
    return <button type="button" aria-label="Linie auswählen" onPointerDown={onPointerDown} className={`absolute z-10 cursor-move p-0 ${selected ? "ring-2 ring-sky-500" : ""}`} style={{ ...position(item), height: "5px", transform: "translateY(-2px)" }}><span className="block w-full" style={{ borderTop: `${Math.max(1, item.strokeWidth || 0.5)}px solid ${item.stroke || "#18181b"}` }}/></button>;
  }
  if (item.type === "image") {
    return <button type="button" aria-label="Bild auswählen" onPointerDown={onPointerDown} className={`absolute z-10 overflow-hidden p-0 ${selected ? "ring-2 ring-sky-500" : ""}`} style={position(item)}>{item.src ? <img src={item.src} alt="Layout" className="h-full w-full" style={{ objectFit: item.fit || "contain" }}/> : <span className="flex h-full items-center justify-center border border-dashed border-slate-400 text-[1.4cqw] text-slate-500">Bild</span>}</button>;
  }
  const content = item.type === "field" ? (item.key === "positions" ? "Pos.  Beschreibung       Menge   Preis\n1     Beispielposition       1,00   0,00 €" : `{{ ${documentFieldLabel(item.key)} }}`) : item.text;
  return <button type="button" onPointerDown={onPointerDown} className={`absolute z-10 cursor-move overflow-hidden whitespace-pre-wrap p-0 leading-tight ${selected ? "ring-2 ring-sky-500 ring-offset-1" : ""}`} style={style}>{content || "Text"}</button>;
}

function NumberField({ label, value, onChange, min = 0, step = 0.5 }) {
  return <label className="text-xs text-slate-400"><span className="mb-1 block">{label}</span><input type="number" min={min} step={step} value={value} onChange={event => onChange(Number(event.target.value))} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white"/></label>;
}

export default function DocumentLayoutEditor({ value, onChange }) {
  const { SideBarCollapsed = true } = useApp() || {};
  const layout = normalizeDocumentLayout(value);
  const [tool, setTool] = useState("select");
  const [selectedId, setSelectedId] = useState(layout.objects[0]?.id || null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const selected = layout.objects.find(item => item.id === selectedId) || null;

  useEffect(() => {
    const closeOnEscape = event => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  const commit = objects => onChange({ ...layout, objects });
  const patchSelected = patch => commit(layout.objects.map(item => item.id === selectedId ? { ...item, ...patch } : item));
  const point = event => {
    const bounds = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(A4_WIDTH_MM, (event.clientX - bounds.left) / bounds.width * A4_WIDTH_MM)),
      y: Math.max(0, Math.min(A4_HEIGHT_MM, (event.clientY - bounds.top) / bounds.height * A4_HEIGHT_MM))
    };
  };

  const addAt = (type, x = 20, y = 20) => {
    const created = newLayoutObject(type, x, y);
    commit([...layout.objects, created]);
    setSelectedId(created.id);
    setTool("select");
  };

  const canvasPointerDown = event => {
    if (event.target !== event.currentTarget || tool === "select") return;
    const current = point(event);
    addAt(tool, current.x, current.y);
  };

  const objectPointerDown = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);
    setTool("select");
    const current = point(event);
    dragRef.current = { id: item.id, pointerId: event.pointerId, startX: current.x, startY: current.y, x: item.x, y: item.y };
    canvasRef.current?.setPointerCapture?.(event.pointerId);
  };

  const move = event => {
    const drag = dragRef.current;
    if (!drag) return;
    const current = point(event);
    commit(layout.objects.map(item => item.id === drag.id ? {
      ...item,
      x: Math.max(0, Math.min(A4_WIDTH_MM - item.width, drag.x + current.x - drag.startX)),
      y: Math.max(0, Math.min(A4_HEIGHT_MM - Math.max(item.height, 1), drag.y + current.y - drag.startY))
    } : item));
  };

  const addImage = event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/") || file.size > 1_500_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      const created = { ...newLayoutObject("image", 20, 20), src: String(reader.result || "") };
      commit([...layout.objects, created]);
      setSelectedId(created.id);
    };
    reader.readAsDataURL(file);
  };

  const editor = <div className={`grid gap-4 xl:grid-cols-[190px_minmax(520px,1fr)_260px] ${isFullscreen ? "min-h-0 flex-1 overflow-hidden p-3" : ""}`}>
      <aside className={`rounded-xl border border-slate-700 bg-slate-900/70 p-3 ${isFullscreen ? "min-h-0 overflow-y-auto" : ""}`}>
        <h3 className="text-sm font-semibold">Werkzeuge</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1">{TOOL_OPTIONS.map(([id, label]) => <button key={id} type="button" onClick={() => setTool(id)} className={`rounded-lg border px-3 py-2 text-left text-sm ${tool === id ? "border-sky-500 bg-sky-500/15 text-sky-200" : "border-slate-700 hover:bg-slate-800"}`}>{label}</button>)}</div>
        <label className="mt-2 block cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">Bild / Logo<input type="file" accept="image/*" className="sr-only" onChange={addImage}/></label>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">Element auswählen und auf der Seite ziehen. Maße und Farben lassen sich rechts exakt einstellen. Bilder sind auf 1,5 MB begrenzt.</p>
        <h3 className="mt-5 border-t border-slate-700 pt-4 text-sm font-semibold">Enthalten</h3>
        <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">{layout.objects.map((item, index) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs ${selectedId === item.id ? "bg-sky-500/20 text-sky-200" : "text-slate-400 hover:bg-slate-800"}`}>{index + 1}. {item.type === "field" ? documentFieldLabel(item.key) : item.type === "text" ? item.text : item.type === "rect" ? "Fläche" : item.type === "line" ? "Linie" : "Bild"}</button>)}</div>
      </aside>

      <div className="min-h-0 overflow-auto rounded-xl bg-slate-950/70 p-4 sm:p-7">
        <div ref={canvasRef} onPointerDown={canvasPointerDown} onPointerMove={move} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} className={`relative mx-auto w-full max-w-[720px] touch-none overflow-hidden shadow-2xl ${tool !== "select" ? "cursor-crosshair" : ""}`} style={{ aspectRatio: `${A4_WIDTH_MM}/${A4_HEIGHT_MM}`, background: layout.page.background, containerType: "inline-size" }}>
          {layout.objects.filter(item => item.visible !== false).map(item => <PreviewObject key={item.id} item={item} selected={item.id === selectedId} onPointerDown={event => objectPointerDown(event, item)}/>) }
        </div>
      </div>

      <aside className={`rounded-xl border border-slate-700 bg-slate-900/70 p-3 ${isFullscreen ? "min-h-0 overflow-y-auto" : ""}`}>
        <h3 className="text-sm font-semibold">Eigenschaften</h3>
        {!selected && <p className="mt-3 text-xs text-slate-500">Ein Element auf der Seite oder in der Liste auswählen.</p>}
        {selected && <div className="mt-3 space-y-3">
          {selected.type === "text" && <label className="block text-xs text-slate-400"><span className="mb-1 block">Text</span><textarea rows="3" value={selected.text || ""} onChange={event => patchSelected({ text: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white"/></label>}
          {selected.type === "field" && <label className="block text-xs text-slate-400"><span className="mb-1 block">Automatischer Schlüssel</span><select value={selected.key || ""} onChange={event => patchSelected({ key: event.target.value, multiline: Boolean(DOCUMENT_FIELD_KEYS.find(field => field.key === event.target.value)?.multiline) })} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white">{DOCUMENT_FIELD_KEYS.map(field => <option key={field.key} value={field.key}>{field.label} · {field.key}</option>)}</select></label>}
          <div className="grid grid-cols-2 gap-2"><NumberField label="X (mm)" value={selected.x} onChange={x => patchSelected({ x })}/><NumberField label="Y (mm)" value={selected.y} onChange={y => patchSelected({ y })}/><NumberField label="Breite" value={selected.width} onChange={width => patchSelected({ width })}/><NumberField label="Höhe" value={selected.height} onChange={height => patchSelected({ height })}/></div>
          {["text", "field"].includes(selected.type) && <><NumberField label="Schriftgröße (pt)" value={selected.fontSize || 9} min={4} step={1} onChange={fontSize => patchSelected({ fontSize })}/><div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-400"><span className="mb-1 block">Textfarbe</span><input type="color" value={selected.color || "#18181b"} onChange={event => patchSelected({ color: event.target.value })} className="h-9 w-full rounded bg-slate-950"/></label><label className="text-xs text-slate-400"><span className="mb-1 block">Ausrichtung</span><select value={selected.align || "left"} onChange={event => patchSelected({ align: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm"><option value="left">Links</option><option value="center">Mitte</option><option value="right">Rechts</option></select></label></div><label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={Number(selected.fontWeight) >= 700} onChange={event => patchSelected({ fontWeight: event.target.checked ? 700 : 400 })}/>Fett</label></>}
          {selected.type === "rect" && <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-400">Füllung<input type="color" value={selected.fill || "#ffffff"} onChange={event => patchSelected({ fill: event.target.value })} className="mt-1 h-9 w-full rounded bg-slate-950"/></label><label className="text-xs text-slate-400">Kontur<input type="color" value={selected.stroke || "#18181b"} onChange={event => patchSelected({ stroke: event.target.value })} className="mt-1 h-9 w-full rounded bg-slate-950"/></label></div>}
          {selected.type === "line" && <label className="text-xs text-slate-400">Linienfarbe<input type="color" value={selected.stroke || "#18181b"} onChange={event => patchSelected({ stroke: event.target.value })} className="mt-1 h-9 w-full rounded bg-slate-950"/></label>}
          <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={selected.visible !== false} onChange={event => patchSelected({ visible: event.target.checked })}/>Im Beleg anzeigen</label>
          <button type="button" onClick={() => { commit(layout.objects.filter(item => item.id !== selected.id)); setSelectedId(null); }} className="w-full rounded-lg border border-rose-900 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/50">Element löschen</button>
        </div>}
      </aside>
    </div>;

  return (
    <div className={isFullscreen ? `fixed inset-x-0 top-0 bottom-[var(--mobile-navigation-height,4rem)] z-50 flex flex-col border-l border-slate-700 bg-slate-950 text-white shadow-2xl sm:bottom-0 sm:right-0 ${SideBarCollapsed ? "sm:left-16 xl:left-20" : "sm:left-60"}` : ""} role={isFullscreen ? "region" : undefined} aria-label={isFullscreen ? "Beleglayout im Vollbild bearbeiten" : undefined}>
      <div className={`flex shrink-0 items-center justify-between gap-3 ${isFullscreen ? "border-b border-slate-700 bg-slate-900 px-4 py-3" : "mb-3 justify-end"}`}>
        {isFullscreen && <div><h3 className="font-semibold text-slate-100">A4-Beleglayout bearbeiten</h3><p className="text-xs text-slate-500">Die Hauptnavigation bleibt verfügbar · Esc beendet den Vollbildmodus</p></div>}
        <button type="button" aria-pressed={isFullscreen} onClick={() => setIsFullscreen(current => !current)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${isFullscreen ? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700" : "border-sky-700 bg-sky-950/40 text-sky-200 hover:bg-sky-900/50"}`}>
          {isFullscreen ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>}
          {isFullscreen ? "Vollbild verlassen" : "Editor im Vollbild"}
        </button>
      </div>
      {editor}
    </div>
  );
}
