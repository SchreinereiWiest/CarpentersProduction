import { authenticate } from "../middleware/auth.middleware.js";
import express from "express";
import prisma from "../config/prisma.js";
import { getDayEntrys, getOpenEntrys, newTime, createGeneratedTimeData, getGeneratedTimeData } from "../controllers/time.controller.js";

const router = express.Router();

router.get("/day/:date", authenticate, getDayEntrys);

router.get("/open", authenticate, getOpenEntrys);

router.post("/new/:id", authenticate, newTime);

router.post("/uploadWeek/:id/:date", authenticate, createGeneratedTimeData);

router.get("/downloadWeek/:id/:date", authenticate, getGeneratedTimeData)

export default router;