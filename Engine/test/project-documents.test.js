import assert from "node:assert/strict";
import test from "node:test";

import {
  assertProjectDocument,
  projectDocumentDefinition
} from "../src/contracts/project/project-documents.js";

test("resolves the storage file for every supported project document", () => {
  assert.equal(projectDocumentDefinition("cabinet")?.fileName, "cabinet.json");
  assert.equal(projectDocumentDefinition("unknown"), null);
});

test("accepts valid measurement data", () => {
  const definition = assertProjectDocument("aufmas", {
    views: [],
    objects: [],
    todos: [],
    completed: false
  });

  assert.equal(definition.fileName, "aufmas.json");
});

test("rejects malformed or unknown project documents with a client error", () => {
  assert.throws(
    () => assertProjectDocument("aufmas", { views: [], objects: [] }),
    error => error.code === "INVALID_PROJECT_DOCUMENT" && error.statusCode === 400
  );
  assert.throws(
    () => assertProjectDocument("unknown", {}),
    error => error.code === "INVALID_PROJECT_DOCUMENT" && error.statusCode === 400
  );
});
