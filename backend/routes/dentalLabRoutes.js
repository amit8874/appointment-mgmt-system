import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  createLaboratory,
  getLaboratories,
  updateLaboratory,
  deleteLaboratory,
  createLabCase,
  getLabCases,
  getPatientLabCases,
  getLabCaseById,
  updateLabCase,
  patchLabCaseStatus,
  deleteLabCase
} from '../controllers/dentalLabController.js';

const router = express.Router();

// Enforce auth token and tenant verification
router.use(authenticateToken);
router.use(requireTenant);

// Dental Laboratories CRUD routes
router.post('/', createLaboratory);
router.get('/', getLaboratories);
router.put('/:id', updateLaboratory);
router.delete('/:id', deleteLaboratory);

// Dental Lab Cases workflow routes
router.post('/cases', createLabCase);
router.get('/cases', getLabCases);
router.get('/cases/patient/:patientId', getPatientLabCases);
router.get('/cases/:id', getLabCaseById);
router.put('/cases/:id', updateLabCase);
router.patch('/cases/:id/status', patchLabCaseStatus);
router.delete('/cases/:id', deleteLabCase);

export default router;
