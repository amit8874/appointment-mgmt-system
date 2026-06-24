import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  getAllBills,
  getBillingStats,
  createBill,
  updateBillStatus,
  deleteBill,
  getBillById,
  createPOSBill,
  sendWhatsAppInvoice,
  sendEmailInvoice,
  getBillsByPatient,
  downloadInvoicePDF,
  updateBill,
  generatePatientStatement,
  sendWhatsAppStatement,
  getDailyCaseRegisterData,
  downloadDailyCaseRegisterPDF
} from '../controllers/billingController.js';

const router = express.Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticateToken);
router.use(requireTenant);

// GET all billing records
router.get('/', getAllBills);

// GET billing stats
router.get('/stats', getBillingStats);

// GET billing records for a specific patient
router.get('/patient/:patientId', getBillsByPatient);

// CREATE new POS bill (Fast checkout, stock deduction)
router.post('/pos', createPOSBill);

// CREATE new standard bill
router.post('/', createBill);

// UPDATE bill (Full update)
router.put('/:id', updateBill);

// DELETE bill
router.delete('/:id', deleteBill);

// GET Daily Case Register JSON data
router.get('/daily-case-register', getDailyCaseRegisterData);

// GET Daily Case Register PDF
router.get('/daily-case-register/pdf', downloadDailyCaseRegisterPDF);

// GET single bill by ID
router.get('/:id', getBillById);

// SEND Invoice via WhatsApp
router.post('/:id/send-whatsapp', sendWhatsAppInvoice);

// SEND Invoice via Email
router.post('/:id/send-email', sendEmailInvoice);

// GET/GENERATE Invoice PDF
router.get('/:id/pdf', downloadInvoicePDF);

// Patient Statement Routes
router.post('/patient/:patientId/statement', generatePatientStatement);
router.post('/patient/:patientId/statement/whatsapp', sendWhatsAppStatement);

export default router;
