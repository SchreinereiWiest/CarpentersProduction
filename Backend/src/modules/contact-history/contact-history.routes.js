import express from "express";

import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import {
  deleteContactHistoryPassword,
  getContactHistorySettings,
  queueContactHistorySync,
  saveContactHistorySettings,
  testContactHistorySettings
} from "./contact-history-settings.controller.js";

const router = express.Router();
router.use(authenticate, requireFeature("crm"), authorizeRoles("admin"));

router.get("/settings", getContactHistorySettings);
router.put("/settings", saveContactHistorySettings);
router.post("/settings/test", testContactHistorySettings);
router.post("/sync", queueContactHistorySync);
router.delete("/settings/password", deleteContactHistoryPassword);

export default router;
