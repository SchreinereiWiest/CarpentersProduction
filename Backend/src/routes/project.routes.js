import express from "express";
import prisma from "../config/prisma.js";

import { newProject, getAllProjectsID, getProject, getGeneratedProjectData, createGeneratedProjectData, getAllProjects, updateProject, deleteProject } from "../controllers/project.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { getTime, manualTime, startTime, stopTime } from "../controllers/time.controller.js";
import { exportProject, importProject } from "../controllers/projectArchive.controller.js";
import multer from "multer";
import os from "os";
import crypto from "crypto";

const router = express.Router();

const archiveUpload = multer({
    storage: multer.diskStorage({
        destination: os.tmpdir(),
        filename: (_req, _file, callback) => callback(null, `project-import-${crypto.randomUUID()}`)
    }),
    limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 1 }
});

router.post("/new", authenticate, newProject);

router.put("/update/:id", authenticate, updateProject);

router.delete("/delete/:projectId", deleteProject);

router.get("/getAll/:id", authenticate, getAllProjectsID);

router.get("/getAll", authenticate, getAllProjects);

// Backwards-compatible route for older clients.
router.get("/getActive", authenticate, getAllProjects);

router.get("/get/:id", authenticate, getProject);

router.get("/export/:id", authenticate, exportProject);

router.post("/import", authenticate, archiveUpload.single("projectFile"), importProject);

router.get("/generated/:id/:name", authenticate, getGeneratedProjectData);

router.post("/generated/:id/:name", authenticate, createGeneratedProjectData);

router.post("/time/:id/start", authenticate, startTime);

router.patch("/time/:id/stop", authenticate, stopTime);

router.get("/time/:id", authenticate, getTime);

router.post("/time/:id/new", authenticate, manualTime);

export default router;
