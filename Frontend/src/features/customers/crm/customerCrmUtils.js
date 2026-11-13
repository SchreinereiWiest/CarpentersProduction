export const communicationLabels = {
  phone: "Telefonat",
  email: "E-Mail",
  letter: "Schriftverkehr",
  meeting: "Besprechung",
  note: "Notiz",
  other: "Sonstiges"
};

export const calendarTypeLabels = {
  project: "Projektzeitraum",
  measurement: "Aufmaß",
  planning: "Planung",
  manufacturing: "Fertigung",
  installation: "Montage",
  appointment: "Termin",
  vacation: "Urlaub",
  other: "Sonstiges"
};

export const appointmentStatusLabels = {
  planned: "Geplant",
  completed: "Erledigt",
  cancelled: "Abgesagt"
};

export const customerDisplayName = customer =>
  [customer?.firstName, customer?.lastName].filter(Boolean).join(" ")
  || customer?.companyName
  || "Unbenannter Kunde";

export const actorDisplayName = actor =>
  [actor?.firstName, actor?.lastName].filter(Boolean).join(" ")
  || actor?.login
  || "Unbekannt";

export function formatDateTime(value, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(value));
}

export function localDateTimeInput(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function initialAppointmentTimes(now = new Date()) {
  const start = new Date(now);
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { startAt: localDateTimeInput(start), endAt: localDateTimeInput(end) };
}
