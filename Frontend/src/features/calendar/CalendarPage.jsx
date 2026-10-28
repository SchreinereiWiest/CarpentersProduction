import { useCallback, useEffect, useMemo, useState } from "react";
import SideBar from "../../shared/components/sideBar.jsx";
import { useAuth } from "../../app/providers/AuthContext.js";
import CalendarEventForm from "./components/CalendarEventForm.jsx";
import CalendarFilters from "./components/CalendarFilters.jsx";
import { DayView, MonthView, WeekView } from "./components/CalendarViews.jsx";
import {
  CALENDAR_TYPES,
  formatViewTitle,
  moveFocus,
  viewRange,
  visibleEvents
} from "./engine/calendar.js";
import {
  loadCalendarEvents,
  loadCalendarProjects,
  removeCalendarEvent,
  saveCalendarEvent
} from "./engine/calendarApi.js";

const initialFilters = Object.fromEntries(CALENDAR_TYPES.map(item => [item.key, true]));

export default function CalendarPage() {
  const { user } = useAuth();
  const admin = user?.role === "admin";
  const [view, setView] = useState("week");
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [panelOpen, setPanelOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1280);
  const [loadedRange, setLoadedRange] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => viewRange(view, focusDate), [view, focusDate]);
  const rangeFrom = range.from.getTime();
  const rangeTo = range.to.getTime();
  const rangeKey = `${rangeFrom}:${rangeTo}`;
  const loading = loadedRange !== rangeKey;

  const refreshEvents = useCallback(async signal => {
    const nextEvents = await loadCalendarEvents({
      from: new Date(rangeFrom),
      to: new Date(rangeTo),
      signal
    });
    setEvents(nextEvents);
    setSelectedEvent(current => current
      ? nextEvents.find(event => event.id === current.id) ?? null
      : null);
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    const controller = new AbortController();
    loadCalendarEvents({
      from: new Date(rangeFrom),
      to: new Date(rangeTo),
      signal: controller.signal
    })
      .then(nextEvents => {
        setEvents(nextEvents);
        setSelectedEvent(current => current
          ? nextEvents.find(event => event.id === current.id) ?? null
          : null);
        setLoadedRange(rangeKey);
        setError("");
      })
      .catch(loadError => {
        if (loadError.code !== "ERR_CANCELED") {
          setLoadedRange(rangeKey);
          setError("Der Kalender konnte nicht geladen werden.");
        }
      });
    return () => controller.abort();
  }, [rangeFrom, rangeKey, rangeTo]);

  useEffect(() => {
    if (!admin) return undefined;
    const controller = new AbortController();
    loadCalendarProjects({ signal: controller.signal })
      .then(setProjects)
      .catch(loadError => {
        if (loadError.code !== "ERR_CANCELED") {
          console.error("Kalenderprojekte konnten nicht geladen werden", loadError);
          setError("Die Projektliste für die Produktionsplanung konnte nicht geladen werden.");
        }
      });
    return () => controller.abort();
  }, [admin]);

  const shownEvents = useMemo(() => visibleEvents(events, filters), [events, filters]);

  const selectEvent = event => {
    setSelectedEvent(event);
    setPanelOpen(true);
  };

  const createAt = date => {
    setFocusDate(new Date(date));
    setSelectedEvent(null);
    setPanelOpen(true);
  };

  const save = async payload => {
    setSaving(true);
    try {
      const saved = await saveCalendarEvent(payload);
      await refreshEvents();
      setSelectedEvent(saved);
    } finally {
      setSaving(false);
    }
  };

  const remove = async event => {
    if (!window.confirm(`Termin „${event.title}“ wirklich löschen?`)) return;
    setSaving(true);
    try {
      await removeCalendarEvent(event.id);
      setSelectedEvent(null);
      await refreshEvents();
    } catch (removeError) {
      setError(removeError?.response?.data?.message || "Der Termin konnte nicht gelöscht werden.");
    } finally {
      setSaving(false);
    }
  };

  const eventReadOnly = Boolean(selectedEvent?.scope === "production" && !admin);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-950 text-white">
      <SideBar selected={4} />
      <main className="relative flex min-w-0 flex-1 overflow-hidden">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-slate-800 bg-slate-900/95 px-3 py-3 backdrop-blur sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setFocusDate(moveFocus(view, focusDate, -1))} aria-label="Vorheriger Zeitraum" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800">‹</button>
                <button type="button" onClick={() => setFocusDate(new Date())} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800">Heute</button>
                <button type="button" onClick={() => setFocusDate(moveFocus(view, focusDate, 1))} aria-label="Nächster Zeitraum" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800">›</button>
              </div>
              <h1 className="min-w-0 flex-1 text-center text-base font-semibold capitalize text-white sm:text-lg">{formatViewTitle(view, focusDate)}</h1>
              <div className={`flex items-center gap-2 transition-[margin] ${panelOpen ? "" : "mt-9"}`}>
                <button type="button" onClick={() => createAt(focusDate)} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 sm:px-4">+ Termin</button>
                <button type="button" onClick={() => setPanelOpen(open => !open)} aria-label="Kalendereinstellungen" className={`rounded-lg border px-3 py-2 text-sm ${panelOpen ? "border-sky-500 bg-sky-950 text-sky-300" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}>☰</button>
              </div>
            </div>
            <div className="mt-3 flex justify-center">
              <div className="grid grid-cols-3 rounded-lg bg-slate-800 p-1">
                {[["day", "Tag"], ["week", "Woche"], ["month", "Monat"]].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setView(value)} className={`rounded-md px-4 py-1.5 text-xs font-medium ${view === value ? "bg-slate-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>{label}</button>
                ))}
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-4">
            {error && <div role="alert" className="mb-3 rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-300">{error}</div>}
            {loading ? (
              <div className="grid h-64 place-items-center text-sm text-slate-400">Kalender wird geladen…</div>
            ) : view === "day" ? (
              <DayView date={focusDate} events={shownEvents} onSelect={selectEvent} onCreateAt={createAt} />
            ) : view === "week" ? (
              <WeekView date={focusDate} events={shownEvents} onSelect={selectEvent} onCreateAt={createAt} />
            ) : (
              <MonthView date={focusDate} events={shownEvents} onSelect={selectEvent} onCreateAt={createAt} />
            )}
          </div>
        </section>

        {panelOpen && (
          <>
            <button type="button" aria-label="Seitenmenü schließen" onClick={() => setPanelOpen(false)} className="absolute inset-0 z-30 bg-black/50 xl:hidden" />
            <aside className="absolute inset-y-0 right-0 z-40 w-[min(90vw,360px)] overflow-y-auto border-l border-slate-700 bg-slate-800 p-4 shadow-2xl xl:relative xl:z-10 xl:w-80 xl:shrink-0 xl:shadow-none">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">{admin ? "Planung & Einstellungen" : "Mein Kalender"}</p>
                  <p className="mt-1 text-xs text-slate-400">Termine planen und Ansichten filtern</p>
                </div>
                <button type="button" onClick={() => setPanelOpen(false)} aria-label="Seitenmenü schließen" className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white">✕</button>
              </div>

              <CalendarEventForm
                key={`${selectedEvent?.id ?? "new"}:${selectedEvent?.updatedAt ?? focusDate.toISOString()}`}
                event={selectedEvent}
                focusDate={focusDate}
                projects={projects}
                admin={admin}
                readOnly={eventReadOnly}
                saving={saving}
                onSave={save}
                onDelete={remove}
                onNew={() => setSelectedEvent(null)}
              />

              <div className="my-6 border-t border-slate-700" />
              <CalendarFilters
                filters={filters}
                onChange={(key, checked) => setFilters(current => ({ ...current, [key]: checked }))}
              />
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
