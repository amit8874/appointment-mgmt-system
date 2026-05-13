import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Phone, User, Calendar, Clock, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { followUpReminderApi } from '../../services/api';
import { toast } from 'react-toastify';

const DueReminderPopup = ({ reminder, onClose, onActionSuccess }) => {
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (actionFn, ...args) => {
    setIsProcessing(true);
    try {
      await actionFn(reminder._id, ...args);
      toast.success("Reminder updated");
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (error) {
      toast.error("Action failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSnooze = async (minutes) => {
    const snoozedUntil = new Date(Date.now() + minutes * 60000);
    handleAction(followUpReminderApi.snoozeFollowUpReminder, snoozedUntil);
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    const reminderAt = new Date(`${rescheduleData.date}T${rescheduleData.time}`);
    handleAction(followUpReminderApi.rescheduleFollowUpReminder, reminderAt);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-full max-w-sm">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white border shadow-2xl rounded-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-blue-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bell size={16} />
            <span className="text-sm font-semibold">Reminder Due</span>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Patient Info */}
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-500 font-bold shrink-0">
              {(reminder.patientId?.fullName || reminder.customPatientName || 'P').charAt(0)}
            </div>
            <div>
              <h4 className="text-sm font-bold text-black">{reminder.title}</h4>
              <p className="text-xs text-gray-600">{reminder.patientId?.fullName || reminder.customPatientName || 'No Name'}</p>
              <p className="text-[11px] text-gray-500 font-semibold">{reminder.patientId?.mobile || reminder.customPatientMobile || 'No Phone'}</p>
            </div>
          </div>

          {reminder.note && (
            <div className="bg-gray-50 p-2 text-xs text-gray-700 border border-dashed rounded">
              "{reminder.note}"
            </div>
          )}

          {!showReschedule ? (
            <div className="space-y-2">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleAction(followUpReminderApi.completeFollowUpReminder)}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle size={14} /> Done
                </button>
                <a 
                  href={`tel:${reminder.patientId?.mobile}`}
                  className="flex items-center justify-center gap-2 py-2 border border-gray-200 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50"
                >
                  <Phone size={14} /> Call
                </a>
              </div>

              {/* Advanced Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => handleSnooze(15)}
                  disabled={isProcessing}
                  className="py-2 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 border rounded"
                >
                  Snooze 15m
                </button>
                <button 
                  onClick={() => setShowReschedule(true)}
                  disabled={isProcessing}
                  className="py-2 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 border rounded"
                >
                  Reschedule
                </button>
                <button 
                  onClick={() => handleAction(followUpReminderApi.cancelFollowUpReminder)}
                  disabled={isProcessing}
                  className="py-2 text-[10px] font-semibold text-red-600 hover:bg-red-50 border border-red-100 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRescheduleSubmit} className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date"
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})}
                  className="w-full px-2 py-1.5 border rounded text-xs text-black"
                />
                <input 
                  type="time"
                  value={rescheduleData.time}
                  onChange={(e) => setRescheduleData({...rescheduleData, time: e.target.value})}
                  className="w-full px-2 py-1.5 border rounded text-xs text-black"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-2 bg-blue-600 text-white rounded text-xs font-semibold"
                >
                  Confirm
                </button>
                <button 
                  type="button"
                  onClick={() => setShowReschedule(false)}
                  className="px-4 py-2 border rounded text-xs font-semibold"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DueReminderPopup;
