import prisma from "../../infrastructure/database/prisma.js";

export const FREEPBX_WEBHOOK_SECRET = "contact-history.freepbx-webhook-secret";

const ACTIVE_CALL_STATUSES = new Set(["ringing", "answered"]);
const EVENT_TYPES = new Set(["ringing", "answered", "ended"]);

export function normalizeCountryCode(value) {
  const countryCode = String(value || "+49").trim().replace(/^00/, "+");
  if (!/^\+[1-9]\d{0,3}$/.test(countryCode)) {
    throw Object.assign(new Error("Bitte eine gültige internationale Landesvorwahl eingeben, zum Beispiel +49."), {
      statusCode: 400,
      code: "FREEPBX_COUNTRY_CODE_INVALID"
    });
  }
  return countryCode;
}

export function normalizePhoneNumber(value, defaultCountryCode = "+49") {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 80) return null;
  const extensionFree = raw.replace(/(?:ext\.?|durchwahl|x)\s*\d+$/i, "");
  let number = extensionFree.replace(/[^\d+]/g, "");
  if (number.startsWith("00")) number = `+${number.slice(2)}`;
  if (number.startsWith("0")) number = `${normalizeCountryCode(defaultCountryCode)}${number.slice(1)}`;
  if (!number.startsWith("+")) {
    const countryCode = normalizeCountryCode(defaultCountryCode);
    number = number.startsWith(countryCode.slice(1)) ? `+${number}` : `${countryCode}${number}`;
  }
  if (!/^\+[1-9]\d{5,14}$/.test(number)) return null;
  return number;
}

const firstValue = (body, names) => {
  for (const name of names) {
    const value = body?.[name];
    if (value != null && String(value).trim()) return value;
  }
  return null;
};

function webhookDate(value, fallback = new Date()) {
  if (value == null || value === "") return fallback;
  const numeric = Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 10_000_000_000 ? numeric * 1_000 : numeric)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const skew = Math.abs(date.getTime() - Date.now());
  return skew > 31 * 24 * 60 * 60 * 1_000 ? fallback : date;
}

export function parseFreePbxWebhook(event, body = {}, defaultCountryCode = "+49") {
  if (!EVENT_TYPES.has(event)) {
    throw Object.assign(new Error("Unbekanntes Asterisk-Ereignis."), { statusCode: 404, code: "FREEPBX_EVENT_INVALID" });
  }
  const externalId = String(firstValue(body, ["call_id", "linkedid", "Linkedid", "uniqueid", "Uniqueid"]) || "").trim();
  if (!externalId || externalId.length > 200 || /[\r\n\0]/.test(externalId)) {
    throw Object.assign(new Error("Dem Webhook fehlt eine gültige call_id beziehungsweise linkedid."), { statusCode: 400, code: "FREEPBX_CALL_ID_INVALID" });
  }
  const callerNumber = String(firstValue(body, ["caller_number", "caller", "CallerIDNum", "calleridnum"]) || "").trim();
  const normalizedCallerNumber = normalizePhoneNumber(callerNumber, defaultCountryCode);
  if (!normalizedCallerNumber) {
    throw Object.assign(new Error("Dem Webhook fehlt eine gültige Anrufernummer."), { statusCode: 400, code: "FREEPBX_CALLER_INVALID" });
  }
  const calledNumber = String(firstValue(body, ["called_number", "called", "extension", "Exten"]) || "").trim().slice(0, 80) || null;
  const rawDuration = firstValue(body, ["duration_seconds", "duration", "billsec", "BillableSeconds"]);
  const durationSeconds = rawDuration == null ? null : Math.max(0, Math.min(604_800, Math.floor(Number(rawDuration))));
  return {
    event,
    externalId,
    callerNumber: callerNumber.slice(0, 80),
    normalizedCallerNumber,
    defaultCountryCode: normalizeCountryCode(defaultCountryCode),
    calledNumber,
    timestamp: webhookDate(firstValue(body, ["timestamp", "event_time", "eventTime"])),
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null
  };
}

export async function findCustomerByPhone(normalizedPhone, defaultCountryCode = "+49") {
  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      OR: [{ phoneMobile: { not: null } }, { phoneLandline: { not: null } }]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      email: true,
      phoneMobile: true,
      phoneLandline: true
    }
  });
  const matches = customers.filter(customer => [customer.phoneMobile, customer.phoneLandline]
    .some(number => normalizePhoneNumber(number, defaultCountryCode) === normalizedPhone));
  return matches.length === 1 ? matches[0] : null;
}

