import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant, detectTenant } from '../middleware/tenant.js';
import {
  getNotifications,
  getPatientNotifications,
  getDoctorNotifications,
  getPatientUnreadCount,
  getUnreadCount,
  markRead,
  markAllRead,
  markPatientAllRead,
  createNotification,
  deleteNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Apply tenant detection but allow patient-specific routes to work without tenant
router.use(detectTenant);

// Get all notifications (for admin only - returns everything for this tenant)
router.get('/', requireTenant, getNotifications);

// Get notifications for a specific patient (only their own)
router.get('/patient/:patientId', getPatientNotifications);

// Get notifications for a specific doctor (only their own - appointment notifications)
router.get('/doctor/:doctorId', getDoctorNotifications);

// Get unread count for a specific patient
router.get('/patient/:patientId/unread-count', getPatientUnreadCount);

// Get unread notifications count
router.get('/unread-count', requireTenant, getUnreadCount);

// Mark notification as read
router.put('/:id/read', requireTenant, markRead);

// Mark all notifications as read
router.put('/mark-all-read', requireTenant, markAllRead);

// Mark all notifications as read for a specific patient
router.put('/patient/:patientId/mark-all-read', markPatientAllRead);

// Create a new notification (internal use)
router.post('/', requireTenant, createNotification);

// Delete a notification
router.delete('/:id', requireTenant, deleteNotification);

export default router;