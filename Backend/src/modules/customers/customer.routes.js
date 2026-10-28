import express from "express";
import prisma from "../../infrastructure/database/prisma.js";
import {
  newcustomer, getCustomers, getCustomerInfo, updateCustomer, searchCustomers
} from "./customer.controller.js";
import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import {
  createAppointment,
  createCommunication,
  deleteAppointment,
  deleteCommunication,
  getCustomerCrm,
  updateAppointment,
  updateCommunication
} from "./customer-crm.controller.js";

const router = express.Router();
router.use(authenticate);

// Die reduzierte Namenssuche wird auch beim Erstellen von Projekten benötigt.
// Sie ist deshalb unabhängig vom weiterhin geschützten CRM-Bereich verfügbar.
router.get("/search", requireFeature("work-preparation"), searchCustomers);

router.use(requireFeature("crm"));

router.post("/new", authorizeRoles("admin", "manager"), newcustomer);

router.get("/all", authorizeRoles("admin", "manager"), getCustomers);

router.get("/get/:id", authorizeRoles("admin", "manager"), getCustomerInfo);

router.post("/update/:id", authorizeRoles("admin", "manager"), updateCustomer);

router.get("/crm/:id", authorizeRoles("admin", "manager"), getCustomerCrm);
router.post("/crm/:id/communications", authorizeRoles("admin", "manager"), createCommunication);
router.put("/crm/:id/communications/:communicationId", authorizeRoles("admin", "manager"), updateCommunication);
router.delete("/crm/:id/communications/:communicationId", authorizeRoles("admin", "manager"), deleteCommunication);
router.post("/crm/:id/appointments", authorizeRoles("admin", "manager"), createAppointment);
router.put("/crm/:id/appointments/:appointmentId", authorizeRoles("admin", "manager"), updateAppointment);
router.delete("/crm/:id/appointments/:appointmentId", authorizeRoles("admin", "manager"), deleteAppointment);

export default router;
