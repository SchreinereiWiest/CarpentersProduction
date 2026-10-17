import express from "express";
import prisma from "../../infrastructure/database/prisma.js";
import {
  newcustomer, getCustomers, getCustomerInfo, updateCustomer, searchCustomers
} from "./customer.controller.js";
import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";

const router = express.Router();
router.use(authenticate, requireFeature("crm"));

router.post("/new", authorizeRoles("admin", "manager"), newcustomer);

router.get("/all", authorizeRoles("admin", "manager"), getCustomers);

router.get("/get/:id", authorizeRoles("admin", "manager"), getCustomerInfo);

router.post("/update/:id", authorizeRoles("admin", "manager"), updateCustomer);

router.get("/search", searchCustomers);

export default router;
