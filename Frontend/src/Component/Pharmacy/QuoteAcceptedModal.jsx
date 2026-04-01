import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Phone, MapPin, X, ExternalLink, User } from 'lucide-react';

const QuoteAcceptedModal = ({ data, onClose }) => {
    if (!data) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md"
                    onClick={onClose}
                />

                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 30 }}
                    className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border-4 border-emerald-500/20"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Success Header */}
                    <div className="bg-emerald-500 p-8 text-center text-white relative overflow-hidden">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                            className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"
                        >
                            <CheckCircle2 size={40} className="text-white" />
                        </motion.div>
                        <h2 className="text-2xl font-black tracking-tight mb-1">Quotation Accepted!</h2>
                        <p className="text-emerald-100 text-xs font-black uppercase tracking-widest opacity-80">You have been selected for this order</p>
                        
                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Quote Summary */}
                        <div className="flex justify-between items-end border-b border-slate-50 pb-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Quote</p>
                                <p className="text-3xl font-black text-slate-800 tracking-tighter">₹{data.quotedTotal}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order ID</p>
                                <p className="text-sm font-black text-slate-800">#{data.orderId}</p>
                            </div>
                        </div>

                        {/* Patient Details */}
                        <div className="space-y-6">
                            <div className="flex items-start gap-4 group">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                    <User size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient Name</p>
                                    <p className="text-lg font-black text-slate-800 tracking-tight">{data.patientName}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 group">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                    <Phone size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mobile Number</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-lg font-black text-slate-800 tracking-tight">{data.patientMobile}</p>
                                        <a href={`tel:${data.patientMobile}`} className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                                            Call Now <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 group">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                    <MapPin size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivery / Pickup</p>
                                    {data.deliveryMethod === 'pickup' ? (
                                        <p className="text-sm font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg inline-block mt-1">
                                            ⚠️ CUSTOMER WILL VISIT YOUR PLACE SOON
                                        </p>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-black text-slate-700 leading-snug">{data.deliveryAddress}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 italic">Standard home delivery requested</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
                        >
                            Got it, Start Processing
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default QuoteAcceptedModal;
