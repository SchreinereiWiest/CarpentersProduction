import express from "express";
import multer from "multer";

import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import { authorizeProject, authorizeProjectBody } from "../../middleware/resourceAuthorization.middleware.js";
import {
  applyScan,
  authorizeMeasurementScan,
  createPrintRun,
  listProjectScans,
  listScans,
  retryScan,
  reviewScan,
  uploadScan
} from "./measurement-ocr.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set(["image/jpeg", "image/png", "application/pdf"]).has(file.mimetype);
    callback(allowed ? null : new Error("Only PDF, JPEG and PNG scans are supported"), allowed);
  }
});

const router = express.Router();
router.use(authenticate, requireFeature("work-preparation"));

router.post("/print-runs", authorizeProjectBody("projectId"), createPrintRun);
router.post("/scans", authorizeRoles("admin", "manager"), upload.single("file"), uploadScan);
router.get("/scans", authorizeRoles("admin", "manager"), listScans);
router.get("/projects/:projectId/scans", authorizeProject("projectId"), listProjectScans);
router.post("/scans/:scanId/retry", authorizeRoles("admin", "manager"), retryScan);
router.put("/scans/:scanId/review", authorizeMeasurementScan, reviewScan);
router.post("/scans/:scanId/apply", authorizeMeasurementScan, applyScan);

export default router;
