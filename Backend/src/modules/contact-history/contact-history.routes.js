import express from "express";

import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import {
  deleteContactHistoryPassword,
  getContactHistorySettings,
  queueContactHistorySync,
  saveContactHistorySettings,
  testContactHistorySettings
} from "./contact-history-settings.controller.js";
import {
  disconnectFreePbx,
  getActivePhoneCalls,
  getFreePbxSettings,
  rotateFreePbxSecret,
  saveFreePbxSettings,
  streamPhoneCalls
} from "./freepbx.controller.js";

const router = express.Router();
router.use(authenticate, requireFeature("crm"));

router.get("/calls/active", authorizeRoles("admin", "manager"), getActivePhoneCalls);
router.get("/calls/events", authorizeRoles("admin", "manager"), streamPhoneCalls);

router.use(authorizeRoles("admin"));

router.get("/settings", getContactHistorySettings);
router.put("/settings", saveContactHistorySettings);
router.post("/settings/test", testContactHistorySettings);
router.post("/sync", queueContactHistorySync);
router.delete("/settings/password", deleteContactHistoryPassword);
router.get("/freepbx/settings", getFreePbxSettings);
router.put("/freepbx/settings", saveFreePbxSettings);
router.post("/freepbx/settings/rotate-secret", rotateFreePbxSecret);
router.delete("/freepbx/settings/secret", disconnectFreePbx);

export default router;
