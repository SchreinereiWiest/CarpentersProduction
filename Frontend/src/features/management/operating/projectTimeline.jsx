import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useManagement } from "../hooks/useManagement.js";

const CELL_WIDTH = 38;
const OVERVIEW_CELL_WIDTH = 30;
const projectColors = ["#2563eb", "#7c3aed", "#d97706", "#059669", "#db2777", "#0891b2", "#dc2626", "#4f46e5"];
const inputClass = "rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500";
const calendarTypes = [
  ["project", "Projektzeitraum"],
  ["measurement", "Aufmaß"],
  ["planning", "Planung"],
  ["manufacturing", "Fertigung"],
  ["installation", "Montage"],
  ["appointment", "Termin"]
];
const key = value => String(value || "").slice(0, 10);
const localDate = value => new Date(`${key(value)}T12:00:00`);
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (value, amount) => { const date = value instanceof Date ? new Date(value) : localDate(value); date.setDate(date.getDate() + amount); return date; };
const dayNumber = value => { const date = value instanceof Date ? value : localDate(value); return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000; };
const distance = (from, to) => dayNumber(to) - dayNumber(from);
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function initialRows(schedule) {
  if (Array.isArray(schedule?.plan) && schedule.plan.length) return structuredClone(schedule.plan);
  if (schedule?.plannedStart && schedule?.plannedEnd) return [{
    id: uid("row"), label: "Gesamtzeitraum",
    bars: [{ id: uid("bar"), start: key(schedule.plannedStart), end: key(schedule.plannedEnd) }]
  }];
  return [];
}

function bounds(rows) {
  const bars = rows.flatMap(row => row.bars || []);
  if (!bars.length) return null;
  return { start: bars.map(bar => bar.start).sort()[0], end: bars.map(bar => bar.end).sort().at(-1) };
}

