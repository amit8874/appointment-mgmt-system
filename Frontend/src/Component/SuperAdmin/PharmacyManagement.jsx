import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Settings, 
  ShieldCheck, 
  ShieldAlert,
  TrendingUp,
  Percent,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { superAdminApi } from '../../services/api';
import { toast } from 'react-toastify';

const PharmacyManagement = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'pending'
  const [showAddModal, setShowAddModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({}); // { pharmacyId: boolean }

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', zip: '' },
    commissionRate: 10,
    password: 'Pharmacy123@'
  });

  const [approvalData, setApprovalData] = useState({
    email: '',
    password: '',
    ownerName: '',
    commissionRate: 10
  });

  useEffect(() => {
    fetchPharmacies();
  }, []);

  const fetchPharmacies = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getPharmacies();
      setPharmacies(data);
    } catch (err) {
      toast.error('Failed to load pharmacies');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await superAdminApi.updatePharmacyStatus(id, newStatus);
      toast.success(`Store ${newStatus === 'active' ? 'activated' : 'suspended'}`);
      fetchPharmacies();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await superAdminApi.createPharmacy(formData);
      toast.success('Pharmacy onboarded successfully!');
      setShowAddModal(false);
      fetchPharmacies();
      setFormData({
        name: '',
        ownerName: '',
        email: '',
        phone: '',
        address: { street: '', city: '', state: '', zip: '' },
        commissionRate: 10,
        password: 'Pharmacy123@'
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Onboarding failed');
    }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    try {
      await superAdminApi.approvePharmacy(selectedPharmacy._id, approvalData);
      toast.success('Pharmacy approved and credentials sent!');
      setShowApproveModal(false);
      fetchPharmacies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const openApproveModal = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setApprovalData({
      email: pharmacy.email,
      password: `Phar${Math.random().toString(36).slice(-6)}@`,
      ownerName: pharmacy.ownerName || '',
      commissionRate: 10
    });
    setShowApproveModal(true);
  };

  const filteredPharmacies = pharmacies.filter(p => 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
    p.status === activeTab
  );

  const stats = [
    { label: 'Total Stores', value: pharmacies.length, icon: Store, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Partners', value: pharmacies.filter(p => p.status === 'active').length, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Suspended', value: pharmacies.filter(p => p.status === 'suspended').length, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Pending Requests', value: pharmacies.filter(p => p.status === 'pending').length, icon: Settings, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy Management</h1>
          <p className="text-slate-500">Onboard and manage medical store partners in your ecosystem</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-100"
        >
          <Plus size={20} />
          Onboard New Store
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Active
          </button>
          <button 
            onClick={() => setActiveTab('suspended')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'suspended' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Suspended
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Pending
            {pharmacies.filter(p => p.status === 'pending').length > 0 && (
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeTab === 'pending' ? 'bg-white text-indigo-600' : 'bg-orange-500 text-white'}`}>
                {pharmacies.filter(p => p.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search stores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Pharmacy List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-slate-100"></div>)
        ) : filteredPharmacies.length > 0 ? (
          filteredPharmacies.map((pharmacy) => (
            <motion.div 
              layout
              key={pharmacy._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                      <Store size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{pharmacy.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        pharmacy.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 
                        pharmacy.status === 'suspended' ? 'bg-red-50 text-red-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {pharmacy.status}
                      </span>
                    </div>
                  </div>
                  {(pharmacy.status === 'active' || pharmacy.status === 'suspended') && (
                    <button 
                      onClick={() => handleStatusUpdate(pharmacy._id, pharmacy.status)}
                      title={pharmacy.status === 'active' ? 'Suspend Store' : 'Activate Store'}
                      className={`p-2 rounded-lg transition-colors ${
                        pharmacy.status === 'active' ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'
                      }`}
                    >
                      {pharmacy.status === 'active' ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                    </button>
                  )}
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <User size={14} />
                    <span>Contact: {pharmacy.ownerId?.name || pharmacy.ownerName || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail size={14} />
                    <span>{pharmacy.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin size={14} />
                    <span>{pharmacy.address?.city}, {pharmacy.address?.state}</span>
                  </div>
                  
                  {/* Credentials Section for Super Admin */}
                  {(pharmacy.status === 'active' || pharmacy.status === 'suspended') && pharmacy.ownerId && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Login Credentials</p>
                       <div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2 text-slate-600">
                           <Mail size={12} className="text-indigo-500" />
                           <span className="font-medium">{pharmacy.ownerId.email || pharmacy.email}</span>
                         </div>
                       </div>
                       <div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2 text-slate-600">
                           <Lock size={12} className="text-indigo-500" />
                           <span className="font-mono font-bold">
                             {visiblePasswords[pharmacy._id] ? (pharmacy.ownerId.plainPassword || '******') : '••••••••'}
                           </span>
                         </div>
                         <button 
                           onClick={() => togglePasswordVisibility(pharmacy._id)}
                           className="text-indigo-600 hover:text-indigo-700 font-bold"
                         >
                           {visiblePasswords[pharmacy._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                         </button>
                       </div>
                    </div>
                  )}
                </div>

                {pharmacy.status === 'active' ? (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-slate-600 font-bold">
                      <TrendingUp size={16} className="text-indigo-500" />
                      <span className="text-sm">{pharmacy.commissionRate}% Cut</span>
                    </div>
                    <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                      View Details
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-50">
                    <button 
                      onClick={() => openApproveModal(pharmacy)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl transition-all shadow-lg shadow-emerald-50 block text-center"
                    >
                      Review & Approve
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-500">
            <Store size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-lg text-center px-4">No {activeTab} pharmacies found</p>
          </div>
        )}
      </div>

      {/* Approve Pharmacy Modal */}
      <AnimatePresence>
        {showApproveModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowApproveModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50">
                <h2 className="text-2xl font-black text-slate-900">Approve Pharmacy Partner</h2>
                <p className="text-slate-500 font-medium">Create official credentials for {selectedPharmacy?.name}</p>
              </div>

              <form onSubmit={handleApprove} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Assign Owner Name</label>
                      <input 
                        required
                        type="text" 
                        value={approvalData.ownerName}
                        onChange={(e) => setApprovalData({...approvalData, ownerName: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Commission %</label>
                      <input 
                        required
                        type="number" 
                        value={approvalData.commissionRate}
                        onChange={(e) => setApprovalData({...approvalData, commissionRate: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Official Login Email</label>
                    <input 
                      required
                      type="email" 
                      value={approvalData.email}
                      onChange={(e) => setApprovalData({...approvalData, email: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Generate Password</label>
                    <input 
                      required
                      type="text" 
                      value={approvalData.password}
                      onChange={(e) => setApprovalData({...approvalData, password: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-700"
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <ShieldCheck size={14} />
                    On approval, credentials will be sent to {approvalData.email}
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowApproveModal(false)}
                    className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
                  >
                    Approve & Send
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Standard Add Store Modal (Manual) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Onboard New Pharmacy</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Store Info */}
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Store Information</p>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Pharmacy Name</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                        placeholder="e.g. Apollo Pharmacy"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Official Email</label>
                      <input 
                        required
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Owner Info */}
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Owner Information</p>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Owner Full Name</label>
                      <input 
                        required
                        type="text" 
                        value={formData.ownerName}
                        onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Admin Password</label>
                      <input 
                        required
                        type="password" 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-8 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                  >
                    Create Partner
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PharmacyManagement;
