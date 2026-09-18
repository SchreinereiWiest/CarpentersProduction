import express from "express";
import prisma from "../config/prisma.js";

import {createUpload, createDownloadUrl, deleteFile} from "../middleware/upload.middleware.js";
import {uploadcomplete} from "../controllers/file.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

import multer from "multer";

const upload = multer({
    storage: multer.memoryStorage()
});

const router = express.Router();

router.post("/upload", authenticate, upload.single("file"), createUpload);

// router.post("/complete", uploadcomplete);

router.get("/download/:id", authenticate, createDownloadUrl);

router.delete("/delete/:fileId", authenticate, deleteFile);

export default router;