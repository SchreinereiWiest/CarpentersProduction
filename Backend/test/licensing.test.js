import test from "node:test";
import assert from "node:assert/strict";

import { LicenseError } from "../src/modules/licensing/services/LicenseProvider.js";
import {
  RemoteLicenseProvider,
  normalizeLicense,
  remoteConfiguration
} from "../src/modules/licensing/services/RemoteLicenseProvider.js";

const tenant = {
  id: "00000000-0000-4000-8000-000000000123",
  name: "Möbelschreinerei Beispiel",
  slug: "beispiel"
};

const activeLicense = {
  licenseId: "lic_123",
  tenantId: tenant.id,
  companyName: tenant.name,
  status: "active",
  plan: "professional",
  features: ["crm", "cabinet", "crm"],
  maxUsers: 12,
  validUntil: "2027-12-31T23:59:59.000Z"
};

const environment = {
  NODE_ENV: "test",
  LICENSE_SERVER_URL: "http://licensing.internal:5100/",
  LICENSE_SERVER_API_KEY: "client-secret",
  LICENSE_SERVER_PRODUCT_ID: "carpenters-production",
  LICENSE_SERVER_TIMEOUT_MS: "1000"
};

function jsonResponse(body, { status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

test("RemoteLicenseProvider sendet den versionierten Validierungsvertrag", async () => {
  let request;
  const provider = new RemoteLicenseProvider({
    environment,
    now: () => new Date("2026-10-21T10:00:00.000Z"),
    fetchImpl: async (url, options) => {
      request = { url, options };
      return jsonResponse({ license: activeLicense });
    }
  });

  const license = await provider.getLicense(tenant);
  const requestBody = JSON.parse(request.options.body);

  assert.equal(request.url.toString(), "http://licensing.internal:5100/api/v1/licenses/validate");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.authorization, "Bearer client-secret");
  assert.equal(request.options.headers["x-license-api-version"], "1");
  assert.deepEqual(requestBody, {
    apiVersion: "1",
    productId: "carpenters-production",
    installation: {
      tenantId: tenant.id,
      companyName: tenant.name,
      tenantSlug: tenant.slug
    }
  });
  assert.equal(license.provider, "remote");
  assert.deepEqual(license.features, ["crm", "cabinet"]);
  assert.equal(license.licenseKey, null);
  assert.equal(license.lastCheckedAt.toISOString(), "2026-10-21T10:00:00.000Z");
});

test("RemoteLicenseProvider überträgt Aktivierungsschlüssel nur im Request-Body", async () => {
  let request;
  const provider = new RemoteLicenseProvider({
    environment,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return jsonResponse({ license: activeLicense });
    }
  });

  await provider.activateLicense(tenant, "secret-license-key");

  assert.equal(request.url.toString(), "http://licensing.internal:5100/api/v1/licenses/activate");
  assert.equal(JSON.parse(request.options.body).licenseKey, "secret-license-key");
  assert.equal(request.url.toString().includes("secret-license-key"), false);
});

test("Remote-Antworten müssen zum angefragten Mandanten gehören", () => {
  assert.throws(
    () => normalizeLicense({ ...activeLicense, tenantId: "another-tenant" }, tenant),
    error => error instanceof LicenseError
      && error.code === "LICENSE_SERVER_TENANT_MISMATCH"
      && error.statusCode === 502
  );
});

test("Remote-Antworten dürfen nicht auf einen anderen Firmennamen ausgestellt sein", () => {
  assert.throws(
    () => normalizeLicense({ ...activeLicense, companyName: "Andere Firma" }, tenant),
    error => error instanceof LicenseError
      && error.code === "LICENSE_SERVER_COMPANY_MISMATCH"
      && error.statusCode === 403
  );
});

test("Ein überschrittenes Ablaufdatum setzt den Status unabhängig vom Server auf expired", () => {
  const license = normalizeLicense(
    { ...activeLicense, validUntil: "2026-10-20T00:00:00.000Z" },
    tenant,
    new Date("2026-10-21T00:00:00.000Z")
  );

  assert.equal(license.status, "expired");
});

test("Fehlende Remote-Konfiguration bricht mit einem stabilen Fehlercode ab", () => {
  assert.throws(
    () => remoteConfiguration({ NODE_ENV: "production" }),
    error => error instanceof LicenseError
      && error.code === "LICENSE_CONFIGURATION"
      && error.statusCode === 503
  );
});

test("Remote-Konfiguration verlangt in Produktion HTTPS", () => {
  assert.throws(
    () => remoteConfiguration({ ...environment, NODE_ENV: "production" }),
    error => error instanceof LicenseError && error.code === "LICENSE_CONFIGURATION"
  );
});

test("HTTP-Fehler des Lizenzservers werden ohne fremde Antwortdetails übersetzt", async () => {
  const provider = new RemoteLicenseProvider({
    environment,
    fetchImpl: async () => jsonResponse({ message: "internal detail" }, { status: 401 })
  });

  await assert.rejects(
    provider.getLicense(tenant),
    error => error instanceof LicenseError
      && error.code === "LICENSE_SERVER_AUTHENTICATION"
      && error.statusCode === 503
      && !error.message.includes("internal detail")
  );
});

test("Netzwerkfehler des Lizenzservers werden als temporäre Nichtverfügbarkeit gemeldet", async () => {
  const provider = new RemoteLicenseProvider({
    environment,
    fetchImpl: async () => { throw new TypeError("connect ECONNREFUSED"); }
  });

  await assert.rejects(
    provider.getLicense(tenant),
    error => error instanceof LicenseError
      && error.code === "LICENSE_SERVER_UNAVAILABLE"
      && error.statusCode === 503
  );
});
