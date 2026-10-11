import express from "express";
import prisma from "../config/prisma.js";
import {
  newcustomer, getCustomers, getCustomerInfo, updateCustomer, searchCustomers
} from "../controllers/customer.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/new", authenticate, authorizeRoles("admin", "manager"), newcustomer);

router.get("/all", authenticate, authorizeRoles("admin", "manager"), getCustomers);

router.get("/get/:id", authenticate, authorizeRoles("admin", "manager"), getCustomerInfo);

router.post("/update/:id", authenticate, authorizeRoles("admin", "manager"), updateCustomer);

router.get("/search", authenticate, searchCustomers);

export default router;
