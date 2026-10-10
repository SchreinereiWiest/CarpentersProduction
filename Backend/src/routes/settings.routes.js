
import express from "express";
import prisma from "../config/prisma.js";

import { authenticate, authenticateAdmin } from "../middleware/auth.middleware.js";
import { createSettingsData, getSettingsData } from "../controllers/settings.controller.js";


const router = express.Router();

// Company settings are also needed by regular users for the time calendar.
router.get("/company", authenticate, (req, res) => {
    req.params.name = "company";
    return getSettingsData(req, res);
});

router.get("/:name", authenticateAdmin, getSettingsData);

router.post("/:name", authenticateAdmin, createSettingsData);

export default router;
