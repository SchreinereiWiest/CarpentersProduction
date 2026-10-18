
import express from "express";
import { authenticate, authenticateAdmin } from "../../middleware/auth.middleware.js";
import { createSettingsData, getSettingsData } from "./settings.controller.js";
import { getCalculationSnapshots } from "../calculation/calculation-snapshot.controller.js";
import {
    deleteAttachmentSearchCredential,
    getAttachmentSearchCredentialStatus,
    setAttachmentSearchCredential
} from "../attachment-search/attachment-credential.controller.js";


const router = express.Router();

// Company settings are also needed by regular users for the time calendar.
router.get("/company", authenticate, (req, res) => {
    req.params.name = "company";
    return getSettingsData(req, res);
});

router.get("/calculation-snapshots", authenticateAdmin, getCalculationSnapshots);

router.get("/attachment-search-credential", authenticateAdmin, getAttachmentSearchCredentialStatus);
router.post("/attachment-search-credential", authenticateAdmin, setAttachmentSearchCredential);
router.delete("/attachment-search-credential", authenticateAdmin, deleteAttachmentSearchCredential);

router.get("/:name", authenticateAdmin, getSettingsData);

router.post("/:name", authenticateAdmin, createSettingsData);

export default router;
