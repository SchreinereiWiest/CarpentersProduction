export const DAY_MS = 24 * 60 * 60 * 1000;

export const CALENDAR_TYPES = [
  { key: "project", label: "Projektzeitraum", color: "#64748b", scope: "production" },
  { key: "measurement", label: "Aufmaß", color: "#38bdf8", scope: "production" },
  { key: "planning", label: "Planung", color: "#a78bfa", scope: "production" },
  { key: "manufacturing", label: "Fertigung", color: "#f59e0b", scope: "production" },
  { key: "installation", label: "Montage", color: "#10b981", scope: "production" },
  { key: "appointment", label: "Einzeltermin", color: "#f43f5e", scope: "production" },
  { key: "personal-appointment", type: "appointment", label: "Privater Termin", color: "#ec4899", scope: "personal" },
  { key: "personal-vacation", type: "vacation", label: "Urlaub", color: "#22c55e", scope: "personal" },
  { key: "personal-other", type: "other", label: "Persönlich / Sonstiges", color: "#06b6d4", scope: "personal" }
];

export const startOfDay = value => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (value, amount) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};

export const startOfWorkWeek = value => {
  const date = startOfDay(value);
  const weekday = date.getDay() || 7;
  return addDays(date, 1 - weekday);
};

export const monthGridStart = value => {
  const date = new Date(value);
  date.setDate(1);
  return startOfWorkWeek(date);
};

export const calendarDays = (start, count) =>
  Array.from({ length: count }, (_, index) => addDays(start, index));

export function viewRange(view, focusDate) {
  if (view === "day") {
    const from = startOfDay(focusDate);
    return { from, to: addDays(from, 1) };
  }
  if (view === "week") {
    const from = startOfWorkWeek(focusDate);
    return { from, to: addDays(from, 5) };
  }
  const from = monthGridStart(focusDate);
  return { from, to: addDays(from, 42) };
}

export const dateKey = value => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const timeKey = value => {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export const localDateTime = (date, time = "00:00") => new Date(`${date}T${time}:00`);

export const eventFilterKey = event =>
  event.scope === "personal" ? `personal-${event.type}` : event.type;

export const typeDefinition = eventOrKey => {
  const key = typeof eventOrKey === "string" ? eventOrKey : eventFilterKey(eventOrKey);
  return CALENDAR_TYPES.find(item => item.key === key) ?? CALENDAR_TYPES.at(-1);
};

export const eventOverlapsDay = (event, day) => {
  const from = startOfDay(day);
  const to = addDays(from, 1);
  return new Date(event.startAt) < to && new Date(event.endAt) > from;
};

export const visibleEvents = (events, filters) =>
  events.filter(event => filters[eventFilterKey(event)] !== false);

export function timedEventPosition(event, day) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const start = new Date(Math.max(new Date(event.startAt).getTime(), dayStart.getTime()));
  const end = new Date(Math.min(new Date(event.endAt).getTime(), dayEnd.getTime()));
  const startMinutes = (start.getTime() - dayStart.getTime()) / 60000;
  const durationMinutes = Math.max(20, (end.getTime() - start.getTime()) / 60000);
  return {
    top: `${(startMinutes / 1440) * 100}%`,
    height: `${Math.min(100 - (startMinutes / 1440) * 100, (durationMinutes / 1440) * 100)}%`
  };
}

export const formatViewTitle = (view, focusDate) => {
  const date = new Date(focusDate);
  if (view === "day") {
    return new Intl.DateTimeFormat("de-DE", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    }).format(date);
  }
  if (view === "week") {
    const start = startOfWorkWeek(date);
    const end = addDays(start, 4);
    const first = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(start);
    const last = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(end);
    return `${first} – ${last}`;
  }
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(date);
};

export const moveFocus = (view, focusDate, direction) => {
  if (view === "day") return addDays(focusDate, direction);
  if (view === "week") return addDays(focusDate, direction * 7);
  const date = new Date(focusDate);
  date.setDate(1);
  date.setMonth(date.getMonth() + direction);
  return date;
};

export const durationInDays = event => Math.max(
  1,
  Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / DAY_MS)
);

export function buildEventPayload(form) {
  const start = localDateTime(form.startDate, form.allDay ? "00:00" : form.startTime);
  let end;
  if (form.allDay) {
    end = addDays(start, Math.max(1, Number(form.duration) || 1));
  } else {
    end = localDateTime(form.endDate, form.endTime);
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Das Terminende muss nach dem Beginn liegen.");
  }
  return {
    scope: form.scope,
    type: form.type,
    title: form.title.trim(),
    description: form.description.trim() || null,
    projectId: form.scope === "production" ? form.projectId || null : null,
    allDay: Boolean(form.allDay),
    startAt: start.toISOString(),
    endAt: end.toISOString()
  };
}
