import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/api';

const RevenueAnalytics = () => {
  const [revenueData, setRevenueData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getRevenue();
      // API returns { revenueData: [...], totalRevenue: number }
      setRevenueData(data.revenueData || data.data?.revenueData || []);
      setTotalRevenue(data.totalRevenue || data.data?.totalRevenue || 0);
    } catch (err) {
      setError('Failed to load revenue data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysLeft = (expiryDate) => {
    if (!expiryDate) return null;
    const diffTime = new Date(expiryDate) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (days) => {
    if (days === null) return 'text-gray-400';
    if (days <= 0) return 'text-red-600 bg-red-50';
    if (days <= 5) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  const formatWhatsAppLink = (phone, orgName, days) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `Hello ${orgName}, your Slotify plan ${days <= 0 ? 'has expired' : `is expiring in ${days} days`}. Please renew to avoid any service interruption.`;
    return `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  if (loading) return <div className="p-6">Loading revenue analytics...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Revenue & Expiry Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Manage clinic renewals and track income</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Lifetime Revenue</p>
          <div className="text-2xl font-bold text-green-600">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Clinic Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Upgraded On</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Expires On</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reminder</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {revenueData.length > 0 ? (
              revenueData.map((item, index) => {
                const daysLeft = getDaysLeft(item.expiryDate);
                
                const formatDate = (dateStr) => {
                  if (!dateStr) return 'N/A';
                  const dateParts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('-');
                  if (dateParts.length !== 3) return dateStr;
                  const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                };

                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{item.organizationName}</div>
                      <div className="text-xs text-gray-400">{item.organizationPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md">
                        {item.planName || 'Pro'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(item.period)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {formatDate(item.expiryDate?.split('T')[0])}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ₹{item.amount?.toLocaleString('en-IN') || 499}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(daysLeft)}`}>
                        {daysLeft === null ? 'N/A' : daysLeft <= 0 ? 'EXPIRED' : `${daysLeft} Days Left`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.organizationPhone ? (
                        <a 
                          href={formatWhatsAppLink(item.organizationPhone, item.organizationName, daysLeft)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm hover:shadow-md"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          Remind
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">No Phone</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="2" className="px-6 py-4 text-center text-gray-500">
                  No revenue data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RevenueAnalytics;
