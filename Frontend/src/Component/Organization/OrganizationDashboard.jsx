import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationApi, analyticsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TrialNotification from './TrialNotification';

const OrganizationDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get organizationId from user object or localStorage (ensure only ID string is used)
  const orgRawId = user?.organizationId || localStorage.getItem('organizationId');
  const organizationId = typeof orgRawId === 'object' ? orgRawId._id : orgRawId;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (organizationId) {
        const [orgData, analyticsData] = await Promise.all([
          organizationApi.getById(organizationId),
          analyticsApi.getDashboard(),
        ]);
        setOrganization(orgData);
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Trial Notification */}
      {organizationId && (
        <TrialNotification organizationId={organizationId} />
      )}

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {organization?.name || 'Organization Dashboard'}
              </h1>
              <p className="text-sm text-gray-600">
                {organization?.email}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/organization/subscription')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Manage Subscription
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  sessionStorage.removeItem('token');
                  navigate('/');
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Doctors"
              value={analytics.overview?.totalDoctors || 0}
              icon="👨‍⚕️"
            />
            <StatCard
              title="Total Patients"
              value={analytics.overview?.totalPatients || 0}
              icon="🏥"
            />
            <StatCard
              title="Appointments (This Month)"
              value={analytics.overview?.appointmentsThisMonth || 0}
              icon="📅"
            />
            <StatCard
              title="Total Appointments"
              value={analytics.overview?.totalAppointments || 0}
              icon="📋"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/admin-dashboard')}
              className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Manage Clinic
            </button>
            <button
              onClick={() => navigate('/organization/subscription')}
              className="px-4 py-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
            >
              Subscription
            </button>
            <button
              onClick={() => navigate('/receptionist')}
              className="px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Receptionist Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
};

export default OrganizationDashboard;
