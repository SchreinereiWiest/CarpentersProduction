import crypto from "crypto";
import os from "os";

import express from "express";
import multer from "multer";

import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import {
    cleanupOrphanedObjects,
    deleteStorageFolder,
    deleteStorageObject,
    downloadStorageObject,
    getStorageOverview
} from "./storage-admin.controller.js";
import {
    createBackup,
    createDatabaseBackup,
    createShopDatabaseBackup,
    deleteBackup,
    downloadBackup,
    importBackup,
    importDatabaseBackup,
    importShopDatabaseBackup,
    listBackups,
    restoreBackup
} from "./storage-backup.controller.js";

const router = express.Router();
const backupUpload = multer({
    storage: multer.diskStorage({
        destination: os.tmpdir(),
        filename: (_req, _file, callback) => callback(null, `tenant-backup-import-${crypto.randomUUID()}`)
    }),
    limits: { fileSize: 10 * 1024 * 1024 * 1024, files: 1 }
});

router.use(authenticate, requireFeature("work-preparation"), authorizeRoles("admin"));

router.get("/overview", getStorageOverview);
router.get("/objects/:id/download", downloadStorageObject);
router.delete("/objects/:id", deleteStorageObject);
router.delete("/folders", deleteStorageFolder);
router.post("/cleanup", cleanupOrphanedObjects);

router.get("/backups", listBackups);
router.post("/backups", createBackup);
router.get("/backups/:id/download", downloadBackup);
router.post("/backups/:id/restore", restoreBackup);
router.delete("/backups/:id", deleteBackup);
router.post("/backups/import", backupUpload.single("backup"), importBackup);
router.post("/database-backups", createDatabaseBackup);
router.post("/database-backups/import", backupUpload.single("backup"), importDatabaseBackup);
router.post("/shop-database-backups", createShopDatabaseBackup);
router.post("/shop-database-backups/import", backupUpload.single("backup"), importShopDatabaseBackup);

export default router;
