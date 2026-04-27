import jwt from 'jsonwebtoken';
import { sendWhatsAppTemplate } from '../services/whatsappService.js';
import { sanitizePhone } from '../utils/phoneUtils.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { parseUA } from '../utils/uaParser.js';

// In-memory store for OTPs (For production, use Redis or a DB)
const otpStore = new Map();

export const sendOtp = async (req, res) => {
  try {
    const { phone, role } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Valid 10-digit phone number required' });
    }

    // Optional: Check if user exists for this role to avoid sending OTP to wrong person
    if (role) {
      const normalizedRole = String(role).toLowerCase().trim();
      let roleFilter = {};
      
      if (normalizedRole === 'staff') {
        roleFilter = { role: { $in: ['receptionist', 'admin', 'doctor'] } };
      } else if (normalizedRole === 'admin') {
        roleFilter = { role: { $in: ['admin', 'orgadmin', 'superadmin', 'doctor'] } };
      } else if (normalizedRole === 'pharmacy') {
        roleFilter = { role: 'pharmacy' };
      } else if (normalizedRole === 'patient') {
        roleFilter = { role: 'patient' };
      }

      const userExists = await User.findOne({ mobile: phone, ...roleFilter });
      if (!userExists && normalizedRole !== 'patient') {
        return res.status(404).json({ message: `No ${role} account found with this mobile number.` });
      }
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with timestamp (5 mins expiry)
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    // Sanitize phone for WhatsApp
    const sanitizedPhone = sanitizePhone(phone);

    const appName = process.env.APP_NAME || 'Oviaan';

    // Send OTP via WhatsApp Template
    try {
      const otpTemplate = process.env.WHATSAPP_OTP_TEMPLATE || 'registration_otp';
      const otpLang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || 'en';
      
      const response = await sendWhatsAppTemplate(
        sanitizedPhone, 
        otpTemplate,
        otpLang,
        [otp],
        [otp]
      );
      
      console.log(`[Auth] OTP for ${phone} sent via WhatsApp Template: ${otp}`);
      
      // Return success only if Meta response contains message ID
      if (response && response.messages && response.messages[0] && response.messages[0].id) {
        return res.json({ 
          success: true, 
          message: 'OTP sent successfully via WhatsApp', 
          phone,
          wamid: response.messages[0].id 
        });
      } else {
        console.error('[Auth] Meta API success but no message ID returned:', response);
        return res.status(500).json({ message: 'Failed to deliver WhatsApp message' });
      }
    } catch (wsError) {
      console.error('[Auth] Failed to send WhatsApp OTP Template:', wsError.response?.data || wsError.message);
      return res.status(500).json({ message: 'Failed to send WhatsApp OTP. Please try again.' });
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, role } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP required' });
    }

    const storedData = otpStore.get(phone);

    // Check if OTP exists and is not expired
    if (storedData && storedData.otp === otp && Date.now() < storedData.expiresAt) {
      // Clear OTP after successful use
      otpStore.delete(phone);

      const normalizedRole = String(role || 'patient').toLowerCase().trim();
      let roleFilter = {};
      
      if (normalizedRole === 'staff') {
        roleFilter = { role: { $in: ['receptionist', 'admin', 'doctor'] } };
      } else if (normalizedRole === 'admin') {
        roleFilter = { role: { $in: ['admin', 'orgadmin', 'superadmin', 'doctor'] } };
      } else if (normalizedRole === 'pharmacy') {
        roleFilter = { role: 'pharmacy' };
      } else if (normalizedRole === 'patient') {
        roleFilter = { role: 'patient' };
      }

      // 1. Find the User with the specific role
      let user = await User.findOne({ mobile: phone, ...roleFilter }).populate('organizationId');
      
      if (!user) {
        // IMPORTANT: Check if the user exists with ANY role before creating a new patient
        const existingAnyRoleBody = await User.findOne({ mobile: phone });
        
        if (existingAnyRoleBody) {
          return res.status(401).json({ 
            success: false, 
            message: `Access denied. This account is registered as ${existingAnyRoleBody.role}. Please switch to the correct tab (User/Staff/Admin) to log in.` 
          });
        }

        // If no user at all exists, and it's a patient, create them
        if (normalizedRole === 'patient') {
          user = new User({
            name: `Patient ${phone.slice(-4)}`,
            mobile: phone,
            role: 'patient',
            password: Math.random().toString(36).slice(-10),
            organizationId: req.tenantId || null
          });
          await user.save();
          console.log(`[Auth] New patient user created via OTP: ${user._id}`);
        } else {
          // For other roles, they MUST exist
          return res.status(404).json({ success: false, message: 'Account not found for this role.' });
        }
      }

      // 2. Generate standard JWT token
      const token = jwt.sign(
        { id: user._id, role: user.role, organizationId: user.organizationId?._id || user.organizationId || null },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Create a new session tracking record
      try {
        await Session.create({
          userId: user._id,
          organizationId: user.organizationId?._id || user.organizationId || null,
          token: token,
          userAgent: req.get('User-Agent') || 'Unknown',
          ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          deviceInfo: parseUA(req.get('User-Agent')),
          lastActive: new Date()
        });
      } catch (sessionError) {
        console.error('Failed to create session record:', sessionError);
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
          organizationId: user.organizationId?._id || user.organizationId || null,
          organization: user.organizationId ? {
            name: user.organizationId.name,
            branding: user.organizationId.branding,
            slug: user.organizationId.slug
          } : null,
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

    // Create a new session tracking record
    try {
      await Session.create({
        userId: user._id,
        organizationId: user.organizationId || null,
        token: token,
        userAgent: req.get('User-Agent') || 'Unknown',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        deviceInfo: parseUA(req.get('User-Agent')),
        lastActive: new Date()
      });
    } catch (sessionError) {
      console.error('Failed to create session record:', sessionError);
    }

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
