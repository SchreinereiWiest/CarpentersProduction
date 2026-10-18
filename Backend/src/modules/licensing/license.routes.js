import express from "express";
import { activateCurrentLicense, getCurrentLicense } from "./license.controller.js";
import { authenticateAdmin } from "../../middleware/auth.middleware.js";

const router = express.Router();

// Lizenzschlüssel und Vertragsinformationen sind Firmeneinstellungen und daher
// ausschließlich für Administratoren der aktuell angemeldeten Firma sichtbar.
router.get("/current", authenticateAdmin, getCurrentLicense);
router.put("/current", authenticateAdmin, activateCurrentLicense);

export default router;
