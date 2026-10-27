import express from "express";
import { authenticate, authenticateAdmin, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import {
    activateArticleArchiveEntry,
    createArticleArchiveEntry,
    createPurchaseList,
    deleteArticleArchiveEntry,
    deletePurchaseList,
    getArticleArchive,
    getNonProjectPurchases,
    getPurchaseLists,
    getShopCatalog,
    getShopSettings,
    processNonProjectPurchases,
    releasePurchaseList,
    saveShopCatalog,
    saveShopSettings,
    updateArticleArchiveEntry,
    updatePurchaseList
} from "./shop.controller.js";

const router = express.Router();
router.use(authenticate, requireFeature("shop"));

router.get("/catalog", getShopCatalog);
router.put("/catalog", authorizeRoles("admin", "manager"), saveShopCatalog);

router.get("/settings", getShopSettings);
router.put("/settings", authorizeRoles("admin"), saveShopSettings);

router.get("/lists", getPurchaseLists);
router.post("/lists", authorizeRoles("admin", "manager"), createPurchaseList);
router.put("/lists/:id", authorizeRoles("admin", "manager"), updatePurchaseList);
router.delete("/lists/:id", authorizeRoles("admin", "manager"), deletePurchaseList);
router.post("/lists/:id/release", releasePurchaseList);

router.get("/non-project-purchases", getNonProjectPurchases);
router.patch("/non-project-purchases/process", processNonProjectPurchases);

router.get("/archive", getArticleArchive);
router.post("/archive", authorizeRoles("admin", "manager"), createArticleArchiveEntry);
router.put("/archive/:id", authorizeRoles("admin", "manager"), updateArticleArchiveEntry);
router.delete("/archive/:id", authorizeRoles("admin", "manager"), deleteArticleArchiveEntry);
router.post("/archive/:id/activate", authorizeRoles("admin", "manager"), activateArticleArchiveEntry);

export default router;
