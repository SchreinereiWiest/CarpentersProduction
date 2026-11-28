const arrayDocument = label => value => {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
};

const objectDocument = label => value => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
};

const measurementDocument = value => {
  objectDocument("measurement document")(value);
  for (const key of ["views", "objects", "todos"]) {
    if (!Array.isArray(value[key])) throw new TypeError(`measurement.${key} must be an array`);
  }
  if (value.variables != null && !Array.isArray(value.variables)) {
    throw new TypeError("measurement.variables must be an array");
  }
  if (value.completed != null && typeof value.completed !== "boolean") {
    throw new TypeError("measurement.completed must be a boolean");
  }
};

const procurementDocument = value => {
  objectDocument("procurement document")(value);
  if (!Array.isArray(value.items)) throw new TypeError("procurement.items must be an array");
};

const attachmentLinksDocument = value => {
  objectDocument("attachment links document")(value);
  if (!value.links || typeof value.links !== "object" || Array.isArray(value.links)) {
    throw new TypeError("attachmentLinks.links must be an object");
  }
  for (const [fileId, cabinetIds] of Object.entries(value.links)) {
    if (!fileId || !Array.isArray(cabinetIds) || cabinetIds.some(id => typeof id !== "string" || !id)) {
      throw new TypeError("attachmentLinks entries must contain cabinet ID arrays");
    }
  }
};

export const PROJECT_DOCUMENTS = Object.freeze({
  aufmas: { fileName: "aufmas.json", schemaVersion: 1, validate: measurementDocument },
  cabinet: { fileName: "cabinet.json", schemaVersion: 1, validate: arrayDocument("cabinet document") },
  cabinetWorkspace: { fileName: "cabinetWorkspace.json", schemaVersion: 1, validate: objectDocument("cabinet workspace document") },
  list: { fileName: "list.json", schemaVersion: 1, validate: arrayDocument("part-list document") },
  nesting: { fileName: "nesting.json", schemaVersion: 1, validate: arrayDocument("nesting document") },
  procurement: { fileName: "procurement.json", schemaVersion: 1, validate: procurementDocument },
  calculation: { fileName: "calculation.json", schemaVersion: 1, validate: objectDocument("calculation document") },
  attachmentLinks: { fileName: "attachmentLinks.json", schemaVersion: 1, validate: attachmentLinksDocument }
});

export function projectDocumentDefinition(name) {
  return PROJECT_DOCUMENTS[String(name)] ?? null;
}

export function assertProjectDocument(name, value) {
  const definition = projectDocumentDefinition(name);
  if (!definition) {
    const error = new Error(`Unknown project document: ${name}`);
    error.code = "INVALID_PROJECT_DOCUMENT";
    error.statusCode = 400;
    throw error;
  }

  try {
    definition.validate(value);
  } catch (cause) {
    const error = new Error(cause.message);
    error.code = "INVALID_PROJECT_DOCUMENT";
    error.statusCode = 400;
    error.cause = cause;
    throw error;
  }
  return definition;
}
