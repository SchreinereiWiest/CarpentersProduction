import assert from "node:assert/strict";
import test from "node:test";

import { runWithTenant } from "../src/infrastructure/database/tenant-context.js";
import { upsertWorkAssignment } from "../src/modules/assignments/work-assignment.service.js";

test("Auftragszuweisungen verwenden ausschließlich den aktiven Tenant im zusammengesetzten Schlüssel", async () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  let received;
  const db = { workAssignment: { upsert: async input => { received = input; return input; } } };

  await runWithTenant({ tenantId, userId: "user-1" }, () => upsertWorkAssignment(db, {
    kind: "commercial_document",
    sourceId: "22222222-2222-4222-8222-222222222222",
    assigneeId: "33333333-3333-4333-8333-333333333333",
    createdById: "44444444-4444-4444-8444-444444444444",
    title: "Beleg",
    href: "/Belege/22222222-2222-4222-8222-222222222222"
  }));

  assert.equal(received.where.tenantId_kind_sourceId_assigneeId.tenantId, tenantId);
  assert.equal("tenantId" in received.create, false, "Der Tenant-Proxy ergänzt create zentral");
});

test("Auftragszuweisungen schlagen ohne authentifizierten Tenant-Kontext geschlossen fehl", async () => {
  const db = { workAssignment: { upsert: async () => assert.fail("Datenbank darf nicht aufgerufen werden") } };
  await assert.rejects(
    () => upsertWorkAssignment(db, {
      kind: "project", sourceId: "source", assigneeId: "assignee", createdById: "creator", title: "Projekt", href: "/Projects/source"
    }),
    /Tenant context is missing/
  );
});
