import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Patient from '../models/PaitentEditProfile.js';
import Receptionist from '../models/Receptionist.js';
import Notification from '../models/Notification.js';
import Organization from '../models/Organization.js';
import AuditLog from '../models/AuditLog.js';
import Session from '../models/Session.js';
import { parseUA } from '../utils/uaParser.js';
import { generatePatientId } from '../utils/idGenerator.js';

// Update patient profile (requires auth)
export const updatePatientProfile = async (req, res) => {
  try {
    const paitentId = req.params.id;
    const updateData = req.body;

    const updatePatient = await Patient.findOneAndUpdate(
      { _id: paitentId, organizationId: req.tenantId },
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatePatient) return res.status(404).json({ message: 'Patient not found' });

    res.json(updatePatient);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message })
  }
};

// Get all users (requires auth and tenant)
export const getAllUsers = async (req, res) => {
  try {
    let users;

    // For superadmin, return all users (no tenant filter)
    if (req.user && req.user.role === 'superadmin') {
      users = await User.find().select('-password');
    } else {
      // For other users, filter by organization
      users = await User.find({ organizationId: req.tenantId }).select('-password');
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check if session is valid
export const checkSession = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate({
        path: 'organizationId',
        populate: { path: 'subscriptionId' }
      });
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fallback for mobile
    const userObj = user.toObject();
    if ((user.role === 'orgadmin' || user.role === 'admin') && !user.mobile && user.organizationId) {
      userObj.mobile = user.organizationId.phone || '';
    }

    if (user.role === 'patient') {
      const patientProfile = await Patient.findOne({ 
        mobile: user.mobile, 
        organizationId: user.organizationId?._id || user.organizationId 
      });
      if (patientProfile) {
        userObj.patientProfileId = patientProfile._id;
        userObj.patientId = patientProfile.patientId;
      }
    }

    // Add standardized organization object for UI branding
    if (user.organizationId) {
      userObj.organization = {
        name: user.organizationId.name,
        slug: user.organizationId.slug,
        branding: user.organizationId.branding,
        phone: user.organizationId.phone,
        email: user.organizationId.email,
        plan: user.organizationId.subscriptionId?.plan || (user.organizationId.planType === 'PAID' ? 'basic' : 'free'),
        planName: user.organizationId.subscriptionId?.planName || (user.organizationId.planType === 'PAID' ? 'Active Plan' : 'Free Trial')
      };
    }

    res.json({ message: 'Session is valid', user: userObj });
  } catch (error) {
    console.error('Check session error:', error);
    res.status(500).json({ message: 'Error checking session' });
  }
};

// Get single user (requires auth)
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('organizationId', 'phone email address name branding');
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fallback for mobile if it's an orgadmin/admin and mobile is missing
    const userObj = user.toObject();
    if ((user.role === 'orgadmin' || user.role === 'admin') && !user.mobile && user.organizationId) {
      userObj.mobile = user.organizationId.phone || '';
    }

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new user (signup) - Only for patients and receptionists
export const signup = async (req, res) => {
  try {
    const { name, mobile, password, age, role, organizationId: bodyOrgId } = req.body;

    // 1. Initial Normalization & Validation
    const normalizedRole = String(role || 'patient').toLowerCase().trim();
    if (['admin', 'superadmin', 'orgadmin'].includes(normalizedRole)) {
      return res.status(403).json({ message: 'Admin accounts cannot be created through signup.' });
    }

    const trimmedName = String(name || '').trim();
    const rawMobile = String(mobile || '').trim();
    const trimmedPassword = String(password || '').trim();
    const ageNum = age !== undefined ? Number(age) : undefined;
    const targetOrgId = bodyOrgId || req.tenantId;

    if (!trimmedName || !rawMobile || !trimmedPassword) {
      return res.status(400).json({ message: 'Name, mobile, and password are required' });
    }

    // Robust mobile normalization: remove non-digits and take last 10 digits
    let normalizedMobile = rawMobile.replace(/\D/g, '');
    if (normalizedMobile.length > 10) {
      normalizedMobile = normalizedMobile.slice(-10);
    }

    if (normalizedMobile.length !== 10) {
      console.warn(`[Signup] Validation failed: Mobile ${rawMobile} normalized to ${normalizedMobile}`);
      return res.status(400).json({ message: 'Invalid mobile number. Please provide a 10-digit number.' });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }



    // 2. Check for existing user
    // In a multi-tenant system, a user might exist globally or per tenant.
    // Here we check globally first to see if they're trying to use a number already taken.
    const existingUser = await User.findOne({ mobile: normalizedMobile, organizationId: targetOrgId });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this mobile number is already registered in this organization.' });
    }

    // 3. Create User record
    const newUser = new User({
      name: trimmedName,
      mobile: normalizedMobile,
      password: trimmedPassword, // Model handles hashing
      role: normalizedRole,
      age: ageNum,
      organizationId: targetOrgId
    });

    await newUser.save();

    // 4. Create Profile Record
    try {
      if (normalizedRole === 'patient') {
        // Check if a patient already exists with this mobile number in the organization
        let patientProfile = await Patient.findOne({ mobile: normalizedMobile, organizationId: targetOrgId });

        if (patientProfile) {
          // If a patient profile exists, it might not be linked to this new user ID.
          // But our system currently expects Patient._id to be the user._id for some profile views.
          // However, we can't change Patient._id. So we update other fields to match User if needed.
          // For future, we should probably have a 'userId' field in Patient model.
          
          // For now, let's at least ensure the existing profile is used.
          // Note: If we need Patient._id to be User._id, we may need a migration or a change in how we query.
          // But preventing duplicates is the first priority.
          
          patientProfile.fullName = trimmedName;
          patientProfile.firstName = trimmedName.split(' ')[0] || trimmedName;
          patientProfile.lastName = trimmedName.split(' ').slice(1).join(' ') || '';
          patientProfile.age = ageNum;
          // Important: We don't change the patientId or _id here.
          await patientProfile.save();
        } else {
          // No existing patient, create a new one
          const patientId = await generatePatientId(targetOrgId);
          patientProfile = new Patient({
            organizationId: targetOrgId,
            patientId,
            firstName: trimmedName.split(' ')[0] || trimmedName,
            lastName: trimmedName.split(' ').slice(1).join(' ') || '',
            fullName: trimmedName,
            mobile: normalizedMobile,
            age: ageNum
          });
          await patientProfile.save();
        }
      } else if (normalizedRole === 'receptionist') {
        if (!targetOrgId) {
          await User.findByIdAndDelete(newUser._id);
          return res.status(400).json({ message: 'Organization context is required for receptionist signup.' });
        }
        const receptionistProfile = new Receptionist({
          organizationId: targetOrgId,
          receptionistId: `REC${newUser._id.toString().slice(-6).toUpperCase()}`,
          name: trimmedName,
          phone: normalizedMobile
        });
        await receptionistProfile.save();
      }
    } catch (profileError) {
      console.error('[Signup] Profile Creation Error, Rolling back user:', profileError);
      // Manual Rollback Strategy
      await User.findByIdAndDelete(newUser._id);
      throw profileError;
    }

    console.log(`[Signup] Successfully created user ${newUser._id}`);

    // 6. Generate JWT and Respond
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, organizationId: newUser.organizationId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        mobile: newUser.mobile,
        role: newUser.role,
        organizationId: newUser.organizationId
      }
    });

    // Fire-and-forget notification
    Notification.create({
      message: `New ${newUser.role} registered: ${newUser.name}`,
      type: 'info',
      category: 'user_registration',
      userId: newUser._id,
      organizationId: targetOrgId
    }).catch(err => console.error('[Signup] Notification error:', err.message));

  } catch (error) {
    console.error('[Signup] Critical Error:', error);

    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mobile number or email already in use.' });
    }
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
};

