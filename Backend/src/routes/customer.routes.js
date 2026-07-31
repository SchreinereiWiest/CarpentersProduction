import express from "express";
import prisma from "../config/prisma.js";
import {
  newcustomer, getCustomers, getCustomerInfo, updateCustomer, searchCustomers
} from "../controllers/customer.controller.js";
import { authenticate, authenticateAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/new", authenticateAdmin, newcustomer);

router.get("/all", authenticateAdmin, getCustomers);

router.get("/get/:id", authenticateAdmin, getCustomerInfo);

router.post("/update/:id", authenticateAdmin, updateCustomer);

router.get("/search", searchCustomers);

export default router;