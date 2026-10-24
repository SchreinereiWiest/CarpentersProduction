
import express from "express";
import { authenticate, authenticateAdmin, requireFeature } from "../../middleware/auth.middleware.js";
import { createSettingsData, getSettingsData } from "./settings.controller.js";
import { getCalculationSnapshots } from "../calculation/calculation-snapshot.controller.js";
import {
    deleteAttachmentSearchCredential,
    getAttachmentSearchCredentialStatus,
    setAttachmentSearchCredential
} from "../attachment-search/attachment-credential.controller.js";
import { getHourlyRates, saveHourlyRates } from "./hourly-rates.controller.js";


const router = express.Router();

const requireSettingsModule = (req, res, next) => {
    const feature = req.params.name === "shop"
        ? "shop"
        : ["cabinet", "cnc", "nesting"].includes(req.params.name)
            ? "work-preparation"
            : null;
    return feature ? requireFeature(feature)(req, res, next) : next();
};

// Company settings are also needed by regular users for the time calendar.
router.get("/company", authenticate, (req, res) => {
    req.params.name = "company";
    return getSettingsData(req, res);
});

router.get("/calculation-snapshots", authenticateAdmin, requireFeature("calculation"), getCalculationSnapshots);

router.get("/hourly-rates", authenticateAdmin, requireFeature("calculation"), getHourlyRates);
router.put("/hourly-rates", authenticateAdmin, requireFeature("calculation"), saveHourlyRates);

router.get("/attachment-search-credential", authenticateAdmin, requireFeature("work-preparation"), getAttachmentSearchCredentialStatus);
router.post("/attachment-search-credential", authenticateAdmin, requireFeature("work-preparation"), setAttachmentSearchCredential);
router.delete("/attachment-search-credential", authenticateAdmin, requireFeature("work-preparation"), deleteAttachmentSearchCredential);

router.get("/:name", authenticateAdmin, requireSettingsModule, getSettingsData);

router.post("/:name", authenticateAdmin, requireSettingsModule, createSettingsData);

export default router;
