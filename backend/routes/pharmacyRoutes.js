import express from 'express';
import multer from 'multer';
import { 
  getDashboardStats, 
  getInventory, 
  updateInventory, 
  getOrders, 
  updateOrderStatus,
  createProduct,
  getProducts,
  searchMedicines,
  autoAssignOrder,
  broadcastPrescription,
  getBroadcastedOrders,
  getPharmacyPrescriptions,
  submitQuote,
  getQuotesForUser,
  selectQuote,
  getPatientPrescriptions,
  confirmPrescriptionOrder,
  getPharmacyProfile,
  updatePharmacyProfile,
  getPrescriptionOrderStatus,
  updatePrescriptionOrderStatus,
  cancelPrescriptionOrder,
  bulkUploadInventory,
  dispenseMedicine,
  getInventoryLogs,
  guestMobileLogin,
  getPharmacyAnalytics
} from '../controllers/pharmacyController.js';


import { authenticateToken, requirePharmacy } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public/Patient routes — no auth required (orderId acts as implicit auth for guests)
router.get('/medicines/search', searchMedicines);
router.post('/prescriptions/broadcast', broadcastPrescription);
router.get('/prescriptions/:id/status', getPrescriptionOrderStatus);
router.get('/prescriptions/:id/quotes', getQuotesForUser);
router.post('/prescriptions/:id/cancel', cancelPrescriptionOrder);
router.post('/prescriptions/:id/select-quote', selectQuote);
router.post('/guest-login', guestMobileLogin);
router.put('/prescriptions/:id/status', authenticateToken, updatePrescriptionOrderStatus);



// Auth required from here
router.use(authenticateToken);

// Patient/User: Auto-assign pharmacy
router.post('/auto-assign', autoAssignOrder);
router.get('/prescriptions/patient-orders', getPatientPrescriptions);
router.post('/prescriptions/:id/confirm', confirmPrescriptionOrder);


// The following routes are for users with 'pharmacy' role only
router.use(requirePharmacy);

// Pharmacy: Broadcasts & Prescriptions
router.get('/prescriptions/broadcasts', getBroadcastedOrders);
router.get('/prescriptions/my-orders', getPharmacyPrescriptions);
router.post('/prescriptions/:id/quote', submitQuote);


router.get('/dashboard/stats', getDashboardStats);
router.get('/analytics', getPharmacyAnalytics);

router.route('/inventory')
  .get(getInventory)
  .post(updateInventory);

router.get('/inventory/:productId/logs', getInventoryLogs);

router.post('/inventory/bulk-upload', upload.single('file'), bulkUploadInventory);
router.post('/inventory/dispense', dispenseMedicine);

router.route('/orders')
  .get(getOrders);

router.patch('/orders/:id/status', updateOrderStatus);

router.route('/products')
  .get(getProducts)
  .post(createProduct);

router.route('/profile')
  .get(getPharmacyProfile)
  .put(updatePharmacyProfile);

export default router;
