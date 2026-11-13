import express from "express";

import { receiveFreePbxWebhook } from "./freepbx-webhook.controller.js";

const router = express.Router();
router.post("/webhook/:tenantId/:event", receiveFreePbxWebhook);

export default router;