// Login user (Unified: supporting email or mobile)
export const login = async (req, res) => {
  try {
    const { identifier, password, role } = req.body; // 'identifier' can be email or mobile

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/Mobile and password are required' });
    }

    const trimmedPassword = String(password).trim();
    const normalizedRole = String(role || 'patient').toLowerCase().trim();

    // Check if identifier is email or mobile
    const isEmail = identifier.includes('@');
    let query = {};
    
    if (isEmail) {
      query = { email: identifier.trim().toLowerCase() };
    } else {
      // Normalize mobile: remove non-digits and take last 10 digits
      let normalizedMobile = identifier.replace(/\D/g, '');
      if (normalizedMobile.length > 10) {
        normalizedMobile = normalizedMobile.slice(-10);
      }
      if (normalizedMobile.length !== 10) {
        return res.status(400).json({ message: 'Invalid mobile number. Please provide a 10-digit number or valid email.' });
      }
      query = { mobile: normalizedMobile };
    }

    // 2. Prepare Role Filter
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

    // 3. Find User
    const user = await User.findOne({ ...query, ...roleFilter }).populate('organizationId');
    
    if (!user) {
      // If we didn't find a matching role, check if user exists at all with any role
      // to give a better error message (consistent with current UI)
      const anyUser = await User.findOne(query);
      if (anyUser) {
         return res.status(401).json({ 
           message: `Access denied. This account is registered as ${anyUser.role}.` 
         });
      }
      return res.status(401).json({ message: `Invalid ${isEmail ? 'email' : 'mobile number'} or password.` });
    }

    // 3. Verify Role
    // Handle role groups: 'staff' can be receptionist or admin (doctor)
    const userRole = user.role.toLowerCase().trim();
    let roleMatch = false;

    if (normalizedRole === 'staff') {
      roleMatch = ['receptionist', 'admin', 'doctor'].includes(userRole);
    } else if (normalizedRole === 'admin') {
      roleMatch = ['admin', 'orgadmin', 'superadmin', 'doctor'].includes(userRole);
    } else if (normalizedRole === 'pharmacy') {
      roleMatch = userRole === 'pharmacy';
    } else {
      roleMatch = userRole === normalizedRole;
    }

    if (!roleMatch) {
      console.log(`[Login] Role mismatch: User is ${user.role}, tried to login as ${normalizedRole}`);
      return res.status(401).json({ message: `Access denied. This account is registered as ${user.role}.` });
    }

    // 4. Verify Password
    const isMatch = await bcrypt.compare(trimmedPassword, user.password);
    if (!isMatch) {
      // Logic for old password check
      if (user.previousPasswordHashes?.length > 0) {
        for (const oldHash of user.previousPasswordHashes) {
          if (await bcrypt.compare(trimmedPassword, oldHash)) {
            const daysAgo = user.passwordLastChanged ?
              Math.floor((new Date() - new Date(user.passwordLastChanged)) / (1000 * 60 * 60 * 24)) : 'some';
            return res.status(401).json({
              message: `Your password was changed ${daysAgo} days ago. Please use your current password.`,
              isOldPassword: true
            });
          }
        }
      }
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // 5. Success - Generate Token & Respond
    const token = jwt.sign(
      { id: user._id, role: user.role, organizationId: user.organizationId?._id || user.organizationId || null },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Fetch patient info if it's a patient
    let patientId = null;
    let patientProfileId = null;
    if (user.role === 'patient') {
      const patientProfile = await Patient.findOne({ 
        mobile: user.mobile, 
        organizationId: user.organizationId?._id || user.organizationId 
      });
      if (patientProfile) {
        patientId = patientProfile.patientId;
        patientProfileId = patientProfile._id;
      }
    }

    // Filter sensitive data
    const userResponse = {
      id: user._id,
      name: user.name,
      mobile: user.mobile || (user.organizationId?.phone) || null,
      email: user.email,
      role: user.role,
      patientId: patientId, // The PATXXXX string
      patientProfileId: patientProfileId, // The MongoDB ObjectId
      organizationId: user.organizationId?._id || user.organizationId,
      organization: user.organizationId ? {
        name: user.organizationId.name,
        slug: user.organizationId.slug,
        status: user.organizationId.status,
        branding: user.organizationId.branding,
        address: user.organizationId.address,
        phone: user.organizationId.phone,
        email: user.organizationId.email
      } : null
    };

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('[Login] Critical Error:', error);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
};

// Admin login (email + password)
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = String(password).trim();



    const user = await User.findOne({ email: trimmedEmail });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    // Check if user has orgadmin role (clinic owner) - regular admin uses mobile login
    if (user.role !== 'orgadmin' && user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const isMatch = await bcrypt.compare(trimmedPassword, user.password);
    if (!isMatch) {
      // Check if it's an old password
      if (user.previousPasswordHashes && user.previousPasswordHashes.length > 0) {
        for (const oldHash of user.previousPasswordHashes) {
          const isOldMatch = await bcrypt.compare(trimmedPassword, oldHash);
          if (isOldMatch) {
            const daysAgo = Math.floor((new Date() - new Date(user.passwordLastChanged)) / (1000 * 60 * 60 * 24));
            return res.status(400).json({
              message: `Your password was changed ${daysAgo === 0 ? 'today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`}. If you didn't change it, please contact support.`,
              isOldPassword: true
            });
          }
        }
      }
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Populate organization info for tenant isolation
    try {
      await user.populate({
        path: 'organizationId',
        populate: { path: 'subscriptionId' }
      });
    } catch (populateError) {
      console.error('Error populating organization:', populateError);
      // Continue without organization data if populate fails
    }

    // Generate JWT token - include organizationId for context
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
      // Don't block login if session tracking fails
    }

    res.json({
      message: 'Admin login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || (user.organizationId?.phone) || null,
        role: user.role,
        organizationId: user.organizationId?._id || user.organizationId,
        organization: user.organizationId ? {
          name: user.organizationId.name,
          slug: user.organizationId.slug,
          subdomain: user.organizationId.subdomain,
          branding: user.organizationId.branding,
          address: user.organizationId.address,
          phone: user.organizationId.phone,
          email: user.organizationId.email,
          plan: user.organizationId.subscriptionId?.plan || (user.organizationId.planType === 'PAID' ? 'basic' : 'free'),
          planName: user.organizationId.subscriptionId?.planName || (user.organizationId.planType === 'PAID' ? 'Active Plan' : 'Free Trial')
        } : null
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    // Provide more specific error message based on error type
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid input data: ' + error.message });
    } else if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid data format' });
    } else if (error.name === 'MongoError' || error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate entry' });
    }
    res.status(500).json({ message: 'Server error during login. Please try again later.' });
  }
};

