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
import DispenseMedicineModal from './DispenseMedicineModal';

const PharmacyOrders = () => {
  const [activeTab, setActiveTab] = useState('standard'); // 'standard', 'prescriptions'
  const [orders, setOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showDispenseModal, setShowDispenseModal] = useState(false);

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
    <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Orders Management</h1>
          <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-0.5">TRACK AND PROCESS CUSTOMER REQUESTS</p>
        </div>
      </div>

      {/* Tabs & Search Together */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm shrink-0">
                <button 
                onClick={() => setActiveTab('standard')}
                className={`px-5 py-2 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all ${activeTab === 'standard' ? 'bg-slate-900 text-white shadow-md shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                Standard Orders
                </button>
                <button 
                onClick={() => setActiveTab('prescriptions')}
                className={`px-5 py-2 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all ${activeTab === 'prescriptions' ? 'bg-slate-900 text-white shadow-md shadow-slate-200' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                Prescriptions
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto items-center">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search ID or Patient..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                    />
                </div>

                <div className="flex gap-1 overflow-x-auto w-full md:w-auto shrink-0 pb-1 md:pb-0">
                    {['all', 'pending', 'processing', 'completed', 'cancelled'].map((status) => (
                        <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                            filterStatus === status 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                        >
                        {status}
                        </button>
                    ))}
                </div>
            </div>
      </div>

      {activeTab === 'standard' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="6" className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                </tr>
                            ))
                        ) : filteredOrders.length > 0 ? (
                            filteredOrders.map((order) => (
                                <tr key={order._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${getStatusColor(order.status).split(' ')[0]}`}>
                                                <Package size={16} className={getStatusColor(order.status).split(' ')[1]} />
                                            </div>
                                            <span className="font-black text-slate-900 text-sm">{order.orderId}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <p className="font-bold text-slate-700 text-sm leading-none">{order.customerId?.name || 'Unknown Patient'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{order.customerId?.mobile || 'No contact'}</p>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-xs font-bold text-slate-500">
                                            {new Date(order.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <p className="text-sm font-black text-indigo-600">₹{order.totalAmount}</p>
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${
                                            order.status === 'completed' || order.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-slate-400'
                                        }`}>{order.status === 'completed' ? 'PAID' : order.paymentStatus}</p>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {order.status === 'pending' && (
                                                <button onClick={() => handleStatusUpdate(order._id, 'processing')} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all shadow-sm" title="Process">
                                                    <Clock size={16} />
                                                </button>
                                            )}
                                            {order.status === 'processing' && (
                                                <button onClick={() => handleStatusUpdate(order._id, 'completed')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all shadow-sm" title="Complete">
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                            {order.status !== 'completed' && order.status !== 'cancelled' && (
                                                <button onClick={() => handleStatusUpdate(order._id, 'cancelled')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all shadow-sm" title="Cancel">
                                                    <XCircle size={16} />
                                                </button>
                                            )}
                                            <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-all" title="View Details">
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="py-20 text-center text-slate-400">
                                    <Package size={48} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-bold">No orders found</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Delivery</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="7" className="px-5 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                </tr>
                            ))
                        ) : prescriptions.length > 0 ? (
                            prescriptions.map((pres) => (
                                <tr key={pres._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${getStatusColor(pres.status).split(' ')[0]}`}>
                                                <FileText size={16} className={getStatusColor(pres.status).split(' ')[1]} />
                                            </div>
                                            <span className="font-black text-slate-900 text-[10px] uppercase tracking-widest leading-none">Prescription</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <p className="font-bold text-slate-700 text-sm leading-none">{pres.patientId?.fullName || 'Anonymous Patient'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1">
                                            <Phone size={10} /> {pres.mobileNumber || 'N/A'}
                                        </p>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${pres.deliveryMethod === 'pickup' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {pres.deliveryMethod === 'pickup' ? <Store size={10} /> : <MapPin size={10} />}
                                            {pres.deliveryMethod || 'Pickup'}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-xs font-bold text-slate-500">
                                            {new Date(pres.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        {pres.status === 'accepted' ? (
                                            <span className="text-[9px] font-black text-orange-500 uppercase tracking-tighter animate-pulse">PENDING QUOTE</span>
                                        ) : (
                                            <>
                                                <p className="text-sm font-black text-indigo-600">₹{pres.quotedTotal}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                    {pres.status === 'quoted' ? 'Reviewing' : 'Paid'}
                                                </p>
                                            </>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusColor(pres.status)}`}>
                                            {pres.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {pres.status === 'accepted' && (
                                                <button onClick={() => setSelectedPrescription(pres)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all shadow-sm" title="Build Quote">
                                                    <Plus size={16} />
                                                </button>
                                            )}
                                            {(pres.status === 'paid' || pres.status === 'accepted') && (
                                                <button onClick={() => { setSelectedPrescription(pres); setShowDispenseModal(true); }} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all shadow-sm" title="Dispense">
                                                    <Package size={16} />
                                                </button>
                                            )}
                                            {pres.status === 'ready' && (
                                                <button onClick={() => handlePrescriptionStatusUpdate(pres._id, 'shipped')} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all shadow-sm" title="Ship">
                                                    <Package size={16} />
                                                </button>
                                            )}
                                            {pres.status === 'shipped' && (
                                                <button onClick={() => handlePrescriptionStatusUpdate(pres._id, 'completed')} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-sm" title="Deliver">
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => setSelectedPrescription(pres)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-all">
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="py-20 text-center text-slate-400">
                                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-bold">No prescriptions found</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Quote Modal */}
      <AnimatePresence mode="wait">
        {selectedPrescription && !showDispenseModal && (
          <PrescriptionQuoteModal 
            prescription={selectedPrescription}
            onClose={() => setSelectedPrescription(null)}
            onSuccess={activeTab === 'standard' ? fetchOrders : fetchPrescriptions}
          />
        )}
      </AnimatePresence>

      {/* Dispense Modal */}
      <AnimatePresence mode="wait">
        {showDispenseModal && selectedPrescription && (
          <DispenseMedicineModal 
            order={selectedPrescription}
            onClose={() => {
                setShowDispenseModal(false);
                setSelectedPrescription(null);
            }}
            onSuccess={() => {
                fetchPrescriptions();
                setShowDispenseModal(false);
                setSelectedPrescription(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PharmacyOrders;
