import UsageAnalytics from "../models/UsageAnalytics.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import mongoose from "mongoose";

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
