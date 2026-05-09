import React from 'react';
import { ShoppingBag, AlertTriangle, Package, TrendingUp } from 'lucide-react';

const PharmacyTab = ({ data }) => {
  const topSelling = data?.topSelling || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Stock Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{data?.inventoryValue?.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{data?.lowStockCount || 0} items</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Expiring (30d)</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{data?.expiringSoon || 0} batches</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Pharmacy Bills</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{topSelling.length} items sold</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Top Selling Medicines</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Medicine Name</th>
                <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Sold Quantity</th>
                <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {topSelling.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{item._id}</td>
                  <td className="px-6 py-4">{item.totalSold}</td>
                  <td className="px-6 py-4 font-bold text-blue-600">₹{item.revenue?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PharmacyTab;
