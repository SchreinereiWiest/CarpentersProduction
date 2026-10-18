import express from "express";
import prisma from "../../infrastructure/database/prisma.js";

import { getMaterials, createMaterial, updateMaterial, updateMaterialQuantity } from "./storage.controller.js";
import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";

const router = express.Router();
router.use(authenticate, requireFeature("storage"));

router.post("/create", createMaterial);

router.get("/get", getMaterials);

router.put("/:id", authorizeRoles("admin", "manager"), updateMaterial);

router.patch("/:id/quantity", authorizeRoles("admin", "manager"), updateMaterialQuantity);

export default router;