// Super Admin login (email + password) - Only for superadmin role
export const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = String(password).trim();



    const user = await User.findOne({ email: trimmedEmail });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    // Only allow superadmin role
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
    }

    const isMatch = await bcrypt.compare(trimmedPassword, user.password);
    if (!isMatch) {
      // Check if it's an old password
      if (user.previousPasswordHashes && user.previousPasswordHashes.length > 0) {
        for (const oldHash of user.previousPasswordHashes) {
          const isOldMatch = await bcrypt.compare(trimmedPassword, oldHash);
          if (isOldMatch) {
            const daysAgo = Math.floor((new Date() - new Date(user.passwordLastChanged)) / (1000 * 60 * 60 * 24));
            return res.status(400).json({
              message: `Your password was changed ${daysAgo === 0 ? 'today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`}. If you didn't change it, please contact support.`,
              isOldPassword: true
            });
          }
        }
      }
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Create a new session tracking record
    try {
      await Session.create({
        userId: user._id,
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
      message: 'Super Admin login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Super Admin login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { password, ...updateData } = req.body; // Exclude password from update

    // Filter out undefined values to avoid overwriting with undefined
    const filteredUpdateData = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && value !== null && value !== '') {
        filteredUpdateData[key] = value;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      filteredUpdateData,
      { new: true, runValidators: true }
    ).populate('organizationId', 'phone email address name branding');
    
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    // Fallback for mobile
    const userObj = updatedUser.toObject();
    if ((updatedUser.role === 'orgadmin' || updatedUser.role === 'admin') && !updatedUser.mobile && updatedUser.organizationId) {
      userObj.mobile = updatedUser.organizationId.phone || '';
    }
    
    // Log the update
    await AuditLog.create({
      adminId: req.user.id,
      organizationId: updatedUser.organizationId?._id || updatedUser.organizationId,
      action: 'UPDATE_PROFILE',
      targetType: 'User',
      targetId: updatedUser._id,
      details: { updatedFields: Object.keys(filteredUpdateData) },
      ipAddress: req.ip
    });

    res.json(userObj);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ message: error.message });
  }
};


