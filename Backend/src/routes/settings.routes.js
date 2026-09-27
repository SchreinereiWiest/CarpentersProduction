
import express from "express";
import prisma from "../config/prisma.js";

import { authenticateAdmin } from "../middleware/auth.middleware.js";
import { createSettingsData, getSettingsData } from "../controllers/settings.controller.js";


const router = express.Router();

router.get("/:name", authenticateAdmin, getSettingsData);

router.post("/:name", authenticateAdmin, createSettingsData);

export default router;