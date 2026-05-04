import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { searchMedicines, bulkSaveMedicines } from '../controllers/medicineController.js';

const router = express.Router();

// All medicine routes require authentication but NOT tenant scoping
// because the medicine database is shared/global across all organizations
router.use(authenticateToken);

// GET /api/medicines/search?q=para  → autocomplete suggestions
router.get('/search', searchMedicines);

// POST /api/medicines/bulk-save  → save medicine names when bill is created
router.post('/bulk-save', bulkSaveMedicines);

export default router;
