import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  createEquipmentExpense,
  getEquipmentExpenses,
  updateEquipmentExpense,
  deleteEquipmentExpense,
  exportEquipmentExpensesPDF,
  createConsumerProductExpense,
  getConsumerProductExpenses,
  updateConsumerProductExpense,
  deleteConsumerProductExpense,
  exportConsumerProductExpensesPDF,
  createLabExpense,
  getLabExpenses,
  updateLabExpense,
  deleteLabExpense,
  exportLabExpensesPDF,
  createOtherExpense,
  getOtherExpenses,
  updateOtherExpense,
  deleteOtherExpense,
  exportOtherExpensesPDF,
  uploadExpenseRecord,
  getExpenseRecords,
  deleteExpenseRecord,
  getExpenseDashboardStats,
  getUnifiedExpenses,
  exportUnifiedExpensesPDF,
  getExpenseAnalytics
} from '../controllers/expenseController.js';

const router = express.Router();

router.get('/dashboard/stats', authenticateToken, requireTenant, getExpenseDashboardStats);
router.get('/unified', authenticateToken, requireTenant, getUnifiedExpenses);
router.get('/unified/export/pdf', authenticateToken, requireTenant, exportUnifiedExpensesPDF);
router.get('/analytics', authenticateToken, requireTenant, getExpenseAnalytics);

// ==========================================
// 1. DENTAL EQUIPMENT EXPENSES
// ==========================================
router.post('/equipment', authenticateToken, requireTenant, createEquipmentExpense);
router.get('/equipment', authenticateToken, requireTenant, getEquipmentExpenses);
router.put('/equipment/:id', authenticateToken, requireTenant, updateEquipmentExpense);
router.delete('/equipment/:id', authenticateToken, requireTenant, deleteEquipmentExpense);
router.get('/equipment/export/pdf', authenticateToken, requireTenant, exportEquipmentExpensesPDF);

// ==========================================
// 2. DENTAL CONSUMABLE PRODUCTS
// ==========================================
router.post('/consumer-products', authenticateToken, requireTenant, createConsumerProductExpense);
router.get('/consumer-products', authenticateToken, requireTenant, getConsumerProductExpenses);
router.put('/consumer-products/:id', authenticateToken, requireTenant, updateConsumerProductExpense);
router.delete('/consumer-products/:id', authenticateToken, requireTenant, deleteConsumerProductExpense);
router.get('/consumer-products/export/pdf', authenticateToken, requireTenant, exportConsumerProductExpensesPDF);

// ==========================================
// 3. DENTAL LAB EXPENSES
// ==========================================
router.post('/lab', authenticateToken, requireTenant, createLabExpense);
router.get('/lab', authenticateToken, requireTenant, getLabExpenses);
router.put('/lab/:id', authenticateToken, requireTenant, updateLabExpense);
router.delete('/lab/:id', authenticateToken, requireTenant, deleteLabExpense);
router.get('/lab/export/pdf', authenticateToken, requireTenant, exportLabExpensesPDF);

// ==========================================
// 3.1 OTHER / MORE CLINIC EXPENSES
// ==========================================
router.post('/other', authenticateToken, requireTenant, createOtherExpense);
router.get('/other', authenticateToken, requireTenant, getOtherExpenses);
router.put('/other/:id', authenticateToken, requireTenant, updateOtherExpense);
router.delete('/other/:id', authenticateToken, requireTenant, deleteOtherExpense);
router.get('/other/export/pdf', authenticateToken, requireTenant, exportOtherExpensesPDF);

// ==========================================
// 4. GENERAL EXPENSE FILE / IMAGE RECORDS
// ==========================================
router.post('/records', authenticateToken, requireTenant, uploadExpenseRecord);
router.get('/records', authenticateToken, requireTenant, getExpenseRecords);
router.delete('/records/:id', authenticateToken, requireTenant, deleteExpenseRecord);

export default router;
