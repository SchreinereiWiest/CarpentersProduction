import test from "node:test";
import assert from "node:assert/strict";

import {
  parseTenantBootstrapInput,
  provisionBootstrapTenant,
  TenantBootstrapError,
  tenantSlugForCompany,
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

test("Neue Firmen erhalten einen stabilen, URL-tauglichen Tenant-Slug", () => {
  assert.equal(tenantSlugForCompany("  Möbelschreinerei Weiß & Söhne GmbH  "), "mobelschreinerei-weiss-sohne-gmbh");
  assert.equal(tenantSlugForCompany("***"), "unternehmen");
});

test("eine neue Lizenz erhält vor der Aktivierung einen wiederverwendbaren Setup-Mandanten", async () => {
  const created = [];
  let lockCalls = 0;
  const transaction = {
    $executeRaw: async () => { lockCalls += 1; return 1; },
    $queryRaw: async () => assert.fail("Void-Funktionen dürfen nicht über $queryRaw ausgeführt werden"),
    tenant: {
      findFirst: async () => null,
      findUnique: async () => null,
      create: async ({ data }) => {
        created.push(data);
        return { id: "tenant-new", ...data };
      }
    }
  };
  const database = { $transaction: callback => callback(transaction) };

  const tenant = await provisionBootstrapTenant("Neue Schreinerei", database);

  assert.deepEqual(created, [{
    name: "Neue Schreinerei",
    slug: "neue-schreinerei",
    status: "pending-setup"
  }]);
  assert.equal(tenant.id, "tenant-new");
  assert.equal(lockCalls, 1);
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
