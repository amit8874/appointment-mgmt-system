import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Clock,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { pharmacyApi } from '../../services/api';
import { toast } from 'react-toastify';

const PharmacyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({
    stats: {
      newOrders: 0,
      pendingPayout: 0,
      lowStockItems: 0,
      avgProcessTime: '---',
      stockCapacity: 0
    },
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const result = await pharmacyApi.getDashboardStats();
      setData(result);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const stats = [
    { label: 'New Orders', value: data.stats.newOrders, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Payout', value: `₹${data.stats.pendingPayout}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Low Stock Items', value: data.stats.lowStockItems, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Avg Process Time', value: data.stats.avgProcessTime, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const recentOrders = data.recentOrders;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {user?.name || 'Partner'}!
          </h1>
          <p className="text-slate-500 font-medium">Here's what's happening at your pharmacy today.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Store Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
            <button 
              onClick={() => navigate('/pharmacy/orders')}
              className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 group"
            >
              View All <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Patient</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{order.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-700">{order.patient}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{order.items}</p>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900">{order.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                        order.status === 'Processing' ? 'bg-blue-50 text-blue-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate('/pharmacy/orders')}
                        className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all font-black text-indigo-600"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Inventory Status</h2>
          
          <div className="space-y-4">
            <div 
              onClick={() => navigate('/pharmacy/inventory')}
              className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <Package size={20} />
                </div>
                <div>
                  <p className="font-bold text-orange-900">Low Stock</p>
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-wide">
                    {data.stats.lowStockItems} items need attention
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-orange-400" />
            </div>

            <div className="p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between text-sm font-bold">
                    <span className="text-slate-500">Stock Capacity</span>
                    <span className="text-slate-900">{data.stats.stockCapacity}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: `${data.stats.stockCapacity}%` }}
                    ></div>
                </div>
            </div>

            <button 
              onClick={() => navigate('/pharmacy/inventory')}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
                Update Inventory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
