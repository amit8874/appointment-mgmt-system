import express from 'express';
import { getMasterComplaints, addMasterComplaint } from '../controllers/complaintController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireTenant);

// GET /api/complaints/master
router.get('/master', getMasterComplaints);

// POST /api/complaints/master
router.post('/master', addMasterComplaint);

export default router;
