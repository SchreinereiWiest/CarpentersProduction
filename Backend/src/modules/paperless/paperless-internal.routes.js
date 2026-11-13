import express from "express";
import { verifyOcrWorker } from "../measurement-ocr/measurement-ocr.controller.js";
import {
  receiveLocalDocumentQrResult,
  receivePaperlessQrResult,
  streamLocalDocumentToWorker,
  streamPaperlessDocumentToWorker
} from "./paperless-internal.controller.js";

const router = express.Router();
router.use(verifyOcrWorker);
router.get("/content/local/:fileId", streamLocalDocumentToWorker);
router.get("/content/:documentId", streamPaperlessDocumentToWorker);
router.post("/qr-result/local", receiveLocalDocumentQrResult);
router.post("/qr-result", receivePaperlessQrResult);
export default router;
