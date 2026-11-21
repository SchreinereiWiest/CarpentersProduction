import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeTimeEntryTiming,
    TimeEntryTimingError
} from "../src/modules/time-tracking/time-entry-timing.js";

test("Beginn und Ende berechnen die Dauer eines Zeiteintrags", () => {
    const result = normalizeTimeEntryTiming({
        startTime: "2026-11-21T08:15:00.000Z",
        endTime: "2026-11-21T10:00:00.000Z"
    });

    assert.equal(result.duration, 105);
    assert.equal(result.startedAt.toISOString(), "2026-11-21T08:15:00.000Z");
    assert.equal(result.endedAt.toISOString(), "2026-11-21T10:00:00.000Z");
});

test("Beginn und Dauer berechnen das Ende eines Zeiteintrags", () => {
    const result = normalizeTimeEntryTiming({
        startTime: "2026-11-21T08:15:00.000Z",
        duration: 45
    });

    assert.equal(result.endedAt.toISOString(), "2026-11-21T09:00:00.000Z");
});

test("Offene Projektzeiten dürfen weiterhin nur eine Dauer besitzen", () => {
    assert.deepEqual(
        normalizeTimeEntryTiming({ duration: 30 }, { allowDurationOnly: true }),
        { startedAt: null, endedAt: null, duration: 30 }
    );
    assert.throws(
        () => normalizeTimeEntryTiming({ duration: 30 }),
        error => error instanceof TimeEntryTimingError
    );
});

test("widersprüchliche Zeitangaben werden abgelehnt", () => {
    assert.throws(() => normalizeTimeEntryTiming({
        startTime: "2026-11-21T08:15:00.000Z",
        endTime: "2026-11-21T09:00:00.000Z",
        duration: 30
    }), /widersprechen/);
});
