import express from 'express';
import { authenticate, authorizeRoles, requireFeature } from '../../middleware/auth.middleware.js';
import { getManagementOverview, getManagementReferences } from './controllers/overview.controller.js';
import { saveManagementConfig, approveManagementSetup } from './controllers/configuration.controller.js';
import { run } from './services/http.js';
import {
  createAssignmentCalendarPeriod,
  createGoal,
  createGoalCheckpoint,
  deleteAssignment,
  deleteGoal,
  deleteGoalCheckpoint,
  deleteProjectSchedule,
  getManagementWorkspace,
  saveAssignment,
  saveEmployeeProfile,
  saveProjectSchedule,
  saveProjectStage,
  saveRateCalculation,
  transferProjectScheduleToCalendar,
  updateGoal
} from './controllers/workspace.controller.js';

// Die Oberfläche verwendet ausschließlich Jahres-Snapshot, Referenzen, Entwurf und Freigabe.
const router = express.Router();
router.use(authenticate, requireFeature('business-management'), authorizeRoles('admin', 'manager'));
router.get('/', run(getManagementOverview));
router.get('/references', run(getManagementReferences));
router.put('/settings', run(saveManagementConfig));
router.post('/setup/approve', run(approveManagementSetup));
router.get('/workspace', run(getManagementWorkspace));
router.post('/assignments', run(saveAssignment));
router.delete('/assignments/:id', run(deleteAssignment));
router.post('/assignments/:id/calendar', run(createAssignmentCalendarPeriod));
router.put('/projects/:projectId/stage', run(saveProjectStage));
router.put('/projects/:projectId/schedule', run(saveProjectSchedule));
router.post('/projects/:projectId/schedule/calendar', run(transferProjectScheduleToCalendar));
router.delete('/projects/:projectId/schedule', run(deleteProjectSchedule));
router.put('/employees/:userId/profile', run(saveEmployeeProfile));
router.post('/goals', run(createGoal));
router.put('/goals/:id', run(updateGoal));
router.delete('/goals/:id', run(deleteGoal));
router.post('/goals/:id/checkpoints', run(createGoalCheckpoint));
router.delete('/goals/:id/checkpoints/:checkpointId', run(deleteGoalCheckpoint));
router.put('/rates', run(saveRateCalculation));
export default router;
