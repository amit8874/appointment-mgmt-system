import UsageAnalytics from "../models/UsageAnalytics.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Billing from "../models/Billing.js";
import PendingAppointment from "../models/PendingAppointment.js";
import ConfirmedAppointment from "../models/ConfirmedAppointment.js";
import CancelledAppointment from "../models/CancelledAppointment.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/PaitentEditProfile.js";
import AuditLog from "../models/AuditLog.js";
import Medicine from "../models/Medicine.js";
import MedicineBatch from "../models/MedicineBatch.js";
import WhatsAppCreditTransaction from "../models/WhatsAppCreditTransaction.js";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "gsk_dummy",
});

export const trackHeartbeat = async (req, res) => {
  const { path, organizationId, lastSeen, deviceType } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    // Find a record for this user, org, and path that was updated "Recently" (within 2 minutes)
    // to group heartbeats into contiguous sessions.
    const recentThreshold = new Date(Date.now() - 2 * 60 * 1000);

    let session = await UsageAnalytics.findOne({
      userId,
      organizationId,
      path,
      lastPulse: { $gte: recentThreshold },
    }).sort({ lastPulse: -1 });

    if (session) {
      // Calculate time differential since last pulse
      const now = new Date();
      const diffSeconds = Math.round((now - session.lastPulse) / 1000);
      
      // Update existing session
      session.duration += diffSeconds;
      session.lastPulse = now;
      await session.save();
    } else {
      // Create a brand new usage entry
      session = new UsageAnalytics({
        userId,
        organizationId,
        role,
        path,
        device: deviceType || 'Desktop',
        duration: 0, 
      });
      await session.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Heartbeat Error:", error);
    res.status(500).json({ message: "Analytics tracking failed." });
  }
};

