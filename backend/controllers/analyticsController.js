import Appointment from '../models/Appointment.js';
import PendingAppointment from '../models/PendingAppointment.js';
import ConfirmedAppointment from '../models/ConfirmedAppointment.js';
import CancelledAppointment from '../models/CancelledAppointment.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Billing from '../models/Billing.js';

export const getDashboard = async (req, res) => {
  try {
    const orgId = req.tenantId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get counts
    const [
      totalDoctors,
      totalReceptionists,
      totalPatients,
      totalAppointments,
      appointmentsThisMonth,
      appointmentsThisYear,
      pendingAppointments,
      confirmedAppointments,
      cancelledAppointments,
    ] = await Promise.all([
      Doctor.countDocuments({ organizationId: orgId }),
      User.countDocuments({ organizationId: orgId, role: 'receptionist' }),
      User.countDocuments({ organizationId: orgId, role: 'patient' }),
      Appointment.countDocuments({ organizationId: orgId }),
      Appointment.countDocuments({
        organizationId: orgId,
        createdAt: { $gte: startOfMonth },
      }),
      Appointment.countDocuments({
        organizationId: orgId,
        createdAt: { $gte: startOfYear },
      }),
      PendingAppointment.countDocuments({ organizationId: orgId }),
      ConfirmedAppointment.countDocuments({ organizationId: orgId }),
      CancelledAppointment.countDocuments({ organizationId: orgId }),
    ]);

    // Get appointments by status
    const appointmentsByStatus = {
      pending: pendingAppointments,
      confirmed: confirmedAppointments,
      cancelled: cancelledAppointments,
    };

    // Get recent appointments
    const recentAppointments = await Appointment.find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('patientName doctorName date time status');

    res.json({
      overview: {
        totalDoctors,
        totalReceptionists,
        totalPatients,
        totalAppointments,
        appointmentsThisMonth,
        appointmentsThisYear,
      },
      appointmentsByStatus,
      recentAppointments,
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getCharts = async (req, res) => {
  try {
    const orgId = req.tenantId;
    const now = new Date();
    
    // 1. Appointment Trends (Last 7 days)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Aggregation helper to avoid code duplication
    const aggregateTrends = async (Model) => {
      return await Model.aggregate([
        { 
          $match: { 
            organizationId: orgId,
            createdAt: { $gte: sevenDaysAgo }
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            patients: { $addToSet: "$patientId" }
          }
        }
      ]);
    };

    // Run aggregations for all active collections
    const [pendingRaw, confirmedRaw, cancelledRaw, oldRaw] = await Promise.all([
      aggregateTrends(PendingAppointment),
      aggregateTrends(ConfirmedAppointment),
      aggregateTrends(CancelledAppointment),
      aggregateTrends(Appointment)
    ]);

    // Merge results
    const combinedTrends = [...pendingRaw, ...confirmedRaw, ...cancelledRaw, ...oldRaw];

    // Format for frontend
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const appointmentTrendsRawMap = combinedTrends.reduce((acc, curr) => {
      if (!acc[curr._id]) {
        acc[curr._id] = { appointments: 0, patients: new Set() };
      }
      acc[curr._id].appointments += curr.count;
      curr.patients.forEach(pid => acc[curr._id].patients.add(pid));
      return acc;
    }, {});

    const trendDataProcessedMap = Object.keys(appointmentTrendsRawMap).reduce((acc, date) => {
      acc[date] = {
        appointments: appointmentTrendsRawMap[date].appointments,
        patients: appointmentTrendsRawMap[date].patients.size
      };
      return acc;
    }, {});

    const appointmentTrendsData = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      
      const dayData = trendDataProcessedMap[dateStr] || { appointments: 0, patients: 0 };
      appointmentTrendsData.push({
        day: dayName,
        appointments: dayData.appointments,
        patients: dayData.patients
      });
    }

    // 2. Revenue by Doctor
    const revenueByDoctorRaw = await Billing.aggregate([
      {
        $match: {
          organizationId: orgId,
          status: 'Paid'
        }
      },
      {
        $group: {
          _id: "$doctorId",
          doctorName: { $first: "$doctorName" },
          value: { $sum: "$amount" }
        }
      },
      {
        $match: {
          value: { $gt: 0 }
        }
      },
      { $sort: { value: -1 } },
      { $limit: 10 }
    ]);

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#EAB308', '#F97316', '#14B8A6', '#84CC16'];
    const revenueByDoctorData = revenueByDoctorRaw.map((item, index) => ({
      name: item.doctorName || 'Unknown',
      value: item.value,
      color: colors[index % colors.length]
    }));

    // 3. Monthly Income vs Expenses (Last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    const monthlyIncomeRaw = await Billing.aggregate([
      {
        $match: {
          organizationId: orgId,
          status: 'Paid',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          income: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const monthlyIncomeRawMap = monthlyIncomeRaw.reduce((acc, curr) => {
      acc[curr._id] = curr.income;
      return acc;
    }, {});

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyIncomeExpenseData = [];
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = monthNames[d.getMonth()];
      
      monthlyIncomeExpenseData.push({
        month: monthLabel,
        income: monthlyIncomeRawMap[monthStr] || 0,
        expenses: 0 // Placeholder as no Expenses collection
      });
    }

    res.json({
      appointmentTrends: appointmentTrendsData,
      revenueByDoctor: revenueByDoctorData,
      incomeExpense: monthlyIncomeExpenseData
    });
  } catch (error) {
    console.error('Charts analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAppointmentsStats = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const orgId = req.tenantId;

    let dateFilter = { organizationId: orgId };
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Group appointments by date
    let groupFormat = '%Y-%m-%d';
    if (groupBy === 'month') {
      groupFormat = '%Y-%m';
    } else if (groupBy === 'year') {
      groupFormat = '%Y';
    }

    const appointmentsByDate = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Appointments by doctor
    const appointmentsByDoctor = await Appointment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$doctorId',
          doctorName: { $first: '$doctorName' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      appointmentsByDate,
      appointmentsByDoctor,
    });
  } catch (error) {
    console.error('Appointment analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorStats = async (req, res) => {
  try {
    const orgId = req.tenantId;

    const doctors = await Doctor.find({ organizationId: orgId })
      .select('name specialization status');

    const doctorStats = await Promise.all(
      doctors.map(async (doctor) => {
        const [
          totalAppointments,
          confirmedAppointments,
          cancelledAppointments,
        ] = await Promise.all([
          Appointment.countDocuments({
            organizationId: orgId,
            doctorId: doctor.doctorId,
          }),
          ConfirmedAppointment.countDocuments({
            organizationId: orgId,
            doctorId: doctor.doctorId,
          }),
          CancelledAppointment.countDocuments({
            organizationId: orgId,
            doctorId: doctor.doctorId,
          }),
        ]);

        return {
          doctorId: doctor.doctorId,
          name: doctor.name,
          specialization: doctor.specialization,
          status: doctor.status,
          totalAppointments,
          confirmedAppointments,
          cancelledAppointments,
          confirmationRate:
            totalAppointments > 0
              ? ((confirmedAppointments / totalAppointments) * 100).toFixed(2)
              : 0,
        };
      })
    );

    res.json(doctorStats);
  } catch (error) {
    console.error('Doctor analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getPatientStats = async (req, res) => {
  try {
    const orgId = req.tenantId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalPatients,
      patientsThisMonth,
      patientsThisYear,
      patientsByMonth,
    ] = await Promise.all([
      User.countDocuments({ organizationId: orgId, role: 'patient' }),
      User.countDocuments({
        organizationId: orgId,
        role: 'patient',
        createdAt: { $gte: startOfMonth },
      }),
      User.countDocuments({
        organizationId: orgId,
        role: 'patient',
        createdAt: { $gte: startOfYear },
      }),
      User.aggregate([
        {
          $match: {
            organizationId: orgId,
            role: 'patient',
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$createdAt',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      totalPatients,
      patientsThisMonth,
      patientsThisYear,
      patientsByMonth,
    });
  } catch (error) {
    console.error('Patient analytics error:', error);
    res.status(500).json({ message: error.message });
  }
};
