import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Sparkles, Send, Loader2, User, Phone } from 'lucide-react';
import { whatsappApi } from '../../services/api';
import { toast } from 'react-toastify';

const WhatsAppModal = ({ isOpen, onClose, patient }) => {
  const [message, setMessage] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!patient) return null;

  const handleImprove = async () => {
    if (!message.trim()) {
      toast.warning("Please write a draft first.");
      return;
    }

    setIsImproving(true);
    try {
      const response = await whatsappApi.improve(message, patient.name);
      if (response.success) {
        setMessage(response.refinedText);
        toast.success("AI refined your message!");
      }
    } catch (error) {
      console.error("AI Improvement Error:", error);
      toast.error("AI was unable to refine the message.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.warning("Cannot send an empty message.");
      return;
    }

    setIsSending(true);
    try {
      const phone = patient.mobile || patient.phone || patient.contactNumber || patient.contact;
      const response = await whatsappApi.send(phone, message);
      
      if (response.success) {
        toast.success("Message sent successfully via WhatsApp!");
        onClose();
        setMessage('');
      }
    } catch (error) {
      console.error("WhatsApp Send Error:", error);
      toast.error(error.response?.data?.message || "Failed to send WhatsApp message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center border border-green-500/30">
                  <MessageCircle className="text-green-500" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">WhatsApp Patient</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Powered by Slotify Intelligence</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient Info Card */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={14} className="text-blue-500" />
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">{patient.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">{patient.mobile || patient.phone || patient.contactNumber || patient.contact}</span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                  WhatsApp Active
                </div>
              </div>

              {/* Composer */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Message Content</label>
                <div className="relative group">
                  <textarea
                    rows="5"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write a note (e.g., Follow up tomorrow at 10 AM)..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none group-hover:border-slate-300 dark:group-hover:border-slate-600"
                  />
                  
                  {/* AI Button Overlay */}
                  <button
                    onClick={handleImprove}
                    disabled={isImproving || !message.trim()}
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:scale-100"
                  >
                    {isImproving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {isImproving ? "Refining..." : "AI Improve"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-bold italic px-1">AI will help you make the message more professional and clear.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || !message.trim()}
                className="flex-[2] py-4 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-slate-800 disabled:bg-slate-400 transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {isSending ? "Sending Message..." : "Send via WhatsApp"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WhatsAppModal;
