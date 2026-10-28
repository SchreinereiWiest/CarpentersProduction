const PROJECT_STATUSES = new Set(["active", "inactive", "archive"]);

export function newProjectData(body, userId) {
  return {
    id: body.id || undefined,
    customerId: body.customerId,
    title: body.title,
    description: body.description,
    status: "inactive",
    createdById: userId
  };
}

export function projectUpdateData(current, body, activatedAt = new Date()) {
  const requestedStatus = body.status ?? current.status;
  if (!PROJECT_STATUSES.has(requestedStatus)) {
    const error = new Error("Ungültiger Projektstatus.");
    error.statusCode = 400;
    throw error;
  }

  return {
    customerId: body.customerId,
    title: body.title,
    description: body.description,
    status: requestedStatus,
    internalNotes: body.internalNotes,
    ...(body.status === "active" && !current.startDate
      ? { startDate: activatedAt }
      : {})
  };
}
