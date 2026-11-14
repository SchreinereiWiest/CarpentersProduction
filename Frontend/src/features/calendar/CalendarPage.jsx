import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import SideBar from "../../shared/components/sideBar.jsx";
import { useAuth } from "../../app/providers/AuthContext.js";
import CalendarEventForm from "./components/CalendarEventForm.jsx";
import CalendarFilters from "./components/CalendarFilters.jsx";
import { DayView, MonthView, WeekView } from "./components/CalendarViews.jsx";
import {
  CALENDAR_TYPES,
  addDays,
  dateKey,
  formatViewTitle,
  moveFocus,
  viewRange,
  visibleEvents
} from "./engine/calendar.js";
import {
  loadCalendarEvents,
  loadCalendarProjects,
  removeCalendarEvent,
  saveAssignmentCalendarPeriod,
  saveCalendarEvent
} from "./engine/calendarApi.js";

const initialFilters = Object.fromEntries(CALENDAR_TYPES.map(item => [item.key, true]));

export default function CalendarPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectPeriod = location.state?.projectPeriod || null;
  const admin = user?.role === "admin";
  const [view, setView] = useState(() => {
    const requested = searchParams.get("view");
    if (projectPeriod) return "month";
    return ["day", "week", "month"].includes(requested) ? requested : "week";
  });
  const [focusDate, setFocusDate] = useState(() => {
    const requested = new Date(searchParams.get("date") || "");
    return Number.isNaN(requested.getTime()) ? new Date() : requested;
  });
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectionStart, setSelectionStart] = useState(null);
  const [panelOpen, setPanelOpen] = useState(() => !projectPeriod && typeof window !== "undefined" && window.innerWidth >= 1280);
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

  const selectProjectPeriodDay = async day => {
    if (!projectPeriod || saving) return;
    const clicked = new Date(day);
    clicked.setHours(0, 0, 0, 0);
    if (!selectionStart) {
      setSelectionStart(clicked);
      setError("");
      return;
    }
    if (clicked < selectionStart) {
      setError("Der Endtag darf nicht vor dem ausgewählten Starttag liegen.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveAssignmentCalendarPeriod(projectPeriod.assignmentId, {
        startAt: selectionStart.toISOString(),
        endAt: addDays(clicked, 1).toISOString(),
        allDay: true
      });
      await refreshEvents();
      setSelectionStart(null);
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    } catch (saveError) {
      setError(saveError?.response?.data?.message || "Der Projektzeitraum konnte nicht in den Kalender übernommen werden.");
    } finally {
      setSaving(false);
    }
  };

  const provisionalEnd = projectPeriod && selectionStart
    ? new Date(`${projectPeriod.preliminaryEnd}T12:00:00`)
    : null;
  const selectionEnd = provisionalEnd && provisionalEnd >= selectionStart ? provisionalEnd : selectionStart;

  const eventReadOnly = Boolean(selectedEvent && (
    (selectedEvent.scope === "production" && !admin)
    || (selectedEvent.scope === "personal" && selectedEvent.ownerUserId !== user?.id)
  ));

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
                {!projectPeriod && <button type="button" onClick={() => createAt(focusDate)} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 sm:px-4">+ Termin</button>}
                <button type="button" onClick={() => setPanelOpen(open => !open)} aria-label="Kalendereinstellungen" className={`rounded-lg border px-3 py-2 text-sm ${panelOpen ? "border-sky-500 bg-sky-950 text-sky-300" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}>☰</button>
              </div>
            </div>
            <div className="mt-3 flex justify-center">
              <div className="grid grid-cols-3 rounded-lg bg-slate-800 p-1">
                {[["day", "Tag"], ["week", "Woche"], ["month", "Monat"]].map(([value, label]) => (
                  <button key={value} type="button" disabled={Boolean(projectPeriod && value !== "month")} onClick={() => setView(value)} className={`rounded-md px-4 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-35 ${view === value ? "bg-slate-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>{label}</button>
                ))}
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-4">
            {projectPeriod && <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-700 bg-blue-950/60 p-4 text-sm text-blue-100">
              <div><strong>Projektzeitraum planen: {projectPeriod.projectTitle}</strong><span className="ml-2 text-blue-300">für {projectPeriod.assigneeName}</span><p className="mt-1 text-xs text-blue-200/80">{selectionStart ? `Start ${dateKey(selectionStart)} ist markiert. Das vorläufige Ende ${projectPeriod.preliminaryEnd} dient als Vorschau – klicke jetzt den gewünschten Endtag an.` : `Klicke zuerst den Starttag an. Danach wird der vorläufige Zeitraum bis ${projectPeriod.preliminaryEnd} farbig angezeigt.`}</p></div>
              <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-blue-600 px-3 py-2 text-xs hover:bg-blue-900">Planung abbrechen</button>
            </div>}
            {error && <div role="alert" className="mb-3 rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-300">{error}</div>}
            {loading ? (
              <div className="grid h-64 place-items-center text-sm text-slate-400">Kalender wird geladen…</div>
            ) : view === "day" ? (
              <DayView date={focusDate} events={shownEvents} onSelect={selectEvent} onCreateAt={createAt} />
            ) : view === "week" ? (
              <WeekView date={focusDate} events={shownEvents} onSelect={selectEvent} onCreateAt={createAt} />
            ) : (
              <MonthView date={focusDate} events={shownEvents} onSelect={selectEvent} onCreateAt={createAt} periodSelection={projectPeriod ? { start: selectionStart, end: selectionEnd } : null} onSelectDay={projectPeriod ? selectProjectPeriodDay : null} />
            )}
          </div>
        </section>

        {panelOpen && (
          <>
            <button type="button" aria-label="Seitenmenü schließen" onClick={() => setPanelOpen(false)} className="absolute inset-0 z-30 bg-black/50 xl:hidden" />
            <aside className="absolute inset-y-0 right-0 z-40 w-[min(90vw,360px)] overflow-y-auto border-l border-slate-700 bg-slate-800 p-4 shadow-2xl xl:relative xl:z-10 xl:w-80 xl:shrink-0 xl:shadow-none">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">{admin ? "Planung & Einstellungen" : "Firmenkalender"}</p>
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
