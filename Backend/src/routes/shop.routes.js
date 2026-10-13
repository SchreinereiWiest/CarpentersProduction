import express from "express";
import { authenticate, authenticateAdmin, authorizeRoles, requireFeature } from "../middleware/auth.middleware.js";
import {
    getShopCatalog,
    getShopSettings,
    saveShopCatalog,
    saveShopSettings
} from "../controllers/shop.controller.js";

const router = express.Router();
router.use(authenticate, requireFeature("purchasing"));

router.get("/catalog", getShopCatalog);
router.put("/catalog", authorizeRoles("admin", "manager"), saveShopCatalog);

router.get("/settings", getShopSettings);
router.put("/settings", authorizeRoles("admin"), saveShopSettings);

export default router;
