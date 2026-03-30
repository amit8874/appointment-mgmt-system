import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  getProducts,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireTenant);

// Product CRUD
router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Specialized Barcode Lookup
router.get('/barcode/:barcode', getProductByBarcode);

export default router;
