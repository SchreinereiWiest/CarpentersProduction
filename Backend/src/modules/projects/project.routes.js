import express from "express";
import prisma from "../../infrastructure/database/prisma.js";

import { newProject, getAllProjectsID, getProject, getGeneratedProjectData, createGeneratedProjectData, getAllProjects, getOfflineProjects, updateProject, deleteProject } from "./project.controller.js";
import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import { authorizeCustomer, authorizeCustomerReferenceBody, authorizeProject, authorizeTimeEntry } from "../../middleware/resourceAuthorization.middleware.js";
import { getTime, manualTime, startTime, stopTime } from "../time-tracking/time.controller.js";
import { exportProject, importProject } from "./project-archive.controller.js";
import { getCalculationContext } from "../calculation/calculation.controller.js";
import { releaseCalculationSnapshot } from "../calculation/calculation-snapshot.controller.js";
import multer from "multer";
import os from "os";
import crypto from "crypto";

const router = express.Router();
router.use(authenticate, requireFeature("work-preparation"));

const archiveUpload = multer({
    storage: multer.diskStorage({
        destination: os.tmpdir(),
        filename: (_req, _file, callback) => callback(null, `project-import-${crypto.randomUUID()}`)
    }),
    limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 1 }
});

router.post("/new", authorizeCustomerReferenceBody(), newProject);

router.put("/update/:id", authorizeProject(), authorizeCustomerReferenceBody(), updateProject);

router.delete("/delete/:projectId", authorizeRoles("admin", "manager"), deleteProject);

router.get("/getAll/:id", authorizeCustomer(), getAllProjectsID);

router.get("/getAll", getAllProjects);

// Backwards-compatible route for older clients.
router.get("/getActive", getAllProjects);

router.get("/offline", getOfflineProjects);

router.get("/get/:id", authorizeProject(), getProject);

router.get("/calculation-context/:id", requireFeature("calculation"), authorizeProject(), getCalculationContext);

router.post("/calculation-snapshots/:id/release", requireFeature("calculation"), authorizeProject(), releaseCalculationSnapshot);

router.get("/export/:id", authorizeProject(), exportProject);

router.post("/import", authorizeRoles("admin", "manager"), archiveUpload.single("projectFile"), importProject);

router.get("/generated/:id/:name", authorizeProject(), getGeneratedProjectData);

router.post("/generated/:id/:name", authorizeProject(), createGeneratedProjectData);

router.post("/time/:id/start", authorizeProject(), startTime);

router.patch("/time/:id/stop", authorizeTimeEntry(), stopTime);

router.get("/time/:id", authorizeProject(), getTime);

router.post("/time/:id/new", authorizeProject(), manualTime);

export default router;
