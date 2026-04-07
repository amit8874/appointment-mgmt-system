import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


// Register a new organization (onboarding)
export const registerOrganization = async (req, res) => {
  try {
    console.log('Organization registration request:', { ...req.body, ownerPassword: '***' });
    
    const {
      name,
      email,
      phone,
      address,
      ownerName,
      ownerEmail,
      ownerPassword,
      subdomain,
      plan,
    } = req.body;


    // Validate required fields with detailed error messages
    const missingFields = [];
    if (!name || !name.trim()) missingFields.push('name');
    if (!email || !email.trim()) missingFields.push('email');
    if (!ownerName || !ownerName.trim()) missingFields.push('ownerName');
    if (!ownerEmail || !ownerEmail.trim()) missingFields.push('ownerEmail');
    if (!ownerPassword || !ownerPassword.trim()) missingFields.push('ownerPassword');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid organization email format' });
    }
    if (!emailRegex.test(ownerEmail)) {
      return res.status(400).json({ message: 'Invalid owner email format' });
    }

    // Check if organization with email or subdomain already exists
    const existingOrg = await Organization.findOne({
      $or: [
        { email: email.toLowerCase().trim() }, 
        { subdomain: subdomain?.toLowerCase().trim() }
      ]
    });

    if (existingOrg) {
      return res.status(400).json({ 
        message: 'Organization with this email or subdomain already exists',
        existing: existingOrg.email === email.toLowerCase() ? 'email' : 'subdomain'
      });
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({ 
      email: ownerEmail.toLowerCase().trim() 
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create organization owner user (without organizationId initially)
    // organizationId will be set after organization is created
    const owner = new User({
      name: ownerName.trim(),
      email: ownerEmail.toLowerCase().trim(),
      password: ownerPassword,
      plainPassword: ownerPassword, // Store plain password for super admin viewing
      role: 'orgadmin',
      mobile: phone?.trim() || '',
      // organizationId will be set after organization creation
    });

    try {
      await owner.save();
    } catch (userError) {
      console.error('User creation error:', userError);
      if (userError.code === 11000) {
        // Duplicate key error
        if (userError.keyPattern?.email) {
          return res.status(400).json({ message: 'User with this email already exists' });
        }
        if (userError.keyPattern?.mobile) {
          // This shouldn't happen for orgadmin, but handle it
          return res.status(400).json({ message: 'Mobile number conflict. Please contact support.' });
        }
        return res.status(400).json({ message: 'User with this information already exists' });
      }
      if (userError.message.includes('email')) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      if (userError.message.includes('password')) {
        return res.status(400).json({ message: userError.message });
      }
      if (userError.name === 'ValidationError') {
        const validationErrors = Object.values(userError.errors).map(err => err.message);
        return res.status(400).json({ message: `Validation error: ${validationErrors.join(', ')}` });
      }
      throw userError;
    }

    // Generate slug from name if subdomain not provided, otherwise use subdomain as slug
    let generatedSlug = '';
    if (subdomain && subdomain.trim()) {
      generatedSlug = subdomain.toLowerCase().trim();
    } else {
      // Generate from name
      generatedSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    
    // Ensure slug uniqueness
    const existingSlug = await Organization.findOne({ slug: generatedSlug });
    if (existingSlug) {
      generatedSlug = `${generatedSlug}-${Date.now()}`;
    }

    // Create organization
    const organization = new Organization({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      address: address || {},
      ownerId: owner._id,
      slug: generatedSlug,
      subdomain: subdomain?.toLowerCase().trim() || generatedSlug,
      status: 'trial',
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      trialDays: 14,
      isTrialActive: true,
      planType: 'FREE_TRIAL', // Explicitly mark as Free Trial for auto-reset
    });

    try {
      await organization.save();
    } catch (orgError) {
      console.error('Organization creation error:', orgError);
      // If organization creation fails, delete the user
      await User.findByIdAndDelete(owner._id);
      
      if (orgError.message.includes('slug') || orgError.message.includes('subdomain')) {
        return res.status(400).json({ message: 'Organization slug or subdomain already exists. Please choose a different one.' });
      }
      throw orgError;
    }

    // Create subscription based on chosen plan - strictly default to 'free'
    const chosenPlan = plan || 'free';
    const isFree = chosenPlan === 'free';
    
    const subscription = new Subscription({
      organizationId: organization._id,
      plan: chosenPlan,
      planName: isFree ? 'Free Trial' : `${chosenPlan.charAt(0).toUpperCase() + chosenPlan.slice(1)} Plan`,
      status: 'trial',
      startDate: new Date(),
      trialEndDate: organization.trialEndDate,
      limits: Subscription.getPlanLimits(chosenPlan),
    });


    await subscription.save();

    // Update organization with subscription
    organization.subscriptionId = subscription._id;
    await organization.save();


    // Generate JWT token for auto-login
    const token = jwt.sign(
      { id: owner._id, role: owner.role, organizationId: organization._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Organization registered successfully',
      token,
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        subdomain: organization.subdomain,
        status: organization.status,
        trialStartDate: organization.trialStartDate,
        trialEndDate: organization.trialEndDate,
      },
      owner: {
        id: owner._id,
        email: owner.email,
        role: owner.role,
        name: owner.name,
      },
    });

  } catch (error) {
    console.error('Organization registration error:', error);
    
    // Provide more detailed error messages
    let errorMessage = 'Registration failed. Please try again.';
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      errorMessage = `Validation error: ${validationErrors.join(', ')}`;
    } else if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      errorMessage = `${field} already exists. Please choose a different ${field}.`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all active organizations (Public)
export const getPublicOrganizations = async (req, res) => {
  try {
    const query = { status: 'active' };

    // Also include 'trial' status organizations since they are operational
    const organizations = await Organization.find({ 
      $or: [{ status: 'active' }, { status: 'trial' }] 
    })
      .select('_id name slug subdomain phone address branding status')
      .sort({ name: 1 });

    res.json(organizations);
  } catch (error) {
    console.error('Get public organizations error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all organizations (Super Admin only)
export const getOrganizations = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    const organizations = await Organization.find(query)
      .populate('ownerId', 'name email')
      .populate('subscriptionId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Organization.countDocuments(query);

    res.json({
      organizations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get organization by ID
export const getOrganization = async (req, res) => {
  try {
    // Superadmin can access any organization
    // Any user (orgadmin, receptionist, doctor, patient) can access their own organization
    const userOrgId = req.user.organizationId?._id ? req.user.organizationId._id.toString() : req.user.organizationId?.toString();
    
    if (req.user.role === 'superadmin' || userOrgId === req.params.id) {
      const organization = await Organization.findById(req.params.id)
        .populate('ownerId', 'name email')
        .populate('subscriptionId');
      
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      return res.json(organization);
    }

    res.status(403).json({ message: 'Access denied. You do not have permission to view this organization.' });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update organization
export const updateOrganization = async (req, res) => {
  try {
    let organization;

    const userOrgId = req.user.organizationId?._id ? req.user.organizationId._id.toString() : req.user.organizationId?.toString();
    if (req.user.role === 'superadmin') {
      organization = await Organization.findById(req.params.id);
    } else if (req.user.role === 'orgadmin' && userOrgId === req.params.id) {
      organization = await Organization.findById(req.params.id);
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Update allowed fields
    const {
      name,
      phone,
      address,
      branding,
      settings,
    } = req.body;

    if (name) organization.name = name;
    if (phone) organization.phone = phone;
    if (address) organization.address = address;
    if (branding) organization.branding = { ...organization.branding, ...branding };
    if (settings) organization.settings = { ...organization.settings, ...settings };

    await organization.save();

    res.json({ message: 'Organization updated successfully', organization });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update organization status (Super Admin only)
export const updateOrganizationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended', 'trial'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    organization.status = status;
    await organization.save();

    res.json({ message: 'Organization status updated', organization });
  } catch (error) {
    console.error('Update organization status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get organization statistics
export const getOrganizationStats = async (req, res) => {
  try {
    const orgId = req.params.id;

    // Check access
    const userOrgId = req.user.organizationId?._id ? req.user.organizationId._id.toString() : req.user.organizationId?.toString();
    if (req.user.role !== 'superadmin' && 
        userOrgId !== orgId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const Doctor = (await import('../models/Doctor.js')).default;
    const Receptionist = (await import('../models/Receptionist.js')).default;
    const Appointment = (await import('../models/Appointment.js')).default;
    const PendingAppointment = (await import('../models/PendingAppointment.js')).default;
    const ConfirmedAppointment = (await import('../models/ConfirmedAppointment.js')).default;
    const User = (await import('../models/User.js')).default;

    const [
      doctorsCount,
      receptionistsCount,
      patientsCount,
      appointmentsCount,
      pendingAppointments,
      confirmedAppointments,
    ] = await Promise.all([
      Doctor.countDocuments({ organizationId: orgId }),
      Receptionist.countDocuments({ organizationId: orgId }),
      User.countDocuments({ organizationId: orgId, role: 'patient' }),
      Appointment.countDocuments({ organizationId: orgId }),
      PendingAppointment.countDocuments({ organizationId: orgId }),
      ConfirmedAppointment.countDocuments({ organizationId: orgId }),
    ]);

    res.json({
      doctors: doctorsCount,
      receptionists: receptionistsCount,
      patients: patientsCount,
      appointments: appointmentsCount,
      pendingAppointments,
      confirmedAppointments,
    });
  } catch (error) {
    console.error('Get organization stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get organization trial status
export const getTrialStatus = async (req, res) => {
  try {
    const orgId = req.params.id;

    // Check access
    const userOrgId = req.user.organizationId?._id ? req.user.organizationId._id.toString() : req.user.organizationId?.toString();
    if (req.user.role !== 'superadmin' && 
        userOrgId !== orgId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const organization = await Organization.findById(orgId).lean();

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const subscription = await Subscription.findOne({ organizationId: orgId }).lean();

    // Calculate trial days remaining
    const now = new Date();
    // Normalize to start of day for accurate day counting
    now.setHours(0, 0, 0, 0);
    
    // If no trialEndDate, treat as no trial (paid or expired)
    if (!organization.trialEndDate) {
      return res.json({
        isTrialActive: false,
        trialStartDate: null,
        trialEndDate: null,
        trialDays: 0,
        daysRemaining: 0,
        isTrialExpired: organization.status !== 'active',
        status: organization.status,
      });
    }
    
    const trialEnd = new Date(organization.trialEndDate);
    trialEnd.setHours(0, 0, 0, 0);
    
    // Total days between now and end date
    const daysRemainingStr = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    
    // We want Day 1 to be 14 days remaining, Day 13 to be 1 day, Day 14 is 0 days? User says "Day 13: 1 day left". So if it's a 14 day trial, total is 14. 
    // If daysRemaining is 14 -> First Day.
    // If daysRemaining is 1 -> Day 13.
    // If daysRemaining < 1 -> Expired.
    const daysRemaining = Math.max(0, daysRemainingStr);
    
    // Only consider trial expired if it hasn't been explicitly activated by super admin
    const isTrialExpired = daysRemaining <= 0 && organization.status !== 'active';

    // Update trial status if expired
    if (daysRemaining <= 0 && organization.isTrialActive && organization.status !== 'active') {
      organization.isTrialActive = false;
      organization.status = 'inactive';
      await Organization.findByIdAndUpdate(orgId, {
        isTrialActive: false,
        status: 'inactive'
      });
      // Ensure the return flag matches the update
      isTrialExpired = true;
    }

    res.json({
      isTrialActive: organization.isTrialActive !== false,
      trialStartDate: organization.trialStartDate,
      trialEndDate: organization.trialEndDate,
      trialDays: organization.trialDays || 14,
      daysRemaining: Math.max(0, daysRemaining),
      isTrialExpired,
      status: organization.status,
      planType: organization.planType || 'FREE_TRIAL',
      lastDataResetAt: organization.lastDataResetAt,
      needsResetNotification: organization.needsResetNotification || false,
      isManualOverride: subscription?.isManualOverride || false,
      limits: subscription?.limits || Subscription.getPlanLimits(organization.planType === 'FREE_TRIAL' ? 'free' : (subscription?.plan || 'free')),
    });
  } catch (error) {
    console.error('Get trial status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Dismiss the data reset notification
export const dismissResetNotification = async (req, res) => {
  try {
    const orgId = req.params.id;
    const userOrgId = req.user.organizationId?._id ? req.user.organizationId._id.toString() : req.user.organizationId?.toString();
    
    if (req.user.role !== 'superadmin' && userOrgId !== orgId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Organization.findByIdAndUpdate(orgId, { needsResetNotification: false });
    res.json({ message: 'Notification dismissed' });
  } catch (error) {
    console.error('Dismiss notification error:', error);
    res.status(500).json({ message: error.message });
  }
};
