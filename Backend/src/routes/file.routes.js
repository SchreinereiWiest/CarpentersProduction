import express from "express";
import prisma from "../config/prisma.js";

import {createUpload, createDownloadUrl, deleteFile} from "../middleware/upload.middleware.js";
import {uploadcomplete} from "../controllers/file.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeFile, authorizeUploadTarget } from "../middleware/resourceAuthorization.middleware.js";

import multer from "multer";

const upload = multer({
    storage: multer.memoryStorage()
});

const router = express.Router();

router.post("/upload", authenticate, upload.single("file"), authorizeUploadTarget, createUpload);

// router.post("/complete", uploadcomplete);

router.get("/download/:id", authenticate, authorizeFile(), createDownloadUrl);

router.delete("/delete/:fileId", authenticate, authorizeFile("fileId"), deleteFile);

export default router;
