import assert from "node:assert/strict";
import test from "node:test";

import { tenantArgs } from "../src/infrastructure/database/prisma.js";

test("Tenant-Proxy überschreibt direkte und zusammengesetzte Tenant-IDs aus Eingaben", () => {
  const activeTenant = "11111111-1111-4111-8111-111111111111";
  const foreignTenant = "22222222-2222-4222-8222-222222222222";
  const args = tenantArgs("upsert", {
    where: {
      tenantId_kind_sourceId_assigneeId: {
        tenantId: foreignTenant,
        kind: "commercial_document",
        sourceId: "33333333-3333-4333-8333-333333333333",
        assigneeId: "44444444-4444-4444-8444-444444444444"
      },
      tenantId: foreignTenant
    },
    create: { tenantId: foreignTenant, title: "Test" },
    update: { tenantId: foreignTenant, title: "Geändert" }
  }, activeTenant);

  assert.equal(args.where.tenantId, activeTenant);
  assert.equal(args.where.tenantId_kind_sourceId_assigneeId.tenantId, activeTenant);
  assert.equal(args.create.tenantId, activeTenant);
  assert.equal("tenantId" in args.update, false);
});

test("Tenant-Proxy ergänzt Tenant-Filter bei jeder geschützten Leseoperation", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  for (const method of ["findUnique", "findFirst", "findMany", "count", "aggregate", "groupBy"]) {
    assert.equal(tenantArgs(method, { where: { id: "resource" } }, tenantId).where.tenantId, tenantId);
  }
});
