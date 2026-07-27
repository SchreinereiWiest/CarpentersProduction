import express from "express";
import prisma from "../config/prisma.js";

import { getMaterials, createMaterial, updateMaterialQuantity } from "../controllers/storage.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", authenticate, createMaterial);

router.get("/get", authenticate, getMaterials);

router.patch("/:id/quantity", updateMaterialQuantity);

export default router;
