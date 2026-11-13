import express from "express";

import {
  receiveOcrResult,
  resolvePrintPage,
  verifyOcrWorker
} from "./measurement-ocr.controller.js";

const router = express.Router();
router.use(verifyOcrWorker);
router.post("/resolve", resolvePrintPage);
router.post("/result", receiveOcrResult);

export default router;
