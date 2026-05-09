import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  History, 
  ChevronLeft, 
  ChevronRight,
  PackagePlus,
  Layers,
  Settings2,
  AlertCircle,
  X
} from 'lucide-react';
import api from '../../../services/api';

const Inventory = ({ onAddMedicine, onEditMedicine, onAddStock }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    manufacturer: '',
    type: '',
    category: '',
    stockStatus: '',
    expiryStatus: ''
  });

  useEffect(() => {
    fetchInventory();
  }, [filters]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(filters);
      const response = await api.get(`/internal-pharmacy/inventory?${params.toString()}`);
      setInventory(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (med) => {
    setSelectedMedicine(med);
    setShowDetailModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Stock': return 'bg-green-100 text-green-700';
      case 'Low Stock': return 'bg-orange-100 text-orange-700';
      case 'Out of Stock': return 'bg-red-100 text-red-700';
      case 'Expired': return 'bg-rose-100 text-rose-700';
      case 'Expiring Soon': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Medicine Inventory</h1>
          <p className="text-sm text-slate-500 font-medium">Manage your pharmacy stock and medicine details</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onAddMedicine}
            className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg shadow-sm hover:bg-slate-900 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Medicine
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search medicine or generic name..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-300 outline-none"
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
        </div>
        <select 
          className="px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
          value={filters.stockStatus}
          onChange={(e) => setFilters({...filters, stockStatus: e.target.value})}
        >
          <option value="">Stock Status</option>
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>
        <select 
          className="px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 outline-none"
          value={filters.expiryStatus}
          onChange={(e) => setFilters({...filters, expiryStatus: e.target.value})}
        >
          <option value="">Expiry Status</option>
          <option value="Valid">Valid</option>
          <option value="Expiring Soon">Expiring Soon</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-100 dark:border-gray-700">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicine Details</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type & Category</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Stock</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pricing</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="6" className="px-4 py-6"><div className="h-3 bg-slate-100 dark:bg-gray-700 rounded w-full"></div></td>
                  </tr>
                ))
              ) : inventory.length > 0 ? inventory.map((med, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-slate-600 font-bold mr-3 text-xs">
                        {med.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{med.name}</p>
                        <p className="text-[10px] text-slate-500">{med.genericName || 'No Generic Name'}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{med.manufacturer}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-bold rounded uppercase">{med.type}</span>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{med.category}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex flex-col items-center">
                      <p className={`text-xs font-bold ${med.totalStock <= med.minimumStockAlert ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
                        {med.totalStock}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{med.batchCount} Batches</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">MRP: ₹{med.mrp}</p>
                      <p className="text-[10px] font-medium text-slate-400">Sale: ₹{med.sellingPrice}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase text-center ${getStatusColor(med.stockStatus)}`}>
                        {med.stockStatus}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase text-center ${getStatusColor(med.expiryStatus)}`}>
                        {med.expiryStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleView(med)}
                        title="View" 
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onAddStock(med)}
                        title="Add Stock" 
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded transition-all"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onEditMedicine(med)}
                        title="Edit" 
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No medicines found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedMedicine && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-800/50">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 text-indigo-500" />
                Medicine Details
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicine Name</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedMedicine.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Generic Name</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedMedicine.genericName || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manufacturer</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedMedicine.manufacturer}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedMedicine.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Stock</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedMedicine.totalStock} {selectedMedicine.unit}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Min Stock Alert</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedMedicine.minimumStockAlert}</p>
                </div>
              </div>

              {selectedMedicine.description && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{selectedMedicine.description}</p>
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-100 dark:border-gray-700">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3">Batch Information</h4>
                <p className="text-xs text-slate-500 mb-2 italic">Note: Full batch details available in "Opening Stock" or "Expiry Report"</p>
                {/* Simplified batch view */}
                <div className="bg-slate-50 dark:bg-gray-900/50 p-3 rounded-lg border border-slate-100 dark:border-gray-700">
                   <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                     <span>Batch Count: {selectedMedicine.batchCount}</span>
                     <span>Current Stock: {selectedMedicine.totalStock}</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
