import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Send, AlertCircle, X, Truck, Store } from 'lucide-react';
import { pharmacyApi } from '../../services/api';

const BroadcastAlertModal = ({ broadcast, onReject }) => {
    const [medicineCharge, setMedicineCharge] = useState('');
    const [deliveryCharge, setDeliveryCharge] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");

    const isHomeDelivery = broadcast?.deliveryMethod && broadcast.deliveryMethod !== 'pickup';
    const total = (Number(medicineCharge) || 0) + (isHomeDelivery ? (Number(deliveryCharge) || 0) : 0);
    const canSubmit = medicineCharge && Number(medicineCharge) > 0 && (!isHomeDelivery || deliveryCharge !== '');

    useEffect(() => {
        if (!broadcast?.expiryAt) return;
        const timer = setInterval(() => {
            const diff = new Date(broadcast.expiryAt) - new Date();
            if (diff <= 0) { setTimeLeft("00:00"); clearInterval(timer); return; }
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(timer);
    }, [broadcast?.expiryAt]);

    if (!broadcast) return null;

    const handleSendQuote = async () => {
        if (!medicineCharge || Number(medicineCharge) <= 0) {
            alert("Please enter a valid medicine charge"); return;
        }
        if (isHomeDelivery && deliveryCharge === '') {
            alert("Please enter the delivery charge (0 for free)"); return;
        }
        try {
            setIsSubmitting(true);
            await pharmacyApi.submitQuote(broadcast._id, {
                medicineCharge: Number(medicineCharge),
                deliveryCharge: isHomeDelivery ? Number(deliveryCharge) : 0,
                deliveryTime: "30-45 min",
                isFullAvailable: true
            });
            onReject();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send quotation");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3">
                {/* Backdrop — semi-transparent, not pitch black */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onReject}
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 12 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-sm bg-[#1c1c1e] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* ── Top bar: timer + close ── */}
                    <div className="flex justify-between items-center px-4 pt-3 pb-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/15 border border-orange-500/25 rounded-full">
                            <Clock size={12} className="text-orange-400 animate-pulse" />
                            <span className="text-xs font-black text-orange-400 tracking-widest">{timeLeft}</span>
                        </div>
                        <button onClick={onReject} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                            <X size={18} />
                        </button>
                    </div>

                    {/* ── Prescription image ── */}
                    <div className="px-4">
                        <div className="bg-white rounded-2xl overflow-hidden relative h-84 flex items-center justify-center">
                            <img
                                src={broadcast.prescriptionUrl}
                                alt="Prescription"
                                className="max-w-full max-h-full object-contain"
                            />
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-900/90 text-white rounded-full font-black text-[9px] uppercase tracking-widest border border-white/10 whitespace-nowrap">
                                Location: {broadcast.pinCode}
                            </div>
                        </div>
                    </div>

                    {/* ── Delivery badge ── */}
                    <div className="px-4 pt-3">
                        {isHomeDelivery ? (
                            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                    <Truck size={14} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Home Delivery</p>
                                    <p className="text-[9px] font-bold text-slate-500 mt-0.5 truncate">
                                        {broadcast.deliveryAddress || 'Customer requested home delivery'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                                    <Store size={14} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">Self Pickup</p>
                                    <p className="text-[9px] font-bold text-slate-500 mt-0.5">Customer will collect from your store</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Quotation inputs ── */}
                    <div className="px-4 pt-3 pb-4 space-y-2.5">
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-0.5">Medicine Charge</p>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-500 text-base">₹</span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={medicineCharge}
                                    autoFocus
                                    onChange={e => setMedicineCharge(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2.5 bg-[#2a2a2e] border border-white/8 focus:border-blue-500 rounded-xl outline-none text-base font-black text-white transition-all placeholder:text-slate-700"
                                />
                            </div>
                        </div>

                        {isHomeDelivery && (
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-0.5">Delivery Charge</p>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-500 text-base">₹</span>
                                    <input
                                        type="number"
                                        placeholder="0.00 (enter 0 for free)"
                                        value={deliveryCharge}
                                        onChange={e => setDeliveryCharge(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2.5 bg-blue-950/30 border border-blue-500/20 focus:border-blue-500 rounded-xl outline-none text-base font-black text-white transition-all placeholder:text-slate-700"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Total + Send row */}
                        <div className="flex gap-2 pt-0.5">
                            {medicineCharge && (
                                <div className="flex flex-col justify-center px-3 py-2 bg-white/5 border border-white/8 rounded-xl shrink-0">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Total</p>
                                    <p className="text-sm font-black text-white leading-tight mt-0.5">₹{total}</p>
                                </div>
                            )}
                            <button
                                onClick={handleSendQuote}
                                disabled={isSubmitting || !canSubmit}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSubmitting
                                    ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                    : <Send size={15} />
                                }
                                Send Quote
                            </button>
                        </div>

                        {broadcast.notes && (
                            <div className="flex items-start gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <AlertCircle size={13} className="text-blue-400 mt-0.5 shrink-0" />
                                <p className="text-[10px] font-bold text-blue-400 italic leading-snug">"{broadcast.notes}"</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BroadcastAlertModal;
