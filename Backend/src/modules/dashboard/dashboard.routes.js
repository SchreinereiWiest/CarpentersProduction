import express from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { completeWorkAssignment, dismissWorkAssignment, getDashboard } from "./dashboard.controller.js";

const router = express.Router();
router.get("/", authenticate, getDashboard);
router.post("/assignments/:id/complete", authenticate, completeWorkAssignment);
router.post("/assignments/:id/dismiss", authenticate, dismissWorkAssignment);

export default router;