const compareBars = (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || String(a.id).localeCompare(String(b.id));

function packBarLanes(bars) {
  return [...bars].sort(compareBars).reduce((lanes, bar) => {
    const available = lanes.findIndex(lane => lane.at(-1).end < bar.start);
    if (available >= 0) lanes[available].push(bar);
    else lanes.push([bar]);
    return lanes;
  }, []);
}

function buildOverviewProjects(projects, plans) {
  return projects.map(project => {
    const rows = (plans[project.id] || []).map(row => {
      const bars = [...(row.bars || [])].filter(bar => bar.start && bar.end).sort(compareBars);
      return { ...row, bars, bounds: bars.length ? { start: bars[0].start, end: bars.map(bar => bar.end).sort().at(-1) } : null, lanes: packBarLanes(bars) };
    }).filter(row => row.bounds).sort((a, b) => a.bounds.start.localeCompare(b.bounds.start) || a.bounds.end.localeCompare(b.bounds.end) || a.label.localeCompare(b.label, "de"));
    return { project, rows, bounds: bounds(rows) };
  }).filter(item => item.bounds).sort((a, b) => a.bounds.start.localeCompare(b.bounds.start) || a.bounds.end.localeCompare(b.bounds.end) || (a.project.projectNumber || a.project.title).localeCompare(b.project.projectNumber || b.project.title, "de"));
}

function peakParallelProjects(projects) {
  const changes = new Map();
  projects.forEach(item => {
    const merged = item.rows.flatMap(row => row.bars).sort(compareBars).reduce((ranges, bar) => {
      const previous = ranges.at(-1);
      if (previous && bar.start <= dateKey(addDays(previous.end, 1))) previous.end = previous.end > bar.end ? previous.end : bar.end;
      else ranges.push({ start: bar.start, end: bar.end });
      return ranges;
    }, []);
    merged.forEach(range => {
      const start = dayNumber(range.start);
      const afterEnd = dayNumber(addDays(range.end, 1));
      changes.set(start, (changes.get(start) || 0) + 1);
      changes.set(afterEnd, (changes.get(afterEnd) || 0) - 1);
    });
  });
  let current = 0;
  return [...changes.entries()].sort(([a], [b]) => a - b).reduce((maximum, [, change]) => {
    current += change;
    return Math.max(maximum, current);
  }, 0);
}

export default function ProjectTimeline() {
  const { workspace, busy, request } = useManagement();
  const schedules = useMemo(() => Object.fromEntries((workspace.projectSchedules || []).map(item => [item.projectId, item])), [workspace.projectSchedules]);
  const firstProject = workspace.projects[0];
  const [selectedProjectId, setSelectedProjectId] = useState(firstProject?.id || "");
  const [plans, setPlans] = useState(() => Object.fromEntries(workspace.projects.map(project => [project.id, initialRows(schedules[project.id])])));
  const [selectedCalendarTypes, setSelectedCalendarTypes] = useState(() => Object.fromEntries(workspace.projects.map(project => [project.id, schedules[project.id]?.calendarType || "project"])));
  const [mode, setMode] = useState("overview");
  const overviewProjects = useMemo(() => buildOverviewProjects(workspace.projects, plans), [plans, workspace.projects]);
  const overviewBounds = bounds(overviewProjects.flatMap(item => item.rows));
  const selectedProject = workspace.projects.find(project => project.id === selectedProjectId);
  const rows = plans[selectedProjectId] || [];
  const initialBound = overviewBounds || bounds(rows);
  const [viewStart, setViewStart] = useState(initialBound?.start || key(selectedProject?.startDate) || dateKey(new Date()));
  const [visibleCount, setVisibleCount] = useState(() => {
    if (!overviewBounds) return 90;
    const duration = distance(overviewBounds.start, overviewBounds.end) + 1;
    return [30, 60, 90, 120, 180].find(value => value >= duration) || 180;
  });
  const [newRowLabel, setNewRowLabel] = useState("");
  const [drawing, setDrawing] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [dragging, setDragging] = useState(null);
  const visibleDays = useMemo(() => Array.from({ length: visibleCount }, (_, index) => addDays(viewStart, index)), [viewStart, visibleCount]);
  const planBounds = bounds(rows);
  const selectedCalendarType = selectedCalendarTypes[selectedProjectId] || "project";
  const linkedCalendarEvent = schedules[selectedProjectId]?.calendarEvent;
  const linkedCalendarEnd = linkedCalendarEvent ? addDays(new Date(linkedCalendarEvent.endAt), -1) : null;

  const setRows = updater => setPlans(current => ({
    ...current,
    [selectedProjectId]: typeof updater === "function" ? updater(current[selectedProjectId] || []) : updater
  }));
  const selectProject = projectId => {
    setSelectedProjectId(projectId);
    const project = workspace.projects.find(item => item.id === projectId);
    const projectRows = plans[projectId] || [];
    setViewStart(bounds(projectRows)?.start || key(project?.startDate) || dateKey(new Date()));
    setDrawing(null);
  };
  const openEditor = projectId => {
    setMode("editor");
    selectProject(projectId || selectedProjectId);
  };
  const openOverview = () => {
    setMode("overview");
    setViewStart(overviewBounds?.start || dateKey(new Date()));
    setDrawing(null);
  };
  const addRow = () => {
    const label = newRowLabel.trim();
    if (!label) return;
    setRows(current => [...current, { id: uid("row"), label, bars: [] }]);
    setNewRowLabel("");
  };
  const updateRow = (rowId, updater) => setRows(current => current.map(row => row.id === rowId ? updater(row) : row));
  const clickDay = (rowId, value) => {
    const clicked = dateKey(value);
    if (!drawing || drawing.rowId !== rowId) {
      setDrawing({ rowId, start: clicked });
      setHoverDate(clicked);
      return;
    }
    const start = drawing.start <= clicked ? drawing.start : clicked;
    const end = drawing.start <= clicked ? clicked : drawing.start;
    updateRow(rowId, row => ({ ...row, bars: [...row.bars, { id: uid("bar"), start, end }] }));
    setDrawing(null);
    setHoverDate(null);
  };
  const moveBar = (targetRowId, start) => {
    if (!dragging) return;
    const duration = distance(dragging.start, dragging.end) + 1;
    setRows(current => current.map(row => {
      const without = row.bars.filter(bar => bar.id !== dragging.barId);
      return row.id === targetRowId
        ? { ...row, bars: [...without, { id: dragging.barId, start, end: dateKey(addDays(start, duration - 1)) }] }
        : { ...row, bars: without };
    }));
    setDragging(null);
  };
  const resizeBar = (rowId, bar) => {
    const entered = window.prompt("Neue Balkenbreite in Kalendertagen:", String(distance(bar.start, bar.end) + 1));
    if (entered === null) return;
    const duration = Math.round(Number(entered));
    if (!Number.isFinite(duration) || duration < 1 || duration > 3650) return;
    updateRow(rowId, row => ({ ...row, bars: row.bars.map(item => item.id === bar.id ? { ...item, end: dateKey(addDays(item.start, duration - 1)) } : item) }));
  };
  const removeBar = (rowId, barId) => updateRow(rowId, row => ({ ...row, bars: row.bars.filter(bar => bar.id !== barId) }));
  const save = () => request("put", `/projects/${selectedProjectId}/schedule`, { rows }, "Projektplanung und Gesamtzeitraum gespeichert.");
  const transferToCalendar = () => {
    if (!planBounds) return;
    const startAt = new Date(`${planBounds.start}T00:00:00`);
    const endAt = addDays(new Date(`${planBounds.end}T00:00:00`), 1);
    request("post", `/projects/${selectedProjectId}/schedule/calendar`, {
      rows,
      calendarType: selectedCalendarType,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString()
    }, schedules[selectedProjectId]?.calendarEvent ? "Kalendereintrag wurde aktualisiert." : "Projektzeitraum wurde in den Kalender übertragen.");
  };
  const removePlan = async () => {
    if (await request("delete", `/projects/${selectedProjectId}/schedule`, undefined, "Projektplanung entfernt.")) {
      setRows([]);
      setDrawing(null);
    }
  };

  if (!firstProject) return <div className="rounded-2xl border border-gray-700 bg-gray-800 p-10 text-center text-gray-400">Es sind keine planbaren Projekte vorhanden.</div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Interaktive Projektzeitplanung</h1><p className="mt-1 max-w-4xl text-sm text-gray-400">Alle Projektzeiträume gemeinsam auswerten oder einzelne Gantts im Tagesraster bearbeiten.</p></div>
      <div className="flex rounded-xl border border-gray-700 bg-gray-900 p-1" role="group" aria-label="Ansicht wählen">
        <button type="button" onClick={openOverview} className={`rounded-lg px-4 py-2 text-sm ${mode === "overview" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>Gesamtübersicht</button>
        <button type="button" onClick={() => openEditor()} className={`rounded-lg px-4 py-2 text-sm ${mode === "editor" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>Einzelprojekt bearbeiten</button>
      </div>
    </div>

    {mode === "overview" ? <ProjectPortfolioTimeline projects={overviewProjects} unplannedCount={workspace.projects.length - overviewProjects.length} viewStart={viewStart} setViewStart={setViewStart} visibleCount={visibleCount} setVisibleCount={setVisibleCount} onEdit={openEditor} /> : <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><label className="text-xs text-gray-400">Projekt auswählen<select value={selectedProjectId} onChange={event => selectProject(event.target.value)} className={`${inputClass} mt-1 min-w-72`}>
          {workspace.projects.map(project => <option key={project.id} value={project.id}>{project.projectNumber ? `${project.projectNumber} · ` : ""}{project.title}</option>)}
        </select></label><Link to={`/Projects/${selectedProject.id}`} className="mt-3 block text-xl font-semibold text-blue-300 hover:underline">{selectedProject.title}</Link><p className="mt-1 text-sm text-gray-500">Gesamtzeitraum: <strong className="text-gray-300">{planBounds ? `${planBounds.start} bis ${planBounds.end}` : "noch nicht festgelegt"}</strong></p></div>
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" onClick={() => setViewStart(dateKey(addDays(viewStart, -30)))} className="rounded-lg border border-gray-700 px-3 py-2">← 30 Tage</button>
          <label className="text-xs text-gray-500">Ansicht ab<input type="date" value={viewStart} onChange={event => setViewStart(event.target.value)} className={`${inputClass} mt-1`} /></label>
          <label className="text-xs text-gray-500">Breite<select value={visibleCount} onChange={event => setVisibleCount(Number(event.target.value))} className={`${inputClass} mt-1`}><option value="30">30 Tage</option><option value="60">60 Tage</option><option value="90">90 Tage</option><option value="120">120 Tage</option></select></label>
          <button type="button" onClick={() => setViewStart(dateKey(addDays(viewStart, 30)))} className="rounded-lg border border-gray-700 px-3 py-2">30 Tage →</button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-gray-900 p-3">
        <label className="min-w-64 flex-1 text-xs text-gray-500">Neue Planzeile<input value={newRowLabel} onChange={event => setNewRowLabel(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addRow(); } }} placeholder="z. B. Aufmaß, Planung, Fertigung, Montage" className={`${inputClass} mt-1 w-full`} /></label>
        <button type="button" disabled={!newRowLabel.trim()} onClick={addRow} className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600 disabled:opacity-40">Zeile hinzufügen</button>
        <p className="ml-auto max-w-xl text-xs text-gray-500">Erster Klick setzt den Balkenstart, Mausbewegung zeigt die Vorschau, zweiter Klick setzt das Ende. Balken ziehen zum Verschieben; Doppelklick ändert die Breite.</p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-700">
        <div style={{ minWidth: 260 + (visibleCount * CELL_WIDTH) }}>
          <div className="grid border-b border-gray-700 bg-gray-950" style={{ gridTemplateColumns: `260px ${visibleCount * CELL_WIDTH}px` }}>
            <div className="sticky left-0 z-20 border-r border-gray-700 bg-gray-950 p-3 text-xs font-semibold uppercase text-gray-500">Arbeitsschritt</div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleCount}, ${CELL_WIDTH}px)` }}>{visibleDays.map(day => <div key={dateKey(day)} className={`border-r border-gray-800 py-2 text-center text-[10px] ${[0, 6].includes(day.getDay()) ? "bg-gray-900 text-gray-600" : "text-gray-400"}`}><span className="block">{day.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2)}</span><strong className="block text-xs">{day.getDate()}</strong><span>{day.getMonth() + 1}.</span></div>)}</div>
          </div>

          {!rows.length && <div className="p-10 text-center text-sm text-gray-500">Lege die erste Planzeile an, um mit der Zeitplanung zu beginnen.</div>}
          {rows.map(row => <div key={row.id} className="grid min-h-20 border-b border-gray-700 last:border-0" style={{ gridTemplateColumns: `260px ${visibleCount * CELL_WIDTH}px` }}>
            <div className="sticky left-0 z-20 flex items-center gap-2 border-r border-gray-700 bg-gray-900 p-3"><input aria-label={`${row.label} Bezeichnung`} value={row.label} onChange={event => updateRow(row.id, current => ({ ...current, label: event.target.value }))} className="min-w-0 flex-1 rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm" /><button type="button" aria-label={`${row.label} löschen`} onClick={() => setRows(current => current.filter(item => item.id !== row.id))} className="text-red-300">✕</button></div>
            <div className="relative grid" style={{ gridTemplateColumns: `repeat(${visibleCount}, ${CELL_WIDTH}px)` }} onMouseLeave={() => setHoverDate(null)}>
              {visibleDays.map(day => { const value = dateKey(day); return <button key={value} type="button" aria-label={`${row.label} ${value}`} onMouseEnter={() => drawing?.rowId === row.id && setHoverDate(value)} onClick={() => clickDay(row.id, day)} onDragOver={event => event.preventDefault()} onDrop={() => moveBar(row.id, value)} className={`border-r border-gray-700/60 hover:bg-blue-950/40 ${[0, 6].includes(day.getDay()) ? "bg-gray-950/60" : "bg-gray-900/30"}`} />; })}
              {drawing?.rowId === row.id && hoverDate && <PlanBar start={drawing.start <= hoverDate ? drawing.start : hoverDate} end={drawing.start <= hoverDate ? hoverDate : drawing.start} viewStart={viewStart} visibleCount={visibleCount} preview label="Neuer Balken" />}
              {row.bars.map(bar => <PlanBar key={bar.id} {...bar} viewStart={viewStart} visibleCount={visibleCount} label={row.label} draggable onDragStart={() => setDragging({ rowId: row.id, barId: bar.id, start: bar.start, end: bar.end })} onDragEnd={() => setDragging(null)} onDoubleClick={() => resizeBar(row.id, bar)} onRemove={() => removeBar(row.id, bar.id)} />)}
            </div>
          </div>)}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs text-gray-500">Der früheste Balkenstart und das späteste Balkenende bilden automatisch den Projektzeitraum für den Kalenderimport.</p>{linkedCalendarEvent && <p className="mt-1 text-xs text-green-300">Mit dem Kalender verknüpft: {new Date(linkedCalendarEvent.startAt).toLocaleDateString("de-DE")} bis {linkedCalendarEnd.toLocaleDateString("de-DE")}</p>}</div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          {schedules[selectedProjectId] && <button type="button" disabled={busy} onClick={removePlan} className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300">Planung löschen</button>}
          <button type="button" disabled={busy || !planBounds || rows.some(row => !row.label.trim())} onClick={save} className="rounded-lg border border-blue-700 px-4 py-2 font-medium text-blue-300 hover:bg-blue-950 disabled:opacity-50">Projektplanung speichern</button>
          <label className="text-xs text-gray-500">Kalendertyp<select aria-label="Kalendertyp" value={selectedCalendarType} onChange={event => setSelectedCalendarTypes(current => ({ ...current, [selectedProjectId]: event.target.value }))} className={`${inputClass} mt-1`}>
            {calendarTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <button type="button" disabled={busy || !planBounds || rows.some(row => !row.label.trim())} onClick={transferToCalendar} className="rounded-lg bg-green-700 px-5 py-2 font-medium hover:bg-green-600 disabled:opacity-50">{linkedCalendarEvent ? "Kalendereintrag aktualisieren" : "In Kalender übertragen"}</button>
        </div>
      </div>
    </section>}
  </div>;
}

function ProjectPortfolioTimeline({ projects, unplannedCount, viewStart, setViewStart, visibleCount, setVisibleCount, onEdit }) {
  const visibleDays = useMemo(() => Array.from({ length: visibleCount }, (_, index) => addDays(viewStart, index)), [viewStart, visibleCount]);
  const cellWidth = OVERVIEW_CELL_WIDTH;
  const planRows = projects.reduce((sum, item) => sum + item.rows.length, 0);
  const bars = projects.reduce((sum, item) => sum + item.rows.reduce((rowSum, row) => rowSum + row.bars.length, 0), 0);
  const peak = peakParallelProjects(projects);
  const loads = visibleDays.map(day => {
    const value = dateKey(day);
    const activeProjects = projects.filter(item => item.rows.some(row => row.bars.some(bar => bar.start <= value && bar.end >= value)));
    const activeBars = activeProjects.reduce((sum, item) => sum + item.rows.reduce((rowSum, row) => rowSum + row.bars.filter(bar => bar.start <= value && bar.end >= value).length, 0), 0);
    return { projects: activeProjects.length, bars: activeBars };
  });
  const maxVisibleLoad = Math.max(1, ...loads.map(item => item.projects));

  return <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-xl font-semibold">Gesamtübersicht der Projektzeiträume</h2><p className="mt-1 max-w-3xl text-sm text-gray-400">Projekte sind nach dem frühesten Start sortiert. Arbeitsschritte und Balken folgen chronologisch; Überschneidungen werden automatisch auf getrennte Spuren verteilt.</p></div>
      <TimelineControls viewStart={viewStart} setViewStart={setViewStart} visibleCount={visibleCount} setVisibleCount={setVisibleCount} />
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <PortfolioMetric label="Geplante Projekte" value={projects.length} />
      <PortfolioMetric label="Arbeitsschritte" value={planRows} />
      <PortfolioMetric label="Zeitbalken" value={bars} />
      <PortfolioMetric label="Max. parallele Projekte" value={peak} accent />
      <PortfolioMetric label="Noch ohne Zeitplan" value={unplannedCount} warning={unplannedCount > 0} />
    </div>

    {!projects.length ? <div className="mt-5 rounded-xl border border-dashed border-gray-700 p-12 text-center"><p className="text-gray-400">Es ist noch kein Projekt-Gantt angelegt.</p><button type="button" onClick={() => onEdit()} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium">Erstes Projekt planen</button></div> : <div className="mt-5 overflow-x-auto rounded-xl border border-gray-700">
      <div style={{ minWidth: 300 + (visibleCount * cellWidth) }}>
        <TimelineHeader visibleDays={visibleDays} visibleCount={visibleCount} cellWidth={cellWidth} leftLabel="Projekt / Arbeitsschritt" />
        <div className="grid min-h-14 border-b border-gray-700 bg-gray-950/80" style={{ gridTemplateColumns: `300px ${visibleCount * cellWidth}px` }}>
          <div className="sticky left-0 z-20 flex items-center border-r border-gray-700 bg-gray-950 px-4"><div><strong className="text-sm text-blue-300">Planungsdichte</strong><span className="block text-xs text-gray-600">Projekte / Arbeitspakete je Tag</span></div></div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${visibleCount}, ${cellWidth}px)` }}>{loads.map((load, index) => <div key={dateKey(visibleDays[index])} title={`${load.projects} Projekte · ${load.bars} Arbeitspakete`} className="grid place-items-center border-r border-gray-800 text-[10px] font-semibold" style={{ backgroundColor: load.projects ? `rgba(37, 99, 235, ${0.16 + (load.projects / maxVisibleLoad) * 0.64})` : undefined }}><span>{load.projects || ""}</span></div>)}</div>
        </div>
        {projects.map((item, projectIndex) => {
          const color = projectColors[projectIndex % projectColors.length];
          return <div key={item.project.id} className="border-b-2 border-gray-700 last:border-0">
            <div className="grid min-h-14 bg-gray-900" style={{ gridTemplateColumns: `300px ${visibleCount * cellWidth}px` }}>
              <div className="sticky left-0 z-20 flex items-center gap-3 border-r border-gray-700 bg-gray-900 px-4"><span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} /><div className="min-w-0 flex-1"><Link to={`/Projects/${item.project.id}`} className="block truncate font-semibold hover:underline">{item.project.projectNumber ? `${item.project.projectNumber} · ` : ""}{item.project.title}</Link><span className="text-xs text-gray-500">{item.bounds.start} bis {item.bounds.end}</span></div><button type="button" onClick={() => onEdit(item.project.id)} className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800">Bearbeiten</button></div>
              <TimelineGrid visibleDays={visibleDays} visibleCount={visibleCount} cellWidth={cellWidth}><PlanBar start={item.bounds.start} end={item.bounds.end} viewStart={viewStart} visibleCount={visibleCount} cellWidth={cellWidth} label={`${item.project.title} · Gesamtzeitraum`} color={color} compact readOnly summary /></TimelineGrid>
            </div>
            {item.rows.flatMap(row => row.lanes.map((lane, laneIndex) => <div key={`${row.id}-${laneIndex}`} className="grid min-h-11 border-t border-gray-800" style={{ gridTemplateColumns: `300px ${visibleCount * cellWidth}px` }}>
              <div className="sticky left-0 z-20 flex items-center border-r border-gray-700 bg-gray-900/95 px-5 text-sm text-gray-300"><span className="mr-2 text-gray-600">↳</span><span className="truncate">{row.label}{laneIndex ? ` · Spur ${laneIndex + 1}` : ""}</span></div>
              <TimelineGrid visibleDays={visibleDays} visibleCount={visibleCount} cellWidth={cellWidth}>{lane.map(bar => <PlanBar key={bar.id} {...bar} viewStart={viewStart} visibleCount={visibleCount} cellWidth={cellWidth} label={`${item.project.title} · ${row.label}`} color={color} compact readOnly />)}</TimelineGrid>
            </div>))}
          </div>;
        })}
      </div>
    </div>}
    <p className="mt-3 text-xs text-gray-500">Die Planungsdichte zeigt parallele Projekte, nicht die personenbezogene Kapazität. Für eine echte Mitarbeiterauslastung müssen die Projekte zusätzlich Mitarbeitenden zugewiesen sein.</p>
  </section>;
}

