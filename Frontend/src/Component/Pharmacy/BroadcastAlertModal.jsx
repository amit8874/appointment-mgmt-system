import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Send, AlertCircle, X } from 'lucide-react';
import { pharmacyApi } from '../../services/api';

const BroadcastAlertModal = ({ broadcast, onReject }) => {
    const [price, setPrice] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        if (!broadcast?.expiryAt) return;

        const timer = setInterval(() => {
            const now = new Date();
            const expiry = new Date(broadcast.expiryAt);
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft("00:00");
                clearInterval(timer);
                return;
            }

            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [broadcast?.expiryAt]);

    if (!broadcast) return null;

    const handleSendQuote = async () => {
        if (!price || isNaN(price) || Number(price) <= 0) {
            alert("Please enter a valid total price");
            return;
        }

        try {
            setIsSubmitting(true);
            await pharmacyApi.submitQuote(broadcast._id, {
                price: Number(price),
                deliveryTime: "30-45 min", // Default or could be an input too
                isFullAvailable: true
            });
            onReject(); // Close modal on success
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send quotation");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 md:p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl"
                    onClick={onReject}
                />

                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative flex flex-col items-center w-full max-w-lg bg-[#1a1a1a] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header with Timer */}
                    <div className="w-full px-8 pt-8 flex justify-between items-center">
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full">
                            <Clock size={16} className="text-orange-500 animate-pulse" />
                            <span className="text-sm font-black text-orange-500 tracking-widest">{timeLeft}</span>
                        </div>
                        <button onClick={onReject} className="p-2 text-slate-500 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Prescription Image */}
                    <div className="px-8 pt-6 w-full">
                        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl group relative h-[50vh] flex items-center justify-center">
                            <img 
                                src={broadcast.prescriptionUrl} 
                                alt="Prescription" 
                                className="max-w-full max-h-full object-contain"
                            />
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl border border-white/10">
                                Location: {broadcast.pinCode}
                            </div>
                        </div>
                    </div>

                    {/* Quotation Input Space */}
                    <div className="p-8 w-full space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-white tracking-tight">Set Your Quotation</h2>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">Enter total price for all medicines</p>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-600">₹</span>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={price}
                                    autoFocus
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full pl-12 pr-6 py-5 bg-[#252525] border-2 border-slate-800 focus:border-blue-600 rounded-3xl outline-none text-2xl font-black text-white transition-all placeholder:text-slate-800"
                                />
                            </div>
                            <button 
                                onClick={handleSendQuote}
                                disabled={isSubmitting || !price}
                                className="px-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-3"
                            >
                                {isSubmitting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Send size={20} />}
                                Send
                            </button>
                        </div>

                        {broadcast.notes && (
                            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-xs font-bold text-blue-400 italic">"{broadcast.notes}"</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BroadcastAlertModal;
