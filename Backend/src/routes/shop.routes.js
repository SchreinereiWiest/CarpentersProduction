import express from "express";
import { authenticate, authenticateAdmin, authorizeRoles } from "../middleware/auth.middleware.js";
import {
    getShopCatalog,
    getShopSettings,
    saveShopCatalog,
    saveShopSettings
} from "../controllers/shop.controller.js";

const router = express.Router();

router.get("/catalog", authenticate, getShopCatalog);
router.put("/catalog", authenticate, authorizeRoles("admin", "manager"), saveShopCatalog);

router.get("/settings", authenticate, getShopSettings);
router.put("/settings", authenticateAdmin, saveShopSettings);

export default router;
