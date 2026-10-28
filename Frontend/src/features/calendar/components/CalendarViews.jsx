import { useEffect, useRef } from "react";
import {
  calendarDays,
  eventOverlapsDay,
  monthGridStart,
  startOfDay,
  startOfWorkWeek,
  timedEventPosition,
  typeDefinition
} from "../engine/calendar.js";

const hours = Array.from({ length: 24 }, (_, hour) => hour);
const weekdayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

const isToday = day => startOfDay(day).getTime() === startOfDay(new Date()).getTime();

function EventBlock({ event, compact = false, continuation = false, onSelect }) {
  const definition = typeDefinition(event);
  const time = event.allDay ? "" : new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.startAt));
  return (
    <button
      type="button"
      onClick={click => { click.stopPropagation(); onSelect(event); }}
      title={`${event.title}${event.project ? ` – ${event.project.title}` : ""}`}
      className={`w-full overflow-hidden border-l-4 text-left text-white shadow-sm transition hover:brightness-110 ${compact ? "h-5 px-1 text-[10px] leading-5" : "rounded-md px-2 py-1 text-xs"} ${continuation ? "rounded-none" : "rounded-md"}`}
      style={{ backgroundColor: `${definition.color}cc`, borderLeftColor: definition.color }}
    >
      <span className="font-semibold">{time && `${time} `}{event.title}</span>
      {!compact && event.project && <span className="block truncate opacity-80">{event.project.title}</span>}
    </button>
  );
}

function AllDayLane({ day, events, onSelect, compact = false }) {
  return (
    <div className={`space-y-1 ${compact ? "min-h-6" : "min-h-10 p-1"}`}>
      {events.filter(event => event.allDay && eventOverlapsDay(event, day)).map(event => {
        const beginsBefore = new Date(event.startAt) < startOfDay(day);
        return <EventBlock key={event.id} event={event} compact={compact} continuation={beginsBefore} onSelect={onSelect} />;
      })}
    </div>
  );
}

export function DayView({ date, events, onSelect, onCreateAt }) {
  const scrollRef = useRef(null);
  const timed = events.filter(event => !event.allDay && eventOverlapsDay(event, date));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 7 * 64;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [date]);

  return (
    <div ref={scrollRef} className="h-[calc(100dvh-14rem)] min-h-[420px] min-w-0 overflow-auto overscroll-contain rounded-xl border border-slate-700 bg-slate-800">
      <div className="sticky top-0 z-20 grid grid-cols-[4rem_1fr] border-b border-slate-700 bg-slate-800/95 backdrop-blur">
        <div className="border-r border-slate-700 p-2 text-[10px] uppercase text-slate-500">Ganztag</div>
        <AllDayLane day={date} events={events} onSelect={onSelect} />
      </div>
      <div className="relative h-[1536px] min-w-[280px]" onDoubleClick={() => onCreateAt(date)}>
        {hours.map(hour => (
          <div key={hour} className="absolute inset-x-0 grid h-16 grid-cols-[4rem_1fr]" style={{ top: hour * 64 }}>
            <div className="-translate-y-2 border-r border-slate-700 pr-2 text-right text-xs text-slate-500">{String(hour).padStart(2, "0")}:00</div>
            <div className="border-t border-slate-700/70" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-16 right-2">
          {timed.map(event => (
            <div key={event.id} className="absolute left-2 right-2 min-h-8" style={timedEventPosition(event, date)}>
              <EventBlock event={event} onSelect={onSelect} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WeekView({ date, events, onSelect, onCreateAt }) {
  const scrollRef = useRef(null);
  const days = calendarDays(startOfWorkWeek(date), 5);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      if (scroller) scroller.scrollTop = scroller.scrollHeight * (7 / 24);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [date]);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
      <div className="min-w-[650px]">
        <div className="grid grid-cols-[3.5rem_repeat(5,minmax(0,1fr))] border-b border-slate-700">
          <div className="border-r border-slate-700" />
          {days.map(day => (
            <button key={day.toISOString()} type="button" onClick={() => onCreateAt(day)} className={`border-r border-slate-700 p-2 text-center text-xs font-semibold uppercase last:border-r-0 ${isToday(day) ? "bg-sky-950 text-sky-300" : "text-slate-300"}`}>
              {weekdayFormatter.format(day)}
            </button>
          ))}
          <div className="border-r border-t border-slate-700 p-1 text-[9px] uppercase text-slate-500">Ganztag</div>
          {days.map(day => (
            <div key={`all-${day.toISOString()}`} className="border-r border-t border-slate-700 p-1 last:border-r-0">
              <AllDayLane day={day} events={events} onSelect={onSelect} compact />
            </div>
          ))}
        </div>
        <div ref={scrollRef} className="h-[calc(100dvh-17rem)] min-h-[420px] overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-[3.5rem_repeat(5,minmax(0,1fr))]" style={{ height: "141.1764706%" }}>
            <div className="relative border-r border-slate-700">
              {hours.map(hour => <span key={hour} className="absolute right-2 -translate-y-1/2 text-[10px] text-slate-500" style={{ top: `${(hour / 24) * 100}%` }}>{String(hour).padStart(2, "0")}:00</span>)}
            </div>
            {days.map(day => (
              <div key={day.toISOString()} className={`relative border-r border-slate-700 last:border-r-0 ${isToday(day) ? "bg-sky-950/20" : ""}`} onDoubleClick={() => onCreateAt(day)}>
                {hours.map(hour => <div key={hour} className="absolute inset-x-0 border-t border-slate-700/60" style={{ top: `${(hour / 24) * 100}%` }} />)}
                {events.filter(event => !event.allDay && eventOverlapsDay(event, day)).map(event => (
                  <div key={event.id} className="absolute left-1 right-1 z-10 min-h-5" style={timedEventPosition(event, day)}>
                    <EventBlock event={event} compact onSelect={onSelect} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonthView({ date, events, onSelect, onCreateAt }) {
  const days = calendarDays(monthGridStart(date), 42);
  const currentMonth = new Date(date).getMonth();
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
      <div className="min-w-[630px]">
        <div className="grid grid-cols-7 border-b border-slate-700 bg-slate-900/40">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(label => <div key={label} className="border-r border-slate-700 p-2 text-center text-xs font-semibold uppercase text-slate-400 last:border-r-0">{label}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map(day => {
            const dayEvents = events.filter(event => eventOverlapsDay(event, day)).slice(0, 4);
            const hiddenCount = events.filter(event => eventOverlapsDay(event, day)).length - dayEvents.length;
            return (
              <div
                key={day.toISOString()}
                onDoubleClick={() => onCreateAt(day)}
                className={`min-h-28 border-b border-r border-slate-700 p-1 text-left align-top last:border-r-0 ${day.getMonth() !== currentMonth ? "bg-slate-900/50 text-slate-600" : "text-slate-300"} ${isToday(day) ? "bg-sky-950/40" : ""}`}
              >
                <span className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs ${isToday(day) ? "bg-sky-500 font-bold text-white" : ""}`}>{day.getDate()}</span>
                <span className="block space-y-1">
                  {dayEvents.map(event => (
                    <span key={event.id} className="block">
                      <EventBlock
                        event={event}
                        compact
                        continuation={new Date(event.startAt) < startOfDay(day)}
                        onSelect={onSelect}
                      />
                    </span>
                  ))}
                  {hiddenCount > 0 && <span className="block px-1 text-[10px] text-slate-400">+ {hiddenCount} weitere</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
