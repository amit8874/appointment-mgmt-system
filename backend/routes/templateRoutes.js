import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  setDefaultTemplate,
  deleteTemplate,
  seedTemplates
} from '../controllers/templateController.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireTenant);

// Template Management
router.get('/', getTemplates);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.put('/:id/default', setDefaultTemplate);
router.delete('/:id', deleteTemplate);

// Seed initial templates
router.post('/seed', seedTemplates);

export default router;
