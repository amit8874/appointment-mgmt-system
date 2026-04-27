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
  sendWhatsAppInvoice
} from '../controllers/billingController.js';

const router = express.Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticateToken);
router.use(requireTenant);

// GET all billing records
router.get('/', getAllBills);

// GET billing stats
router.get('/stats', getBillingStats);

// CREATE new POS bill (Fast checkout, stock deduction)
router.post('/pos', createPOSBill);

// CREATE new standard bill
router.post('/', createBill);

// UPDATE bill status
router.put('/:id', updateBillStatus);

// DELETE bill
router.delete('/:id', deleteBill);

// GET single bill by ID
router.get('/:id', getBillById);

// SEND Invoice via WhatsApp
router.post('/:id/send-whatsapp', sendWhatsAppInvoice);

export default router;
