import React, { useState, useEffect } from 'react';
import { 
  History, 
  MapPin, 
  Calendar, 
  Clock, 
  ChevronRight, 
  User, 
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, startOfToday } from 'date-fns';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. ChatActionOptions - Horizontal Buttons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ChatActionOptions = ({ options, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-bottom-2">
      {options.map((opt, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(opt.value || opt.label)}
          className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm active:scale-95"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. DoctorChatCard - Doctor Card with Slots
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const DoctorChatCard = ({ doctor }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Generate next 7 days for tabs
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i));

  useEffect(() => {
    const fetchSlots = async () => {
      if (!doctor.id || !selectedDate) return;
      setLoadingSlots(true);
      try {
        const res = await api.get(`/doctors/${doctor.id}/slots?date=${selectedDate}`);
        setSlots(res.data.slots || []);
      } catch (err) {
        console.error("Error fetching slots in chat:", err);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [doctor.id, selectedDate]);

  const handleBook = () => {
    if (!selectedSlot) return;
    // Redirect to checkout with params
    navigate(`/booking/checkout/${doctor.id}?date=${selectedDate}&time=${selectedSlot.time}`);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 overflow-hidden max-w-sm mt-4 animate-in zoom-in-95 duration-300">
      {/* Header Profile */}
      <div className="p-4 bg-gradient-to-br from-blue-50 to-white flex gap-4 border-b border-slate-50">
        <div className="relative">
          {doctor.photo ? (
            <img src={doctor.photo} alt={doctor.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
              <User size={32} />
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-black text-slate-800 tracking-tight leading-tight">Dr. {doctor.name}</h4>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">
            {doctor.specialization}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Star size={10} className="text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-black text-slate-500">4.9</span>
            </div>
            <div className="flex items-center gap-1">
              <History size={10} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500">{doctor.experience || 5}+ Yrs Exp</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hospital Info */}
      <div className="px-4 py-3 flex items-center gap-2 text-slate-500 border-b border-slate-50">
        <MapPin size={14} className="text-slate-300" />
        <p className="text-[11px] font-bold truncate">
          {doctor.hospital}, {doctor.city}
        </p>
      </div>

      {/* Date Selector Tabs */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {dates.map((date, idx) => {
            const formatted = format(date, 'yyyy-MM-dd');
            const isActive = selectedDate === formatted;
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(formatted)}
                className={`flex-shrink-0 flex flex-col items-center min-w-[50px] p-2 rounded-xl transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] font-black uppercase">{format(date, 'EEE')}</span>
                <span className="text-xs font-black">{format(date, 'dd')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots Grid */}
      <div className="px-4 py-2 min-h-[140px]">
        {loadingSlots ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Clock className="w-5 h-5 text-blue-200 animate-spin mb-2" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Checking Availability...</p>
          </div>
        ) : slots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot, idx) => {
              const isSelected = selectedSlot?.time === slot.time;
              const isAvailable = !slot.isBooked;
              
              return (
                <button
                  key={idx}
                  disabled={!isAvailable}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2 rounded-xl text-[11px] font-black tracking-tight transition-all border ${
                    !isAvailable 
                      ? 'bg-slate-50 text-slate-300 border-slate-50 cursor-not-allowed opacity-50' 
                      : isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                      : 'bg-white text-slate-600 border-slate-100 hover:border-blue-200'
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-5 h-5 text-slate-200 mb-2" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Slots Today</p>
          </div>
        )}
      </div>

      {/* Booking Action */}
      <div className="p-4 bg-slate-50/50">
        <button
          disabled={!selectedSlot}
          onClick={handleBook}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedSlot ? `Book for ${selectedSlot.time}` : 'Select a slot to book'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
