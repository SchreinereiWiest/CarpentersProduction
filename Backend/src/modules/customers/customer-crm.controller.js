import prisma from "../../infrastructure/database/prisma.js";
import {
  appointmentData,
  communicationData,
  CrmValidationError
} from "./customer-crm.validation.js";

const actorSelect = { id: true, firstName: true, lastName: true, login: true };
const projectSelect = { id: true, title: true, status: true, projectNumber: true };

const communicationInclude = {
  project: { select: projectSelect },
  createdBy: { select: actorSelect },
  phoneCall: {
    select: {
      id: true,
      status: true,
      callerNumber: true,
      calledNumber: true,
      startedAt: true,
      answeredAt: true,
      endedAt: true,
      durationSeconds: true
    }
  }
};

const appointmentInclude = {
  project: { select: projectSelect },
  address: true,
  createdBy: { select: actorSelect }
};

async function requireCustomer(customerId) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    select: { id: true }
  });
  if (!customer) throw new CrmValidationError("Kunde nicht gefunden.", 404, "CUSTOMER_NOT_FOUND");
  return customer;
}

async function validateReferences(customerId, { projectId, addressId }) {
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, customerId, deletedAt: null },
      select: { id: true }
    });
    if (!project) throw new CrmValidationError("Das Projekt gehört nicht zu diesem Kunden.");
  }
  if (addressId) {
    const address = await prisma.customerAddress.findFirst({
      where: { id: addressId, customerId, deletedAt: null },
      select: { id: true }
    });
    if (!address) throw new CrmValidationError("Die Adresse gehört nicht zu diesem Kunden.");
  }
}

export async function getCustomerCrm(req, res) {
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      addresses: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" }
      },
      projects: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          calendarEvents: {
            where: { scope: "production" },
            orderBy: { startAt: "asc" }
          },
          _count: {
            select: { files: true, paperlessDocuments: true, appointments: true, communications: true }
          }
        }
      },
      communications: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: communicationInclude
      },
      appointments: {
        where: { deletedAt: null },
        orderBy: { startAt: "asc" },
        include: appointmentInclude
      },
      files: {
        where: { deletedAt: null },
        orderBy: { uploadedAt: "desc" },
        select: {
          id: true,
          fileName: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          category: true,
          uploadedAt: true,
          status: true,
          serverVersion: true
        }
      },
      paperlessDocuments: {
        orderBy: { linkedAt: "desc" },
        include: {
          project: { select: { id: true, title: true, projectNumber: true } }
        }
      }
    }
  });

  if (!customer) throw new CrmValidationError("Kunde nicht gefunden.", 404, "CUSTOMER_NOT_FOUND");

  const calendarEvents = customer.projects.flatMap(project =>
    project.calendarEvents.map(event => ({
      ...event,
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        projectNumber: project.projectNumber
      }
    }))
  ).sort((first, second) => new Date(first.startAt) - new Date(second.startAt));

  const projects = customer.projects.map(({ calendarEvents: _events, ...project }) => project);
  const paperless = await prisma.paperlessConfiguration.findFirst({
    where: { enabled: true },
    select: { baseUrl: true }
  });
  return res.json({
    customer: { ...customer, projects },
    calendarEvents,
    integrations: { paperlessBaseUrl: paperless?.baseUrl || null }
  });
}

export async function createCommunication(req, res) {
  await requireCustomer(req.params.id);
  const data = communicationData(req.body);
  await validateReferences(req.params.id, data);
  const communication = await prisma.communication.create({
    data: {
      ...data,
      customerId: req.params.id,
      createdById: req.user.id
    },
    include: communicationInclude
  });
  return res.status(201).json({ communication });
}

