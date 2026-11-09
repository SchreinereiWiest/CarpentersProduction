import express from "express";
import multer from "multer";

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
  listLocalDocuments,
  listPaperlessDocuments,
  proxyLibraryDocument,
  proxyLinkedDocument,
  remoteDocumentMetadata,
  searchPaperlessLibrary,
  syncPaperlessNow,
  uploadPaperlessDocument,
  dismissLocalDocument,
  unlinkLocalDocument,
  unlinkPaperlessDocument,
  updateLocalDocumentAssignment,
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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const supported = new Set(["application/pdf", "image/jpeg"]).has(file.mimetype);
    callback(supported ? null : new Error("Nur PDF- und JPEG-Dateien werden unterstützt."), supported);
  }
});
const receiveUpload = (req, res, next) => upload.single("document")(req, res, error => {
  if (!error) return next();
  error.statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 415;
  error.code = error.code === "LIMIT_FILE_SIZE" ? "PAPERLESS_UPLOAD_TOO_LARGE" : "PAPERLESS_UPLOAD_TYPE_INVALID";
  return next(error);
});
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
router.get("/local-documents", listLocalDocuments);
router.post("/sync", syncPaperlessNow);
router.post("/upload", receiveUpload, uploadPaperlessDocument);
router.get("/assignment-options", getAssignmentOptions);
router.put("/documents/:documentId/assignment", updatePaperlessAssignment);
router.delete("/documents/:documentId/assignment", unlinkPaperlessDocument);
router.post("/documents/:documentId/dismiss", dismissPaperlessDocument);
router.delete("/documents/:documentId", deletePaperlessDocument);
router.put("/local-documents/:fileId/assignment", updateLocalDocumentAssignment);
router.delete("/local-documents/:fileId/assignment", unlinkLocalDocument);
router.post("/local-documents/:fileId/dismiss", dismissLocalDocument);
router.get("/library", searchPaperlessLibrary);
router.get("/library/:remoteDocumentId/metadata", remoteDocumentMetadata);
router.get("/library/:remoteDocumentId/content", (req, _res, next) => { req.params.action = "content"; next(); }, proxyLibraryDocument);
router.get("/library/:remoteDocumentId/thumbnail", (req, _res, next) => { req.params.action = "thumbnail"; next(); }, proxyLibraryDocument);
router.post("/library/:remoteDocumentId/link", linkLibraryDocument);
router.post("/library/:remoteDocumentId/import", importLibraryDocument);
router.post("/qr", createAssignmentQr);

export default router;
