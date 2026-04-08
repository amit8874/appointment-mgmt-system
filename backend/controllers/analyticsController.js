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
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
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
    const prompt = `You are "Slotify Intelligence", a high-end medical business analyst. 
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
        details: log.details,
        targetType: log.targetType
      })),
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ message: "Failed to fetch activity logs." });
  }
};
