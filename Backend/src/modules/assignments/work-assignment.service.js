import { getTenantId } from "../../infrastructure/database/tenant-context.js";

export const WORK_ASSIGNMENT_KIND = Object.freeze({
  PROJECT: "project",
  COMMERCIAL_DOCUMENT: "commercial_document",
  PAPERLESS_DOCUMENT: "paperless_document"
});

export async function upsertWorkAssignment(db, assignment) {
  const { kind, sourceId, assigneeId, createdById, title, info = null, href } = assignment;
  const tenantId = getTenantId();
  return db.workAssignment.upsert({
    where: { tenantId_kind_sourceId_assigneeId: { tenantId, kind, sourceId, assigneeId } },
    create: { kind, sourceId, assigneeId, createdById, title, info, href },
    update: {
      createdById,
      title,
      info,
      href,
      status: "open",
      completedAt: null,
      dismissedAt: null
    }
  });
}

export async function removeWorkAssignments(db, { kind, sourceId, assigneeId }) {
  return db.workAssignment.deleteMany({
    where: { kind, sourceId, ...(assigneeId ? { assigneeId } : {}) }
  });
}

export const presentWorkAssignment = assignment => ({
  id: assignment.id,
  kind: assignment.kind,
  sourceId: assignment.sourceId,
  title: assignment.title,
  info: assignment.info,
  href: assignment.href,
  status: assignment.status,
  completedAt: assignment.completedAt,
  updatedAt: assignment.updatedAt,
  assignee: assignment.assignee ? {
    id: assignment.assignee.id,
    name: [assignment.assignee.firstName, assignment.assignee.lastName].filter(Boolean).join(" ") || assignment.assignee.login
  } : null,
  createdBy: assignment.createdBy ? {
    id: assignment.createdBy.id,
    name: [assignment.createdBy.firstName, assignment.createdBy.lastName].filter(Boolean).join(" ") || assignment.createdBy.login
  } : null
});

export const workAssignmentPeopleInclude = {
  assignee: { select: { id: true, firstName: true, lastName: true, login: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, login: true } }
};
