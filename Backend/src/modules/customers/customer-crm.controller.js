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
  createdBy: { select: actorSelect }
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
            select: { files: true, appointments: true, communications: true }
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
          status: true
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
  return res.json({ customer: { ...customer, projects }, calendarEvents });
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
    select: { id: true }
  });
  if (!current) throw new CrmValidationError("Kontakteintrag nicht gefunden.", 404, "COMMUNICATION_NOT_FOUND");
  await prisma.communication.update({ where: { id: current.id }, data: { deletedAt: new Date() } });
  return res.status(204).end();
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
