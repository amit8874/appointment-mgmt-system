import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { pharmacyApi } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Phone, 
  MapPin, 
  FileText,
  AlertCircle,
  ArrowLeft,
  Package,
  Loader2,
  ExternalLink,
  Timer,
  X
} from 'lucide-react';

import QuoteComparison from './QuoteComparison';


const PatientOrders = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
    const [prescriptions, setPrescriptions] = useState([]);
    const [standardOrders, setStandardOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        try {
            // 1. Check for authenticated session
            const hasToken = localStorage.getItem('token') || sessionStorage.getItem('token') || 
                             localStorage.getItem('patientUser') || sessionStorage.getItem('patientUser');
            
            let allPrescriptions = [];

            // 1. Fetch authenticated prescriptions if token exists
            if (hasToken) {
                try {
                    const presData = await pharmacyApi.getPatientPrescriptions();
                    allPrescriptions = [...presData];
                } catch (err) {
                    console.error("Error fetching account prescriptions:", err);
                }

                // Fetch standard orders
                try {
                    const storage = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser') || 
                                   sessionStorage.getItem('userData') || localStorage.getItem('userData') || '{}';
                    const patientUser = JSON.parse(storage);
                    const patientId = patientUser._id || patientUser.id || patientUser.userData?._id || patientUser.userData?.id;
                    
                    if (patientId) {
                        const serviceData = await api.get(`/service-requests/patient/${patientId}`);
                        const orders = (serviceData.data || []).filter(req => req.requestType === 'Medicine');
                        setStandardOrders(orders);
                    }
                } catch (err) {
                    console.error("Error fetching standard orders:", err);
                }
            }

            // 2. Always check for guest order in session
            const guestOrderId = sessionStorage.getItem('guestOrderId');
            if (guestOrderId) {
                try {
                    const { data } = await api.get(`/pharmacy/prescriptions/${guestOrderId}/status`);
                    if (data && !allPrescriptions.find(p => p._id === data._id)) {
                        allPrescriptions.push(data);
                    }
                } catch (guestErr) {
                    console.error("Error fetching guest order status:", guestErr);
                }
            }

            setPrescriptions(allPrescriptions);

        } catch (err) {
            console.error("Error fetching patient orders:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s for dynamic updates
        return () => clearInterval(interval);
    }, []);

    const filterOrders = (type) => {
        const TWO_MIN_MS = 2 * 60 * 1000;
        const now = Date.now();

        const isCurrentlyActive = (status, updatedAt) => {
            const s = status.toLowerCase();
            const lastUpdate = new Date(updatedAt || Date.now()).getTime();

            // Statuses that are ALWAYS active
            const activeStatuses = ['broadcast', 'accepted', 'quoted', 'selected', 'confirmed', 'pending', 'processing', 'shipped'];
            if (activeStatuses.includes(s)) return true;

            // 'Ready' status only stays active for 2 minutes
            if (s === 'ready') {
                return (now - lastUpdate) < TWO_MIN_MS;
            }

            return false;
        };
        
        if (type === 'active') {
            return {
                pres: prescriptions.filter(p => isCurrentlyActive(p.status, p.updatedAt)),
                std: standardOrders.filter(o => isCurrentlyActive(o.status, o.updatedAt))
            };
        } else {
            return {
                pres: prescriptions.filter(p => !isCurrentlyActive(p.status, p.updatedAt)),
                std: standardOrders.filter(o => !isCurrentlyActive(o.status, o.updatedAt))
            };
        }
    };

    const ordersData = filterOrders(activeTab);

    const hasOrders = ordersData.pres.length > 0 || ordersData.std.length > 0;

    const StatusBadge = ({ status }) => {
        const styles = {
            broadcast: 'bg-blue-50 text-blue-600 border-blue-100',
            accepted: 'bg-orange-50 text-orange-600 border-orange-100',
            quoted: 'bg-indigo-50 text-indigo-600 border-indigo-100',
            paid: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            ready: 'bg-indigo-50 text-indigo-600 border-indigo-100',
            shipped: 'bg-blue-50 text-blue-600 border-blue-100',
            completed: 'bg-slate-50 text-slate-600 border-slate-100',
            pending: 'bg-amber-50 text-amber-600 border-amber-100',
            processing: 'bg-blue-50 text-blue-600 border-blue-100'
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${styles[status.toLowerCase()] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">Order History & Tracking</h1>
                    <div className="w-10" /> {/* Spacer */}
                </div>
                
                {/* Tabs */}
                <div className="max-w-3xl mx-auto px-4 flex gap-8">
                    {['active', 'history'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-4 text-xs font-black uppercase tracking-widest relative transition-colors ${
                                activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {tab === 'active' ? 'Tracking' : 'History'}
                            {activeTab === tab && (
                                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                            )}
                        </button>
                    ))}
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 pt-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 size={40} className="text-blue-600 animate-spin" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Updating your orders...</p>
                    </div>
                ) : !hasOrders ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                            <ShoppingBag size={32} />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight mb-2">No {activeTab} orders found</h2>
                        <p className="text-sm font-bold text-slate-400 mb-6">Your medicine orders and prescriptions will appear here.</p>
                        <button 
                            onClick={() => navigate('/order-online-medicine')}
                            className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all font-semibold"
                        >
                            Order Medicines
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Prescription Trackers */}
                        {ordersData.pres.map((order) => (
                            <motion.div 
                                key={order._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm overflow-hidden">
                                                {order.prescriptionUrl?.toLowerCase().endsWith('.pdf') ? (
                                                    <FileText size={24} />
                                                ) : order.prescriptionUrl ? (
                                                    <img src={order.prescriptionUrl} alt="Prescription" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FileText size={24} />
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Prescription Request</h3>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">ID: {order._id.slice(-8)} • {new Date(order.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <StatusBadge status={order.status} />
                                    </div>

                                    {/* Quote Model Logic */}
                                    {order.status === 'broadcast' || (order.status === 'quoted' && !order.pharmacyId) ? (
                                        <QuoteComparison 
                                            broadcastId={order._id} 
                                            onSelect={async (quoteId) => {
                                                try {
                                                    await pharmacyApi.selectQuote(order._id, quoteId);
                                                    fetchData(); // Refresh list
                                                } catch (err) {
                                                    alert("Selection failed: " + (err.response?.data?.message || err.message));
                                                }
                                            }}
                                        />
                                    ) : order.pharmacyId ? (

                                        <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-800 font-black shadow-lg border border-slate-100">
                                                        {order.pharmacyId.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight mb-1">{order.pharmacyId.name}</h4>
                                                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-tight">
                                                            <MapPin size={12} className="text-slate-400" />
                                                            {typeof order.pharmacyId.address === 'object' 
                                                                ? `${order.pharmacyId.address.street}, ${order.pharmacyId.address.city}` 
                                                                : order.pharmacyId.address}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <a 
                                                        href={`tel:${order.pharmacyId.phone || order.pharmacyId.mobile || '0000000000'}`}
                                                        className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                                                    >
                                                        <Phone size={20} />
                                                    </a>
                                                </div>
                                            </div>
                                            
                                            <div className="pt-4 border-t border-slate-100">
                                                <div>
                                                    <div className="mb-4">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Confirmed Quotation</p>
                                                        
                                                        {/* Itemized breakdown */}
                                                        {order.quotes?.find(q => q.status === 'selected')?.medicineCharge > 0 ? (
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[11px] font-bold text-slate-500">Medicine Charge</span>
                                                                    <span className="text-sm font-black text-slate-800">₹{order.quotes.find(q => q.status === 'selected').medicineCharge}</span>
                                                                </div>
                                                                {order.deliveryMethod !== 'pickup' && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[11px] font-bold text-slate-500">Delivery Charge</span>
                                                                        <span className="text-sm font-black text-slate-800">₹{order.quotes.find(q => q.status === 'selected').deliveryCharge || 0}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                                                                    <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{order.quotedTotal}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="font-black text-2xl text-slate-900 tracking-tighter">₹{order.quotedTotal}</p>
                                                        )}
                                                    </div>

                                                    <div className="flex justify-end mb-4">
                                                        <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-100">
                                                            Accepted
                                                        </span>
                                                    </div>
                                                </div>

                                                {order.deliveryMethod === 'pickup' ? (
                                                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3">
                                                        <AlertCircle className="text-orange-600 mt-0.5" size={18} />
                                                        <div>
                                                            <p className="text-xs font-black text-orange-900 uppercase tracking-tight">Self Pickup Confirmed</p>
                                                            <p className="text-[10px] font-bold text-orange-700 leading-tight">Please visit the pharmacy at your convenience. They have your contact number.</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                                                        <MapPin className="text-blue-600 mt-0.5" size={18} />
                                                        <div>
                                                            <p className="text-xs font-black text-blue-900 uppercase tracking-tight">Home Delivery Confirmed</p>
                                                            <p className="text-[10px] font-bold text-blue-700 leading-tight">Pharmacy will deliver to: {order.deliveryAddress}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>


                                            {/* Status specific notifications */}
                                            {order.status === 'ready' && (
                                                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3 animate-pulse">
                                                    <Package className="text-indigo-600 mt-0.5" size={18} />
                                                    <div>
                                                        <p className="text-xs font-black text-indigo-900 uppercase tracking-tight">Medicine Packed!</p>
                                                        <p className="text-[10px] font-bold text-indigo-600 leading-tight">
                                                            {order.deliveryMethod === 'pickup' 
                                                                ? "Your medicine is packed. Please visit the pharmacy store for collection at your convenience."
                                                                : "Your medicine has been packed and will be delivered to your location shortly."}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    ) : (
                                        <div className="py-8 px-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex flex-col items-center gap-3 text-center mb-6">
                                            <Loader2 size={24} className="text-blue-500 animate-spin" />
                                            <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Broadcasting to nearby pharmacies...</p>
                                        </div>
                                    )}


                                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
                                            <span className="flex items-center gap-1.5 group cursor-pointer hover:text-blue-600 transition-colors">
                                                <Clock size={12} />
                                                Update: {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <button className="text-blue-600 hover:underline font-black">Support</button>
                                        </div>
                                        
                                        {['broadcast', 'accepted', 'quoted'].includes(order.status) ? (
                                            <button 
                                                onClick={async () => {
                                                    if (window.confirm("Are you sure you want to cancel this prescription request? This will remove it from your tracking.")) {
                                                        try {
                                                            await pharmacyApi.cancelPrescriptionOrder(order._id);
                                                            fetchData();
                                                        } catch (err) {
                                                            alert("Failed to cancel: " + (err.response?.data?.message || err.message));
                                                        }
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                            >
                                                <X size={14} />
                                                Cancel Request
                                            </button>
                                        ) : (order.status === 'ready' || order.status === 'shipped') && (
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight italic">
                                                Packed! For cancellations, contact pharmacy directly.
                                            </span>
                                        )}

                                    </div>

                                </div>
                            </motion.div>
                        ))}

                        {/* Standard Medicine Orders */}
                        {ordersData.std.map((order) => (
                            <motion.div 
                                key={order._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                                                <ShoppingBag size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Medicine Order</h3>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Order: {order._id.slice(-8)} • {new Date(order.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <StatusBadge status={order.status} />
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        {Array.isArray(order.details?.medicines) && order.details.medicines.map((med, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                                                <span>{med.name} x{med.quantity}</span>
                                                <span className="font-black text-slate-800 tracking-tight">₹{med.price * med.quantity}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
                                            <span className="font-black text-slate-900 text-lg tracking-tighter">₹{order.totalAmount}</span>
                                        </div>
                                        <button className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all font-semibold">
                                            View Invoice
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PatientOrders;
