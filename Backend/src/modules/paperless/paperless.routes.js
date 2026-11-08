import express from "express";

import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import {
  authorizePaperlessDocument,
  createAssignmentQr,
  deletePaperlessDocument,
  dismissPaperlessDocument,
  getAssignmentOptions,
  getPaperlessStatus,
  importLibraryDocument,
  linkLibraryDocument,
  listPaperlessDocuments,
  proxyLibraryDocument,
  proxyLinkedDocument,
  remoteDocumentMetadata,
  searchPaperlessLibrary,
  syncPaperlessNow,
  unlinkPaperlessDocument,
  updatePaperlessAssignment
} from "./paperless.controller.js";
import {
  deletePaperlessApiToken,
  getPaperlessSettings,
  rotatePaperlessWebhookSecret,
  savePaperlessSettings,
  testPaperlessConnection
} from "./paperless-settings.controller.js";

const router = express.Router();
router.use(authenticate);

router.get("/documents/:documentId/content", authorizePaperlessDocument, (req, _res, next) => { req.params.action = "content"; next(); }, proxyLinkedDocument);
router.get("/documents/:documentId/thumbnail", authorizePaperlessDocument, (req, _res, next) => { req.params.action = "thumbnail"; next(); }, proxyLinkedDocument);

router.get("/settings", authorizeRoles("admin"), getPaperlessSettings);
router.put("/settings", authorizeRoles("admin"), savePaperlessSettings);
router.post("/settings/test", authorizeRoles("admin"), testPaperlessConnection);
router.post("/settings/webhook-secret", authorizeRoles("admin"), rotatePaperlessWebhookSecret);
router.delete("/settings/token", authorizeRoles("admin"), deletePaperlessApiToken);

router.use(requireFeature("business-management"), authorizeRoles("admin", "manager"));
router.get("/status", getPaperlessStatus);
router.get("/documents", listPaperlessDocuments);
router.post("/sync", syncPaperlessNow);
router.get("/assignment-options", getAssignmentOptions);
router.put("/documents/:documentId/assignment", updatePaperlessAssignment);
router.delete("/documents/:documentId/assignment", unlinkPaperlessDocument);
router.post("/documents/:documentId/dismiss", dismissPaperlessDocument);
router.delete("/documents/:documentId", deletePaperlessDocument);
router.get("/library", searchPaperlessLibrary);
router.get("/library/:remoteDocumentId/metadata", remoteDocumentMetadata);
router.get("/library/:remoteDocumentId/content", (req, _res, next) => { req.params.action = "content"; next(); }, proxyLibraryDocument);
router.get("/library/:remoteDocumentId/thumbnail", (req, _res, next) => { req.params.action = "thumbnail"; next(); }, proxyLibraryDocument);
router.post("/library/:remoteDocumentId/link", linkLibraryDocument);
router.post("/library/:remoteDocumentId/import", importLibraryDocument);
router.post("/qr", createAssignmentQr);

export default router;
