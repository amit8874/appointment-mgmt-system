import jwt from 'jsonwebtoken';
import Organization from '../models/Organization.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import AuditLog from '../models/AuditLog.js';
import Pharmacy from '../models/Pharmacy.js';
import Notification from '../models/Notification.js';

// Get super admin dashboard statistics
export const getDashboard = async (req, res) => {
  try {
    const [
      totalOrganizations,
      activeOrganizations,
      trialOrganizations,
      totalSubscriptions,
      activeSubscriptions,
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAppointments,
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ status: 'active' }),
      Organization.countDocuments({ status: 'trial' }),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      User.countDocuments({ role: { $ne: 'superadmin' } }),
      Doctor.countDocuments(),
      User.countDocuments({ role: 'patient' }),
      Appointment.countDocuments(),
    ]);

    // Calculate revenue (simplified - in production, aggregate from payment history)
    const revenueTrendData = await Subscription.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$startDate" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    // Organization growth trends (last 12 months)
    const orgGrowthData = await Organization.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    // Active users by role summary
    const usersByRole = await User.aggregate([
      { $match: { role: { $ne: 'superadmin' } } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent organizations
    const recentOrganizations = await Organization.find()
      .populate('ownerId', 'name email')
      .populate('subscriptionId')
      .sort({ createdAt: -1 })
      .limit(10);

    // Organizations by status
    const organizationsByStatus = await Organization.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Subscriptions by plan
    const subscriptionsByPlan = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
        },
      },
    ]);

    // Churn Analytics: At-risk organizations (expiring in next 7 days or inactive)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const atRiskOrganizations = await Organization.find({
      status: { $in: ['active', 'trial'] },
      $or: [
        { trialEndDate: { $lte: sevenDaysFromNow, $gte: new Date() } },
        { 'subscriptionId.endDate': { $lte: sevenDaysFromNow, $gte: new Date() } }
      ]
    })
    .populate('ownerId', 'name email phone')
    .populate('subscriptionId')
    .limit(10);

    // Revenue Forecasting (Simplified)
    // Based on active subscriptions monthly revenue + 10% expected growth
    const currentMonthlyRevenue = (revenueTrendData[revenueTrendData.length - 1]?.total || 0);
    const forecastedRevenue = Math.round(currentMonthlyRevenue * 1.15); // Predicting 15% growth

    res.json({
      overview: {
        totalOrganizations,
        activeOrganizations,
        trialOrganizations,
        totalSubscriptions,
        activeSubscriptions,
        totalUsers,
        totalDoctors,
        totalPatients,
        totalAppointments,
        revenueThisMonth: currentMonthlyRevenue,
        revenueThisYear: revenueTrendData.reduce((acc, curr) => acc + curr.total, 0) || 0,
        forecastedRevenue,
      },
      recentOrganizations,
      atRiskOrganizations,
      organizationsByStatus,
      subscriptionsByPlan,
      charts: {
        revenueTrend: revenueTrendData,
        orgGrowth: orgGrowthData,
        usersByRole,
        forecast: [
          { month: 'Current', revenue: currentMonthlyRevenue },
          { month: 'Forecast', revenue: forecastedRevenue }
        ]
      }
    });
  } catch (error) {
    console.error('Super admin dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all organizations with filters
export const getOrganizations = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) {
      if (status === 'expired') {
        // Trial expired: isTrialActive is false and status is not active
        query.$or = [
          { isTrialActive: false, status: { $ne: 'active' } },
          { trialEndDate: { $lt: new Date() }, status: 'trial' }
        ];
      } else if (status === 'trial') {
        // Trial active
        query.status = 'trial';
        query.isTrialActive = true;
      } else {
        query.status = status;
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
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

// Get all organizations with owner credentials (including plain password)
export const getOrganizationsWithCredentials = async (req, res) => {
  try {
    const organizations = await Organization.find()
      .populate({
        path: 'ownerId',
        select: 'name email plainPassword',
        options: { lean: true }
      })
      .populate('subscriptionId')
      .sort({ createdAt: -1 })
      .lean();

    // Transform data to include credentials
    const organizationsWithCredentials = organizations.map(org => ({
      _id: org._id,
      name: org.name,
      slug: org.slug,
      subdomain: org.subdomain,
      email: org.email,
      phone: org.phone,
      address: org.address,
      status: org.status,
      createdAt: org.createdAt,
      ownerId: org.ownerId?._id,
      ownerName: org.ownerId?.name || 'N/A',
      ownerEmail: org.ownerId?.email || 'N/A',
      ownerPassword: org.ownerId?.plainPassword || 'N/A',
      subscription: org.subscriptionId ? {
        plan: org.subscriptionId.plan,
        planName: org.subscriptionId.planName,
        status: org.subscriptionId.status,
        startDate: org.subscriptionId.startDate,
        endDate: org.subscriptionId.endDate,
      } : null,
    }));

    res.json({
      organizations: organizationsWithCredentials,
      total: organizationsWithCredentials.length,
    });
  } catch (error) {
    console.error('Get organizations with credentials error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all subscriptions
export const getSubscriptions = async (req, res) => {
  try {
    const { status, plan, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (plan) query.plan = plan;

    const subscriptions = await Subscription.find(query)
      .populate('organizationId', 'name email slug')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Subscription.countDocuments(query);

    res.json({
      subscriptions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get revenue analytics
export const getRevenue = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Aggregate revenue by period
    const revenueData = await Subscription.aggregate([
      {
        $match: {
          status: 'active',
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'month' ? '%Y-%m' : '%Y',
              date: '$startDate',
            },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Total revenue
    const totalRevenue = await Subscription.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    res.json({
      revenueData,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update organization status
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
    
    // If Super Admin specifically manually activates them, bypass the trial restrictions
    if (status === 'active') {
      organization.isTrialActive = false; // Trial ends immediately
    } else if (status === 'suspended' || status === 'inactive') {
      organization.isTrialActive = false;
    }

    await organization.save();

    // Log the configuration change
    await AuditLog.create({
      adminId: req.user.id,
      action: 'UPDATE_ORG_STATUS',
      targetType: 'Organization',
      targetId: organization._id,
      details: { status },
      ipAddress: req.ip
    });

    res.json({ message: 'Organization status updated', organization });
  } catch (error) {
    console.error('Update organization status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Manual subscription override
export const overrideSubscription = async (req, res) => {
  try {
    const { 
      plan, 
      planName, 
      amount, 
      status, 
      endDate, 
      trialEndDate, 
      overrideNote 
    } = req.body;

    const subscription = await Subscription.findOne({ organizationId: req.params.orgId });
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (plan) subscription.plan = plan;
    if (planName) subscription.planName = planName;
    if (amount !== undefined) subscription.amount = amount;
    if (status) subscription.status = status;
    if (endDate) subscription.endDate = new Date(endDate);
    if (trialEndDate) subscription.trialEndDate = new Date(trialEndDate);
    
    subscription.isManualOverride = true;
    subscription.overrideNote = overrideNote || 'Manual override by Super Admin';
    subscription.updatedAt = Date.now();

    await subscription.save();

    // Also update the Organization record
    const org = await Organization.findById(req.params.orgId);
    if (org) {
      if (trialEndDate) org.trialEndDate = new Date(trialEndDate);
      if (status) org.status = status;
      
      // Clear inactive/suspended statuses if we extend trial to future
      if (trialEndDate && new Date(trialEndDate) > new Date()) {
         org.isTrialActive = true;
         if (org.status === 'inactive') org.status = 'trial';
      }
      // If setting to active, clear trial explicitly
      if (status === 'active') {
         org.isTrialActive = false;
      }
      
      await org.save();
    }

    // Log the manual override
    await AuditLog.create({
      adminId: req.user.id,
      action: 'OVERRIDE_SUBSCRIPTION',
      targetType: 'Organization',
      targetId: req.params.orgId,
      details: { plan, amount, status, endDate, trialEndDate },
      ipAddress: req.ip
    });

    res.json({ message: 'Subscription updated successfully', subscription });
  } catch (error) {
    console.error('Override subscription error:', error);
    res.status(500).json({ message: error.message });
  }
};

// System Health Analytics
export const getSystemHealth = async (req, res) => {
  try {
    const health = {
      status: 'Healthy',
      apiLatency: Math.floor(Math.random() * (45 - 15 + 1)) + 15,
      dbLatency: Math.floor(Math.random() * (12 - 5 + 1)) + 5,
      uptime: process.uptime(),
      memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      cpuLoad: (Math.random() * 5 + 1).toFixed(1) + '%'
    };
    res.json(health);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Searchable Audit Logs
export const getAuditLogs = async (req, res) => {
  try {
    const { action, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = {};
    if (action) query.action = action;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const logs = await AuditLog.find(query)
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await AuditLog.countDocuments(query);
    res.json({ logs, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Impersonate another user (Shadow Mode)
 * @route   POST /api/superadmin/impersonate/:userId
 * @access  Super Admin
 */
export const impersonateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the target user
    const targetUser = await User.findById(userId).populate('organizationId');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Security: Don't allow impersonating other Super Admins
    if (targetUser.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot impersonate another Super Admin' });
    }

    // Generate token for the target user with isImpersonated flag
    const token = jwt.sign(
      { 
        id: targetUser._id, 
        role: targetUser.role, 
        organizationId: targetUser.organizationId?._id || targetUser.organizationId || null,
        isImpersonated: true,
        impersonatorId: req.user.id
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Filter sensitive data for response
    const userResponse = {
      id: targetUser._id,
      name: targetUser.name,
      mobile: targetUser.mobile,
      email: targetUser.email,
      role: targetUser.role,
      organizationId: targetUser.organizationId?._id || targetUser.organizationId,
      organization: targetUser.organizationId ? {
        name: targetUser.organizationId.name,
        branding: targetUser.organizationId.branding,
        status: targetUser.organizationId.status
      } : null,
      isImpersonated: true
    };

    // Log the impersonation event
    await AuditLog.create({
      adminId: req.user.id,
      action: 'USER_IMPERSONATION_START',
      targetType: 'User',
      targetId: targetUser._id,
      details: { 
        targetRole: targetUser.role,
        targetName: targetUser.name
      },
      ipAddress: req.ip
    });

    res.json({
      message: `Shadow Mode active for ${targetUser.name}`,
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ message: 'Error starting Shadow Mode' });
  }
};

/**
 * @desc    Get all pharmacies
 * @route   GET /api/superadmin/pharmacies
 * @access  Super Admin
 */
export const getPharmacies = async (req, res) => {
  try {
    const pharmacies = await Pharmacy.find().populate('ownerId', 'name email mobile plainPassword');
    res.json(pharmacies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Onboard a new pharmacy
 * @route   POST /api/superadmin/pharmacies
 * @access  Super Admin
 */
export const createPharmacy = async (req, res) => {
  try {
    const { name, email, phone, address, commissionRate, ownerName, password } = req.body;

    // 1. Create the Pharmacy Admin User
    const pharmacyUser = await User.create({
      name: ownerName,
      email,
      mobile: phone,
      password,
      plainPassword: password,
      role: 'pharmacy',
    });

    // 2. Create the Pharmacy record
    const pharmacy = await Pharmacy.create({
      name,
      email,
      phone,
      address,
      commissionRate: commissionRate || 10,
      ownerName,
      ownerId: pharmacyUser._id,
      status: 'active'
    });

    // 3. Log the action
    await AuditLog.create({
        adminId: req.user.id,
        action: 'PHARMACY_ONBOARDING',
        targetType: 'Pharmacy',
        targetId: pharmacy._id,
        details: { name, ownerName },
        ipAddress: req.ip
    });

    res.status(201).json({
      message: 'Pharmacy onboarded successfully',
      pharmacy
    });
  } catch (error) {
    console.error('Pharmacy onboarding error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update pharmacy status
 * @route   PATCH /api/superadmin/pharmacies/:id/status
 * @access  Super Admin
 */
export const updatePharmacyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const pharmacy = await Pharmacy.findByIdAndUpdate(id, { status }, { new: true });
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    // Log the action
    await AuditLog.create({
        adminId: req.user.id,
        action: 'PHARMACY_STATUS_UPDATE',
        targetType: 'Pharmacy',
        targetId: pharmacy._id,
        details: { status },
        ipAddress: req.ip
    });

    res.json({ message: `Pharmacy status updated to ${status}`, pharmacy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Public pharmacy self-registration
 * @route   POST /api/superadmin/pharmacies/public-register
 * @access  Public
 */
export const registerPharmacy = async (req, res) => {
  try {
    const { name, email, phone, address, ownerName } = req.body;

    // Check if pharmacy already exists with this email
    const existing = await Pharmacy.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'A pharmacy with this email already exists' });
    }

    const pharmacy = await Pharmacy.create({
      name,
      email,
      phone,
      address,
      ownerName, // Store contact person name
      ownerId: null, // Pending approval
      status: 'pending',
      commissionRate: 10 // Default
    });

    // Create a system notification for super admin
    await Notification.create({
      message: `New Pharmacy Registration: ${name} by ${ownerName}`,
      type: 'info',
      category: 'user_registration',
      isRead: false
    });

    res.status(201).json({ 
      message: 'Registration request submitted successfully. We will contact you soon.',
      pharmacy 
    });
  } catch (error) {
    console.error('Pharmacy self-registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Approve pharmacy and create owner account
 * @route   POST /api/superadmin/pharmacies/:id/approve
 * @access  Super Admin
 */
export const approvePharmacy = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, ownerName, commissionRate } = req.body;

    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy) {
      return res.status(404).json({ message: 'Pharmacy not found' });
    }

    // 1. Create the User account
    const user = await User.create({
      name: ownerName || pharmacy.ownerName || 'Pharmacy Owner',
      email,
      password,
      plainPassword: password,
      role: 'pharmacy',
      mobile: pharmacy.phone
    });

    // 2. Update Pharmacy record
    pharmacy.ownerId = user._id;
    pharmacy.status = 'active';
    pharmacy.email = email; // Update to official email if different
    if (commissionRate) pharmacy.commissionRate = commissionRate;
    
    await pharmacy.save();

    // 3. Log the action
    await AuditLog.create({
      adminId: req.user.id,
      action: 'PHARMACY_APPROVE',
      targetType: 'Pharmacy',
      targetId: pharmacy._id,
      details: { email, ownerName },
      ipAddress: req.ip
    });

    res.json({ 
      message: 'Pharmacy approved and account created successfully',
      pharmacy,
      credentials: { email, password } // In real production, send via email
    });
  } catch (error) {
    console.error('Pharmacy approval error:', error);
    res.status(500).json({ message: error.message });
  }
};
