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

// 🔧 Ensure 'uploads' directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 🔧 Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + file.originalname;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({ storage });

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