function PortfolioMetric({ label, value, accent, warning }) {
  return <div className={`rounded-xl border p-4 ${warning ? "border-amber-900 bg-amber-950/30" : "border-gray-700 bg-gray-900"}`}><span className="text-xs text-gray-500">{label}</span><strong className={`mt-1 block text-2xl ${accent ? "text-blue-300" : warning ? "text-amber-300" : "text-white"}`}>{value}</strong></div>;
}

function TimelineControls({ viewStart, setViewStart, visibleCount, setVisibleCount }) {
  return <div className="flex flex-wrap items-end gap-2"><button type="button" onClick={() => setViewStart(dateKey(addDays(viewStart, -30)))} className="rounded-lg border border-gray-700 px-3 py-2">← 30 Tage</button><label className="text-xs text-gray-500">Ansicht ab<input aria-label="Gesamtübersicht ab" type="date" value={viewStart} onChange={event => setViewStart(event.target.value)} className={`${inputClass} mt-1`} /></label><label className="text-xs text-gray-500">Breite<select aria-label="Gesamtübersicht Breite" value={visibleCount} onChange={event => setVisibleCount(Number(event.target.value))} className={`${inputClass} mt-1`}><option value="30">30 Tage</option><option value="60">60 Tage</option><option value="90">90 Tage</option><option value="120">120 Tage</option><option value="180">180 Tage</option></select></label><button type="button" onClick={() => setViewStart(dateKey(addDays(viewStart, 30)))} className="rounded-lg border border-gray-700 px-3 py-2">30 Tage →</button></div>;
}

