import express from 'express';
import { authenticate, authorizeRoles, requireFeature } from '../../middleware/auth.middleware.js';
import { getManagementOverview, getManagementReferences } from './controllers/overview.controller.js';
import { saveManagementConfig, approveManagementSetup } from './controllers/configuration.controller.js';
import { run } from './services/http.js';

// Die Oberfläche verwendet ausschließlich Jahres-Snapshot, Referenzen, Entwurf und Freigabe.
const router = express.Router();
router.use(authenticate, requireFeature('business-management'), authorizeRoles('admin', 'manager'));
router.get('/', run(getManagementOverview));
router.get('/references', run(getManagementReferences));
router.put('/settings', run(saveManagementConfig));
router.post('/setup/approve', run(approveManagementSetup));
export default router;
