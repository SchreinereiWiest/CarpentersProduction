import express from "express";

import { authenticate, authorizeRoles, requireFeature } from "../../middleware/auth.middleware.js";
import {
  createCommercialDocument,
  createCommission,
  createDocumentTemplate,
  clearDocumentTemplateDefault,
  deleteCommission,
  deleteDocumentTemplate,
  getCommercialDocument,
  getCommissionWorkspace,
  listCommercialDocumentAssignees,
  listCustomerCommissions,
  listCustomerDocuments,
  listDocumentTemplates,
  saveCommissionCalculation,
  setDocumentTemplateDefault,
  updateCommercialDocument,
  updateCommercialDocumentAssignee,
  updateCommission,
  updateDocumentTemplate
} from "./commercial.controller.js";

const router = express.Router();

router.use(authenticate);

router.get("/templates", authorizeRoles("admin", "manager"), listDocumentTemplates);
router.post("/templates", authorizeRoles("admin"), createDocumentTemplate);
router.put("/templates/:id", authorizeRoles("admin"), updateDocumentTemplate);
router.delete("/templates/:id", authorizeRoles("admin"), deleteDocumentTemplate);
router.put("/templates/:id/default", authorizeRoles("admin"), setDocumentTemplateDefault);
router.delete("/templates/default/:documentType", authorizeRoles("admin"), clearDocumentTemplateDefault);

router.use(requireFeature("crm"));

router.get("/documents/:id", authorizeRoles("admin", "manager", "user"), getCommercialDocument);
router.put("/documents/:id", authorizeRoles("admin", "manager", "user"), updateCommercialDocument);

router.use(authorizeRoles("admin", "manager"));
router.get("/document-assignees", listCommercialDocumentAssignees);
router.put("/documents/:id/assignee", updateCommercialDocumentAssignee);
router.get("/customers/:customerId/commissions", listCustomerCommissions);
router.post("/customers/:customerId/commissions", createCommission);
router.put("/commissions/:id", updateCommission);
router.delete("/commissions/:id", deleteCommission);
router.get("/commissions/:id/workspace", requireFeature("calculation"), getCommissionWorkspace);
router.put("/commissions/:id/calculation", requireFeature("calculation"), saveCommissionCalculation);

router.get("/customers/:customerId/documents", listCustomerDocuments);
router.post("/documents", createCommercialDocument);

export default router;