function TimelineHeader({ visibleDays, visibleCount, cellWidth, leftLabel }) {
  return <div className="grid border-b border-gray-700 bg-gray-950" style={{ gridTemplateColumns: `300px ${visibleCount * cellWidth}px` }}><div className="sticky left-0 z-30 border-r border-gray-700 bg-gray-950 p-3 text-xs font-semibold uppercase text-gray-500">{leftLabel}</div><div className="grid" style={{ gridTemplateColumns: `repeat(${visibleCount}, ${cellWidth}px)` }}>{visibleDays.map(day => <div key={dateKey(day)} className={`border-r border-gray-800 py-2 text-center text-[10px] ${[0, 6].includes(day.getDay()) ? "bg-gray-900 text-gray-600" : "text-gray-400"}`}><span className="block">{day.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2)}</span><strong className="block text-xs">{day.getDate()}</strong><span>{day.getMonth() + 1}.</span></div>)}</div></div>;
}

function TimelineGrid({ visibleDays, visibleCount, cellWidth, children }) {
  return <div className="relative grid" style={{ gridTemplateColumns: `repeat(${visibleCount}, ${cellWidth}px)` }}>{visibleDays.map(day => <div key={dateKey(day)} className={`border-r border-gray-800 ${[0, 6].includes(day.getDay()) ? "bg-gray-950/70" : "bg-gray-900/30"}`} />)}{children}</div>;
}

