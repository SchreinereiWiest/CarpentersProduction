import { CALENDAR_TYPES } from "../engine/calendar.js";

export default function CalendarFilters({ filters, onChange }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Kalender einblenden</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {CALENDAR_TYPES.map(item => (
          <label key={item.key} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700/60">
            <input
              type="checkbox"
              checked={filters[item.key] !== false}
              onChange={event => onChange(item.key, event.target.checked)}
              className="size-4 accent-sky-500"
            />
            <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