export function presentPhoneCall(call) {
  if (!call) return null;
  const customer = call.customer ? {
    id: call.customer.id,
    name: call.customer.companyName
      || [call.customer.firstName, call.customer.lastName].filter(Boolean).join(" ")
      || "Unbenannter Kontakt",
    email: call.customer.email || null,
    phone: call.customer.phoneMobile || call.customer.phoneLandline || call.callerNumber
  } : null;
  return {
    id: call.id,
    externalId: call.externalId,
    status: call.status,
    direction: call.direction,
    callerNumber: call.callerNumber,
    calledNumber: call.calledNumber,
    startedAt: call.startedAt,
    answeredAt: call.answeredAt,
    endedAt: call.endedAt,
    durationSeconds: call.durationSeconds,
    customer
  };
}

const customerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  companyName: true,
  email: true,
  phoneMobile: true,
  phoneLandline: true
};

export const phoneCallInclude = { customer: { select: customerSelect } };

export async function activePhoneCalls() {
  const calls = await prisma.phoneCall.findMany({
    where: {
      status: { in: [...ACTIVE_CALL_STATUSES] },
      startedAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1_000) }
    },
    include: phoneCallInclude,
    orderBy: { startedAt: "desc" },
    take: 10
  });
  return calls.map(presentPhoneCall);
}

export async function processPhoneCallEvent(payload) {
  const customer = await findCustomerByPhone(payload.normalizedCallerNumber, payload.defaultCountryCode);
  const existing = await prisma.phoneCall.findFirst({
    where: { externalId: payload.externalId },
    include: phoneCallInclude
  });

  const customerId = existing?.customerId || customer?.id || null;
  const base = {
    callerNumber: payload.callerNumber,
    normalizedCallerNumber: payload.normalizedCallerNumber,
    calledNumber: payload.calledNumber,
    ...(customerId ? { customerId } : {})
  };

  let call;
  if (payload.event === "ringing") {
    if (existing && existing.status !== "ringing") return presentPhoneCall(existing);
    call = existing
      ? await prisma.phoneCall.update({ where: { id: existing.id }, data: base, include: phoneCallInclude })
      : await prisma.phoneCall.create({
          data: { ...base, externalId: payload.externalId, status: "ringing", startedAt: payload.timestamp },
          include: phoneCallInclude
        });
  } else if (payload.event === "answered") {
    if (existing?.status === "ended" || existing?.status === "missed") return presentPhoneCall(existing);
    call = existing
      ? await prisma.phoneCall.update({
          where: { id: existing.id },
          data: { ...base, status: "answered", answeredAt: existing.answeredAt || payload.timestamp },
          include: phoneCallInclude
        })
      : await prisma.phoneCall.create({
          data: {
            ...base,
            externalId: payload.externalId,
            status: "answered",
            startedAt: payload.timestamp,
            answeredAt: payload.timestamp
          },
          include: phoneCallInclude
        });
  } else {
    if (existing && ["ended", "missed"].includes(existing.status)) return presentPhoneCall(existing);
    const startedAt = existing?.startedAt || payload.timestamp;
    const answeredAt = existing?.answeredAt || null;
    const endedAt = payload.timestamp;
    const durationSeconds = payload.durationSeconds ?? (answeredAt
      ? Math.max(0, Math.floor((endedAt.getTime() - answeredAt.getTime()) / 1_000))
      : 0);
    const status = answeredAt || durationSeconds > 0 ? "ended" : "missed";
    call = existing
      ? await prisma.phoneCall.update({
          where: { id: existing.id },
          data: { ...base, status, endedAt, durationSeconds },
          include: phoneCallInclude
        })
      : await prisma.phoneCall.create({
          data: {
            ...base,
            externalId: payload.externalId,
            status,
            startedAt,
            endedAt,
            durationSeconds
          },
          include: phoneCallInclude
        });

    if (call.customerId && !call.communicationId) {
      const existingCommunication = await prisma.communication.findFirst({
        where: { customerId: call.customerId, source: "asterisk", externalId: payload.externalId },
        select: { id: true }
      });
      const communication = existingCommunication || await prisma.communication.create({
        data: {
          customerId: call.customerId,
          type: "phone",
          subject: status === "missed" ? "Verpasster eingehender Anruf" : "Eingehender Anruf",
          content: "",
          source: "asterisk",
          externalId: payload.externalId,
          direction: "inbound",
          fromAddress: call.callerNumber,
          occurredAt: call.startedAt,
          createdAt: call.startedAt
        }
      });
      call = await prisma.phoneCall.update({
        where: { id: call.id },
        data: { communicationId: communication.id },
        include: phoneCallInclude
      });
    }
  }
  return presentPhoneCall(call);
}
