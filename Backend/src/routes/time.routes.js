import { authenticate } from "../middleware/auth.middleware.js";
import express from "express";
import prisma from "../config/prisma.js";
import { getDayEntrys, getOpenEntrys } from "../controllers/time.controller.js";

const router = express.Router();

router.get("/day/:date", authenticate, getDayEntrys);

router.get("/open", authenticate, getOpenEntrys);

export default router;