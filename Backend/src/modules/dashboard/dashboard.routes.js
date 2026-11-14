import express from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { getDashboard } from "./dashboard.controller.js";

const router = express.Router();
router.get("/", authenticate, getDashboard);

export default router;
