import express from "express";
import { authenticateAdmin } from "../../middleware/auth.middleware.js";
import { getOnboarding, resetOnboarding, updateOnboardingStep } from "./onboarding.controller.js";

const router = express.Router();
router.use(authenticateAdmin);
router.get("/", getOnboarding);
router.put("/step", updateOnboardingStep);
router.post("/reset", resetOnboarding);

export default router;
