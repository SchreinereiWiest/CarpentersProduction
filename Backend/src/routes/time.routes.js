import { authenticate } from "../middleware/auth.middleware.js";
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

router.get("/day/:date", authenticate, getDayEntrys);

router.get("/open", authenticate, getOpenEntrys);

router.post("/new/:id", authenticate, authorizeProject(), newTime);

router.patch("/:id/assign", authenticate, authorizeTimeEntry(), assignTimeEntry);

router.patch("/:id", authenticate, authorizeTimeEntry(), authorizeProjectBody(), updateTimeEntry);

router.post("/uploadWeek/:id/:date", authenticate, authorizeUserResource(), createGeneratedTimeData);

router.get("/downloadWeek/:id/:date", authenticate, authorizeUserResource(), getGeneratedTimeData)

export default router;
