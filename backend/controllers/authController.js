import jwt from 'jsonwebtoken';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { sanitizePhone } from '../utils/phoneUtils.js';
import User from '../models/User.js';

// In-memory store for OTPs (For production, use Redis or a DB)
const otpStore = new Map();

export const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Valid 10-digit phone number required' });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with timestamp (5 mins expiry)
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    // Sanitize phone for WhatsApp
    const sanitizedPhone = sanitizePhone(phone);

    // Send OTP via WhatsApp
    try {
      await sendWhatsAppMessage(
        sanitizedPhone, 
        `🔑 Your Slotify OTP is: ${otp}. Do not share it with anyone. Valid for 5 minutes.`
      );
      console.log(`[Auth] OTP for ${phone} sent via WhatsApp: ${otp}`);
    } catch (wsError) {
      console.error('[Auth] Failed to send WhatsApp OTP:', wsError.message);
      // Fallback for demo: just log it
    }

    res.json({ success: true, message: 'OTP sent successfully via WhatsApp', phone });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP required' });
    }

    const storedData = otpStore.get(phone);

    // Check if OTP exists and is not expired
    if (storedData && storedData.otp === otp && Date.now() < storedData.expiresAt) {
      // Clear OTP after successful use
      otpStore.delete(phone);

      // 1. Find or Create the User in database to avoid CastErrors later
      let user = await User.findOne({ mobile: phone });
      
      if (!user) {
        // Create a new patient user if they don't exist
        user = new User({
          name: `Patient ${phone.slice(-4)}`, // Placeholder name
          mobile: phone,
          role: 'patient',
          password: Math.random().toString(36).slice(-10), // Random password for OTP-only users
          organizationId: req.tenantId || null // Use tenant if available
        });
        await user.save();
        console.log(`[Auth] New user created via OTP: ${user._id}`);
      }

      // 2. Generate standard JWT token (matching userController format)
      const token = jwt.sign(
        { id: user._id, role: user.role, organizationId: user.organizationId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // 3. Send Success Message via WhatsApp as requested by user
      const sanitizedPhone = sanitizePhone(phone);
      try {
        await sendWhatsAppMessage(
          sanitizedPhone, 
          "Thank you for registering on slotify an Appointment Management Platform go and book you first appointment with th doctor ."
        );
      } catch (wsError) {
        console.error('[Auth] Failed to send Welcome WhatsApp:', wsError.message);
      }

      res.json({
        success: true,
        message: 'OTP verified successfully',
        token,
        user: { 
          _id: user._id, 
          mobile: user.mobile, 
          name: user.name,
          role: user.role,
          isVerified: true 
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const quickLogin = async (req, res) => {
  try {
    const { name, mobile } = req.body;

    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: 'Valid 10-digit phone number required' });
    }
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Find or Create User
    let user = await User.findOne({ mobile });

    if (!user) {
      user = new User({
        name,
        mobile,
        role: 'patient',
        password: Math.random().toString(36).slice(-10),
        organizationId: req.tenantId || null
      });
      await user.save();
      console.log(`[Auth] New patient user created via Quick Login: ${user._id}`);
    } else {
      // Update name if it's a patient and name was placeholder or missing
      if (user.role === 'patient' && (!user.name || user.name.startsWith('Patient '))) {
        user.name = name;
        await user.save();
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, organizationId: user.organizationId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Quick login successful',
      token,
      user: {
        _id: user._id,
        mobile: user.mobile,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error during quick login:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
