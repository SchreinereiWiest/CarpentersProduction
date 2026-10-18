import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
    getFileChangeClientCount,
    publishFileChange,
    subscribeToFileChanges
} from "../src/modules/files/file-change-events.service.js";

const createStream = tenantId => {
    const request = new EventEmitter();
    request.tenant = { id: tenantId };
    const writes = [];
    const response = {
        destroyed: false,
        writableEnded: false,
        status() { return this; },
        set() { return this; },
        flushHeaders() {},
        write(value) { writes.push(value); }
    };
    subscribeToFileChanges(request, response);
    return { request, writes };
};

test("Dateiänderungen werden nur an Clients desselben Mandanten gesendet", () => {
    const first = createStream("tenant-a");
    const second = createStream("tenant-b");
    const initialWrites = first.writes.length;

    assert.equal(publishFileChange({
        tenantId: "tenant-a",
        action: "updated",
        fileId: "file-1",
        serverVersion: 2
    }), 1);
    assert.equal(first.writes.length, initialWrites + 3);
    assert.match(first.writes.join(""), /"fileId":"file-1"/);
    assert.doesNotMatch(second.writes.join(""), /"fileId":"file-1"/);

    first.request.emit("close");
    second.request.emit("close");
    assert.equal(getFileChangeClientCount("tenant-a"), 0);
    assert.equal(getFileChangeClientCount("tenant-b"), 0);
});
