import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { systemPrisma } from "../../../infrastructure/database/prisma.js";
import { LicenseError, LicenseProvider } from "./LicenseProvider.js";

const normalizeName = (value) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase("de-DE");
const hashKey = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

/**
 * Erzeugt die API-Darstellung ohne Zertifikat oder vollständigen Schlüssel.
 * Signierte Claims haben Vorrang vor DB-Spalten, damit manipulierte lokale
 * Metadaten keine zusätzlichen Features oder Laufzeiten freischalten können.
 */
function publicLicense(record, payload = null) {
  const validUntil = payload?.exp
    ? new Date(payload.exp * 1000)
    : record.validUntil;
  const expired = validUntil && validUntil.getTime() < Date.now();
  
  return {
    licenseId: String(payload?.licenseId ?? record.licenseId),
    tenantId: record.tenantId,
    companyName: String(payload?.companyName ?? record.companyName),
    plan: String(payload?.plan ?? record.plan),
    features: Array.isArray(payload?.features)
      ? payload.features.map(String)
      : record.features,
    maxUsers: Number.isInteger(payload?.maxUsers)
      ? payload.maxUsers
      : record.maxUsers,
    validUntil,
    status: expired ? "expired" : String(payload?.status ?? record.status),
    provider: "database",
    licenseKey: record.licenseKeyHash
      ? `••••-${record.licenseKeyHash.slice(-4).toUpperCase()}`
      : null,
    lastCheckedAt: record.lastCheckedAt
  };
}

export class DatabaseLicenseProvider extends LicenseProvider {
  /**
   * Prüft ein bereits aktiviertes Zertifikat vollständig lokal.
   *
   * `ignoreExpiration` betrifft nur die kryptografische Verifikation: Ein
   * abgelaufenes, aber echt signiertes Zertifikat soll als `expired` angezeigt
   * werden können. `assertActiveLicense` verweigert anschließend den Zugriff.
   */
  async getLicense(tenant) {
    const record = await systemPrisma.tenantLicense.findUnique({
      where: { tenantId: tenant.id }
    });

    if (!record?.certificate) {
      throw new LicenseError(
        "Für dieses Unternehmen wurde keine Lizenz hinterlegt",
        "LICENSE_MISSING"
      );
    }

    // In .env-Dateien liegen PEM-Zeilenumbrüche häufig escaped als "\n" vor.
    const publicKey = process.env.LICENSE_PUBLIC_KEY?.replaceAll("\\n", "\n");
    if (!publicKey) {
      throw new LicenseError(
        "LICENSE_PUBLIC_KEY ist nicht konfiguriert",
        "LICENSE_CONFIGURATION",
        503
      );
    }

    let payload;
    try {
      payload = jwt.verify(record.certificate, publicKey, {
        algorithms: ["RS256"],
        ignoreExpiration: true
      });
    } catch {
      throw new LicenseError(
        "Die gespeicherte Lizenzsignatur ist ungültig",
        "LICENSE_SIGNATURE_INVALID"
      );
    }

    // Mandant, Firmenname und Lizenz-ID sind signiert. Damit kann dasselbe
    // Zertifikat weder kopiert noch nach einer Firmenumbenennung still weiter
    // verwendet werden.
    if (
      payload.tenantId !== tenant.id ||
      normalizeName(payload.companyName) !== normalizeName(tenant.name) ||
      payload.licenseId !== record.licenseId
    ) {
      throw new LicenseError(
        "Die Lizenz ist an einen anderen Firmennamen gebunden",
        "LICENSE_COMPANY_MISMATCH"
      );
    }

    return publicLicense(record, payload);
  }

  async activateLicense(tenant, licenseKey) {
    const publicKey = process.env.LICENSE_PUBLIC_KEY?.replaceAll("\\n", "\n");
    if (!publicKey) {
      throw new LicenseError(
        "LICENSE_PUBLIC_KEY ist nicht konfiguriert",
        "LICENSE_CONFIGURATION",
        503
      );
    }

    // Bei der Aktivierung gilt die normale Ablaufprüfung von jsonwebtoken;
    // bereits abgelaufene Schlüssel werden nicht erst gespeichert.
    let payload;
    try {
      payload = jwt.verify(licenseKey, publicKey, { algorithms: ["RS256"] });
    } catch {
      throw new LicenseError(
        "Der Lizenzschlüssel ist ungültig oder abgelaufen",
        "LICENSE_SIGNATURE_INVALID"
      );
    }

    if (
      payload.tenantId !== tenant.id ||
      normalizeName(payload.companyName) !== normalizeName(tenant.name)
    ) {
      throw new LicenseError(
        "Der Lizenzschlüssel gehört nicht zu diesem Unternehmen",
        "LICENSE_TENANT_MISMATCH"
      );
    }

    if (
      !payload.licenseId ||
      !payload.plan ||
      !Array.isArray(payload.features)
    ) {
      throw new LicenseError(
        "Das Lizenzzertifikat ist unvollständig",
        "LICENSE_PAYLOAD_INVALID"
      );
    }

    // Das Originalzertifikat wird für spätere Offline-Prüfungen gespeichert.
    // Der Hash dient nur einer gefahrlosen, gekürzten Anzeige im Frontend.
    const data = {
      licenseId: String(payload.licenseId),
      companyName: tenant.name,
      plan: String(payload.plan),
      features: payload.features.map(String),
      maxUsers: Number.isInteger(payload.maxUsers) ? payload.maxUsers : null,
      validUntil: payload.exp ? new Date(payload.exp * 1000) : null,
      status: String(payload.status ?? "active"),
      licenseKeyHash: hashKey(licenseKey),
      certificate: licenseKey,
      lastCheckedAt: new Date()
    };

    const record = await systemPrisma.tenantLicense.upsert({
      where: { tenantId: tenant.id },
      create: { tenantId: tenant.id, ...data },
      update: data
    });

    return publicLicense(record);
  }
}
