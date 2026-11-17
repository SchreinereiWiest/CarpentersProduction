import express from "express";
import multer from "multer";

import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import {
  createCommercialDocument,
  createCommission,
  deleteCommission,
  downloadDocumentTemplate,
  getCommercialDocument,
  getCommissionWorkspace,
  listCustomerCommissions,
  listCustomerDocuments,
  listDocumentTemplates,
  saveCommissionCalculation,
  updateCommercialDocument,
  updateCommission,
  uploadDocumentTemplate
} from "./commercial.controller.js";

const router = express.Router();
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(file.mimetype === "application/pdf" ? null : new Error("Nur PDF-Dateien werden unterstützt."), file.mimetype === "application/pdf")
});
const receiveTemplate = (req, res, next) => pdfUpload.single("template")(req, res, error => {
  if (!error) return next();
  error.statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 415;
  error.code = error.code === "LIMIT_FILE_SIZE" ? "DOCUMENT_TEMPLATE_TOO_LARGE" : "DOCUMENT_TEMPLATE_TYPE_INVALID";
  return next(error);
});

router.use(authenticate, authorizeRoles("admin", "manager"));

router.get("/templates", listDocumentTemplates);
router.post("/templates", authorizeRoles("admin"), receiveTemplate, uploadDocumentTemplate);
router.get("/templates/:id/download", downloadDocumentTemplate);

router.use(requireFeature("crm"));
router.get("/customers/:customerId/commissions", listCustomerCommissions);
router.post("/customers/:customerId/commissions", createCommission);
router.put("/commissions/:id", updateCommission);
router.delete("/commissions/:id", deleteCommission);
router.get("/commissions/:id/workspace", requireFeature("calculation"), getCommissionWorkspace);
router.put("/commissions/:id/calculation", requireFeature("calculation"), saveCommissionCalculation);

router.get("/customers/:customerId/documents", listCustomerDocuments);
router.post("/documents", createCommercialDocument);
router.get("/documents/:id", getCommercialDocument);
router.put("/documents/:id", updateCommercialDocument);

export default router;
