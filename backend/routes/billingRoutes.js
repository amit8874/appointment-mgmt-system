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
  getBillsByPatient,
  downloadInvoicePDF,
  updateBill,
  generatePatientStatement,
  sendWhatsAppStatement
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

// GET single bill by ID
router.get('/:id', getBillById);

// SEND Invoice via WhatsApp
router.post('/:id/send-whatsapp', sendWhatsAppInvoice);

// GET/GENERATE Invoice PDF
router.get('/:id/pdf', downloadInvoicePDF);

// Patient Statement Routes
router.post('/patient/:patientId/statement', generatePatientStatement);
router.post('/patient/:patientId/statement/whatsapp', sendWhatsAppStatement);

export default router;
