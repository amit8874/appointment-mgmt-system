import express from 'express';
import { getDiagnosisMaster, searchDiagnosis, addDiagnosisMaster } from '../controllers/diagnosisController.js';
import { detectTenant } from '../middleware/tenant.js';

const router = express.Router();

router.get('/master', detectTenant, getDiagnosisMaster);
router.get('/search', detectTenant, searchDiagnosis);
router.post('/master', detectTenant, addDiagnosisMaster);

export default router;
