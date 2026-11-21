import { useEffect, useRef, useState } from "react";

import {
  DOCUMENT_FIELD_KEYS,
  LAYOUT_HEIGHT,
  LAYOUT_WIDTH,
  documentFieldExample,
  documentFieldLabel,
  fontFamilyValue,
  layoutObjectPosition,
  newLayoutObject,
  normalizeDocumentLayout,
  snapValue
} from "../../commercial/document-layout/documentLayout.js";

const TOOLS = [["select", "Auswahl"], ["text", "Statischer Text"], ["field", "Eingabefeld"], ["logo", "Firmenlogo"], ["line", "Linie"], ["rect", "Fläche"]];

const textStyle = item => ({
  color: item.color,
  background: item.background,
  borderColor: item.borderColor,
  borderWidth: `${item.borderWidth || 0}px`,
  borderStyle: item.borderStyle || "solid",
  borderRadius: `${item.borderRadius || 0}px`,
  padding: `${item.padding || 0}px`,
  textAlign: item.align,
  fontFamily: fontFamilyValue(item.fontFamily),
  fontSize: `${(item.fontSize || 9) * 0.168}cqw`,
  fontWeight: item.fontWeight,
  lineHeight: item.lineHeight,
  flexDirection: "column",
  justifyContent: item.verticalAlign === "center" ? "center" : item.verticalAlign === "bottom" ? "flex-end" : "flex-start"
});

function PreviewObject({ item, selected, logoDataUrl, onMoveStart, onResizeStart }) {
  const baseClass = `absolute z-10 touch-none overflow-hidden ${selected ? "ring-2 ring-sky-500 ring-offset-1" : ""}`;
  let content;
  if (item.type === "line") content = <span className="block w-full" style={{ borderTop: `${Math.max(1, item.strokeWidth || 0.5)}px solid ${item.stroke}` }}/>;
  else if (item.type === "rect") content = null;
  else if (item.type === "logo") content = logoDataUrl ? <img src={logoDataUrl} alt="Unternehmenslogo" className="h-full w-full" style={{ objectFit: item.fit }}/> : <span className="flex h-full items-center justify-center border border-dashed border-slate-400 bg-white text-[1.4cqw] text-slate-500">Kein Firmenlogo</span>;
  else content = <span className="flex h-full w-full whitespace-pre-wrap" style={{ ...textStyle(item), outline: item.type === "field" ? "1px dashed #38bdf8" : undefined, outlineOffset: "-1px" }}>{item.type === "field" ? (item.key === "positions" ? "Pos.  Beschreibung        Menge   Preis\n1     Beispielposition        1,00    0,00 €" : documentFieldExample(item.key)) : item.text}</span>;
  const geometry = item.type === "line" ? { ...layoutObjectPosition(item), height: "6px", transform: "translateY(-3px)" } : layoutObjectPosition(item);
  const decoration = item.type === "rect" ? { background: item.fill, border: `${item.strokeWidth || 0}px solid ${item.stroke}` } : {};
  return <div role="button" tabIndex="0" aria-label={`${item.type === "field" ? documentFieldLabel(item.key) : item.type === "text" ? item.text : item.type} auswählen`} onPointerDown={event => onMoveStart(event, item)} className={`${baseClass} ${item.locked ? "cursor-not-allowed" : "cursor-move"}`} style={{ ...geometry, ...decoration }}>
    {content}
    {selected && !item.locked && <button type="button" aria-label="Elementgröße ändern" onPointerDown={event => onResizeStart(event, item)} className="absolute bottom-0 right-0 z-20 size-3 cursor-nwse-resize border border-white bg-sky-600 shadow"/>}
  </div>;
}

function NumberField({ label, value, onChange, min = 0, max, step = 0.5 }) {
  return <label className="text-xs text-slate-400"><span className="mb-1 block">{label}</span><input type="number" min={min} max={max} step={step} value={Math.round(Number(value) * 10) / 10} onChange={event => onChange(Number(event.target.value))} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white"/></label>;
}

function ColorField({ label, value, onChange }) {
  return <label className="text-xs text-slate-400"><span className="mb-1 block">{label}</span><input type="color" value={value === "transparent" ? "#ffffff" : value} onChange={event => onChange(event.target.value)} className="h-9 w-full rounded bg-slate-950"/></label>;
}

const objectLabel = item => item.type === "field" ? documentFieldLabel(item.key) : item.type === "text" ? item.text : item.type === "logo" ? "Firmenlogo" : item.type === "rect" ? "Fläche" : "Linie";

