import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Search, ChevronRight, Package, Download } from 'lucide-react';
import api from '../../../services/api';

const ExpiryLowStock = () => {
  const [data, setData] = useState({ lowStock: [], expired: [], expiringSoon: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/internal-pharmacy/dashboard'); // Reusing dashboard data for now
      setData({
        lowStock: response.data.lowStockMedicines || [],
        expired: response.data.expiredMedicines || [],
        expiringSoon: response.data.expiringSoonMedicines || []
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="px-2">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Inventory Alerts</h1>
        <p className="text-sm text-slate-500 font-medium">Manage medicines that require immediate attention</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expired List */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-rose-500" />
              Expired
            </h3>
            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-bold">{data.expired.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-gray-700">
            {data.expired.length > 0 ? data.expired.map((item, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{item.medicineName || 'Medicine'}</p>
                </div>
                <div className="flex justify-between text-[10px] font-medium text-slate-500">
                  <p>Batch: {item.batchNo}</p>
                  <p className="text-rose-600 font-bold">Qty: {item.stockQuantity}</p>
                </div>
              </div>
            )) : <p className="p-10 text-center text-slate-400 text-xs font-medium">No expired medicines.</p>}
          </div>
        </section>

        {/* Expiring Soon List */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center">
              <Clock className="w-4 h-4 mr-2 text-amber-500" />
              Expiring Soon
            </h3>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-bold">{data.expiringSoon.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-gray-700">
            {data.expiringSoon.length > 0 ? data.expiringSoon.map((item, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{item.medicineName || 'Medicine'}</p>
                </div>
                <div className="flex justify-between text-[10px] font-medium text-slate-500">
                  <p>Batch: {item.batchNo}</p>
                  <p className="text-amber-600 font-bold">Qty: {item.stockQuantity}</p>
                </div>
              </div>
            )) : <p className="p-10 text-center text-slate-400 text-xs font-medium">No near-expiry medicines.</p>}
          </div>
        </section>

        {/* Low Stock List */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center">
              <Package className="w-4 h-4 mr-2 text-slate-500" />
              Low Stock
            </h3>
            <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px] font-bold">{data.lowStock.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-gray-700">
            {data.lowStock.length > 0 ? data.lowStock.map((item, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{item.name}</p>
                </div>
                <div className="flex justify-between text-[10px] font-medium text-slate-500">
                  <p>{item.manufacturer}</p>
                  <p className="text-orange-600 font-bold">Stock: {item.totalStock}</p>
                </div>
              </div>
            )) : <p className="p-10 text-center text-slate-400 text-xs font-medium">All stocks healthy.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExpiryLowStock;
