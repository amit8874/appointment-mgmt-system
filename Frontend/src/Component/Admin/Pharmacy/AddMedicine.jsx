import React, { useState } from 'react';
import { Save, X, Image as ImageIcon, Plus, Info, AlertCircle } from 'lucide-react';
import api from '../../../services/api';

const AddMedicine = ({ medicine, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: medicine?.name || '',
    genericName: medicine?.genericName || '',
    manufacturer: medicine?.manufacturer || '',
    category: medicine?.category || '',
    type: medicine?.type || 'Tablet',
    dose: medicine?.dose || '',
    packSize: medicine?.packSize || '',
    unit: medicine?.unit || '',
    hsnCode: medicine?.hsnCode || '',
    gstPercentage: medicine?.gstPercentage || 0,
    minimumStockAlert: medicine?.minimumStockAlert || 10,
    description: medicine?.description || '',
    status: medicine?.status || 'Active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const types = [
    'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 
    'Powder', 'Drops', 'Suspension', 'Spray', 'Gel', 'Lotion', 
    'Sachet', 'Liquid', 'Inhaler', 'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      if (medicine?._id) {
        await api.put(`/internal-pharmacy/medicine/${medicine._id}`, formData);
        alert('Medicine updated successfully!');
      } else {
        await api.post('/internal-pharmacy/medicine', formData);
        alert('Medicine added successfully!');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-gray-900 overflow-y-auto">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">{medicine?._id ? 'Edit Medicine' : 'Add New Medicine'}</h1>
          <p className="text-sm text-slate-500 font-medium">{medicine?._id ? 'Update existing medicine details' : 'Register a new product in your pharmacy database'}</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm text-slate-400 hover:text-slate-600 transition-all">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Basic Information */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 mb-1">
              <Info className="w-4 h-4" />
              <h3 className="text-sm font-bold">Basic Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Medicine Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Dolo 650"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all font-bold"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Generic Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Paracetamol"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                  value={formData.genericName}
                  onChange={(e) => setFormData({...formData, genericName: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Manufacturer *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Micro Labs Ltd"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Category</label>
                <input 
                  type="text" 
                  placeholder="e.g. Analgesic"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Type</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Dose / Strength</label>
                <input 
                  type="text" 
                  placeholder="e.g. 650mg"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                  value={formData.dose}
                  onChange={(e) => setFormData({...formData, dose: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Description</label>
              <textarea 
                rows="2"
                placeholder="Optional medicine notes..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Inventory & Tax Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 mb-1">
              <Plus className="w-4 h-4" />
              <h3 className="text-sm font-bold">Stock & Pricing</h3>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Pack Size</label>
              <input 
                type="text" 
                placeholder="e.g. 15 Tablets"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                value={formData.packSize}
                onChange={(e) => setFormData({...formData, packSize: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Unit (e.g. Strip)</label>
              <input 
                type="text" 
                placeholder="e.g. Strip"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Min Stock Alert</label>
              <input 
                type="number" 
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                value={formData.minimumStockAlert}
                onChange={(e) => setFormData({...formData, minimumStockAlert: e.target.value === '' ? '' : Number(e.target.value)})}
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-gray-700 space-y-3">
              <div className="flex items-center space-x-2 text-slate-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <h3 className="text-[10px] font-bold uppercase tracking-wider">Tax Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">HSN Code</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded text-[11px] outline-none transition-all"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({...formData, hsnCode: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">GST %</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded text-[11px] outline-none transition-all"
                    value={formData.gstPercentage}
                    onChange={(e) => setFormData({...formData, gstPercentage: e.target.value === '' ? '' : Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white shadow transition-all active:scale-95 uppercase tracking-wider text-xs
              ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'}`}
          >
            <Save className="w-4 h-4 mr-2 inline-block" />
            {loading ? 'Adding...' : 'Save Medicine'}
          </button>
          
          {error && (
            <p className="text-rose-600 text-[10px] font-bold text-center bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg border border-rose-100">
              {error}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddMedicine;
