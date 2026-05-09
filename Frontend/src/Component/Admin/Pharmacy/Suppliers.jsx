import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Mail, Phone, MapPin, MoreVertical, Edit, Trash2 } from 'lucide-react';
import api from '../../../services/api';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstNumber: '',
    address: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/internal-pharmacy/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sup) => {
    setEditingId(sup._id);
    setFormData({
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      gstNumber: sup.gstNumber || '',
      address: sup.address || '',
      city: sup.city || '',
      state: sup.state || ''
    });
    setShowAddForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/internal-pharmacy/suppliers/${editingId}`, formData);
      } else {
        await api.post('/internal-pharmacy/suppliers', formData);
      }
      setShowAddForm(false);
      setEditingId(null);
      setFormData({ name: '', contactPerson: '', phone: '', email: '', gstNumber: '', address: '', city: '', state: '' });
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert(error.response?.data?.message || 'Failed to save supplier');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await api.delete(`/internal-pharmacy/suppliers/${id}`);
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Failed to delete supplier');
    }
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900 min-h-full relative">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Supplier Management</h1>
          <p className="text-sm text-slate-500 font-medium">Manage your pharmaceutical vendors and contact details</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setFormData({ name: '', contactPerson: '', phone: '', email: '', gstNumber: '', address: '', city: '', state: '' }); setShowAddForm(true); }}
          className="flex items-center px-5 py-2.5 bg-slate-800 text-white rounded-lg shadow-sm font-bold hover:bg-slate-900 transition-all text-xs uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Supplier
        </button>
      </div>

      {/* Add/Edit Supplier Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/50 dark:bg-gray-900/50">
              <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                {editingId ? 'Edit Supplier Details' : 'New Supplier Details'}
              </h2>
              <button onClick={() => { setShowAddForm(false); setEditingId(null); }} className="text-slate-400 hover:text-rose-500 transition-colors"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Supplier / Company Name *</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter company name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Contact Person</label>
                  <input 
                    type="text" 
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                    placeholder="Person name"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Mobile Number</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Email ID</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="vendor@email.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">GST Number</label>
                  <input 
                    type="text" 
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({...formData, gstNumber: e.target.value})}
                    placeholder="27XXXXX..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 font-medium"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Full Address</label>
                  <textarea 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Street, Area, Building..."
                    rows="2"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 font-medium resize-none"
                  ></textarea>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">City</label>
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="City"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">State</label>
                  <input 
                    type="text" 
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="State"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => { setShowAddForm(false); setEditingId(null); }}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-slate-800 text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
                >
                  {editingId ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by supplier name, contact person or city..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-slate-300 font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 animate-pulse"></div>
        )) : suppliers.length > 0 ? suppliers.map((sup, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm hover:shadow transition-all group relative animate-fadeIn">
            <div className="absolute top-0 right-0 p-3">
              <button 
                onClick={() => handleEdit(sup)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg transition-all"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-gray-900 flex items-center justify-center text-slate-600 transition-all border border-slate-100 dark:border-gray-700">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{sup.name}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{sup.contactPerson || 'Vendor'}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 font-bold">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{sup.phone || 'No Phone'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{sup.email || 'No Email'}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                <span className="text-[10px] leading-relaxed line-clamp-1">{sup.address}, {sup.city}</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-gray-700 flex justify-between items-center">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gst No</p>
                <p className="font-bold text-slate-800 dark:text-white text-[11px]">{sup.gstNumber || 'N/A'}</p>
              </div>
              <button 
                onClick={() => handleDelete(sup._id)}
                className="text-[10px] font-bold text-rose-600 uppercase tracking-wider hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-10 text-center flex flex-col items-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-slate-300">
            <Truck className="w-10 h-10 text-slate-300 mb-3" />
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">No suppliers found</p>
            <button onClick={() => setShowAddForm(true)} className="mt-2 text-[10px] font-black text-slate-800 underline uppercase tracking-widest">Add your first supplier</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Suppliers;
