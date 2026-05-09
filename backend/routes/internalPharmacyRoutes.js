import express from 'express';
import multer from 'multer';
import {
  getPharmacyDashboard,
  getAllMedicines,
  getFullInventory,
  addMedicine,
  updateMedicine,
  bulkUploadMedicines,
  addOpeningStock,
  createPurchase,
  createPharmacyBill,
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  getPharmacyReports
} from '../controllers/InternalPharmacyController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

router.get('/dashboard', getPharmacyDashboard);
router.get('/medicines/all', getAllMedicines);
router.get('/inventory', getFullInventory);
router.post('/medicine', addMedicine);
router.put('/medicine/:id', updateMedicine);
router.post('/inventory/bulk-upload', upload.single('file'), bulkUploadMedicines);
router.post('/inventory/opening-stock', addOpeningStock);
router.post('/purchase', createPurchase);
router.post('/billing', createPharmacyBill);
router.get('/suppliers', getSuppliers);
router.post('/suppliers', addSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);
router.get('/reports', getPharmacyReports);

export default router;