// Update user password
export const updateUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    // Store old hash in history (keep last 5)
    if (!user.previousPasswordHashes) user.previousPasswordHashes = [];
    user.previousPasswordHashes.unshift(user.password);
    if (user.previousPasswordHashes.length > 5) {
      user.previousPasswordHashes = user.previousPasswordHashes.slice(0, 5);
    }

    user.password = newPassword; // Let User model pre-save hook handle hashing
    user.passwordLastChanged = new Date();
    await user.save();

    // Log the password change
    await AuditLog.create({
      adminId: req.user.id,
      organizationId: user.organizationId,
      action: 'PASSWORD_CHANGE',
      targetType: 'User',
      targetId: user._id,
      ipAddress: req.ip
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Create admin user (only for superadmin)
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, organizationId } = req.body;

    // 1. Authorization Check
    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Only super admins can create clinic administrators.' });
    }

    // 2. Validation & Normalization
    const trimmedName = String(name || '').trim();
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const trimmedPassword = String(password || '').trim();
    const targetOrgId = organizationId || req.tenantId;

    if (!trimmedName || !trimmedEmail || !trimmedPassword || !targetOrgId) {
      return res.status(400).json({ message: 'Name, email, password, and organization context are required' });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    console.log(`[CreateAdmin] Attempt for ${trimmedEmail}`);

    // 3. Check for existing user
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    const newAdmin = new User({
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword,
      role: 'admin',
      organizationId: targetOrgId
    });

    await newAdmin.save();
    console.log(`[CreateAdmin] Successfully created: ${newAdmin._id}`);

    res.status(201).json({
      message: 'Admin created successfully',
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error('[CreateAdmin] Critical Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email address already in use.' });
    }
    res.status(500).json({ message: 'Internal server error during admin creation.' });
  }
};

