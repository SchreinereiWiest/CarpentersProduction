import express from "express";
import prisma from "../../infrastructure/database/prisma.js";

import {createUpload, createDownloadUrl, deleteFile} from "../../middleware/upload.middleware.js";
import {uploadcomplete} from "./file.controller.js";
import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import { authorizeFile, authorizeProjectBody, authorizeUploadTarget } from "../../middleware/resourceAuthorization.middleware.js";
import { subscribeToFileChanges } from "./file-change-events.service.js";
import { attachmentSearch, importAttachmentSearchResult } from "../attachment-search/attachment-search.controller.js";

import multer from "multer";

const upload = multer({
    storage: multer.memoryStorage()
});

const shopImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
        callback(allowedTypes.has(file.mimetype) ? null : new Error("Unsupported shop image type"), allowedTypes.has(file.mimetype));
    }
});

const projectAttachmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        const allowedTypes = new Set(["image/jpeg", "application/pdf"]);
        const allowed = allowedTypes.has(file.mimetype);
        callback(allowed ? null : new Error("Only JPEG and PDF attachments are supported"), allowed);
    }
});

const projectImportAssetUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        const allowedTypes = new Set([
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
        ]);
        const allowed = allowedTypes.has(file.mimetype);
        callback(allowed ? null : new Error("Unsupported project import asset type"), allowed);
    }
});

const PROJECT_IMPORT_CATEGORIES = Object.freeze({
    home: "project-home-image",
    "measurement-image": "measurement-image",
    "measurement-plan": "measurement-plan"
});

const router = express.Router();

const requireUploadModule = (req, res, next) => {
    const feature = req.body?.entity === "shop"
        ? "shop"
        : req.body?.entity === "management"
            ? "business-management"
            : "work-preparation";
    return requireFeature(feature)(req, res, next);
};

const requireAuthorizedFileModule = (req, res, next) => {
    const category = req.authorizedFile?.category;
    const feature = category === "management-document"
        ? "business-management"
        : category === "shop"
            ? "shop"
            : "work-preparation";
    return requireFeature(feature)(req, res, next);
};

router.get("/events", authenticate, subscribeToFileChanges);

router.post(
    '/management-document', authenticate, requireFeature("business-management"), authorizeRoles('admin', 'manager'),
    projectAttachmentUpload.single('file'),
    (req, _res, next) => { req.body.entity = 'management'; req.uploadCategory = 'management-document'; next(); },
    createUpload
);

router.post("/upload", authenticate, upload.single("file"), requireUploadModule, authorizeUploadTarget, createUpload);

router.post(
    "/project-import-asset",
    authenticate,
    requireFeature("work-preparation"),
    authorizeRoles("admin", "manager"),
    projectImportAssetUpload.single("file"),
    (req, res, next) => {
        const category = PROJECT_IMPORT_CATEGORIES[req.body.target];
        if (!category) {
            return res.status(400).json({ message: "Invalid project import target" });
        }
        req.body.entity = "project";
        req.uploadCategory = category;
        next();
    },
    authorizeUploadTarget,
    createUpload
);

router.post(
    "/project-attachment",
    authenticate,
    requireFeature("work-preparation"),
    authorizeRoles("admin", "manager"),
    projectAttachmentUpload.single("file"),
    (req, _res, next) => {
        req.body.entity = "project";
        req.uploadCategory = "production-attachment";
        next();
    },
    authorizeUploadTarget,
    createUpload
);

router.post(
    "/attachment-search",
    authenticate,
    requireFeature("work-preparation"),
    authorizeRoles("admin", "manager"),
    authorizeProjectBody("projectId"),
    attachmentSearch
);

router.post(
    "/attachment-search/import",
    authenticate,
    requireFeature("work-preparation"),
    authorizeRoles("admin", "manager"),
    authorizeProjectBody("projectId"),
    importAttachmentSearchResult
);

router.post(
    "/shop-image",
    authenticate,
    requireFeature("shop"),
    authorizeRoles("admin", "manager"),
    shopImageUpload.single("file"),
    (req, _res, next) => {
        req.body.entity = "shop";
        next();
    },
    createUpload
);

// router.post("/complete", uploadcomplete);

router.get("/download/:id", authenticate, authorizeFile("id", { allowSharedShop: true }), requireAuthorizedFileModule, createDownloadUrl);

router.delete(
    "/delete/:fileId",
    authenticate,
    authorizeFile("fileId"),
    requireAuthorizedFileModule,
    (req, res, next) => {
        const isProductionAttachment = req.authorizedFile.category === "production-attachment";
        const canEditAttachments = ["admin", "manager"].includes(req.user.role);
        if (isProductionAttachment && !canEditAttachments) {
            return res.status(403).json({ message: "Not authorized" });
        }
        next();
    },
    deleteFile
);

export default router;
