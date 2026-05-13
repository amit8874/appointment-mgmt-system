import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  createFollowUpReminder,
  getFollowUpReminders,
  getTodayFollowUpReminders,
  getDueFollowUpReminders,
  markReminderPopupShown,
  completeFollowUpReminder,
  snoozeFollowUpReminder,
  rescheduleFollowUpReminder,
  cancelFollowUpReminder,
  deleteFollowUpReminder
} from '../controllers/followUpReminderController.js';

const router = express.Router();

// All routes require authentication and tenant detection
router.use(authenticateToken);
router.use(requireTenant);

router.route('/')
  .post(createFollowUpReminder)
  .get(getFollowUpReminders);

router.get('/today', getTodayFollowUpReminders);
router.get('/due', getDueFollowUpReminders);

router.patch('/:id/popup-shown', markReminderPopupShown);
router.patch('/:id/complete', completeFollowUpReminder);
router.patch('/:id/snooze', snoozeFollowUpReminder);
router.patch('/:id/reschedule', rescheduleFollowUpReminder);
router.patch('/:id/cancel', cancelFollowUpReminder);

router.delete('/:id', deleteFollowUpReminder);

export default router;
