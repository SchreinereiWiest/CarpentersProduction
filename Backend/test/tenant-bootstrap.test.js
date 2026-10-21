import test from "node:test";
import assert from "node:assert/strict";

import {
  parseTenantBootstrapInput,
  TenantBootstrapError,
  tenantNeedsBootstrap
} from "../src/modules/tenants/tenant-bootstrap.service.js";

test("Bootstrap-Eingaben werden normalisiert, ohne den Lizenzschlüssel umzudeuten", () => {
  const input = parseTenantBootstrapInput({
    firstName: "  Erika ",
    lastName: " Muster ",
    email: " ADMIN@EXAMPLE.COM ",
    login: " admin ",
    password: "a-secure-password",
    licenseKey: " MDL_secret "
  });

  assert.deepEqual(input, {
    firstName: "Erika",
    lastName: "Muster",
    email: "admin@example.com",
    login: "admin",
    password: "a-secure-password",
    licenseKey: "MDL_secret"
  });
});

test("Bootstrap verlangt ein eigenständiges starkes Benutzerpasswort", () => {
  assert.throws(
    () => parseTenantBootstrapInput({
      email: "admin@example.com",
      login: "admin",
      password: "short",
      licenseKey: "MDL_secret"
    }),
    error => error instanceof TenantBootstrapError
      && error.code === "BOOTSTRAP_PASSWORD_INVALID"
  );
});

test("Nur ein Tenant ohne jede Membership benötigt die Ersteinrichtung", async () => {
  const emptyDatabase = { tenantMembership: { count: async () => 0 } };
  const populatedDatabase = { tenantMembership: { count: async () => 1 } };

  assert.equal(await tenantNeedsBootstrap("tenant-id", emptyDatabase), true);
  assert.equal(await tenantNeedsBootstrap("tenant-id", populatedDatabase), false);
});
