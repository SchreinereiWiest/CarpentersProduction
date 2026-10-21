import { LicenseError, LicenseProvider } from "./LicenseProvider.js";

const API_VERSION = "1";
const MAX_RESPONSE_BYTES = 256 * 1024;
const LICENSE_STATUSES = new Set(["active", "inactive", "expired", "suspended", "revoked"]);

const nonEmptyString = (value, field) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new LicenseError(
      `Der Lizenzserver hat ein ungültiges Feld '${field}' geliefert`,
      "LICENSE_SERVER_RESPONSE_INVALID",
      502
    );
  }
  return value.trim();
};

function remoteConfiguration(environment = process.env) {
  const rawUrl = environment.LICENSE_SERVER_URL?.trim();
  const apiKey = environment.LICENSE_SERVER_API_KEY?.trim();
  const productId = environment.LICENSE_SERVER_PRODUCT_ID?.trim() || "carpenters-production";
  const timeoutMs = Number(environment.LICENSE_SERVER_TIMEOUT_MS ?? 5_000);

  if (!rawUrl || !apiKey) {
    throw new LicenseError(
      "LICENSE_SERVER_URL und LICENSE_SERVER_API_KEY müssen für den Remote-Provider konfiguriert sein",
      "LICENSE_CONFIGURATION",
      503
    );
  }

  let baseUrl;
  try {
    baseUrl = new URL(rawUrl);
  } catch {
    throw new LicenseError(
      "LICENSE_SERVER_URL ist keine gültige URL",
      "LICENSE_CONFIGURATION",
      503
    );
  }

  if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new LicenseError(
      "LICENSE_SERVER_URL darf keine Zugangsdaten, Query-Parameter oder Fragmente enthalten",
      "LICENSE_CONFIGURATION",
      503
    );
  }
  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new LicenseError(
      "LICENSE_SERVER_URL muss HTTP oder HTTPS verwenden",
      "LICENSE_CONFIGURATION",
      503
    );
  }
  if (environment.NODE_ENV === "production" && baseUrl.protocol !== "https:") {
    throw new LicenseError(
      "LICENSE_SERVER_URL muss in Produktion HTTPS verwenden",
      "LICENSE_CONFIGURATION",
      503
    );
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 60_000) {
    throw new LicenseError(
      "LICENSE_SERVER_TIMEOUT_MS muss zwischen 250 und 60000 liegen",
      "LICENSE_CONFIGURATION",
      503
    );
  }

  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}/`;
  return { baseUrl, apiKey, productId, timeoutMs };
}

function normalizeLicense(payload, tenant, checkedAt = new Date()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new LicenseError(
      "Der Lizenzserver hat keine gültige Lizenz geliefert",
      "LICENSE_SERVER_RESPONSE_INVALID",
      502
    );
  }

  const tenantId = nonEmptyString(payload.tenantId, "tenantId");
  if (tenantId !== tenant.id) {
    throw new LicenseError(
      "Die Antwort des Lizenzservers gehört zu einem anderen Mandanten",
      "LICENSE_SERVER_TENANT_MISMATCH",
      502
    );
  }

  const companyName = nonEmptyString(payload.companyName, "companyName");
  if (companyName.toLocaleLowerCase("de-DE") !== tenant.name.trim().toLocaleLowerCase("de-DE")) {
    throw new LicenseError(
      "Die Lizenz ist an einen anderen Firmennamen gebunden",
      "LICENSE_SERVER_COMPANY_MISMATCH",
      403
    );
  }

  const status = nonEmptyString(payload.status, "status").toLowerCase();
  if (!LICENSE_STATUSES.has(status)) {
    throw new LicenseError(
      "Der Lizenzserver hat einen unbekannten Lizenzstatus geliefert",
      "LICENSE_SERVER_RESPONSE_INVALID",
      502
    );
  }

  if (!Array.isArray(payload.features) || payload.features.some(feature => typeof feature !== "string" || !/^[a-z][a-z0-9_-]{0,63}$/.test(feature))) {
    throw new LicenseError(
      "Der Lizenzserver hat ungültige Modulfreigaben geliefert",
      "LICENSE_SERVER_RESPONSE_INVALID",
      502
    );
  }

  const maxUsers = payload.maxUsers == null ? null : Number(payload.maxUsers);
  if (maxUsers !== null && (!Number.isInteger(maxUsers) || maxUsers < 1)) {
    throw new LicenseError(
      "Der Lizenzserver hat ein ungültiges Benutzerlimit geliefert",
      "LICENSE_SERVER_RESPONSE_INVALID",
      502
    );
  }

  let validUntil = null;
  if (payload.validUntil != null) {
    validUntil = new Date(payload.validUntil);
    if (Number.isNaN(validUntil.getTime())) {
      throw new LicenseError(
        "Der Lizenzserver hat ein ungültiges Ablaufdatum geliefert",
        "LICENSE_SERVER_RESPONSE_INVALID",
        502
      );
    }
  }

  return {
    licenseId: nonEmptyString(payload.licenseId, "licenseId"),
    tenantId,
    companyName,
    status: validUntil && validUntil.getTime() <= checkedAt.getTime() ? "expired" : status,
    plan: nonEmptyString(payload.plan, "plan"),
    features: [...new Set(payload.features)],
    maxUsers,
    validUntil,
    provider: "remote",
    licenseKey: null,
    lastCheckedAt: checkedAt
  };
}

function errorForResponse(response) {
  if (response.status === 401 || response.status === 403) {
    return new LicenseError(
      "Der Lizenzserver hat die Client-Anmeldung abgelehnt",
      "LICENSE_SERVER_AUTHENTICATION",
      503
    );
  }
  if (response.status === 404) {
    return new LicenseError(
      "Für dieses Unternehmen wurde keine Lizenz gefunden",
      "LICENSE_MISSING",
      403
    );
  }
  if (response.status === 409 || response.status === 422) {
    return new LicenseError(
      "Der Lizenzschlüssel konnte diesem Unternehmen nicht zugeordnet werden",
      "LICENSE_ACTIVATION_REJECTED",
      response.status
    );
  }
  if (response.status === 429) {
    return new LicenseError(
      "Der Lizenzserver ist vorübergehend ausgelastet",
      "LICENSE_SERVER_RATE_LIMITED",
      503
    );
  }
  return new LicenseError(
    "Der Lizenzserver ist vorübergehend nicht verfügbar",
    "LICENSE_SERVER_UNAVAILABLE",
    503
  );
}

/**
 * Online-Provider für MoebelDesignLicencing.
 *
 * Alle Zugangsdaten bleiben im Backend. Der externe Server erhält nur die
 * technische Mandanten-ID und die zur Zuordnung nötigen Firmenmetadaten.
 */
export class RemoteLicenseProvider extends LicenseProvider {
  constructor({ environment = process.env, fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
    super();
    this.configuration = remoteConfiguration(environment);
    this.fetch = fetchImpl;
    this.now = now;
  }

  async request(path, tenant, extraBody = {}) {
    if (typeof this.fetch !== "function") {
      throw new LicenseError("HTTP-Client ist nicht verfügbar", "LICENSE_CONFIGURATION", 503);
    }

    const { baseUrl, apiKey, productId, timeoutMs } = this.configuration;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetch(new URL(path, baseUrl), {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "x-license-api-version": API_VERSION
        },
        body: JSON.stringify({
          apiVersion: API_VERSION,
          productId,
          installation: {
            tenantId: tenant.id,
            companyName: tenant.name,
            tenantSlug: tenant.slug
          },
          ...extraBody
        }),
        signal: controller.signal
      });

      if (!response.ok) throw errorForResponse(response);

      const contentLength = Number(response.headers?.get?.("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        throw new LicenseError(
          "Die Antwort des Lizenzservers ist zu groß",
          "LICENSE_SERVER_RESPONSE_INVALID",
          502
        );
      }

      let body;
      try {
        const text = await response.text();
        if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) throw new Error("response too large");
        body = JSON.parse(text);
      } catch {
        throw new LicenseError(
          "Der Lizenzserver hat keine gültige JSON-Antwort geliefert",
          "LICENSE_SERVER_RESPONSE_INVALID",
          502
        );
      }

      return normalizeLicense(body?.license, tenant, this.now());
    } catch (error) {
      if (error instanceof LicenseError) throw error;
      throw new LicenseError(
        error?.name === "AbortError"
          ? "Zeitüberschreitung bei der Lizenzprüfung"
          : "Der Lizenzserver ist nicht erreichbar",
        "LICENSE_SERVER_UNAVAILABLE",
        503
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async getLicense(tenant) {
    return this.request("api/v1/licenses/validate", tenant);
  }

  async activateLicense(tenant, licenseKey) {
    return this.request("api/v1/licenses/activate", tenant, { licenseKey });
  }
}

export { normalizeLicense, remoteConfiguration };
