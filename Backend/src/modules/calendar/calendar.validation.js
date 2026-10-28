export const CALENDAR_SCOPES = new Set(["production", "personal"]);
export const CALENDAR_TYPES = new Set([
  "project",
  "measurement",
  "planning",
  "manufacturing",
  "installation",
  "appointment",
  "vacation",
  "other"
]);

export const PROJECT_REQUIRED_TYPES = new Set([
  "project",
  "measurement",
  "planning",
  "manufacturing",
  "installation"
]);

export class CalendarValidationError extends Error {
  constructor(message, statusCode = 400, code = "INVALID_CALENDAR_EVENT") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const dateValue = (value, field) => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new CalendarValidationError(`${field} ist kein gültiger Zeitpunkt.`);
  }
  return parsed;
};

export function normalizeCalendarEvent(input, current = {}) {
  const scope = input.scope ?? current.scope ?? "personal";
  const type = input.type ?? current.type ?? "other";
  const title = String(input.title ?? current.title ?? "").trim();
  const descriptionValue = input.description ?? current.description ?? null;
  const description = descriptionValue ? String(descriptionValue).trim() : null;
  const projectIdValue = input.projectId === undefined ? current.projectId : input.projectId;
  const projectId = projectIdValue || null;
  const startAt = dateValue(input.startAt ?? current.startAt, "startAt");
  const endAt = dateValue(input.endAt ?? current.endAt, "endAt");

  if (!CALENDAR_SCOPES.has(scope)) {
    throw new CalendarValidationError("Unbekannter Kalenderbereich.");
  }
  if (!CALENDAR_TYPES.has(type)) {
    throw new CalendarValidationError("Unbekannter Termintyp.");
  }
  if (endAt <= startAt) {
    throw new CalendarValidationError("Das Terminende muss nach dem Beginn liegen.");
  }
  if (scope === "production" && PROJECT_REQUIRED_TYPES.has(type) && !projectId) {
    throw new CalendarValidationError("Für diesen Produktionstermin muss ein Projekt gewählt werden.");
  }
  if (scope === "personal" && !["appointment", "vacation", "other"].includes(type)) {
    throw new CalendarValidationError("Dieser Termintyp ist nur für die Produktionsplanung verfügbar.");
  }

  return {
    scope,
    type,
    title,
    description,
    projectId: scope === "personal" ? null : projectId,
    startAt,
    endAt,
    allDay: Boolean(input.allDay ?? current.allDay ?? false)
  };
}

export function calendarRange(query = {}, now = new Date()) {
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const from = query.from ? dateValue(query.from, "from") : defaultFrom;
  const to = query.to ? dateValue(query.to, "to") : defaultTo;

  if (to <= from) {
    throw new CalendarValidationError("Das Bereichsende muss nach dem Beginn liegen.");
  }
  if (to.getTime() - from.getTime() > 370 * 24 * 60 * 60 * 1000) {
    throw new CalendarValidationError("Ein Kalenderabruf darf höchstens 370 Tage umfassen.");
  }
  return { from, to };
}
