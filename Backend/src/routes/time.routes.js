import { authenticate, requireFeature } from "../middleware/auth.middleware.js";
import express from "express";
import prisma from "../config/prisma.js";
import {
    assignTimeEntry,
    createGeneratedTimeData,
    getDayEntrys,
    getGeneratedTimeData,
    getOpenEntrys,
    newTime,
    updateTimeEntry
} from "../controllers/time.controller.js";
import { authorizeProject, authorizeProjectBody, authorizeTimeEntry, authorizeUserResource } from "../middleware/resourceAuthorization.middleware.js";

const router = express.Router();
router.use(authenticate, requireFeature("time"));

router.get("/day/:date", getDayEntrys);

router.get("/open", getOpenEntrys);

router.post("/new/:id", authorizeProject(), newTime);

router.patch("/:id/assign", authorizeTimeEntry(), assignTimeEntry);

router.patch("/:id", authorizeTimeEntry(), authorizeProjectBody(), updateTimeEntry);

router.post("/uploadWeek/:id/:date", authorizeUserResource(), createGeneratedTimeData);

router.get("/downloadWeek/:id/:date", authorizeUserResource(), getGeneratedTimeData)

export default router;