function PlanBar({ start, end, viewStart, visibleCount, cellWidth = CELL_WIDTH, label, preview, draggable, readOnly, compact, summary, color, onDragStart, onDragEnd, onDoubleClick, onRemove }) {
  const viewEnd = dateKey(addDays(viewStart, visibleCount - 1));
  if (end < viewStart || start > viewEnd) return null;
  const clippedStart = start < viewStart ? viewStart : start;
  const clippedEnd = end > viewEnd ? viewEnd : end;
  const left = distance(viewStart, clippedStart) * cellWidth + 2;
  const width = (distance(clippedStart, clippedEnd) + 1) * cellWidth - 4;
  const barStyle = { left, width, ...(color ? { backgroundColor: color, borderColor: color } : {}), ...(summary ? { opacity: 0.55 } : {}) };
  return <div draggable={draggable} onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", `${label}:${start}`); onDragStart?.(); }} onDragEnd={onDragEnd} onDoubleClick={event => { event.stopPropagation(); onDoubleClick?.(); }} className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center overflow-hidden rounded-lg border shadow ${compact ? "h-7" : "h-10"} ${preview ? "pointer-events-none border-blue-300 bg-blue-500/45" : readOnly ? "pointer-events-none" : "cursor-grab border-blue-400 bg-blue-600 active:cursor-grabbing"}`} style={barStyle} title={`${label}: ${start} bis ${end}`}><span className="min-w-0 flex-1 truncate px-2 text-xs font-semibold text-white">{label}</span>{!preview && !readOnly && <button type="button" aria-label={`${label} Balken löschen`} onClick={event => { event.stopPropagation(); onRemove?.(); }} className="h-full border-l border-blue-400/50 px-2 text-blue-100 hover:bg-red-600">✕</button>}</div>;
}
