import assert from "node:assert/strict";
import test from "node:test";

import {
  assertProjectDocument,
  projectDocumentDefinition
} from "../src/contracts/project/project-documents.js";

test("resolves the storage file for every supported project document", () => {
  assert.equal(projectDocumentDefinition("cabinet")?.fileName, "cabinet.json");
  assert.equal(projectDocumentDefinition("cabinetWorkspace")?.fileName, "cabinetWorkspace.json");
  assert.equal(projectDocumentDefinition("attachmentLinks")?.fileName, "attachmentLinks.json");
  assert.equal(projectDocumentDefinition("unknown"), null);
});

test("accepts valid measurement data", () => {
  const definition = assertProjectDocument("aufmas", {
    views: [],
    objects: [],
    todos: [],
    variables: [{ name: "SOCKEL", value: 120, unit: "mm" }],
    completed: false
  });

  assert.equal(definition.fileName, "aufmas.json");
});

test("accepts cabinet links for project attachments", () => {
  const definition = assertProjectDocument("attachmentLinks", {
    version: 1,
    links: { "file-1": ["cabinet-1", "cabinet-2"] },
    updatedAt: "2026-11-21T12:00:00.000Z"
  });

  assert.equal(definition.fileName, "attachmentLinks.json");
  assert.throws(
    () => assertProjectDocument("attachmentLinks", { version: 1, links: { "file-1": "cabinet-1" } }),
    error => error.code === "INVALID_PROJECT_DOCUMENT" && error.statusCode === 400
  );
});

test("rejects malformed or unknown project documents with a client error", () => {
  assert.throws(
    () => assertProjectDocument("aufmas", { views: [], objects: [] }),
    error => error.code === "INVALID_PROJECT_DOCUMENT" && error.statusCode === 400
  );
  assert.throws(
    () => assertProjectDocument("aufmas", { views: [], objects: [], todos: [], variables: {} }),
    error => error.code === "INVALID_PROJECT_DOCUMENT" && error.statusCode === 400
  );
  assert.throws(
    () => assertProjectDocument("unknown", {}),
    error => error.code === "INVALID_PROJECT_DOCUMENT" && error.statusCode === 400
  );
});
