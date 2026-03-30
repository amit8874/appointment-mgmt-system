import express from 'express';
import { getSpecializations, createSpecialization } from '../controllers/specializationController.js';

const router = express.Router();

router.get('/', getSpecializations);
router.post('/', createSpecialization);

export default router;
