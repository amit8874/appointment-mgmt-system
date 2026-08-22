import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { sendWhatsAppTemplate } from '../services/whatsappService.js';
import { sanitizePhone } from '../utils/phoneUtils.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { parseUA } from '../utils/uaParser.js';
import Organization from '../models/Organization.js';

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

/**
 * Returns list of all clinics the logged-in user is associated with.
 */
export const getAssociatedClinics = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Combine all clinic organizations uniquely
    const clinicMap = new Map();

    // 1. Find all organizations owned by this user
    const ownedClinics = await Organization.find({ ownerId: user._id });
    ownedClinics.forEach(org => {
      clinicMap.set(org._id.toString(), {
        id: org._id,
        name: org.name,
        slug: org.slug,
        branding: org.branding,
        role: user.role
      });
    });

    // 2. If the user is staff (doctor/receptionist), find their current organization's owner
    // and include all clinics owned by that owner (sister clinics)
    const userOrgId = user.organizationId?._id || user.organizationId;
    if (userOrgId) {
      const currentOrg = await Organization.findById(userOrgId);
      if (currentOrg && currentOrg.ownerId) {
        const sisterClinics = await Organization.find({ ownerId: currentOrg.ownerId });
        sisterClinics.forEach(org => {
          clinicMap.set(org._id.toString(), {
            id: org._id,
            name: org.name,
            slug: org.slug,
            branding: org.branding,
            role: user.role // Keep the same staff role for sister clinics
          });
        });
      }
    }

    // 3. Find all user accounts with the same email or mobile (associated multi-accounts)
    const conditions = [];
    if (user.email) conditions.push({ email: user.email });
    if (user.mobile) conditions.push({ mobile: user.mobile });

    let associatedUsers = [];
    if (conditions.length > 0) {
      associatedUsers = await User.find({ $or: conditions }).populate('organizationId');
    }

    associatedUsers.forEach(u => {
      if (u.organizationId) {
        const org = u.organizationId;
        const orgIdStr = org._id.toString();
        if (!clinicMap.has(orgIdStr)) {
          clinicMap.set(orgIdStr, {
            id: org._id,
            name: org.name,
            slug: org.slug,
            branding: org.branding,
            role: u.role
          });
        }
      }
    });

    const clinicsList = Array.from(clinicMap.values());
    res.json({ success: true, clinics: clinicsList });
  } catch (error) {
    console.error('Error fetching associated clinics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Helper function to sync/clone staff from a source clinic to a target clinic
 */
const syncClinicStaff = async (sourceOrgId, targetOrgId) => {
  try {
    if (!sourceOrgId || !targetOrgId) {
      return;
    }

    const srcId = sourceOrgId._id ? sourceOrgId._id.toString() : sourceOrgId.toString();
    const tgtId = targetOrgId._id ? targetOrgId._id.toString() : targetOrgId.toString();

    if (srcId === tgtId) {
      return;
    }

    const DoctorModel = mongoose.model('Doctor');
    const ReceptionistModel = mongoose.model('Receptionist');
    const UserModel = mongoose.model('User');

    // 1. Sync Doctors
    const targetDoctorCount = await DoctorModel.countDocuments({ organizationId: tgtId });
    if (targetDoctorCount === 0) {
      const sourceDoctors = await DoctorModel.find({ organizationId: srcId });
      for (const doc of sourceDoctors) {
        const docData = doc.toObject();
        delete docData._id;
        delete docData.id;
        
        const newDoc = new DoctorModel({
          ...docData,
          organizationId: tgtId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await newDoc.save();
        console.log(`[Sync] Cloned doctor ${newDoc.name} from ${srcId} to ${tgtId}`);
      }
    }

    // 2. Sync Receptionists
    const targetRecepCount = await ReceptionistModel.countDocuments({ organizationId: tgtId });
    if (targetRecepCount === 0) {
      const sourceReceptionists = await ReceptionistModel.find({ organizationId: srcId });
      for (const recep of sourceReceptionists) {
        const recepData = recep.toObject();
        delete recepData._id;
        delete recepData.id;
        
        const newRecep = new ReceptionistModel({
          ...recepData,
          organizationId: tgtId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await newRecep.save();
        console.log(`[Sync] Cloned receptionist ${newRecep.name} from ${srcId} to ${tgtId}`);
      }
    }

    // 3. Sync Staff Users
    const sourceStaffUsers = await UserModel.find({
      organizationId: srcId,
      role: { $in: ['doctor', 'receptionist'] }
    });

    for (const staffUser of sourceStaffUsers) {
      const userExists = await UserModel.findOne({
        mobile: staffUser.mobile,
        organizationId: tgtId
      });
      
      if (!userExists) {
        const staffUserData = staffUser.toObject();
        delete staffUserData._id;
        delete staffUserData.id;
        
        const newStaffUser = new UserModel({
          ...staffUserData,
          organizationId: tgtId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await newStaffUser.save();
        console.log(`[Sync] Cloned staff user ${newStaffUser.name} to ${tgtId}`);
      }
    }
  } catch (err) {
    console.error('[Sync] Error syncing clinic staff:', err.message);
  }
};

/**
 * Switch session context to target clinic and return a new JWT token.
 */
export const switchClinic = async (req, res) => {
  try {
    const { targetOrganizationId } = req.body;
    const user = req.user;

    if (!targetOrganizationId) {
      return res.status(400).json({ message: 'Target organization ID is required' });
    }

    // 1. Verify access: Check if targetOrganizationId is owned by user, is a sister clinic, or has a matching user account
    const isOwner = await Organization.findOne({ _id: targetOrganizationId, ownerId: user._id });

    let isSisterClinic = false;
    const userOrgId = user.organizationId?._id || user.organizationId;
    if (userOrgId) {
      const currentOrg = await Organization.findById(userOrgId);
      if (currentOrg && currentOrg.ownerId) {
        const targetOrg = await Organization.findById(targetOrganizationId);
        if (targetOrg && targetOrg.ownerId && targetOrg.ownerId.toString() === currentOrg.ownerId.toString()) {
          isSisterClinic = true;
        }
      }
    }

    let matchingUser = null;
    if (!isOwner) {
      const conditions = [];
      if (user.email) conditions.push({ email: user.email });
      if (user.mobile) conditions.push({ mobile: user.mobile });

      if (conditions.length > 0) {
        matchingUser = await User.findOne({
          organizationId: targetOrganizationId,
          $or: conditions
        }).populate('organizationId');
      }
    }

    if (!isOwner && !isSisterClinic && !matchingUser) {
      return res.status(403).json({ message: 'Access denied to this clinic' });
    }

    // Dynamic Staff Sync (For existing branches that didn't get synced on creation)
    if (userOrgId) {
      await syncClinicStaff(userOrgId, targetOrganizationId);
    }

    // Re-verify matching user after syncing staff to ensure we get the correct newly cloned user account
    if (!isOwner && !matchingUser) {
      const conditions = [];
      if (user.email) conditions.push({ email: user.email });
      if (user.mobile) conditions.push({ mobile: user.mobile });

      if (conditions.length > 0) {
        matchingUser = await User.findOne({
          organizationId: targetOrganizationId,
          $or: conditions
        }).populate('organizationId');
      }
    }

    // 2. Determine target User document and target Role
    const targetUserId = matchingUser ? matchingUser._id : user._id;
    const targetRole = matchingUser ? matchingUser.role : user.role;

    // 3. Generate a new JWT token containing the target clinic organizationId
    const token = jwt.sign(
      { id: targetUserId, role: targetRole, organizationId: targetOrganizationId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 4. Create session tracking record
    try {
      await Session.create({
        userId: targetUserId,
        organizationId: targetOrganizationId,
        token: token,
        userAgent: req.get('User-Agent') || 'Unknown',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        deviceInfo: parseUA(req.get('User-Agent')),
        lastActive: new Date()
      });
    } catch (sessionError) {
      console.error('Failed to create session record on clinic switch:', sessionError);
    }

    // 5. Load organization info to return to the frontend
    const org = await Organization.findById(targetOrganizationId);
    
    const resolvedOrg = org ? {
      name: org.name,
      slug: org.slug,
      status: org.status,
      branding: org.branding,
      address: org.address,
      phone: org.phone,
      email: org.email,
      website: org.website || '',
      clinicType: org.clinicType,
      specialist: org.specialist,
      enabledModules: org.enabledModules
    } : null;

    res.json({
      success: true,
      message: 'Switched clinic successfully',
      token,
      user: {
        id: targetUserId,
        name: matchingUser ? matchingUser.name : user.name,
        mobile: matchingUser ? (matchingUser.mobile || org?.phone) : (user.mobile || org?.phone),
        email: matchingUser ? matchingUser.email : user.email,
        role: targetRole,
        organizationId: targetOrganizationId,
        organization: resolvedOrg
      }
    });

  } catch (error) {
    console.error('Error switching clinic:', error);
    res.status(500).json({ message: 'Internal server error during clinic switch' });
  }
};
