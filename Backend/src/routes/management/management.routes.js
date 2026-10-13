import express from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';
import { getManagementOverview, getManagementReferences } from '../../controllers/management/overview.controller.js';
import { saveManagementConfig, approveManagementSetup } from '../../controllers/management/configuration.controller.js';
import { run } from '../../services/management/http.js';

// Die Oberfläche verwendet ausschließlich Jahres-Snapshot, Referenzen, Entwurf und Freigabe.
const router = express.Router();
router.use(authenticate, authorizeRoles('admin', 'manager'));
router.get('/', run(getManagementOverview));
router.get('/references', run(getManagementReferences));
router.put('/settings', run(saveManagementConfig));
router.post('/setup/approve', run(approveManagementSetup));
export default router;
