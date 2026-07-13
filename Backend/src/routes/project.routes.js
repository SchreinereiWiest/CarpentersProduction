import express from "express";
import prisma from "../config/prisma.js";

import { newProject, getAllProjects, getProject } from "../controllers/project.controller.js";


const router = express.Router();

router.post("/new", newProject);

router.get("/getAll/:id", getAllProjects);

router.get("/get/:id", getProject);

export default router;