export default function DocumentLayoutEditor({ value, onChange, logoDataUrl = "", templateName, onTemplateNameChange, documentType, onDocumentTypeChange, documentTypes = [], setAsDefault, onSetAsDefaultChange, onSave, saving = false, onClose }) {
  const layout = normalizeDocumentLayout(value);
  const [tool, setTool] = useState("select");
  const [selectedId, setSelectedId] = useState(layout.objects.find(item => item.type === "field")?.id || layout.objects[0]?.id || null);
  const [zoom, setZoom] = useState(100);
  const [guides, setGuides] = useState({ x: null, y: null });
  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const gestureRef = useRef(null);
  const pinchRef = useRef(null);
  const selected = layout.objects.find(item => item.id === selectedId) || null;

  useEffect(() => {
    const onKey = event => {
      if (event.key === "Escape") onClose?.();
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        onChange({ ...layout, objects: layout.objects.filter(item => item.id !== selectedId) });
        setSelectedId(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [layout, onChange, onClose, selectedId]);

  useEffect(() => {
    const editorNode = editorRef.current;
    if (!editorNode) return undefined;
    const onWheel = event => {
      const zoomArea = event.target.closest?.("[data-layout-zoom]");
      if (zoomArea) {
        const delta = event.deltaY || event.deltaX;
        if (!delta) return;
        event.preventDefault();
        setZoom(current => Math.max(40, Math.min(180, current + (delta < 0 ? 5 : -5))));
        return;
      }
      if (!event.target.closest?.("[data-layout-scroll]")) event.preventDefault();
    };
    editorNode.addEventListener("wheel", onWheel, { passive: false });
    return () => editorNode.removeEventListener("wheel", onWheel);
  }, []);

  const commit = objects => onChange({ ...layout, objects });
  const patchSelected = patch => commit(layout.objects.map(item => item.id === selectedId ? { ...item, ...patch } : item));
  const point = event => {
    const bounds = canvasRef.current.getBoundingClientRect();
    return { x: Math.max(0, Math.min(LAYOUT_WIDTH, (event.clientX - bounds.left) / bounds.width * LAYOUT_WIDTH)), y: Math.max(0, Math.min(LAYOUT_HEIGHT, (event.clientY - bounds.top) / bounds.height * LAYOUT_HEIGHT)) };
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

  const startGesture = (event, item, mode) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);
    setTool("select");
    if (item.locked) return;
    const current = point(event);
    gestureRef.current = { mode, id: item.id, startX: current.x, startY: current.y, x: item.x, y: item.y, width: item.width, height: item.height };
    canvasRef.current?.setPointerCapture?.(event.pointerId);
  };

  const snapCandidates = (item, axis, size) => {
    const limit = axis === "x" ? LAYOUT_WIDTH : LAYOUT_HEIGHT;
    const candidates = [0, 10, 14, limit / 2 - size / 2, limit - 14 - size, limit - size];
    for (const other of layout.objects) {
      if (other.id === item.id || other.visible === false) continue;
      const start = axis === "x" ? other.x : other.y;
      const otherSize = axis === "x" ? other.width : other.height;
      candidates.push(start, start + otherSize - size, start + otherSize / 2 - size / 2);
    }
    return candidates;
  };

  const moveGesture = event => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const item = layout.objects.find(entry => entry.id === gesture.id);
    if (!item) return;
    const current = point(event);
    if (gesture.mode === "move") {
      const rawX = Math.max(0, Math.min(LAYOUT_WIDTH - item.width, gesture.x + current.x - gesture.startX));
      const rawY = Math.max(0, Math.min(LAYOUT_HEIGHT - Math.max(item.height, 1), gesture.y + current.y - gesture.startY));
      const snappedX = snapValue(rawX, snapCandidates(item, "x", item.width), layout.page.gridSize);
      const snappedY = snapValue(rawY, snapCandidates(item, "y", item.height), layout.page.gridSize);
      setGuides({ x: snappedX.guide, y: snappedY.guide });
      commit(layout.objects.map(entry => entry.id === item.id ? { ...entry, x: snappedX.value, y: snappedY.value } : entry));
    } else {
      const rawRight = Math.max(item.x + 1, Math.min(LAYOUT_WIDTH, item.x + gesture.width + current.x - gesture.startX));
      const rawBottom = Math.max(item.y + (item.type === "line" ? 0 : 1), Math.min(LAYOUT_HEIGHT, item.y + gesture.height + current.y - gesture.startY));
      const rightCandidates = [LAYOUT_WIDTH, ...layout.objects.filter(entry => entry.id !== item.id).flatMap(entry => [entry.x, entry.x + entry.width])];
      const bottomCandidates = [LAYOUT_HEIGHT, ...layout.objects.filter(entry => entry.id !== item.id).flatMap(entry => [entry.y, entry.y + entry.height])];
      const right = snapValue(rawRight, rightCandidates, layout.page.gridSize);
      const bottom = snapValue(rawBottom, bottomCandidates, layout.page.gridSize);
      setGuides({ x: right.guide, y: bottom.guide });
      commit(layout.objects.map(entry => entry.id === item.id ? { ...entry, width: Math.max(1, right.value - item.x), height: item.type === "line" ? 0 : Math.max(1, bottom.value - item.y) } : entry));
    }
  };

  const stopGesture = () => { gestureRef.current = null; setGuides({ x: null, y: null }); };
  const touchDistance = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  const startPinch = event => {
    if (event.touches.length !== 2) return;
    gestureRef.current = null;
    pinchRef.current = { distance: touchDistance(event.touches), zoom };
  };
  const movePinch = event => {
    if (event.touches.length !== 2 || !pinchRef.current?.distance) return;
    event.preventDefault();
    const scale = touchDistance(event.touches) / pinchRef.current.distance;
    setZoom(Math.max(40, Math.min(180, Math.round(pinchRef.current.zoom * scale))));
  };
  const stopPinch = event => { if (event.touches.length < 2) pinchRef.current = null; };
  const removeSelected = () => { if (!selected) return; commit(layout.objects.filter(item => item.id !== selected.id)); setSelectedId(null); };
  const reorder = direction => {
    if (!selected) return;
    const objects = [...layout.objects];
    const index = objects.findIndex(item => item.id === selected.id);
    const target = Math.max(0, Math.min(objects.length - 1, index + direction));
    [objects[index], objects[target]] = [objects[target], objects[index]];
    commit(objects);
  };

  const gridSize = layout.page.gridSize;
  const editor = <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-3 xl:grid-cols-[210px_minmax(540px,1fr)_285px]">
    <aside data-layout-scroll className="min-h-0 overscroll-contain overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <h3 className="text-sm font-semibold">Elemente einfügen</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1">{TOOLS.map(([id, label]) => <button key={id} type="button" disabled={id === "logo" && !logoDataUrl} onClick={() => setTool(id)} className={`rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-40 ${tool === id ? "border-sky-500 bg-sky-500/15 text-sky-200" : "border-slate-700 hover:bg-slate-800"}`}>{label}</button>)}</div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">Element wählen und auf die Arbeitsfläche klicken. Ziehen verschiebt, der blaue Griff ändert die Größe. Mausrad oder Zwei-Finger-Geste skalieren die Belegansicht. Raster und Objektkanten rasten automatisch ein.</p>
      {!logoDataUrl && <p className="mt-2 text-xs text-amber-300">Ein Logo kann unter „Unternehmen“ hinterlegt werden.</p>}
      <div className="mt-4 grid grid-cols-2 gap-2"><NumberField label="Raster (mm)" value={gridSize} min={0.5} max={20} onChange={value => onChange({ ...layout, page: { ...layout.page, gridSize: value } })}/><ColorField label="Seitenfarbe" value={layout.page.background} onChange={background => onChange({ ...layout, page: { ...layout.page, background } })}/></div>
      <h3 className="mt-5 border-t border-slate-700 pt-4 text-sm font-semibold">Ebenen</h3>
      <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">{[...layout.objects].reverse().map(item => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs ${selectedId === item.id ? "bg-sky-500/20 text-sky-200" : "text-slate-400 hover:bg-slate-800"}`}>{objectLabel(item)}</button>)}</div>
    </aside>

    <div data-layout-scroll data-layout-zoom role="region" aria-label="Skalierbare Beleg-Arbeitsfläche" onTouchStart={startPinch} onTouchMove={movePinch} onTouchEnd={stopPinch} onTouchCancel={stopPinch} className="min-h-0 touch-none overscroll-contain overflow-auto rounded-xl bg-slate-950/70 p-4 sm:p-7">
      <div ref={canvasRef} onPointerDown={canvasPointerDown} onPointerMove={moveGesture} onPointerUp={stopGesture} onPointerCancel={stopGesture} className={`relative mx-auto touch-none overflow-hidden shadow-2xl ${tool !== "select" ? "cursor-crosshair" : ""}`} style={{ width: `${zoom}%`, minWidth: `${zoom * 5.4}px`, aspectRatio: `${LAYOUT_WIDTH}/${LAYOUT_HEIGHT}`, backgroundColor: layout.page.background, backgroundImage: "linear-gradient(to right, rgba(100,116,139,.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,.14) 1px, transparent 1px)", backgroundSize: `${gridSize / LAYOUT_WIDTH * 100}% ${gridSize / LAYOUT_HEIGHT * 100}%`, containerType: "inline-size" }}>
        {layout.objects.filter(item => item.visible !== false).map(item => <PreviewObject key={item.id} item={item} logoDataUrl={logoDataUrl} selected={item.id === selectedId} onMoveStart={(event, entry) => startGesture(event, entry, "move")} onResizeStart={(event, entry) => startGesture(event, entry, "resize")}/>) }
        {guides.x !== null && (
          <div className="pointer-events-none absolute inset-y-0 z-50 w-px bg-fuchsia-500" style={{ left: `${guides.x / LAYOUT_WIDTH * 100}%` }}/>
        )}
        {guides.y !== null && (
          <div className="pointer-events-none absolute inset-x-0 z-50 h-px bg-fuchsia-500" style={{ top: `${guides.y / LAYOUT_HEIGHT * 100}%` }}/>
        )}
      </div>
    </div>

    <aside data-layout-scroll className="min-h-0 overscroll-contain overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <h3 className="text-sm font-semibold">Eigenschaften</h3>
      {!selected && <p className="mt-3 text-xs text-slate-500">Ein Element auf der Seite oder in der Ebenenliste auswählen.</p>}
      {selected && <div className="mt-3 space-y-3">
        <div className="rounded bg-slate-950 px-2 py-1.5 text-xs text-slate-300">{objectLabel(selected)}</div>
        {selected.type === "text" && <label className="block text-xs text-slate-400"><span className="mb-1 block">Fester Text</span><textarea rows="4" value={selected.text || ""} onChange={event => patchSelected({ text: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white"/></label>}
        {selected.type === "field" && <label className="block text-xs text-slate-400"><span className="mb-1 block">Später bearbeitbares Feld</span><select value={selected.key || ""} onChange={event => patchSelected({ key: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white">{DOCUMENT_FIELD_KEYS.map(field => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label>}
        <div className="grid grid-cols-2 gap-2"><NumberField label="X" value={selected.x} max={LAYOUT_WIDTH} onChange={x => patchSelected({ x })}/><NumberField label="Y" value={selected.y} max={LAYOUT_HEIGHT} onChange={y => patchSelected({ y })}/><NumberField label="Breite" value={selected.width} min={1} max={LAYOUT_WIDTH} onChange={width => patchSelected({ width })}/><NumberField label="Höhe" value={selected.height} min={0} max={LAYOUT_HEIGHT} onChange={height => patchSelected({ height })}/></div>
        {["text", "field"].includes(selected.type) && <>
          <div className="grid grid-cols-2 gap-2"><NumberField label="Schriftgröße" value={selected.fontSize} min={4} max={72} step={1} onChange={fontSize => patchSelected({ fontSize })}/><NumberField label="Zeilenhöhe" value={selected.lineHeight} min={0.8} max={3} step={0.05} onChange={lineHeight => patchSelected({ lineHeight })}/><NumberField label="Innenabstand" value={selected.padding} max={20} onChange={padding => patchSelected({ padding })}/><NumberField label="Eckenradius" value={selected.borderRadius} max={20} onChange={borderRadius => patchSelected({ borderRadius })}/></div>
          <div className="grid grid-cols-2 gap-2"><ColorField label="Textfarbe" value={selected.color} onChange={color => patchSelected({ color })}/><ColorField label="Hintergrund" value={selected.background === "transparent" ? "#ffffff" : selected.background} onChange={background => patchSelected({ background })}/><ColorField label="Rahmenfarbe" value={selected.borderColor} onChange={borderColor => patchSelected({ borderColor })}/><NumberField label="Rahmenstärke" value={selected.borderWidth} max={5} step={0.1} onChange={borderWidth => patchSelected({ borderWidth })}/></div>
          <label className="block text-xs text-slate-400"><span className="mb-1 block">Schrift</span><select value={selected.fontFamily} onChange={event => patchSelected({ fontFamily: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2"><option value="sans">Sans Serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-400"><span className="mb-1 block">Ausrichtung</span><select value={selected.align} onChange={event => patchSelected({ align: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2"><option value="left">Links</option><option value="center">Mitte</option><option value="right">Rechts</option></select></label><label className="text-xs text-slate-400"><span className="mb-1 block">Vertikal</span><select value={selected.verticalAlign} onChange={event => patchSelected({ verticalAlign: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2"><option value="top">Oben</option><option value="center">Mitte</option><option value="bottom">Unten</option></select></label></div>
          <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-400"><span className="mb-1 block">Rahmenart</span><select value={selected.borderStyle} onChange={event => patchSelected({ borderStyle: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2"><option value="solid">Durchgezogen</option><option value="dashed">Gestrichelt</option><option value="dotted">Gepunktet</option><option value="none">Kein Rahmen</option></select></label><label className="flex items-center gap-2 self-end pb-2 text-xs text-slate-400"><input type="checkbox" checked={Number(selected.fontWeight) >= 700} onChange={event => patchSelected({ fontWeight: event.target.checked ? 700 : 400 })}/>Fett</label></div>
        </>}
        {selected.type === "logo" && <label className="block text-xs text-slate-400"><span className="mb-1 block">Logo-Anpassung</span><select value={selected.fit} onChange={event => patchSelected({ fit: event.target.value })} className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2"><option value="contain">Einpassen</option><option value="cover">Ausfüllen</option><option value="fill">Strecken</option></select></label>}
        {selected.type === "rect" && <div className="grid grid-cols-2 gap-2"><ColorField label="Füllung" value={selected.fill} onChange={fill => patchSelected({ fill })}/><ColorField label="Kontur" value={selected.stroke} onChange={stroke => patchSelected({ stroke })}/><NumberField label="Konturstärke" value={selected.strokeWidth} max={10} step={0.1} onChange={strokeWidth => patchSelected({ strokeWidth })}/></div>}
        {selected.type === "line" && <div className="grid grid-cols-2 gap-2"><ColorField label="Linienfarbe" value={selected.stroke} onChange={stroke => patchSelected({ stroke })}/><NumberField label="Linienstärke" value={selected.strokeWidth} max={10} step={0.1} onChange={strokeWidth => patchSelected({ strokeWidth })}/></div>}
        <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => reorder(-1)} className="rounded border border-slate-700 px-2 py-1.5 text-xs hover:bg-slate-800">Nach hinten</button><button type="button" onClick={() => reorder(1)} className="rounded border border-slate-700 px-2 py-1.5 text-xs hover:bg-slate-800">Nach vorne</button></div>
        <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={selected.locked === true} onChange={event => patchSelected({ locked: event.target.checked })}/>Position sperren</label>
        <button type="button" onClick={removeSelected} className="w-full rounded-lg border border-rose-900 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/50">Element löschen</button>
      </div>}
    </aside>
  </div>;

  return <div ref={editorRef} className="fixed inset-0 z-[110] flex flex-col overscroll-none overflow-hidden bg-slate-950 text-white shadow-2xl" role="region" aria-label="Belegvorlage im Vollbild bearbeiten">
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-700 bg-slate-900 px-4 py-3">
      <div className="mr-auto min-w-[180px]"><h3 className="font-semibold text-slate-100">Belegvorlage bearbeiten</h3><p className="text-xs text-slate-500">Raster, Snapping und Hilfslinien sind aktiv</p></div>
      <input aria-label="Vorlagenname" value={templateName || ""} onChange={event => onTemplateNameChange?.(event.target.value)} className="w-56 rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"/>
      <select aria-label="Belegart der Vorlage" value={documentType || "quote"} onChange={event => onDocumentTypeChange?.(event.target.value)} className="rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm">{documentTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
      <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={setAsDefault === true} onChange={event => onSetAsDefaultChange?.(event.target.checked)}/>Als Standard</label>
      <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 p-1">
        <button type="button" aria-label="Belegansicht verkleinern" onClick={() => setZoom(current => Math.max(40, current - 10))} className="rounded px-2 py-1 text-sm hover:bg-slate-800">−</button>
        <label className="flex items-center gap-2 px-2 text-xs text-slate-300"><span>Ansicht</span><input aria-label="Skalierung der Belegansicht" type="range" min="40" max="180" step="10" value={zoom} onChange={event => setZoom(Number(event.target.value))} className="w-24"/><span className="w-9 text-right tabular-nums">{zoom}%</span></label>
        <button type="button" aria-label="Belegansicht vergrößern" onClick={() => setZoom(current => Math.min(180, current + 10))} className="rounded px-2 py-1 text-sm hover:bg-slate-800">+</button>
      </div>
      <button type="button" disabled={saving || !String(templateName || "").trim()} onClick={onSave} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40">{saving ? "Speichert …" : "Vorlage speichern"}</button>
      <button type="button" onClick={onClose} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800">Schließen</button>
    </div>
    {editor}
  </div>;
}