export async function updateCommunication(req, res) {
  const current = await prisma.communication.findFirst({
    where: { id: req.params.communicationId, customerId: req.params.id, deletedAt: null }
  });
  if (!current) throw new CrmValidationError("Kontakteintrag nicht gefunden.", 404, "COMMUNICATION_NOT_FOUND");
  if (current.source !== "manual") {
    throw new CrmValidationError("Automatisch importierte Kontakteinträge sind unveränderlich.", 409, "IMPORTED_COMMUNICATION_IMMUTABLE");
  }
  const data = communicationData(req.body, current);
  await validateReferences(req.params.id, data);
  const communication = await prisma.communication.update({
    where: { id: current.id },
    data,
    include: communicationInclude
  });
  return res.json({ communication });
}

export async function deleteCommunication(req, res) {
  const current = await prisma.communication.findFirst({
    where: { id: req.params.communicationId, customerId: req.params.id, deletedAt: null },
    select: { id: true, source: true }
  });
  if (!current) throw new CrmValidationError("Kontakteintrag nicht gefunden.", 404, "COMMUNICATION_NOT_FOUND");
  if (current.source !== "manual") {
    throw new CrmValidationError("Automatisch importierte Kontakteinträge bleiben für einen nachvollziehbaren Kontaktverlauf erhalten.", 409, "IMPORTED_COMMUNICATION_IMMUTABLE");
  }
  await prisma.communication.update({ where: { id: current.id }, data: { deletedAt: new Date() } });
  return res.status(204).end();
}

export async function savePhoneCallNote(req, res) {
  const current = await prisma.communication.findFirst({
    where: { id: req.params.communicationId, customerId: req.params.id, deletedAt: null },
    select: { id: true, source: true }
  });
  if (!current) throw new CrmValidationError("Kontakteintrag nicht gefunden.", 404, "COMMUNICATION_NOT_FOUND");
  if (current.source !== "asterisk") {
    throw new CrmValidationError("Eine Gesprächsnotiz kann nur zu einem automatisch erfassten Telefonat gespeichert werden.", 409, "PHONE_NOTE_NOT_AVAILABLE");
  }
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (content.length > 10_000 || /\0/.test(content)) {
    throw new CrmValidationError("Die Gesprächsnotiz darf höchstens 10.000 Zeichen enthalten.", 400, "PHONE_NOTE_INVALID");
  }
  const communication = await prisma.$transaction(async transaction => {
    const updated = await transaction.communication.update({
      where: { id: current.id },
      data: { content },
      include: communicationInclude
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "crm.phone-call.note.update",
        entityType: "Communication",
        entityId: current.id,
        metadata: { customerId: req.params.id, hasContent: Boolean(content) },
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null
      }
    });
    return updated;
  });
  return res.json({ communication });
}

export async function createAppointment(req, res) {
  await requireCustomer(req.params.id);
  const data = appointmentData(req.body);
  await validateReferences(req.params.id, data);
  const appointment = await prisma.appointment.create({
    data: {
      ...data,
      customerId: req.params.id,
      createdById: req.user.id
    },
    include: appointmentInclude
  });
  return res.status(201).json({ appointment });
}

export async function updateAppointment(req, res) {
  const current = await prisma.appointment.findFirst({
    where: { id: req.params.appointmentId, customerId: req.params.id, deletedAt: null }
  });
  if (!current) throw new CrmValidationError("Kundentermin nicht gefunden.", 404, "APPOINTMENT_NOT_FOUND");
  const data = appointmentData(req.body, current);
  await validateReferences(req.params.id, data);
  const appointment = await prisma.appointment.update({
    where: { id: current.id },
    data,
    include: appointmentInclude
  });
  return res.json({ appointment });
}

export async function deleteAppointment(req, res) {
  const current = await prisma.appointment.findFirst({
    where: { id: req.params.appointmentId, customerId: req.params.id, deletedAt: null },
    select: { id: true }
  });
  if (!current) throw new CrmValidationError("Kundentermin nicht gefunden.", 404, "APPOINTMENT_NOT_FOUND");
  await prisma.appointment.update({ where: { id: current.id }, data: { deletedAt: new Date() } });
  return res.status(204).end();
}
