import assert from "node:assert/strict";
import test from "node:test";

import {
    buildTimeStorageObjectKey,
    buildTimeWeekFileName
} from "../src/modules/time-tracking/time-storage.js";

test("time storage uses the tenant-scoped lowercase prefix", () => {
    const tenantId = "11111111-1111-4111-8111-111111111111";
    const userId = "22222222-2222-4222-8222-222222222222";

    assert.equal(buildTimeWeekFileName("2026-11-22"), "weekData-2026-11-22.json");
    assert.equal(
        buildTimeStorageObjectKey({ tenantId, userId, date: "2026-11-22" }),
        `tenants/${tenantId}/time/${userId}/weekData-2026-11-22.json`
    );
    assert.equal(buildTimeStorageObjectKey({ tenantId, userId, date: "2026-11-22" }).includes("/Time/"), false);
});
