import express from "express";
import prisma from "../config/prisma.js";

import {createUploadUrl, createDownloadUrl} from "../middleware/upload.middleware.js";
import {uploadcomplete} from "../controllers/file.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/upload-url", createUploadUrl);

router.post("/complete", uploadcomplete);

router.post("/download/:id", authenticate, createDownloadUrl);
export default router;