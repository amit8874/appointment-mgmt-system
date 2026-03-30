import express from 'express';
import { getPractices, createPractice } from '../controllers/practiceController.js';

const router = express.Router();

router.get('/', getPractices);
router.post('/', createPractice);

export default router;
