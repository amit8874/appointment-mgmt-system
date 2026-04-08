import express from 'express';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import {
  updatePatientProfile,
  getAllUsers,
  checkSession,
  getUser,
  signup,
  login,
  adminLogin,
  superAdminLogin,
  updateUserProfile,
  updateUserPassword,
  createAdmin,
  createUser,
  deleteUser,
  getUserSessions,
  revokeSession
} from '../controllers/userController.js';

const router = express.Router();

// NOTE: Apply authentication and tenant middleware to specific routes below
// rather than globally to avoid blocking public routes like login/signup

// Update patient profile (requires auth)
router.put('/patient/:id', authenticateToken, requireTenant, updatePatientProfile);

// @desc    Get all users (requires auth and tenant)
// @route   GET /api/users
router.get('/', authenticateToken, requireTenant, getAllUsers);

// @desc    Check if session is valid
// @route   GET /api/users/check-session
router.get('/check-session', authenticateToken, checkSession);

// Session Management
router.get('/me/sessions', authenticateToken, getUserSessions);
router.delete('/me/sessions/:sessionId', authenticateToken, revokeSession);

// @desc    Get single user (requires auth)
// @route   GET /api/users/:id
router.get('/:id', authenticateToken, getUser);

// @desc    Create new user (signup) - Only for patients and receptionists
// @route   POST /api/users/signup
router.post('/signup', signup);

// @desc    Login user
// @route   POST /api/users/login
router.post('/login', login);

// @desc    Admin login (email + password)
// @route   POST /api/users/admin-login
router.post('/admin-login', adminLogin);

// @desc    Super Admin login (email + password) - Only for superadmin role
// @route   POST /api/users/superadmin-login
router.post('/superadmin-login', superAdminLogin);

// @desc    Update user profile
// @route   PUT /api/users/:id
router.put('/:id', updateUserProfile);


// @desc    Update user password
// @route   PUT /api/users/:id/password
router.put('/:id/password', updateUserPassword);

// @desc    Create admin user (only for superadmin)
// @route   POST /api/users/create-admin
router.post('/create-admin', authenticateToken, requireSuperAdmin, createAdmin);

// @desc    Create new user (for admin/orgadmin)
// @route   POST /api/users/create-user
router.post('/create-user', authenticateToken, createUser);

// @desc    Delete user (Super admin, orgadmin, admin)
// @route   DELETE /api/users/:id
router.delete('/:id', authenticateToken, deleteUser);



export default router;
