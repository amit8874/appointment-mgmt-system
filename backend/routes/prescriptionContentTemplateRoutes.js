import express from 'express';
import { 
  createTemplate, 
  listTemplates, 
  deleteTemplate 
} from '../controllers/prescriptionContentTemplateController.js';
import { authenticateToken, requireAdminOrDoctor } from '../middleware/auth.js';

const router = express.Router();

// Protect all template content endpoints
router.use(authenticateToken);
router.use(requireAdminOrDoctor);

router.post('/', createTemplate);
router.get('/', listTemplates);
router.delete('/:id', deleteTemplate);

export default router;
