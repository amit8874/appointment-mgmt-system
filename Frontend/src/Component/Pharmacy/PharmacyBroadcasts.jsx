import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pharmacyApi } from '../../services/api';
import { 
  Radio, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  ShoppingBag,
  Loader2,
  AlertCircle
} from 'lucide-react';

const PharmacyBroadcasts = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const data = await pharmacyApi.getBroadcastedOrders();
      setBroadcasts(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching broadcasts:', err);
      setError('Failed to fetch nearby broadcasts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBroadcasts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (id) => {
    try {
      setAcceptingId(id);
      await pharmacyApi.acceptBroadcastedOrder(id);
      setBroadcasts(prev => prev.filter(b => b._id !== id));
      alert('Order accepted successfully! You can now find it in your active orders.');
    } catch (err) {
      console.error('Error accepting broadcast:', err);
      alert(err.response?.data?.message || 'Failed to accept broadcast');
      fetchBroadcasts(); // Refresh to get updated state
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
              <Radio size={24} />
            </span>
            Nearby Broadcasts
          </h1>
          <p className="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest">REAL-TIME PRESCRIPTION REQUESTS</p>
        </div>
        <button 
          onClick={fetchBroadcasts}
          className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
        >
          Refresh Feed
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-6 flex items-center gap-3 text-red-600 font-bold">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {loading && broadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-50 shadow-sm">
          <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Searching for broadcasts...</p>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-50 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 font-black text-4xl italic">!</div>
          <h3 className="text-xl font-black text-slate-800 mb-2">No Active Broadcasts</h3>
          <p className="text-slate-500 font-bold">We will notify you when someone uploads a prescription nearby.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {broadcasts.map((broadcast) => (
              <motion.div
                key={broadcast._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all overflow-hidden flex flex-col"
              >
                <div className="relative h-48 bg-slate-100 overflow-hidden group">
                  <img 
                    src={broadcast.prescriptionUrl} 
                    alt="Prescription" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button 
                      onClick={() => setSelectedImage(broadcast.prescriptionUrl)}
                      className="p-3 bg-white text-slate-800 rounded-2xl shadow-xl hover:scale-110 transition-transform"
                    >
                      <Eye size={20} />
                    </button>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                      NEW REQUEST
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock size={14} />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {new Date(broadcast.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin size={14} />
                      <span className="text-xs font-bold uppercase tracking-widest">{broadcast.pinCode}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1 truncate">
                    {broadcast.patientId?.fullName || (typeof broadcast.patientId === 'string' && broadcast.patientId.startsWith('guest_') ? 'Guest Patient' : 'Anonymous Patient')}
                  </h3>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">
                    {broadcast.mobileNumber || broadcast.patientId?.mobile || 'No contact provided'}
                  </p>

                  <div className="mt-auto pt-6 border-t border-slate-50">
                    <button 
                      onClick={() => handleAccept(broadcast._id)}
                      disabled={acceptingId === broadcast._id}
                      className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {acceptingId === broadcast._id ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={18} />
                          Accept Order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:p-10"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={selectedImage} 
                alt="Zoomed Prescription" 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-white/10"
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-0 right-0 p-4 text-white hover:text-blue-400 transition-colors"
              >
                <XCircle size={32} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PharmacyBroadcasts;
