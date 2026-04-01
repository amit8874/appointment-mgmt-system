import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  MapPin, 
  Star, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Timer as TimerIcon,
  Truck,
  Store,
  Package
} from 'lucide-react';
import { pharmacyApi } from '../../services/api';

const QuoteComparison = ({ broadcastId, onSelect }) => {
    const [broadcast, setBroadcast] = useState(null);
    const [timeLeft, setTimeLeft] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const fetchQuotes = async () => {
        try {
            const data = await pharmacyApi.getQuotesForUser(broadcastId);
            setBroadcast(data);
        } catch (err) {
            console.error("Error fetching quotes:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
        const interval = setInterval(fetchQuotes, 5000); // Poll for new quotes
        return () => clearInterval(interval);
    }, [broadcastId]);

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

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
                <TimerIcon className="text-blue-500" size={32} />
            </motion.div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fetching latest quotations...</p>
        </div>
    );

    const quotes = broadcast?.quotes || [];
    
    // Logic for badges
    const sortedByPrice = [...quotes].sort((a, b) => a.price - b.price);
    const lowestPriceId = sortedByPrice[0]?._id;

    // Simplified fastest delivery logic
    const getMinutes = (str) => parseInt(str?.split(' ')[0]) || 999;
    const sortedBySpeed = [...quotes].sort((a, b) => getMinutes(a.deliveryTime) - getMinutes(b.deliveryTime));
    const fastestDeliveryId = sortedBySpeed[0]?._id;

    return (
        <div className="space-y-6">
            {/* Header / Timer */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Window Closing In</h3>
                        <p className="text-xl font-black text-slate-800 tracking-tight leading-none">{timeLeft}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{quotes.length} Responses Received</p>
                    <div className="flex gap-1 justify-end">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < quotes.length ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Quotes List */}
            <div className="space-y-4">
                <AnimatePresence>
                    {quotes.map((quote) => (
                        <motion.div 
                            key={quote._id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`bg-[#1c1c1c] rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group border-2 transition-all ${
                                quote._id === lowestPriceId ? 'border-emerald-500/30' : 'border-slate-800'
                            }`}
                        >
                            {/* Decorative background flare */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-10 transition-opacity group-hover:opacity-20 ${
                                quote._id === lowestPriceId ? 'bg-emerald-500' : 'bg-blue-500'
                            }`} />

                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex gap-5">
                                    {/* Pharmacy Initial Icon */}
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg ${
                                        quote.pharmacyId?.name?.toLowerCase().includes('apollo') ? 'bg-white text-red-500' :
                                        quote.pharmacyId?.name?.toLowerCase().includes('medplus') ? 'bg-white text-blue-600' :
                                        'bg-white text-slate-800'
                                    }`}>
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                                            {quote.pharmacyId?.name?.charAt(0)}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div>
                                            <h4 className="font-black text-white text-lg tracking-tight leading-none mb-1.5">
                                                {quote.pharmacyId?.name} — {quote.pharmacyDistance || '0.8 km'}
                                            </h4>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center text-orange-400">
                                                    <Star size={12} className="fill-current" />
                                                    <span className="text-[11px] font-black ml-1">{quote.pharmacyRating || '4.7'}</span>
                                                </div>
                                                <span className="text-slate-500 text-[11px] font-bold uppercase tracking-tight">
                                                    {quote.deliveryTime} Delivery
                                                </span>
                                            </div>
                                        </div>


                                        <div className="flex gap-2">
                                            {quote._id === lowestPriceId && (
                                                <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border border-emerald-500/20">
                                                    Lowest price
                                                </span>
                                            )}
                                            {quote._id === fastestDeliveryId && quote._id !== lowestPriceId && (
                                                <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border border-purple-500/20">
                                                    Fastest
                                                </span>
                                            )}
                                            <span className="bg-white/5 text-slate-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border border-white/5">
                                                {quote.isFullAvailable ? 'All In Stock' : 'Partial Stock'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right flex flex-col items-end gap-4">
                                    <div>
                                        {/* Price breakdown */}
                                        {quote.medicineCharge > 0 ? (
                                            <div className="space-y-0.5 text-right mb-1">
                                                <p className="text-[9px] font-bold text-slate-500">
                                                    <span className="text-slate-400">Meds</span> ₹{quote.medicineCharge}
                                                    {quote.deliveryCharge > 0 && (
                                                        <> + <span className="text-slate-400">Del</span> ₹{quote.deliveryCharge}</>
                                                    )}
                                                </p>
                                                <p className="text-2xl font-black text-white tracking-tighter leading-none">₹{quote.price}</p>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Total</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-2xl font-black text-white tracking-tighter leading-none mb-1">₹{quote.price}</p>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">All medicines inkl.</p>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => onSelect(quote._id)}
                                        className="px-6 py-3 bg-[#2d2d2d] hover:bg-white hover:text-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-slate-700 hover:border-white shadow-xl active:scale-95"
                                    >
                                        Accept Quotation
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {quotes.length === 0 && (
                    <div className="py-16 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center gap-4">
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                            <TimerIcon className="text-slate-300" size={48} />
                        </motion.div>
                        <div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Waiting for Quotations...</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-2">Pharmacies typically respond within 2-5 minutes.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuoteComparison;