export const getSuperAdminUsageStats = async (req, res) => {
  try {
    // 1. Top most active organizations (Total Duration)
    const topOrganizations = await UsageAnalytics.aggregate([
      { $match: { organizationId: { $ne: null } } },
      {
        $group: {
          _id: "$organizationId",
          totalDuration: { $sum: "$duration" },
          averageSession: { $avg: "$duration" },
          uniqueUsers: { $addToSet: "$userId" },
        },
      },
      { $sort: { totalDuration: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "organizations",
          localField: "_id",
          foreignField: "_id",
          as: "orgInfo",
        },
      },
      { $unwind: "$orgInfo" },
      {
        $project: {
          name: "$orgInfo.name",
          totalMinutes: { $divide: ["$totalDuration", 60] },
          userCount: { $size: "$uniqueUsers" },
        },
      },
    ]);

    // 2. Page Popularity (Path frequency/duration)
    const pageUsage = await UsageAnalytics.aggregate([
      {
        $group: {
          _id: "$path",
          totalTime: { $sum: "$duration" },
          visitCount: { $count: {} },
        },
      },
      { $sort: { totalTime: -1 } },
      { $limit: 15 },
      {
        $project: {
          path: "$_id",
          totalMinutes: { $divide: ["$totalTime", 60] },
          visitCount: 1,
        },
      },
    ]);

    // 3. Peak Usage (By Hour - Hourly distribution)
    const hourlyDistribution = await UsageAnalytics.aggregate([
        {
          $project: {
            hour: { $hour: "$startTime" },
            duration: 1
          }
        },
        {
          $group: {
            _id: "$hour",
            totalTime: { $sum: "$duration" }
          }
        },
        { $sort: { _id: 1 } }
    ]);

    // 4. Detailed Organization List (Owners and their activity)
    const detailedList = await UsageAnalytics.aggregate([
        {
            $group: {
                _id: { org: "$organizationId", user: "$userId" },
                totalDuration: { $sum: "$duration" },
                lastSeen: { $max: "$lastPulse" },
                favPath: { $first: "$path" } // Simplification
            }
        },
        { $sort: { lastSeen: -1 } },
        { $limit: 50 },
        {
            $lookup: {
                from: "organizations",
                localField: "_id.org",
                foreignField: "_id",
                as: "org"
            }
        },
        { $unwind: { path: "$org", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "users",
                localField: "_id.user",
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: "$user" },
        {
            $project: {
                orgName: "$org.name",
                userName: "$user.name",
                userEmail: "$user.email",
                totalMinutes: { $divide: ["$totalDuration", 60] },
                lastSeen: 1,
                favPath: 1
            }
        }
    ]);

    res.status(200).json({
      topOrganizations,
      pageUsage,
      hourlyDistribution,
      detailedList
    });
  } catch (error) {
    console.error("SuperAdmin Analytics Error:", error);
    res.status(500).json({ message: "Failed to fetch analytics." });
  }
};

// Get Analytics Charts Data
export const getCharts = async (req, res) => {
  try {
    const organizationId = req.tenantId;

    // 1. Appointment Trends (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Aggregating from main Appointment collection (which should have all)
    const appointmentTrends = await Appointment.aggregate([
      { 
        $match: { 
          organizationId: new mongoose.Types.ObjectId(organizationId),
          createdAt: { $gte: sevenDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          appointments: { $sum: 1 },
          uniquePatients: { $addToSet: "$patientId" }
        }
      },
      {
        $project: {
          day: "$_id",
          appointments: 1,
          patients: { $size: "$uniquePatients" },
          _id: 0
        }
      },
      { $sort: { day: 1 } }
    ]);

    // 2. Revenue by Doctor
    const revenueByDoctor = await Billing.aggregate([
      { 
        $match: { 
          organizationId: new mongoose.Types.ObjectId(organizationId),
          status: 'Paid'
        } 
      },
      {
        $group: {
          _id: "$doctorName",
          revenue: { $sum: "$amount" }
        }
      },
      { $sort: { revenue: -1 } },
      { $project: { name: "$_id", value: "$revenue", _id: 0 } }
    ]);

    // 3. Income vs Expense (Placeholder for expense if not tracked)
    // For now, let's aggregate monthly income
    const currentYear = new Date().getFullYear();
    const incomeExpense = await Billing.aggregate([
      { 
        $match: { 
          organizationId: new mongoose.Types.ObjectId(organizationId),
          status: 'Paid',
          createdAt: { $gte: new Date(`${currentYear}-01-01`) }
        } 
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          income: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: {
            $arrayElemAt: [
              ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
              "$_id"
            ]
          },
          income: 1,
          expenses: { $literal: 0 } // Must be plural "expenses" to match frontend
        }
      }
    ]);

    res.json({
      appointmentTrends,
      revenueByDoctor,
      incomeExpense
    });
  } catch (error) {
    console.error("Error fetching charts data:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Analytics Dashboard Data
export const getDashboard = async (req, res) => {
  try {
    const organizationId = req.tenantId;

    // 1. Recent Appointments (Last 10)
    const recentAppointments = await Appointment.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(10);

    // 2. Calculate "This Month" start date
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // 3. Quick Stats (Aggregate All Collections)
    const [
      totalDoctors,
      totalPatients,
      
      // All Appointment Counts
      mainAppts,
      pendingAppts,
      confirmedAppts,
      cancelledAppts,

      // Monthly Growth (All collections)
      mainThisMonth,
      pendingThisMonth,
      confirmedThisMonth,
      cancelledThisMonth,

      totalMonthlyRevenue,
      totalRevenue
    ] = await Promise.all([
      Doctor.countDocuments({ organizationId }),
      Patient.countDocuments({ organizationId }),
      
      // Total counts
      Appointment.countDocuments({ organizationId }),
      PendingAppointment.countDocuments({ organizationId }),
      ConfirmedAppointment.countDocuments({ organizationId }),
      CancelledAppointment.countDocuments({ organizationId }),

      // Monthly counts
      Appointment.countDocuments({ organizationId, createdAt: { $gte: monthStart } }),
      PendingAppointment.countDocuments({ organizationId, createdAt: { $gte: monthStart } }),
      ConfirmedAppointment.countDocuments({ organizationId, createdAt: { $gte: monthStart } }),
      CancelledAppointment.countDocuments({ organizationId, createdAt: { $gte: monthStart } }),

      Billing.aggregate([
        { $match: { 
            organizationId: new mongoose.Types.ObjectId(organizationId), 
            status: 'Paid',
            createdAt: { $gte: monthStart }
        } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Billing.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), status: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalAppointments = (mainAppts || 0) + (pendingAppts || 0) + (confirmedAppts || 0) + (cancelledAppts || 0);
    const appointmentsThisMonth = (mainThisMonth || 0) + (pendingThisMonth || 0) + (confirmedThisMonth || 0) + (cancelledThisMonth || 0);

    res.json({
      recentAppointments,
      overview: {
        totalDoctors,
        totalPatients,
        totalAppointments,
        appointmentsThisMonth,
        revenueThisMonth: totalMonthlyRevenue[0]?.total || 0,
        totalRevenue: totalRevenue[0]?.total || 0
      },
      // Backward compatibility for generic stats
      stats: {
        totalAppointments,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET Predictive AI Insights
export const getPredictiveInsights = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { timeRange = 90 } = req.query; // Default to 90 days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // 1. Aggregate Appointment Performance (No-Shows vs Success)
    const appointmentStats = await Appointment.aggregate([
      { 
        $match: { 
          organizationId: new mongoose.Types.ObjectId(organizationId),
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. Weekly Peak Times (Day of Week distribution)
    const peakDays = await Appointment.aggregate([
      { 
        $match: { 
          organizationId: new mongoose.Types.ObjectId(organizationId),
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Revenue forecasting data
    const revenueStats = await Billing.aggregate([
      { 
        $match: { 
          organizationId: new mongoose.Types.ObjectId(organizationId),
          status: 'Paid',
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 4. Create AI Context
    const context = {
      appointmentStats,
      peakDays: peakDays.map(d => ({ day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d._id - 1], count: d.count })),
      revenueStats,
      totalPatients: await Appointment.distinct("patientId", { organizationId }).then(p => p.length)
    };

    // 5. Query Groq for Analysis
    const prompt = `You are "Oviaan Intelligence", a high-end medical business analyst. 
Analyze the following clinic data from the last ${timeRange} days and provide clear, actionable predictions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DATA SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- APPOINTMENT STATUSES: ${JSON.stringify(context.appointmentStats)}
- WEEKLY PEAK DISTRIBUTION: ${JSON.stringify(context.peakDays)}
- MONTHLY REVENUE TRENDS: ${JSON.stringify(context.revenueStats)}
- UNIQUE PATIENTS: ${context.totalPatients}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Provide exactly 5 bullet points with clear headlines:
1. **No-Show Prediction**: Estimate risk of missed slots next month.
2. **Staffing Efficiency**: Suggest which days need more/less staff.
3. **Revenue Forecast**: Estimate growth or dip for next month.
4. **Patient Retention**: Comment on the unique patient growth.
5. **Growth Hack**: One unique suggestion to improve clinic performance.

Keep it professional, data-driven, and short.`;

    const aiResponse = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
    });

    res.json({
      insights: aiResponse.choices[0].message.content,
      rawStats: context
    });

  } catch (error) {
    console.error("Predictive Error:", error);
    res.status(500).json({ message: "Failed to generate AI insights." });
  }
};

// GET Activity Logs for the Current Organization
export const getActivityLogs = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { action, limit = 50, page = 1 } = req.query;

    if (!organizationId) {
      console.warn("[getActivityLogs] No organizationId found in request");
      return res.status(400).json({ message: "Organization ID is required" });
    }

    console.log(`[getActivityLogs] Fetching logs for organizationId: ${organizationId} (Type: ${typeof organizationId})`);

    // Ensure we have a valid ObjectId
    let orgObjectId;
    try {
      if (mongoose.isValidObjectId(organizationId)) {
        orgObjectId = new mongoose.Types.ObjectId(organizationId.toString());
      } else {
        console.error(`Invalid Organization ID format: ${organizationId}`);
        return res.status(400).json({ message: "Invalid Organization ID format" });
      }
    } catch (err) {
      console.error(`Error converting Organization ID: ${err.message}`);
      return res.status(400).json({ message: "Invalid Organization ID" });
    }

    const query = { organizationId: orgObjectId };
    if (action && action !== 'all') {
      // Map frontend categories to backend actions
      const actionMap = {
        'security': ['PASSWORD_CHANGE', 'LOGIN', 'LOGOUT', '2FA_TOGGLE'],
        'profile': ['UPDATE_PROFILE', 'UPDATE_CLINIC_DETAILS', 'LOGO_UPLOAD'],
        'billing': ['UPGRADE_PLAN', 'CANCEL_SUBSCRIPTION', 'PAYMENT_SUCCESS']
      };
      if (actionMap[action]) {
        query.action = { $in: actionMap[action] };
      }
    }

    const logs = await AuditLog.find(query)
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs: logs.map(log => ({
        id: log._id,
        action: log.action,
        adminName: log.adminId?.name || 'Unknown',
        time: log.createdAt,
        ip: log.ipAddress,
        details: log.details
      })),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ message: "Failed to fetch activity logs." });
  }
};

// GET Comprehensive Clinic Analytics (BI Engine)
export const getClinicAnalytics = async (req, res) => {
  try {
    const organizationId = req.tenantId;
    const { startDate, endDate, doctorId } = req.query;

    const orgId = new mongoose.Types.ObjectId(organizationId);
    const orgFilter = { $in: [orgId, organizationId.toString()] };
    
    // Doctor identifier resolution (support Doctor ID code, MongoDB _id, and name)
    let doctorMatchFilter = null;
    let doctorMatchIds = [];
    if (doctorId && doctorId !== 'all') {
      doctorMatchIds.push(doctorId.toString());
      try {
        if (mongoose.isValidObjectId(doctorId)) {
          const docDoc = await Doctor.findById(doctorId).lean();
          if (docDoc) {
            if (docDoc.doctorId) doctorMatchIds.push(docDoc.doctorId);
            if (docDoc.name) doctorMatchIds.push(docDoc.name);
          }
        } else {
          const docDoc = await Doctor.findOne({ doctorId }).lean();
          if (docDoc) {
            doctorMatchIds.push(docDoc._id.toString());
            if (docDoc.name) doctorMatchIds.push(docDoc.name);
          }
        }
      } catch (e) {
        console.error("Doctor lookup error in analytics:", e.message);
      }
      doctorMatchFilter = {
        $or: [
          { doctorId: { $in: doctorMatchIds } },
          { doctorName: { $in: doctorMatchIds } }
        ]
      };
    }

    // Base filters
    const billingDateMatch = { organizationId: orgFilter };
    const apptDateMatch = { organizationId: orgFilter };
    
    if (startDate && endDate) {
      const startD = new Date(new Date(startDate).setHours(0, 0, 0, 0));
      const endD = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      billingDateMatch.createdAt = { $gte: startD, $lte: endD };
      apptDateMatch.createdAt = { $gte: startD, $lte: endD };
    }

    if (doctorMatchFilter) {
      Object.assign(billingDateMatch, doctorMatchFilter);
      Object.assign(apptDateMatch, doctorMatchFilter);
    }

    const now = new Date();
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Expressions for accurately computing paid and due amounts
    // Paid amount on a bill:
    // If status is 'Paid', use paidAmount if > 0, otherwise bill amount.
    // If status is not 'Paid', only count paidAmount (Pending = 0, Due/Partial = whatever was collected).
    const paidAmountExpr = {
      $cond: [
        { $eq: ["$status", "Paid"] },
        { $cond: [{ $gt: ["$paidAmount", 0] }, "$paidAmount", { $ifNull: ["$amount", 0] }] },
        { $ifNull: ["$paidAmount", 0] }
      ]
    };

    // Remaining due amount on a bill:
    // If status is 'Paid', due is 0.
    // Otherwise, use dueAmount if > 0, else max(0, amount - paidAmount).
    const dueAmountExpr = {
      $cond: [
        { $eq: ["$status", "Paid"] },
        0,
        {
          $cond: [
            { $gt: ["$dueAmount", 0] },
            "$dueAmount",
            { $max: [0, { $subtract: ["$amount", { $ifNull: ["$paidAmount", 0] }] }] }
          ]
        }
      ]
    };

    const [
      overviewStats,
      revenueTrends,
      revenueBreakdown,
      paymentModeStats,
      appointmentData,
      patientAnalytics,
      doctorPerformanceData,
      pharmacyStats,
      whatsappStats,
      billingStats
    ] = await Promise.all([
      // 1. Overview Summary Cards
      Promise.all([
        // All-Time Total Collected Revenue
        Billing.aggregate([
          { $match: { organizationId: orgFilter, status: { $nin: ['Cancelled', 'Dead'] } } },
          { $group: { _id: null, total: { $sum: paidAmountExpr } } }
        ]),
        // Today's Collected Revenue
        Billing.aggregate([
          { $match: { organizationId: orgFilter, status: { $nin: ['Cancelled', 'Dead'] }, createdAt: { $gte: todayStart } } },
          { $group: { _id: null, total: { $sum: paidAmountExpr } } }
        ]),
        // This Month's Collected Revenue (Unpaid pending bills excluded)
        Billing.aggregate([
          { $match: { organizationId: orgFilter, status: { $nin: ['Cancelled', 'Dead'] }, createdAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: paidAmountExpr } } }
        ]),
        // Pending Payments (All unpaid, pending, and due balances included)
        Billing.aggregate([
          { $match: { organizationId: orgFilter, status: { $nin: ['Paid', 'Cancelled', 'Dead'] } } },
          { $group: { _id: null, total: { $sum: dueAmountExpr } } }
        ]),
        // Total Appointments (Unified across Appointment, ConfirmedAppointment, PendingAppointment, CancelledAppointment)
        Promise.all([
          Appointment.countDocuments({ organizationId: orgFilter }),
          ConfirmedAppointment.countDocuments({ organizationId: orgFilter }),
          PendingAppointment.countDocuments({ organizationId: orgFilter }),
          CancelledAppointment.countDocuments({ organizationId: orgFilter })
        ]).then(([a, c, p, can]) => (a || 0) + (c || 0) + (p || 0) + (can || 0)),
        // Total Patients
        Patient.countDocuments({ organizationId: orgFilter }),
        // Total Doctors (Active, Verified, etc.)
        Doctor.countDocuments({ organizationId: orgFilter, status: { $nin: ['Inactive', 'Rejected'] } }),
        // New Patients This Month
        Patient.countDocuments({ organizationId: orgFilter, createdAt: { $gte: monthStart } })
      ]),

      // 2. Revenue Trends (Actual collected revenue per day)
      Billing.aggregate([
        { $match: { ...billingDateMatch, status: { $nin: ['Cancelled', 'Dead'] } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            amount: { $sum: paidAmountExpr }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 3. Revenue Breakdown by Bill Type
      Billing.aggregate([
        { $match: { ...billingDateMatch, status: { $nin: ['Cancelled', 'Dead'] } } },
        { 
          $group: { 
            _id: { $ifNull: ["$billType", "General"] }, 
            total: { $sum: paidAmountExpr } 
          } 
        },
        { $sort: { total: -1 } }
      ]),

      // 4. Payment Modes (Only from bills where actual payment occurred)
      Billing.aggregate([
        { 
          $match: { 
            ...billingDateMatch, 
            status: { $nin: ['Cancelled', 'Dead'] },
            $or: [
              { status: 'Paid' },
              { paidAmount: { $gt: 0 } }
            ]
          } 
        },
        { 
          $group: { 
            _id: { $ifNull: ["$paymentMethod", "Cash"] }, 
            count: { $sum: 1 }, 
            amount: { $sum: paidAmountExpr } 
          } 
        },
        { $sort: { amount: -1 } }
      ]),

      // 5. Unified Appointment Analytics
      Promise.all([
        Appointment.find(apptDateMatch).select('status visitType createdAt doctorId doctorName').lean(),
        ConfirmedAppointment.find(apptDateMatch).select('status visitType createdAt doctorId doctorName').lean(),
        PendingAppointment.find(apptDateMatch).select('status visitType createdAt doctorId doctorName').lean(),
        CancelledAppointment.find(apptDateMatch).select('status visitType createdAt doctorId doctorName').lean()
      ]).then(([appts, confs, pends, cancs]) => {
        const allAppts = [
          ...appts,
          ...confs,
          ...pends,
          ...cancs.map(c => ({ ...c, status: 'cancelled' }))
        ];

        const statusMap = {};
        const hourMap = {};
        const visitMap = {};

        for (const a of allAppts) {
          const rawStatus = (a.status || 'Pending').trim();
          const capStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
          statusMap[capStatus] = (statusMap[capStatus] || 0) + 1;

          if (a.createdAt) {
            const h = new Date(a.createdAt).getHours();
            hourMap[h] = (hourMap[h] || 0) + 1;
          }

          let rawVisit = (a.visitType || 'Appointment').trim();
          if (rawVisit === 'WALK_IN' || rawVisit.toLowerCase() === 'walk-in') rawVisit = 'Walk-in';
          else if (rawVisit === 'APPOINTMENT' || rawVisit.toLowerCase() === 'appointment') rawVisit = 'Appointment';
          visitMap[rawVisit] = (visitMap[rawVisit] || 0) + 1;
        }

        const statusData = Object.entries(statusMap).map(([_id, count]) => ({ _id, count }));
        const peakHours = Object.entries(hourMap)
          .map(([h, count]) => ({ _id: Number(h), count }))
          .sort((a, b) => a._id - b._id);
        const visitTypes = Object.entries(visitMap).map(([_id, count]) => ({ _id, count }));

        return { status: statusData, peakHours, visitTypes, allAppts };
      }),

      // 6. Patient Demographics & Growth
      Promise.all([
        Patient.aggregate([
          { $match: { organizationId: orgFilter } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        Patient.aggregate([
          { $match: { organizationId: orgFilter } },
          { $group: { _id: { $ifNull: ["$gender", "Not Specified"] }, count: { $sum: 1 } } }
        ]),
        Patient.aggregate([
          { $match: { organizationId: orgFilter } },
          {
            $project: {
              ageGroup: {
                $switch: {
                  branches: [
                    { case: { $or: [{ $eq: ["$age", null] }, { $not: ["$age"] }] }, then: "Not Specified" },
                    { case: { $lt: ["$age", 18] }, then: "0-17" },
                    { case: { $lt: ["$age", 35] }, then: "18-34" },
                    { case: { $lt: ["$age", 50] }, then: "35-49" }
                  ],
                  default: "50+"
                }
              }
            }
          },
          { $group: { _id: "$ageGroup", count: { $sum: 1 } } }
        ])
      ]),

      // 7. Doctor Performance (Clinic Doctors + Real Revenue + Real Appointments)
      Promise.all([
        Doctor.find({ organizationId: orgFilter, status: { $nin: ['Inactive', 'Rejected'] } }).lean(),
        Billing.aggregate([
          { $match: { ...billingDateMatch, status: { $nin: ['Cancelled', 'Dead'] } } },
          {
            $group: {
              _id: { $ifNull: ["$doctorId", "$doctorName"] },
              doctorName: { $first: "$doctorName" },
              revenue: { $sum: paidAmountExpr }
            }
          }
        ])
      ]),

      // 8. Pharmacy BI
      Promise.all([
        MedicineBatch.aggregate([
          { $match: { organizationId: orgFilter, status: 'Active' } },
          { $group: { 
              _id: null, 
              totalValue: { $sum: { $multiply: ["$stockQuantity", "$purchasePrice"] } },
              lowStockCount: { $sum: { $cond: [{ $lt: ["$stockQuantity", 10] }, 1, 0] } }
          } }
        ]),
        MedicineBatch.countDocuments({ organizationId: orgFilter, expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, status: 'Active' }),
        Billing.aggregate([
          { $match: { organizationId: orgFilter, billType: 'Pharmacy', status: { $nin: ['Cancelled', 'Dead'] } } },
          { $unwind: "$items" },
          { $group: { _id: { $ifNull: ["$items.description", "$items.procedureName"] }, totalSold: { $sum: "$items.qty" }, revenue: { $sum: "$items.subtotal" } } },
          { $sort: { totalSold: -1 } },
          { $limit: 10 }
        ])
      ]),

      // 9. WhatsApp Analytics & Credits
      Promise.all([
        Organization.findById(orgId).select('whatsappCredits').lean(),
        WhatsAppCreditTransaction.aggregate([
          { 
            $match: { 
              $or: [
                { organization: { $in: [orgId, organizationId.toString()] } },
                { organizationId: { $in: [orgId, organizationId.toString()] } }
              ]
            } 
          },
          { 
            $group: { 
              _id: "$type", 
              total: { $sum: 1 },
              credits: { $sum: "$credits" }
            } 
          }
        ])
      ]),

      // 10. Billing Breakdown by Status
      Billing.aggregate([
        { $match: { ...billingDateMatch, status: { $nin: ['Cancelled', 'Dead'] } } },
        { 
          $group: { 
            _id: "$status", 
            count: { $sum: 1 }, 
            amount: { 
              $sum: {
                $cond: [
                  { $eq: ["$status", "Paid"] },
                  paidAmountExpr,
                  dueAmountExpr
                ]
              }
            } 
          } 
        }
      ])
    ]);

    // Build unified doctor performance list
    const [clinicDoctors, doctorBillingStats] = doctorPerformanceData;
    const allAppointments = appointmentData.allAppts || [];

    // Map doctor revenue from billing
    const docRevMap = {};
    for (const b of doctorBillingStats) {
      if (b._id) docRevMap[b._id.toString()] = (docRevMap[b._id.toString()] || 0) + (b.revenue || 0);
      if (b.doctorName) docRevMap[b.doctorName.toLowerCase()] = (docRevMap[b.doctorName.toLowerCase()] || 0) + (b.revenue || 0);
    }

    // Map doctor appointments
    const docApptMap = {};
    const docCompletedMap = {};
    for (const a of allAppointments) {
      const docKey = a.doctorId || a.doctorName || 'Unknown';
      docApptMap[docKey] = (docApptMap[docKey] || 0) + 1;
      if (a.doctorName) {
        const nameKey = a.doctorName.toLowerCase();
        docApptMap[nameKey] = (docApptMap[nameKey] || 0) + 1;
      }
      if ((a.status || '').toLowerCase() === 'completed') {
        docCompletedMap[docKey] = (docCompletedMap[docKey] || 0) + 1;
        if (a.doctorName) {
          const nameKey = a.doctorName.toLowerCase();
          docCompletedMap[nameKey] = (docCompletedMap[nameKey] || 0) + 1;
        }
      }
    }

    const processedDoctors = new Set();
    const doctorPerformance = [];

    // First add all registered clinic doctors
    for (const doc of clinicDoctors) {
      const docName = doc.name || `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || 'Dr. ' + (doc.doctorId || 'Doctor');
      const docIdStr = doc._id.toString();
      const customDocId = doc.doctorId || '';
      const nameKey = docName.toLowerCase();

      const totalAppts = docApptMap[customDocId] || docApptMap[docIdStr] || docApptMap[nameKey] || 0;
      const completedAppts = docCompletedMap[customDocId] || docCompletedMap[docIdStr] || docCompletedMap[nameKey] || 0;
      const revenue = docRevMap[customDocId] || docRevMap[docIdStr] || docRevMap[nameKey] || 0;

      processedDoctors.add(docIdStr);
      if (customDocId) processedDoctors.add(customDocId);
      processedDoctors.add(nameKey);

      doctorPerformance.push({
        _id: doc._id,
        doctorId: doc.doctorId,
        doctorName: docName,
        totalAppointments: totalAppts,
        completedAppointments: completedAppts,
        revenue
      });
    }

    // Also include any doctor from billing or appointments who wasn't in clinicDoctors
    for (const b of doctorBillingStats) {
      const key = (b.doctorName || b._id || '').toString();
      if (key && !processedDoctors.has(key.toLowerCase()) && !processedDoctors.has(key)) {
        processedDoctors.add(key.toLowerCase());
        doctorPerformance.push({
          _id: b._id,
          doctorName: b.doctorName || key,
          totalAppointments: docApptMap[key] || docApptMap[key.toLowerCase()] || 0,
          completedAppointments: docCompletedMap[key] || docCompletedMap[key.toLowerCase()] || 0,
          revenue: b.revenue || 0
        });
      }
    }

    doctorPerformance.sort((a, b) => b.revenue - a.revenue || b.totalAppointments - a.totalAppointments);

    // Format Overview Cards
    const overview = {
      totalRevenue: overviewStats[0][0]?.total || 0,
      todayRevenue: overviewStats[1][0]?.total || 0,
      thisMonthRevenue: overviewStats[2][0]?.total || 0,
      pendingPayment: overviewStats[3][0]?.total || 0,
      totalAppointments: overviewStats[4] || 0,
      totalPatients: overviewStats[5] || 0,
      totalDoctors: overviewStats[6] || 0,
      newPatientsThisMonth: overviewStats[7] || 0
    };

    // Clinical Insights
    const insights = [];
    if (overview.thisMonthRevenue > 0) {
      insights.push({ type: 'revenue', message: `Monthly revenue collected is ₹${overview.thisMonthRevenue.toLocaleString()}.` });
    }
    if (overview.pendingPayment > 0) {
      insights.push({ type: 'billing', message: `Total pending balance is ₹${overview.pendingPayment.toLocaleString()}. Consider following up on dues.` });
    }
    
    const topDoc = doctorPerformance[0];
    if (topDoc && (topDoc.totalAppointments > 0 || topDoc.revenue > 0)) {
      insights.push({ type: 'appointment', message: `${topDoc.doctorName} is leading with ${topDoc.totalAppointments} appointments and ₹${topDoc.revenue.toLocaleString()} revenue.` });
    }
    
    const lowStock = pharmacyStats[0][0]?.lowStockCount || 0;
    if (lowStock > 0) {
      insights.push({ type: 'pharmacy', message: `${lowStock} medicines are running low on stock.` });
    }

    res.json({
      success: true,
      data: {
        overview,
        revenue: { trends: revenueTrends, breakdown: revenueBreakdown, paymentModes: paymentModeStats },
        appointments: { status: appointmentData.status, peakHours: appointmentData.peakHours, visitTypes: appointmentData.visitTypes },
        patients: { growth: patientAnalytics[0], gender: patientAnalytics[1], ageGroups: patientAnalytics[2] },
        doctors: doctorPerformance,
        pharmacy: {
          inventoryValue: pharmacyStats[0][0]?.totalValue || 0,
          lowStockCount: pharmacyStats[0][0]?.lowStockCount || 0,
          expiringSoon: pharmacyStats[1] || 0,
          topSelling: pharmacyStats[2] || []
        },
        billing: billingStats,
        whatsapp: {
          credits: whatsappStats[0]?.whatsappCredits || {
            totalAvailable: 0,
            monthlyIncluded: 0,
            usedThisMonth: 0
          },
          stats: whatsappStats[1] || []
        },
        insights
      }
    });

  } catch (error) {
    console.error("Clinic Analytics Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch clinic analytics." });
  }
};
