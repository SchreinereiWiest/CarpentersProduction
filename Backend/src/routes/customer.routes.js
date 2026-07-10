import express from "express";
import prisma from "../config/prisma.js";
import {
  newcustomer, getCustomers, getCustomerInfo
} from "../controllers/customer.controller.js";

const router = express.Router();

router.post("/new", newcustomer);

router.get("/all", getCustomers);

router.get("/get/:id", getCustomerInfo);

export default router;