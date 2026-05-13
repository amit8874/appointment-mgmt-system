import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, Calendar, Clock, Search, User, AlertCircle, ChevronDown, Check, Loader2, Tag, UserCheck, ShieldCheck, Phone } from 'lucide-react';
import { patientApi, userApi, followUpReminderApi } from '../../services/api';
import { toast } from 'react-toastify';

const AddFollowUpReminderModal = ({ isOpen, onClose, onSuccess, patient = null, onReminderAdded }) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(patient);
  const searchRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    note: '',
    reminderType: 'FOLLOW_UP_VISIT',
    priority: 'MEDIUM',
    reminderDate: '',
    reminderTime: '',
    customPatientName: '',
    customPatientMobile: ''
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2 && !selectedPatient) {
        setSearching(true);
        try {
          const response = await patientApi.searchAvailablePatients(searchQuery);
          setSearchResults(response.patients || []);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedPatient]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectPatient = (p) => {
    setSelectedPatient(p);
    setSearchQuery('');
    setSearchResults([]);
    setFormData(prev => ({ ...prev, customPatientName: '', customPatientMobile: '' }));
  };

  const clearPatientSelection = () => {
    if (patient) return; 
    setSelectedPatient(null);
    setSearchQuery('');
  };

  const validate = () => {
    if (!selectedPatient && !searchQuery.trim()) {
      toast.error('Please enter a patient name or select one');
      return false;
    }
    if (!formData.title) {
      toast.error('Reminder title is required');
      return false;
    }
    if (!formData.reminderDate || !formData.reminderTime) {
      toast.error('Date and time are required');
      return false;
    }

    const reminderAt = new Date(`${formData.reminderDate}T${formData.reminderTime}`);
    if (reminderAt < new Date()) {
      toast.error('Reminder time cannot be in the past');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        patientId: selectedPatient?._id || selectedPatient?.id || null,
        customPatientName: selectedPatient ? null : searchQuery.trim(),
        doctorId: selectedPatient?.assignedDoctorId || selectedPatient?.doctorId || null,
        reminderAt: new Date(`${formData.reminderDate}T${formData.reminderTime}`)
      };

      await followUpReminderApi.createFollowUpReminder(payload);
      toast.success('Reminder scheduled');
      if (onReminderAdded) onReminderAdded();
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule reminder');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden border">
        {/* Header */}
        <div className="px-5 py-3 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold text-black">Schedule Follow-up</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Patient Selection */}
          <div className="relative" ref={searchRef}>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Patient Name / Details</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    {selectedPatient.fullName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-black text-sm">
                      {selectedPatient.fullName || `${selectedPatient.firstName} ${selectedPatient.lastName}`}
                    </h4>
                    <p className="text-[11px] text-gray-500 font-medium">
                      ID: {selectedPatient.patientId} • {selectedPatient.mobile}
                    </p>
                  </div>
                </div>
                {!patient && (
                  <button type="button" onClick={clearPatientSelection} className="text-[11px] font-bold text-blue-600 hover:underline">
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter name or search database..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm text-black focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
                  
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                      <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase border-b">Database Match</div>
                      {searchResults.map(p => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => selectPatient(p)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center border-b last:border-0"
                        >
                          <div>
                            <p className="text-sm font-semibold text-black">{p.fullName}</p>
                            <p className="text-[11px] text-gray-500">{p.mobile}</p>
                          </div>
                          <Check size={14} className="text-blue-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-2 rounded-md border border-gray-100">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Mobile Number (For Custom Name)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="tel"
                      name="customPatientMobile"
                      placeholder="e.g., +91 98765 43210"
                      value={formData.customPatientMobile}
                      onChange={handleChange}
                      className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-md text-xs text-black focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Reminder Title</label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g., Blood Report Review"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-black focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Note (Optional)</label>
              <textarea
                name="note"
                rows="2"
                placeholder="Details about the follow-up..."
                value={formData.note}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-black focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Type</label>
                <select
                  name="reminderType"
                  value={formData.reminderType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm outline-none bg-white text-black font-medium"
                >
                  <option value="CALL_BACK">Call Back</option>
                  <option value="FOLLOW_UP_VISIT">Follow-up Visit</option>
                  <option value="REPORT_REVIEW">Report Review</option>
                  <option value="MEDICINE_REVIEW">Medicine Review</option>
                  <option value="PAYMENT_FOLLOW_UP">Payment Follow-up</option>
                  <option value="GENERAL_REMINDER">General Reminder</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm outline-none bg-white text-black font-medium"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Date</label>
                <input
                  type="date"
                  name="reminderDate"
                  required
                  value={formData.reminderDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-black outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">Time</label>
                <input
                  type="time"
                  name="reminderTime"
                  required
                  value={formData.reminderTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-black outline-none"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="px-5 py-3 bg-gray-50 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-black">
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddFollowUpReminderModal;
