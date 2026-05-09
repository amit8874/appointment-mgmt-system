import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  ChevronRight,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import api from '../../../services/api';

const PharmacyDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lowStockPage, setLowStockPage] = useState(0);
  const [recentBillsPage, setRecentBillsPage] = useState(0);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/internal-pharmacy/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching pharmacy dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Medicines', value: data?.summary?.totalMedicines || 0, icon: Package, color: 'blue' },
    { label: 'Total Stock Qty', value: data?.summary?.totalStockQuantity || 0, icon: Activity, color: 'indigo' },
    { label: 'Total Stock Value', value: `₹${data?.summary?.totalStockValue?.toLocaleString() || 0}`, icon: TrendingUp, color: 'emerald' },
    { label: 'Today Pharmacy Sales', value: `₹${data?.summary?.todayPharmacySales?.toLocaleString() || 0}`, icon: ShoppingCart, color: 'violet' },
    { label: 'Low Stock Items', value: data?.summary?.lowStockItems || 0, icon: AlertTriangle, color: 'orange' },
    { label: 'Out of Stock', value: data?.summary?.outOfStockItems || 0, icon: AlertTriangle, color: 'red' },
    { label: 'Expiring Soon', value: data?.summary?.expiringSoon || 0, icon: Clock, color: 'amber' },
    { label: 'Expired Medicines', value: data?.summary?.expiredMedicines || 0, icon: AlertTriangle, color: 'rose' },
  ];

  return (
    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Pharmacy Dashboard</h1>
          <p className="text-sm text-slate-500 font-medium">Overview of your pharmacy operations</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm text-xs font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-50 transition-all"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm transition-all group">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-gray-900 text-slate-600">
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock & Expiring Soon */}
        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-800/50">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                Low Stock Medicines
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  disabled={lowStockPage === 0}
                  onClick={() => setLowStockPage(prev => prev - 1)}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-bold text-slate-500">{lowStockPage + 1} / {Math.ceil((data?.lowStockMedicines?.length || 0) / itemsPerPage)}</span>
                <button 
                  disabled={(lowStockPage + 1) * itemsPerPage >= (data?.lowStockMedicines?.length || 0)}
                  onClick={() => setLowStockPage(prev => prev + 1)}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-gray-700 font-medium">
              {data?.lowStockMedicines?.length > 0 ? data.lowStockMedicines.slice(lowStockPage * itemsPerPage, (lowStockPage + 1) * itemsPerPage).map((med, i) => (
                <div key={i} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div>
                    <p className="text-xs text-slate-800 dark:text-white font-bold">{med.name}</p>
                    <p className="text-[10px] text-slate-500">{med.manufacturer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-rose-600">Stock: {med.totalStock || 0}</p>
                  </div>
                </div>
              )) : (
                <p className="p-6 text-center text-slate-400 text-xs">All stocks are healthy.</p>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-800/50">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center">
                <Clock className="w-4 h-4 mr-2 text-slate-500" />
                Expiring Soon
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-gray-700 font-medium">
              {data?.expiringSoonMedicines?.length > 0 ? data.expiringSoonMedicines.slice(0, 5).map((batch, i) => (
                <div key={i} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div>
                    <p className="text-xs text-slate-800 dark:text-white font-bold">Batch: {batch.batchNo}</p>
                    <p className="text-[10px] text-slate-500">Exp: {new Date(batch.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-600">Qty: {batch.stockQuantity}</p>
                  </div>
                </div>
              )) : (
                <p className="p-6 text-center text-slate-400 text-xs">No items expiring soon.</p>
              )}
            </div>
          </section>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-800/50">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center">
                <ShoppingCart className="w-4 h-4 mr-2 text-slate-500" />
                Recent Pharmacy Bills
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  disabled={recentBillsPage === 0}
                  onClick={() => setRecentBillsPage(prev => prev - 1)}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-bold text-slate-500">{recentBillsPage + 1} / {Math.ceil((data?.recentPharmacyBills?.length || 0) / itemsPerPage)}</span>
                <button 
                  disabled={(recentBillsPage + 1) * itemsPerPage >= (data?.recentPharmacyBills?.length || 0)}
                  onClick={() => setRecentBillsPage(prev => prev + 1)}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-gray-700 font-medium">
              {data?.recentPharmacyBills?.length > 0 ? data.recentPharmacyBills.slice(recentBillsPage * itemsPerPage, (recentBillsPage + 1) * itemsPerPage).map((bill, i) => (
                <div key={i} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div>
                    <p className="text-xs text-slate-800 dark:text-white font-bold">{bill.patientName}</p>
                    <p className="text-[10px] text-slate-500">{new Date(bill.date).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800 dark:text-white">₹{bill.amount}</p>
                  </div>
                </div>
              )) : (
                <p className="p-6 text-center text-slate-400 text-xs">No recent sales.</p>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-800/50">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center">
                <Package className="w-4 h-4 mr-2 text-slate-500" />
                Recent Purchases
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-gray-700 font-medium">
              {data?.recentPurchases?.length > 0 ? data.recentPurchases.map((pur, i) => (
                <div key={i} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div>
                    <p className="text-xs text-slate-800 dark:text-white font-bold">Inv: {pur.purchaseInvoiceNo}</p>
                    <p className="text-[10px] text-slate-500">{pur.supplierName || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800 dark:text-white">₹{pur.netAmount}</p>
                  </div>
                </div>
              )) : (
                <p className="p-6 text-center text-slate-400 text-xs">No recent purchases.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
