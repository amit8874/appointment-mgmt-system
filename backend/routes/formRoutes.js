import express from 'express';
import { saveFormData, getAllFormData } from '../controllers/formController.js';

const router = express.Router();

router.post("/", saveFormData);

// (Optional): GET: Fetch all form submissions

router.get("/", getAllFormData);

export default router;