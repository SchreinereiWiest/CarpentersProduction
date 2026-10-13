import { DatabaseLicenseProvider } from "./DatabaseLicenseProvider.js";
import { DevelopmentLicenseProvider } from "./DevelopmentLicenseProvider.js";
import { LicenseError } from "./LicenseProvider.js";

const CACHE_TTL_MS = Number(process.env.LICENSE_CACHE_TTL_MS) || 5 * 60 * 1000;
const cache = new Map();

function configuredProvider() {
  const name =
    process.env.LICENSE_PROVIDER ??
    (process.env.NODE_ENV === "production" ? "database" : "development");

  if (name === "development") return new DevelopmentLicenseProvider();
  if (name === "database") return new DatabaseLicenseProvider();
  throw new Error(`Unsupported LICENSE_PROVIDER: ${name}`);
}

let provider;
const getProvider = () => (provider ??= configuredProvider());

export async function getLicense(tenant, { refresh = false } = {}) {
  const cached = cache.get(tenant.id);
  if (!refresh && cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await getProvider().getLicense(tenant);
  cache.set(tenant.id, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function assertActiveLicense(tenant) {
  const license = await getLicense(tenant);

  if (license.status !== "active") {
    throw new LicenseError(
      `Lizenzstatus: ${license.status}`,
      "LICENSE_INACTIVE"
    );
  }

  return license;
}

export async function hasFeature(tenant, feature) {
  const license = await assertActiveLicense(tenant);
  return license.features.includes(feature);
}

export async function activateLicense(tenant, licenseKey) {
  const license = await getProvider().activateLicense(tenant, licenseKey);
  cache.delete(tenant.id);
  return license;
}

export function invalidateLicenseCache(tenantId) {
  cache.delete(tenantId);
}

export { LicenseError };
