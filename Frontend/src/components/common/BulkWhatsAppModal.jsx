import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Sparkles, Send, Loader2, User, Phone, CheckCircle2, Search, Users, AlertCircle } from 'lucide-react';
import { whatsappApi } from '../../services/api';
import { toast } from 'react-toastify';

const BulkWhatsAppModal = ({ isOpen, onClose, patients = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);

  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.patientId || p.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.mobile || p.phone || p.contactNumber || p.contact || '').includes(searchTerm)
    );
  }, [patients, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPatients.length && filteredPatients.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPatients.map(p => p._id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleImprove = async () => {
    if (!message.trim()) {
      toast.warning("Please write a draft first.");
      return;
    }

    setIsImproving(true);
    try {
      // Use generic improvement since it's for bulk
      const response = await whatsappApi.improve(message, "All");
      if (response.success) {
        setMessage(response.refinedText);
        toast.success("AI refined your bulk message!");
      }
    } catch (error) {
      console.error("AI Improvement Error:", error);
      toast.error("AI was unable to refine the message.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleSendBulk = async () => {
    if (selectedIds.length === 0) {
      toast.warning("Please select at least one patient.");
      return;
    }
    if (!message.trim()) {
      toast.warning("Cannot send an empty message.");
      return;
    }

    setIsSending(true);
    setProgress(0);

    const selectedRecipients = patients
      .filter(p => selectedIds.includes(p._id))
      .map(p => ({
        phone: p.mobile || p.phone || p.contactNumber || p.contact,
        name: p.name
      }));

    try {
      const response = await whatsappApi.bulkSend(selectedRecipients, message);
      
      if (response.success) {
        toast.success(`Successfully sent ${selectedRecipients.length} messages!`);
        onClose();
        setMessage('');
        setSelectedIds([]);
      } else {
        toast.error(response.message || "Failed to send some messages.");
      }
    } catch (error) {
      console.error("Bulk Send Error:", error);
      toast.error("An error occurred while bulk sending.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className={`relative bg-white dark:bg-slate-900 w-full transition-all duration-300 ease-in-out ${selectedIds.length > 0 ? 'max-w-5xl' : 'max-w-2xl'} rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800`}
        >
          {/* Header */}
          <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Users className="text-indigo-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight leading-tight">Bulk WhatsApp Messenger</h3>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest px-0.5">Automated Multi-Channel Outreach</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col max-h-[85vh]">
            {/* Top Section split into Left (Selection) and Right (Selected Batch) */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Left Column: Patient Selection */}
              <div className="flex-1 overflow-hidden flex flex-col p-6 border-r border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Recipients</h4>
                  <button 
                    onClick={toggleSelectAll}
                    className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50 px-3 py-1 rounded-lg"
                  >
                    {selectedIds.length === filteredPatients.length && filteredPatients.length > 0 ? 'Deselect Result' : 'Select All Result'}
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4 group px-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="Search by name, ID or number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Patient List */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar min-h-[300px]">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map(p => (
                      <div 
                        key={p._id}
                        onClick={() => toggleSelectOne(p._id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                          selectedIds.includes(p._id)
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          selectedIds.includes(p._id)
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}>
                          {selectedIds.includes(p._id) && <CheckCircle2 className="text-white" size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-black truncate ${selectedIds.includes(p._id) ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>
                            {p.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-tighter">#{p.patientId || 'N/A'}</span>
                            <span className="flex items-center gap-1"><Phone size={10} /> {p.mobile || p.phone || p.contactNumber || p.contact}</span>
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-2">
                      <Search size={40} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No patients found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Selected Batch Summary */}
              <AnimatePresence>
                {selectedIds.length > 0 && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '320px', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="overflow-hidden flex flex-col bg-slate-50/50 dark:bg-slate-800/20"
                  >
                    <div className="flex flex-col h-full p-6">
                      <div className="flex items-center justify-between mb-4 px-1">
                        <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Batch Summary ({selectedIds.length})</h4>
                        <button 
                          onClick={() => setSelectedIds([])}
                          className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                        >
                          Clear Batch
                        </button>
                      </div>

                      {/* Selected Chips List */}
                      <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {patients.filter(p => selectedIds.includes(p._id)).map(p => (
                          <motion.div
                            key={p._id}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 truncate">{p.name}</p>
                              <p className="text-[9px] font-bold text-slate-400">#{p.patientId || 'N/A'}</p>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectOne(p._id);
                              }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Panel: Composer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Bulk Message Content</label>
                  {isSending && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 animate-pulse">
                      <Loader2 size={12} className="animate-spin" /> SENDING SEQUENTIALLY...
                    </div>
                  )}
                </div>
                
                <div className="relative group">
                  <textarea
                    rows="3"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your announcement or follow-up note..."
                    disabled={isSending}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none shadow-sm group-hover:border-slate-300 dark:group-hover:border-slate-600 disabled:opacity-50"
                  />
                  
                  <button
                    onClick={handleImprove}
                    disabled={isImproving || isSending || !message.trim()}
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:bg-slate-400 text-white text-[10px] font-black rounded-xl shadow-lg transition-all active:scale-95 disabled:scale-100"
                  >
                    {isImproving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} className="text-indigo-400 dark:text-white" />
                    )}
                    {isImproving ? "REFINING..." : "AI ENHANCE"}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isSending}
                  className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-black rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendBulk}
                  disabled={isSending || selectedIds.length === 0 || !message.trim()}
                  className="flex-[2] py-4 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-slate-800 disabled:bg-slate-300 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-2">
                    {isSending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    {isSending ? "Processing Bulk Dispatch..." : `Send Bulk (${selectedIds.length} patients)`}
                  </div>
                </button>
              </div>
              
              {/* Compliance Note */}
              <div className="flex items-center gap-2 px-1 opacity-50">
                <AlertCircle size={10} className="text-slate-400" />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Messages are sent sequentially to comply with WhatsApp safety guidelines.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BulkWhatsAppModal;
