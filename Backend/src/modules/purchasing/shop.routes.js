import express from "express";
import multer from "multer";
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
import {
    fetchArticleCatalog,
    getArticleCatalog,
    saveBrowserArticleCatalogResults,
    saveArticleCatalog
} from "./article-catalog.controller.js";
import { uploadSupplierDatanorm } from "./datanorm/datanorm.controller.js";

const datanormUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024, files: 20 }
});

const router = express.Router();
router.use(authenticate, requireFeature("shop"));

router.get("/catalog", getShopCatalog);
router.put("/catalog", authorizeRoles("admin", "manager"), saveShopCatalog);

router.get("/article-catalog", getArticleCatalog);
router.put("/article-catalog", authorizeRoles("admin", "manager"), saveArticleCatalog);
router.post("/article-catalog/fetch", authorizeRoles("admin", "manager"), fetchArticleCatalog);
router.post("/article-catalog/browser-results", authorizeRoles("admin", "manager"), saveBrowserArticleCatalogResults);

router.get("/settings", getShopSettings);
router.put("/settings", authorizeRoles("admin"), saveShopSettings);
router.post(
    "/settings/suppliers/:id/datanorm",
    authorizeRoles("admin"),
    datanormUpload.array("files", 20),
    uploadSupplierDatanorm
);

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
