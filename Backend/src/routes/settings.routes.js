
import express from "express";
import prisma from "../config/prisma.js";

import { authenticate, authenticateAdmin, authorizeRoles } from "../middleware/auth.middleware.js";
import { createSettingsData, getSettingsData } from "../controllers/settings.controller.js";


const router = express.Router();

// Company settings are also needed by regular users for the time calendar.
router.get("/company", authenticate, (req, res) => {
    req.params.name = "company";
    return getSettingsData(req, res);
});

router.get("/procurement", authenticate, (req, res) => {
    req.params.name = "procurement";
    return getSettingsData(req, res);
});

router.post("/procurement", authenticate, authorizeRoles("admin", "manager"), (req, res) => {
    req.params.name = "procurement";
    return createSettingsData(req, res);
});

router.get("/shop", authenticate, (req, res) => {
    req.params.name = "shop";
    return getSettingsData(req, res);
});

router.post("/shop", authenticateAdmin, (req, res) => {
    req.params.name = "shop";
    return createSettingsData(req, res);
});

router.get("/:name", authenticateAdmin, getSettingsData);

router.post("/:name", authenticateAdmin, createSettingsData);

export default router;
