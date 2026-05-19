import express from 'express';
import { getMedicineMaster, searchMedicines, addMedicineMaster, getMedicineRecommendations } from '../controllers/medicineController.js';
import { detectTenant } from '../middleware/tenant.js';

const router = express.Router();

router.get('/master', detectTenant, getMedicineMaster);
router.get('/search', detectTenant, searchMedicines);
router.post('/master', detectTenant, addMedicineMaster);
router.post('/recommendations', detectTenant, getMedicineRecommendations);

export default router;
