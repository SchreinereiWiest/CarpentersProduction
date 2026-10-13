import express from "express";
import { activateCurrentLicense, getCurrentLicense } from "../controllers/license.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/current", authenticateAdmin, getCurrentLicense);
router.put("/current", authenticateAdmin, activateCurrentLicense);

export default router;
