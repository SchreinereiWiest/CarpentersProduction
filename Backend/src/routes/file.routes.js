import express from "express";
import prisma from "../config/prisma.js";

import {createUpload, createDownloadUrl, deleteFile} from "../middleware/upload.middleware.js";
import {uploadcomplete} from "../controllers/file.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";
import { authorizeFile, authorizeUploadTarget } from "../middleware/resourceAuthorization.middleware.js";

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

const router = express.Router();

router.post("/upload", authenticate, upload.single("file"), authorizeUploadTarget, createUpload);

router.post(
    "/project-attachment",
    authenticate,
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
    "/shop-image",
    authenticate,
    authorizeRoles("admin", "manager"),
    shopImageUpload.single("file"),
    (req, _res, next) => {
        req.body.entity = "shop";
        next();
    },
    createUpload
);

// router.post("/complete", uploadcomplete);

router.get("/download/:id", authenticate, authorizeFile("id", { allowSharedShop: true }), createDownloadUrl);

router.delete(
    "/delete/:fileId",
    authenticate,
    authorizeFile("fileId"),
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
