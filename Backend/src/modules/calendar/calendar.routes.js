import express from "express";
import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  listCalendarProjects,
  syncCompanyDays,
  updateCalendarEvent
} from "./calendar.controller.js";

const router = express.Router();

router.use(authenticate, requireFeature("work-preparation"));
router.get("/events", listCalendarEvents);
router.get("/projects", authorizeRoles("admin"), listCalendarProjects);
router.post("/company-days/sync", authorizeRoles("admin"), syncCompanyDays);
router.post("/events", createCalendarEvent);
router.put("/events/:id", updateCalendarEvent);
router.delete("/events/:id", deleteCalendarEvent);

export default router;
