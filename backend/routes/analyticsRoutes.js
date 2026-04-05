import express from 'express';
import { trackHeartbeat, getSuperAdminUsageStats, getCharts, getDashboard, getPredictiveInsights } from '../controllers/analyticsController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// Chart data for dashboard
router.get('/charts', authenticateToken, getCharts);

// Dashboard specific data (recent appointments, etc.)
router.get('/dashboard', authenticateToken, getDashboard);

// AI Predictive Insights
router.get('/predictive', authenticateToken, getPredictiveInsights);

// Public heartbeat tracking (Requires authentication)
router.post('/heartbeat', authenticateToken, trackHeartbeat);

// Superadmin usage stats
router.get('/superadmin/usage-stats', authenticateToken, requireSuperAdmin, getSuperAdminUsageStats);

export default router;
