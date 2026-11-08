import express from "express";
import { receivePaperlessWebhook } from "./paperless-webhook.controller.js";

const router = express.Router();
router.post("/webhook/:tenantId", receivePaperlessWebhook);
export default router;
