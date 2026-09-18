import express from "express";
import prisma from "../config/prisma.js";

import { newProject, getAllProjectsID, getProject, getGeneratedProjectData, createGeneratedProjectData, getAllActive, updateProject, deleteProject } from "../controllers/project.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { getTime, newTime, startTime, stopTime } from "../controllers/time.controller.js";

const router = express.Router();

router.post("/new", authenticate, newProject);

router.put("/update/:id", authenticate, updateProject);

router.delete("/delete/:projectId", deleteProject);

router.get("/getAll/:id", authenticate, getAllProjectsID);

router.get("/getActive", authenticate, getAllActive);

router.get("/get/:id", authenticate, getProject);

router.get("/generated/:id/:name", authenticate, getGeneratedProjectData);

router.post("/generated/:id/:name", authenticate, createGeneratedProjectData);

router.post("/time/:id/start", authenticate, startTime);

router.patch("/time/:id/stop", authenticate, stopTime);

router.get("/time/:id", authenticate, getTime);

router.post("/time/:id/new", authenticate, newTime);

export default router;