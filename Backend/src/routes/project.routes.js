import express from "express";
import prisma from "../config/prisma.js";

import { newProject, getAllProjectsID, getProject, getGeneratedProjectData, createGeneratedProjectData, getAllProjects, updateProject, deleteProject } from "../controllers/project.controller.js";
import { authenticate, authenticateAdmin, authorizeRoles } from "../middleware/auth.middleware.js";
import { authorizeCustomer, authorizeCustomerBody, authorizeProject, authorizeTimeEntry } from "../middleware/resourceAuthorization.middleware.js";
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

router.post("/new", authenticate, authorizeCustomerBody(), newProject);

router.put("/update/:id", authenticate, authorizeProject(), authorizeCustomerBody(), updateProject);

router.delete("/delete/:projectId", authenticateAdmin, deleteProject);

router.get("/getAll/:id", authenticate, authorizeCustomer(), getAllProjectsID);

router.get("/getAll", authenticate, getAllProjects);

// Backwards-compatible route for older clients.
router.get("/getActive", authenticate, getAllProjects);

router.get("/get/:id", authenticate, authorizeProject(), getProject);

router.get("/export/:id", authenticate, authorizeProject(), exportProject);

router.post("/import", authenticate, authorizeRoles("admin", "manager"), archiveUpload.single("projectFile"), importProject);

router.get("/generated/:id/:name", authenticate, authorizeProject(), getGeneratedProjectData);

router.post("/generated/:id/:name", authenticate, authorizeProject(), createGeneratedProjectData);

router.post("/time/:id/start", authenticate, authorizeProject(), startTime);

router.patch("/time/:id/stop", authenticate, authorizeTimeEntry(), stopTime);

router.get("/time/:id", authenticate, authorizeProject(), getTime);

router.post("/time/:id/new", authenticate, authorizeProject(), manualTime);

export default router;
