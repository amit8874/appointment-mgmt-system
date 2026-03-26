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
  ExternalLink
} from 'lucide-react';

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
            
            if (hasToken) {
                const presData = await pharmacyApi.getPatientPrescriptions();
                setPrescriptions(presData);

                // Fetch standard orders (requires ID)
                const storage = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser') || 
                               sessionStorage.getItem('userData') || localStorage.getItem('userData') || '{}';
                const patientUser = JSON.parse(storage);
                const patientId = patientUser._id || patientUser.id || patientUser.userData?._id || patientUser.userData?.id;
                
                if (patientId) {
                    const serviceData = await api.get(`/service-requests/patient/${patientId}`);
                    const orders = (serviceData.data || []).filter(req => req.requestType === 'Medicine');
                    setStandardOrders(orders);
                }
            } else {
                // 2. Handle guest user tracking
                const guestOrderId = sessionStorage.getItem('guestOrderId');
                if (guestOrderId) {
                    try {
                        // Use the new public status endpoint for guests
                        const { data } = await api.get(`/pharmacy/prescriptions/${guestOrderId}/status`);
                        if (data) {
                            setPrescriptions([data]);
                        }
                    } catch (guestErr) {
                        console.error("Error fetching guest order status:", guestErr);
                    }
                }
            }
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
        const isActive = (status) => ['broadcast', 'accepted', 'quoted', 'pending', 'processing', 'ready', 'shipped'].includes(status.toLowerCase());
        
        if (type === 'active') {
            return {
                pres: prescriptions.filter(p => isActive(p.status)),
                std: standardOrders.filter(o => isActive(o.status))
            };
        } else {
            return {
                pres: prescriptions.filter(p => !isActive(p.status)),
                std: standardOrders.filter(o => !isActive(o.status))
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
                                                {order.prescriptionUrl ? (
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

                                    {/* Pharmacy Details (if accepted) */}
                                    {order.pharmacyId ? (
                                        <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight mb-1">{order.pharmacyId.name}</h4>
                                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase">
                                                        <MapPin size={12} className="text-slate-400" />
                                                        {typeof order.pharmacyId.address === 'object' 
                                                            ? `${order.pharmacyId.address.street}, ${order.pharmacyId.address.city}` 
                                                            : order.pharmacyId.address}
                                                    </div>
                                                </div>
                                                <a 
                                                    href={`tel:${order.pharmacyId.phone || order.pharmacyId.mobile || '0000000000'}`}
                                                    className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                                                >
                                                    <Phone size={18} />
                                                </a>
                                            </div>
                                            
                                            {order.status === 'quoted' && (
                                                <div className="pt-4 border-t border-slate-200/50">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Quote Received</span>
                                                        <span className="font-black text-slate-900">₹{order.quotedTotal}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => navigate('/medicine-ordering')}
                                                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 font-semibold"
                                                    >
                                                        Review & Pay
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Status specific notifications */}
                                            {order.status === 'ready' && (
                                                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3 animate-pulse">
                                                    <Package className="text-indigo-600 mt-0.5" size={18} />
                                                    <div>
                                                        <p className="text-xs font-black text-indigo-900 uppercase tracking-tight">Medicine Packed!</p>
                                                        <p className="text-[10px] font-bold text-indigo-600 leading-tight">Your medicine has been moved from pharmacy and shortly will be delivered to your place.</p>
                                                    </div>
                                                </div>
                                            )}
                                            {order.status === 'shipped' && (
                                                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                                                    <MapPin className="text-blue-600 mt-0.5" size={18} />
                                                    <div>
                                                        <p className="text-xs font-black text-blue-900 uppercase tracking-tight">Out for Delivery</p>
                                                        <p className="text-[10px] font-bold text-blue-600 leading-tight">The delivery partner is on the way to your location.</p>
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

                                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                                        <span className="flex items-center gap-1.5 group cursor-pointer hover:text-blue-600 transition-colors">
                                            <Clock size={12} />
                                            Last update: {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <button className="text-blue-600 hover:underline font-black">Support</button>
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