// Create generic user (for admin/orgadmin/superadmin)
export const createUser = async (req, res) => {
  try {
    const { name, mobile, password, role, age, gender, patientObjectId } = req.body;

    // 1. Authorization Check
    if (!req.user || !['admin', 'orgadmin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only administrators can create users.' });
    }

    // 2. Identify Target Organization
    let organizationId = req.user.organizationId?._id || req.user.organizationId || req.tenantId;

    // Fallback for orgadmin who might not have organizationId on their user object yet
    if (!organizationId && (req.user.role === 'orgadmin' || req.user.role === 'admin')) {
      const Organization = mongoose.model('Organization');
      const ownedOrg = await Organization.findOne({ ownerId: req.user._id });
      organizationId = ownedOrg?._id;
    }

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization context not found. Cannot create user.' });
    }

    // 3. Validation & Normalization
    const trimmedName = String(name || '').trim();
    const rawMobile = String(mobile || '').trim();
    const trimmedPassword = String(password || '').trim();
    const targetRole = String(role || 'receptionist').toLowerCase();

    if (!['doctor', 'receptionist', 'patient'].includes(targetRole)) {
      return res.status(400).json({ message: 'Invalid role. Supported roles are doctor, receptionist, and patient.' });
    }

    if (!trimmedName || !rawMobile || !trimmedPassword) {
      return res.status(400).json({ message: 'Name, mobile, and password are required' });
    }

    // Robust mobile normalization: remove non-digits and take last 10 digits
    let normalizedMobile = rawMobile.replace(/\D/g, '');
    if (normalizedMobile.length > 10) {
      normalizedMobile = normalizedMobile.slice(-10);
    }

    if (normalizedMobile.length !== 10) {
      return res.status(400).json({ message: 'Invalid mobile number. Please provide a 10-digit number.' });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // 4. Check for conflicts
    const existingUser = await User.findOne({ mobile: normalizedMobile, organizationId });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this mobile number is already registered in this organization.' });
    }

    // 5. Atomic Creation
    const newUser = new User({
      name: trimmedName,
      mobile: normalizedMobile,
      password: trimmedPassword,
      role: targetRole,
      age: age || undefined,
      gender: gender || undefined,
      organizationId
    });
    
    await newUser.save();

    try {
      if (targetRole === 'receptionist') {
        const receptionistProfile = new Receptionist({
          organizationId,
          receptionistId: `REC${newUser._id.toString().slice(-6).toUpperCase()}`,
          name: trimmedName,
          phone: normalizedMobile
        });
        await receptionistProfile.save();
      } else if (targetRole === 'doctor') {
        const Doctor = mongoose.model('Doctor');
        const doctorProfile = new Doctor({
          organizationId,
          doctorId: `DOC${newUser._id.toString().slice(-6).toUpperCase()}`,
          name: trimmedName,
          phone: normalizedMobile,
          specialization: 'General', // Default, can be updated later
          status: 'Active'
        });
        await doctorProfile.save();
      } else if (targetRole === 'patient') {
        // Find existing patient by provided ID or mobile
        let patientProfile;
        if (patientObjectId) {
          patientProfile = await Patient.findOne({ _id: patientObjectId, organizationId });
        } else {
          patientProfile = await Patient.findOne({ mobile: normalizedMobile, organizationId });
        }

        if (patientProfile) {
          patientProfile.fullName = trimmedName;
          patientProfile.firstName = trimmedName.split(' ')[0] || trimmedName;
          patientProfile.lastName = trimmedName.split(' ').slice(1).join(' ') || '';
          if (age) patientProfile.age = age;
          if (gender) patientProfile.gender = gender;
          await patientProfile.save();
        } else {
          const patientId = await generatePatientId(organizationId);
          patientProfile = new Patient({
            organizationId,
            patientId,
            firstName: trimmedName.split(' ')[0] || trimmedName,
            lastName: trimmedName.split(' ').slice(1).join(' ') || '',
            fullName: trimmedName,
            mobile: normalizedMobile,
            age,
            gender
          });
          await patientProfile.save();
        }
      }
    } catch (profileError) {
      console.error('[CreateUser] Profile Creation Error, Rolling back user:', profileError);
      await User.findByIdAndDelete(newUser._id);
      throw profileError;
    }

    // 6. Respond
    res.status(201).json({
      message: `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} created successfully`,
      user: {
        id: newUser._id,
        name: newUser.name,
        mobile: newUser.mobile,
        role: newUser.role,
        organizationId: newUser.organizationId
      }
    });

  } catch (error) {
    console.error('[CreateUser] Critical Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mobile number already in use.' });
    }
    res.status(500).json({ message: 'Internal server error during user creation.' });
  }
};

