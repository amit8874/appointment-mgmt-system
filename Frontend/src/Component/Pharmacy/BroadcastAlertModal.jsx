import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BroadcastAlertModal = ({ broadcast, onAccept, onReject, isAccepting }) => {
    if (!broadcast) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 md:p-4">
                {/* Backdrop with heavy blur */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl"
                    onClick={onReject}
                />

                {/* Modal Content - Sharp and Big */}
                <motion.div 
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    className="relative flex flex-col items-center gap-6 w-full max-w-md"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Maximized Image - No curve, No thick border */}
                    <div className="bg-white shadow-2xl overflow-hidden w-full rounded-2xl flex items-center justify-center">
                        <img 
                            src={broadcast.prescriptionUrl} 
                            alt="Prescription" 
                            className="w-full h-auto max-h-[75vh] object-contain block"
                        />
                    </div>

                    {/* Side-by-side Rectangular Buttons */}
                    <div className="w-full max-w-xl flex flex-col items-center gap-4">
                        <div className="px-6 py-2 bg-slate-800 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-xl">
                            Location: {broadcast.pinCode}
                        </div>
                        <div className="flex items-center gap-4 w-full pb-2">
                        <button 
                            onClick={onReject}
                            className="flex-1 py-3 bg-white text-slate-900 font-extrabold text-lg uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-[0.98] shadow-xl rounded-xl"
                        >
                            Reject
                        </button>
                        
                        <button 
                            disabled={isAccepting}
                            onClick={() => onAccept(broadcast._id)}
                            className="flex-1 py-3 bg-blue-600 text-white font-extrabold text-lg uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-[0.98] shadow-xl rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isAccepting ? (
                                <motion.div 
                                    animate={{ rotate: 360 }} 
                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                    className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full"
                                />
                            ) : (
                                "Accept"
                            )}
                        </button>
                    </div>
                </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BroadcastAlertModal;
