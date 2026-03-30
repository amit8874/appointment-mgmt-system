import express from 'express';
import { getCouncils, createCouncil } from '../controllers/councilController.js';

const router = express.Router();

router.get('/', getCouncils);
router.post('/', createCouncil);

export default router;