// Delete user (Super admin, orgadmin, admin)
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent super admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Find the user to check their role
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check permission based on role
    const currentUserRole = req.user.role;
    const userToDeleteRole = userToDelete.role;
    const userTenantId = userToDelete.organizationId?.toString();
    const currentTenantId = req.tenantId?.toString();

    console.log(`[DeleteUser] Attempt by ${req.user.name} (${currentUserRole}, Org: ${currentTenantId}) to delete ${userToDelete.name} (${userToDeleteRole}, Org: ${userTenantId})`);

    // Superadmin can delete anyone except themselves and other superadmins
    if (currentUserRole === 'superadmin') {
      if (userToDeleteRole === 'superadmin') {
        return res.status(403).json({ message: 'Cannot delete superadmin' });
      }
    }
    // Orgadmin/Admin can delete staff within their organization
    else if (currentUserRole === 'orgadmin' || currentUserRole === 'admin') {
      // Permission restriction
      if (!['receptionist', 'doctor', 'patient'].includes(userToDeleteRole)) {
        console.warn(`[DeleteUser] Forbidden: Role mismatch. ${currentUserRole} tried to delete ${userToDeleteRole}`);
        return res.status(403).json({ message: 'Can only delete staff or patient users' });
      }
      
      // Organization restriction
      if (userTenantId !== currentTenantId) {
        console.warn(`[DeleteUser] Forbidden: Org mismatch. Current: ${currentTenantId}, Target: ${userTenantId}`);
        return res.status(403).json({ message: 'Cannot delete user from different organization' });
      }
    }
    else {
      console.warn(`[DeleteUser] Forbidden: User role ${currentUserRole} has no deletion privileges`);
      return res.status(403).json({ message: 'Not authorized to delete users' });
    }

    // Cascading deletion for specialized profiles
    try {
      if (userToDeleteRole === 'doctor') {
        const Doctor = mongoose.model('Doctor');
        await Doctor.deleteOne({ $or: [{ doctorId: userId }, { _id: userId }, { mobile: userToDelete.mobile, organizationId: userToDelete.organizationId }] });
      } else if (userToDeleteRole === 'receptionist') {
        const Receptionist = mongoose.model('Receptionist');
        await Receptionist.deleteOne({ $or: [{ receptionistId: userId }, { _id: userId }, { phone: userToDelete.mobile, organizationId: userToDelete.organizationId }] });
      } else if (userToDeleteRole === 'patient') {
        const Patient = mongoose.model('Patient');
        await Patient.deleteOne({ $or: [{ patientId: userId }, { _id: userId }, { mobile: userToDelete.mobile, organizationId: userToDelete.organizationId }] });
      }
    } catch (profileDelError) {
      console.warn('[DeleteUser] Associated profile deletion failed or not found:', profileDelError.message);
    }

    await User.findByIdAndDelete(userId);
    console.log(`[DeleteUser] Successfully deleted user ${userId} and their associated profile`);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[DeleteUser] Critical Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET Current User Sessions
export const getUserSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ 
      userId: req.user.id,
      isRevoked: false 
    }).sort({ lastActive: -1 });

    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.split(' ')[1];

    res.json(sessions.map(session => ({
      id: session._id,
      device: session.deviceInfo || 'Unknown Device',
      ip: session.ipAddress || '0.0.0.0',
      lastActive: session.lastActive,
      isCurrent: session.token === currentToken
    })));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
};

// Revoke a specific session
export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ _id: sessionId, userId: req.user.id });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.isRevoked = true;
    await session.save();

    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ message: 'Failed to revoke session' });
  }
};
