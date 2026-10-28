const COMMUNICATION_TYPES = new Set(["phone", "email", "letter", "meeting", "note", "other"]);
const APPOINTMENT_STATUSES = new Set(["planned", "completed", "cancelled"]);

export class CrmValidationError extends Error {
  constructor(message, statusCode = 400, code = "INVALID_CRM_INPUT") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const optionalText = value => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const requiredText = (value, field) => {
  const normalized = optionalText(value);
  if (!normalized) throw new CrmValidationError(`${field} ist erforderlich.`);
  return normalized;
};

const optionalDate = (value, field) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new CrmValidationError(`${field} ist ungültig.`);
  return parsed;
};

export function communicationData(input = {}, current = {}) {
  const type = input.type ?? current.type ?? "note";
  if (!COMMUNICATION_TYPES.has(type)) throw new CrmValidationError("Unbekannter Kontakttyp.");

  return {
    type,
    subject: optionalText(input.subject === undefined ? current.subject : input.subject),
    content: requiredText(input.content ?? current.content, "Inhalt"),
    followUpDate: optionalDate(
      input.followUpDate === undefined ? current.followUpDate : input.followUpDate,
      "Wiedervorlagedatum"
    ),
    projectId: (input.projectId === undefined ? current.projectId : input.projectId) || null
  };
}

export function appointmentData(input = {}, current = {}) {
  const startAt = optionalDate(input.startAt ?? current.startAt, "Terminbeginn");
  const endAt = optionalDate(input.endAt ?? current.endAt, "Terminende");
  const status = input.status ?? current.status ?? "planned";

  if (!startAt || !endAt) throw new CrmValidationError("Terminbeginn und -ende sind erforderlich.");
  if (endAt <= startAt) throw new CrmValidationError("Das Terminende muss nach dem Beginn liegen.");
  if (!APPOINTMENT_STATUSES.has(status)) throw new CrmValidationError("Unbekannter Terminstatus.");

  return {
    appointmentType: optionalText(
      input.appointmentType === undefined ? current.appointmentType : input.appointmentType
    ) ?? "customer",
    title: requiredText(input.title ?? current.title, "Termintitel"),
    description: optionalText(
      input.description === undefined ? current.description : input.description
    ),
    startAt,
    endAt,
    status,
    projectId: (input.projectId === undefined ? current.projectId : input.projectId) || null,
    addressId: (input.addressId === undefined ? current.addressId : input.addressId) || null
  };
}
