import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  getDentistDashboard,
  getPatientTreatments,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  getToothChart,
  getPatientImages,
  uploadDentalImage,
  deleteDentalImage,
  getCustomProcedures,
  createCustomProcedure
} from '../controllers/dentistController.js';
import {
  createDentalQuotation,
  getPatientQuotations,
  getQuotationById,
  updateDentalQuotation,
  deleteDentalQuotation,
  convertQuotationToPlan,
  downloadQuotationPDF,
  sendQuotationWhatsApp
} from '../controllers/dentalQuotationController.js';

const router = express.Router();

// Apply auth and multi-tenancy middleware
router.use(authenticateToken);
router.use(requireTenant);

// Dashboard stats route
router.get('/dashboard', getDentistDashboard);

// Tooth treatments CRUD
router.get('/patient/:patientId/treatments', getPatientTreatments);
router.post('/patient/:patientId/treatments', createTreatment);
router.put('/treatments/:treatmentId', updateTreatment);
router.delete('/treatments/:treatmentId', deleteTreatment);

// Dental Quotations / Treatment Estimates CRUD & Actions
router.get('/patient/:patientId/quotations', getPatientQuotations);
router.post('/patient/:patientId/quotations', createDentalQuotation);
router.get('/quotations/:id', getQuotationById);
router.put('/quotations/:id', updateDentalQuotation);
router.delete('/quotations/:id', deleteDentalQuotation);
router.post('/quotations/:id/convert-to-plan', convertQuotationToPlan);
router.get('/quotations/:id/pdf', downloadQuotationPDF);
router.post('/quotations/:id/whatsapp', sendQuotationWhatsApp);

// Chart log aggregation
router.get('/patient/:patientId/chart', getToothChart);

// Patient visual image library
router.get('/patient/:patientId/images', getPatientImages);
router.post('/patient/:patientId/images', uploadDentalImage);
router.delete('/images/:imageId', deleteDentalImage);

// Custom persistent procedure master list
router.get('/procedures', getCustomProcedures);
router.post('/procedures', createCustomProcedure);

export default router;
