import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, MessageSquare, Send, CheckCircle2, AlertCircle, 
  Loader2, Play, Pause, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const BulkMessageModal = ({ isOpen, onClose, selectedPatients = [] }) => {
  const { user } = useAuth();
  
  // States
  const [clinicName, setClinicName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Set default clinic name from user organization on load
  useEffect(() => {
    if (user) {
      const orgName = user.organization?.clinicName || user.organization?.name || 'Smile Dental Care';
      setClinicName(orgName);
    }
  }, [user]);

  const handleTextChange = (e) => {
    const text = e.target.value;
    if (text.length <= 1000) {
      setMessageText(text);
    }
  };

  const handleStartBroadcast = async () => {
    if (!messageText.trim() || selectedPatients.length === 0) return;

    setIsSending(true);
    try {
      const payload = {
        patients: selectedPatients.map(p => ({
          name: p.name,
          mobile: p.mobile || p.phone || p.contactNumber || p.contact
        })),
        messageText: messageText,
        clinicName: clinicName
      };

      const response = await api.post('/whatsapp/send-campaign', payload);

      if (response.data?.success) {
        toast.info("Broadcast campaign started! Live notifications will keep you updated in the background.");
        onClose();
      } else {
        throw new Error(response.data?.message || "Failed to start campaign");
      }
    } catch (err) {
      console.error("Error starting campaign:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to start campaign");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Bulk WhatsApp Sender</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Targeting {selectedPatients.length} selected patients
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSending}
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-gray-700 rounded-full transition-all disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-5">
          
          {/* Approved Template Card */}
          <div>
            <label className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest mb-2 block">
              Approved Template Name
            </label>
            <div className="px-4 py-3 bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-700 rounded-2xl flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
              <ShieldCheck className="text-emerald-500" size={16} />
              clinic_broadcast_notification (English)
            </div>
          </div>

          {/* Grid Variables */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest mb-2 block">
                Clinic Name (Variable 3)
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                disabled={isSending}
                placeholder="e.g. Smile Dental Care"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest mb-2 block">
                Patient Name (Variable 1)
              </label>
              <div className="px-4 py-3 bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-700 rounded-2xl text-sm font-bold text-slate-400">
                {"[Automatically Filled]"}
              </div>
            </div>
          </div>

          {/* Broadcast Message Input */}
          <div>
            <label className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest mb-2 block flex justify-between">
              <span>Broadcast Update Message (Variable 2)</span>
              <span>{messageText.length}/1000</span>
            </label>
            <textarea
              value={messageText}
              onChange={handleTextChange}
              disabled={isSending}
              rows={4}
              placeholder="Type the message that will replace variable 2. (e.g. Our clinic will remain closed tomorrow due to rain. All appointments have rescheduled.)"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-slate-350 dark:placeholder:text-gray-500"
            />
          </div>

          {/* WhatsApp Bubble Preview */}
          <div>
            <label className="text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest mb-2 block">
              Live WhatsApp Message Preview
            </label>
            <div className="p-4 bg-emerald-50/30 dark:bg-gray-900/30 rounded-3xl border border-emerald-100/50 dark:border-gray-700 flex justify-start">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-gray-750 max-w-md rounded-tl-none text-sm font-medium leading-relaxed relative text-slate-800 dark:text-slate-200 text-left">
                <p>
                  Hello <span className="text-indigo-600 dark:text-indigo-400 font-bold">John</span>, here is an update from the doctor: <span className="font-bold">{messageText || "_________________"}</span> Thank you, <span className="text-indigo-600 dark:text-indigo-400 font-bold">{clinicName || "Clinic"}</span> team.
                </p>
                <span className="text-[9px] font-bold text-slate-400 absolute right-3 bottom-1">
                  10:16 AM
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 dark:border-gray-700 flex justify-end gap-3 bg-slate-50 dark:bg-gray-850">
          <button 
            onClick={onClose}
            disabled={isSending}
            className="px-6 py-3 bg-white dark:bg-gray-850 border border-slate-200 dark:border-gray-700 text-slate-550 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            Close
          </button>
          
          <button 
            onClick={handleStartBroadcast}
            disabled={!messageText.trim() || selectedPatients.length === 0 || isSending}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-40 flex items-center gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Send size={14} />
                Start Broadcast
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BulkMessageModal;
