import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, IndianRupee, Clock, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statIcons = {
  todayAppointments: Calendar,
  patientsToday: Users,
  waitingForCheckin: Clock,
  newPatients: UserPlus,
  totalCollected: IndianRupee,
  pendingPayments: Clock,
};

const statColors = {
  todayAppointments: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-l-4 border-blue-500',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  patientsToday: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-l-4 border-green-500',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  waitingForCheckin: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-l-4 border-amber-500',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600'
  },
  newPatients: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-l-4 border-indigo-500',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600'
  },
  totalCollected: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-l-4 border-purple-500',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  pendingPayments: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-l-4 border-rose-500',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600'
  },
};

const statLabels = {
  todayAppointments: "Today's Appointments",
  patientsToday: 'Total Patients Today',
  waitingForCheckin: 'Waiting for Check-in',
  newPatients: 'New Patients Today',
  totalCollected: 'Total Collected',
  pendingPayments: 'Pending Payments',
};

// Maps each stat key to the correct route
const statLinks = {
  todayAppointments: '/receptionist/appointments',
  patientsToday: '/receptionist/patients',
  waitingForCheckin: '/receptionist/appointments',
  newPatients: '/receptionist/patients',
  totalCollected: '/receptionist/billing',
  pendingPayments: '/receptionist/billing',
};

const DashboardStats = ({ stats, loading }) => {
  const navigate = useNavigate();

  const statsArray = Object.entries(stats).map(([key, value]) => ({
    id: key,
    value: key === 'totalCollected' || key === 'pendingPayments' ? `₹${value}` : value,
    label: statLabels[key] || key,
    icon: statIcons[key] || null,
    color: statColors[key] || {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      border: 'border-l-4 border-gray-400',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    link: statLinks[key] || '/receptionist',
  }));

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {statsArray.map((stat, index) => (
        <motion.div
          key={stat.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{
            y: -8,
            scale: 1.02,
            transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
          }}
          transition={{ delay: index * 0.1, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={`${stat.color.bg} ${stat.color.border} overflow-hidden rounded-r-lg`}
        >
          <div className="px-4 py-5 sm:p-5">
            <div className="flex items-start">
              <div className={`flex-shrink-0 rounded-full p-2 ${stat.color.iconBg} ${stat.color.iconColor}`}>
                {stat.icon && <stat.icon className="h-5 w-5" aria-hidden="true" />}
              </div>
              <div className="ml-4 w-0 flex-1">
                <p className="text-sm font-medium text-gray-500 truncate">{stat.label}</p>
                {loading ? (
                  <div className="mt-1 h-7 bg-gray-200 rounded w-3/4 animate-pulse" />
                ) : (
                  <dd className="flex items-baseline">
                    <div className={`text-xl font-bold ${stat.color.text}`}>{stat.value}</div>
                  </dd>
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <button
                onClick={() => navigate(stat.link)}
                className={`font-medium ${stat.color.text} hover:underline focus:outline-none`}
              >
                View all →
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default DashboardStats;
