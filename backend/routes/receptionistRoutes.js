import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireAdmin, requireAdminOrReceptionist } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  getAllReceptionists,
  getReceptionistCount,
  addReceptionist,
  updateReceptionist,
  deleteReceptionist
} from '../controllers/receptionistController.js';

const router = express.Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticateToken);
router.use(requireTenant);

// Configure Multer for memory storage (S3 upload handled in controller)
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/receptionists - Get all receptionists
router.get('/', getAllReceptionists);

// GET /api/receptionists/count - Get receptionist count
router.get('/count', getReceptionistCount);

// POST /api/receptionists - Add a new receptionist
router.post('/', upload.single('profilePhoto'), addReceptionist);

// PUT /api/receptionists/:id - Update a receptionist
router.put('/:id', upload.single('profilePhoto'), updateReceptionist);

// DELETE /api/receptionists/:id - Delete a receptionist
router.delete('/:id', deleteReceptionist);

export default router;
