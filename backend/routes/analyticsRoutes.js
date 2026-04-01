import express from 'express';
import { trackHeartbeat, getSuperAdminUsageStats } from '../controllers/analyticsController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public heartbeat tracking (Requires authentication)
router.post('/heartbeat', authenticateToken, trackHeartbeat);

// Superadmin usage stats
router.get('/superadmin/usage-stats', authenticateToken, requireSuperAdmin, getSuperAdminUsageStats);

export default router;
