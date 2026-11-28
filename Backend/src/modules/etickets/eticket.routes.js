import express from "express";

import { authenticate, requireFeature } from "../../middleware/auth.middleware.js";
import { createEticketPrint, getEticketConfiguration } from "./eticket.controller.js";

const router = express.Router();

router.get("/settings", authenticate, requireFeature("work-preparation"), getEticketConfiguration);
router.post("/print", authenticate, requireFeature("work-preparation"), createEticketPrint);

export default router;
