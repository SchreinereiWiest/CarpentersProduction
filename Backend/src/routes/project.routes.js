import express from "express";
import prisma from "../config/prisma.js";

import { newProject, getAllProjectsID, getProject, getGeneratedProjectData, createGeneratedProjectData, getAllActive } from "../controllers/project.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/new", authenticate, newProject);

router.get("/getAll/:id", authenticate, getAllProjectsID);

router.get("/getActive", authenticate, getAllActive);

router.get("/get/:id", authenticate, getProject);

router.get("/generated/:id/:name", authenticate, getGeneratedProjectData);

router.post("/generated/:id/:name", authenticate, createGeneratedProjectData);

export default router;