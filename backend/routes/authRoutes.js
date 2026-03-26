import express from 'express';
import { sendOtp, verifyOtp } from '../controllers/authController.js';
import { login, signup, superAdminLogin, createUser, deleteUser, updateUserProfile, updateUserPassword } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/send-otp - Send OTP to phone number
router.post('/send-otp', sendOtp);

// POST /api/auth/verify-otp - Verify OTP
router.post('/verify-otp', verifyOtp);

// Alternative paths to bypass IIS issues with /api/users/
router.post('/login', login);
router.post('/signup', signup);
router.post('/superadmin-login', superAdminLogin);

router.post('/create-user', authenticateToken, createUser);
router.delete('/delete-user/:id', authenticateToken, deleteUser);

// Alternative update paths to bypass IIS issues with /api/users/ 405 error
router.put('/update-profile/:id', authenticateToken, updateUserProfile);
router.put('/update-password/:id', authenticateToken, updateUserPassword);

export default router;