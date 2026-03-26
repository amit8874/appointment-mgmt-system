import express from 'express';
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
  acceptBroadcastedOrder,
  getPharmacyPrescriptions,
  createPrescriptionQuote,
  getPatientPrescriptions,
  confirmPrescriptionOrder,
  getPharmacyProfile,
  updatePharmacyProfile,
  getPrescriptionOrderStatus,
  updatePrescriptionOrderStatus
} from '../controllers/pharmacyController.js';
import { authenticateToken, requirePharmacy } from '../middleware/auth.js';

const router = express.Router();

// Public/Patient Search
router.get('/medicines/search', searchMedicines);
router.post('/prescriptions/broadcast', broadcastPrescription);
router.get('/prescriptions/:id/status', getPrescriptionOrderStatus);
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
router.post('/prescriptions/:id/accept', acceptBroadcastedOrder);
router.get('/prescriptions/my-orders', getPharmacyPrescriptions);
router.post('/prescriptions/:id/quote', createPrescriptionQuote);

router.get('/dashboard/stats', getDashboardStats);

router.route('/inventory')
  .get(getInventory)
  .post(updateInventory);

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
