import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye,
  FileText,
  CreditCard,
  Plus,
  Phone,
  Store,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pharmacyApi } from '../../services/api';
import { toast } from 'react-toastify';
import PrescriptionQuoteModal from './PrescriptionQuoteModal';

const PharmacyOrders = () => {
  const [activeTab, setActiveTab] = useState('standard'); // 'standard', 'prescriptions'
  const [orders, setOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    if (activeTab === 'standard') fetchOrders();
    else fetchPrescriptions();
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await pharmacyApi.getOrders();
      setOrders(data);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const data = await pharmacyApi.getPharmacyPrescriptions();
      setPrescriptions(data);
    } catch (err) {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const handlePrescriptionStatusUpdate = async (presId, newStatus) => {
    try {
      await pharmacyApi.updatePrescriptionOrderStatus(presId, newStatus);
      toast.success(`Request marked as ${newStatus}`);
      fetchPrescriptions();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await pharmacyApi.updateOrderStatus(orderId, newStatus);
      toast.success(`Order marked as ${newStatus}`);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerId?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'processing': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
      case 'accepted': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'quoted': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'ready': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'shipped': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Orders Management</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">TRACK AND PROCESS CUSTOMER REQUESTS</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl w-fit border border-slate-100 shadow-sm">
        <button 
          onClick={() => setActiveTab('standard')}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'standard' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Standard Orders
        </button>
        <button 
          onClick={() => setActiveTab('prescriptions')}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'prescriptions' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Prescription Requests
        </button>
      </div>

      {activeTab === 'standard' ? (
        <>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search by Order ID or Patient..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                />
                </div>

                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                {['all', 'pending', 'processing', 'completed', 'cancelled'].map((status) => (
                    <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        filterStatus === status 
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                    >
                    {status}
                    </button>
                ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse border border-slate-100"></div>)
                ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                    <motion.div 
                    layout
                    key={order._id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                    <div className="flex items-start gap-4">
                        <div className={`p-4 rounded-2xl ${getStatusColor(order.status).split(' ')[0]}`}>
                        <Package size={24} className={getStatusColor(order.status).split(' ')[1]} />
                        </div>
                        <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-black text-slate-900">{order.orderId}</h3>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                                {order.status}
                            </span>
                        </div>
                        <p className="font-bold text-slate-700">{order.customerId?.name || 'Unknown Patient'}</p>
                        <p className="text-xs text-slate-400 font-medium">Ordered on {new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-1">
                        <p className="text-2xl font-black text-indigo-600">₹{order.totalAmount}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{order.paymentStatus}</p>
                    </div>

                    <div className="flex items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                        {order.status === 'pending' && (
                        <button 
                            onClick={() => handleStatusUpdate(order._id, 'processing')}
                            className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            <Clock size={16} /> Process
                        </button>
                        )}
                        {order.status === 'processing' && (
                        <button 
                            onClick={() => handleStatusUpdate(order._id, 'completed')}
                            className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center gap-2"
                        >
                            <CheckCircle2 size={16} /> Complete
                        </button>
                        )}
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <button 
                            onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                            className="flex-1 md:flex-none px-4 py-2 bg-white text-red-600 border border-red-100 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-50 transition-all flex items-center gap-2"
                        >
                            <XCircle size={16} /> Cancel
                        </button>
                        )}
                        <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all">
                        <Eye size={20} />
                        </button>
                    </div>
                    </motion.div>
                ))
                ) : (
                <div className="py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <Package size={64} className="mb-4 opacity-20" />
                    <p className="font-bold text-xl">No orders found</p>
                </div>
                )}
            </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6">
            {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse border border-slate-100"></div>)
            ) : prescriptions.length > 0 ? (
                prescriptions.map((pres) => (
                    <motion.div 
                        layout
                        key={pres._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-4 rounded-2xl ${getStatusColor(pres.status).split(' ')[0]}`}>
                                <FileText size={24} className={getStatusColor(pres.status).split(' ')[1]} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">Prescription Request</h3>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(pres.status)}`}>
                                        {pres.status}
                                    </span>
                                </div>
                                <p className="font-bold text-slate-700">{pres.patientId?.fullName || 'Anonymous Patient'}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <Phone size={12} />
                                        {pres.mobileNumber || 'N/A'}
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${pres.deliveryMethod === 'pickup' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {pres.deliveryMethod === 'pickup' ? <Store size={12} /> : <MapPin size={12} />}
                                        {pres.deliveryMethod || 'Pickup'}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 font-medium mt-2">Received on {new Date(pres.createdAt).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:items-end gap-1">
                            {pres.status === 'accepted' ? (
                                <p className="text-sm font-black text-orange-500 uppercase tracking-widest animate-pulse italic">PENDING QUOTE</p>
                            ) : (
                                <>
                                    <p className="text-2xl font-black text-indigo-600">₹{pres.quotedTotal}</p>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                        {pres.status === 'quoted' ? 'Patient reviewing' : 'Payment received'}
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {pres.status === 'accepted' && (
                                <button 
                                    onClick={() => setSelectedPrescription(pres)}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/10"
                                >
                                    <Plus size={18} /> Build Quote
                                </button>
                            )}
                            {(pres.status === 'paid' || pres.status === 'accepted') && (
                                <button 
                                    onClick={() => handlePrescriptionStatusUpdate(pres._id, 'ready')}
                                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-3 shadow-xl shadow-emerald-500/10"
                                >
                                    <CheckCircle2 size={18} /> Ready to Deliver
                                </button>
                            )}
                            {pres.status === 'ready' && (
                                <button 
                                    onClick={() => handlePrescriptionStatusUpdate(pres._id, 'shipped')}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-xl shadow-indigo-500/10"
                                >
                                    <Package size={18} /> Out for Delivery
                                </button>
                            )}
                            {pres.status === 'shipped' && (
                                <button 
                                    onClick={() => handlePrescriptionStatusUpdate(pres._id, 'completed')}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl shadow-slate-200"
                                >
                                    <CheckCircle2 size={18} /> Mark Delivered
                                </button>
                            )}
                            {pres.status === 'quoted' && (
                                <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={16} /> Quoted
                                </div>
                            )}
                            <button 
                                onClick={() => setSelectedPrescription(pres)}
                                className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all"
                            >
                                <Eye size={20} />
                            </button>
                        </div>
                    </motion.div>
                ))
            ) : (
                <div className="py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <FileText size={64} className="mb-4 opacity-20" />
                    <p className="font-bold text-xl">No prescriptions found</p>
                    <p className="text-sm">Broadcasted requests you accepted will appear here</p>
                </div>
            )}
        </div>
      )}

      {/* Quote Modal */}
      <AnimatePresence>
        {selectedPrescription && (
          <PrescriptionQuoteModal 
            prescription={selectedPrescription}
            onClose={() => setSelectedPrescription(null)}
            onSuccess={activeTab === 'standard' ? fetchOrders : fetchPrescriptions}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PharmacyOrders;
