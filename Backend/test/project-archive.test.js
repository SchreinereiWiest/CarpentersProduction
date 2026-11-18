import assert from "node:assert/strict";
import test from "node:test";

import {
    createImportedFileIds,
    remapProjectJsonBuffer
} from "../src/modules/projects/project-archive.logic.js";

test("project archive remaps Aufmaß and Exposé file references on import", () => {
    const planId = "11111111-1111-4111-8111-111111111111";
    const imageId = "22222222-2222-4222-8222-222222222222";
    const generatedIds = [
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    ];
    const fileIds = createImportedFileIds([
        { kind: "file", originalId: planId, archivePath: `files/${planId}` },
        // Version-1 archives did not yet carry originalId; the path is the
        // backwards-compatible source of truth.
        { kind: "file", archivePath: `files/${imageId}` }
    ], () => generatedIds.shift());

    const measurement = {
        views: [{ id: "front", planFileId: planId }],
        objects: [],
        todos: [],
        expose: {
            selectedImageIds: [imageId],
            imageOverrides: { "view:front": imageId },
            assetText: { [imageId]: { title: "Perspektive" } },
            pageOrder: [`image:${imageId}`, "view:front"]
        }
    };
    const remapped = JSON.parse(
        remapProjectJsonBuffer(Buffer.from(JSON.stringify(measurement)), fileIds)
            .toString("utf8")
    );

    assert.equal(remapped.views[0].planFileId, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    assert.deepEqual(remapped.expose.selectedImageIds, ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"]);
    assert.equal(remapped.expose.imageOverrides["view:front"], "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    assert.deepEqual(remapped.expose.assetText["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"], {
        title: "Perspektive"
    });
    assert.equal(remapped.expose.pageOrder[0], "image:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
});
