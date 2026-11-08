import express from "express";
import { verifyOcrWorker } from "../measurement-ocr/measurement-ocr.controller.js";
import {
  receivePaperlessQrResult,
  streamPaperlessDocumentToWorker
} from "./paperless-internal.controller.js";

const router = express.Router();
router.use(verifyOcrWorker);
router.get("/content/:documentId", streamPaperlessDocumentToWorker);
router.post("/qr-result", receivePaperlessQrResult);
export default router;
