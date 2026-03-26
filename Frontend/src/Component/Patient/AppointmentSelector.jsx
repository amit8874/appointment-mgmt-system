import React, { useState } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import useSlots from './useSlots';
import useAvailabilitySummary from './useAvailabilitySummary';

// Generate next 7 days starting from today + offset
const generateDates = (weekOffset = 0) => {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i + (weekOffset * 7));

    const formatted = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const day = date.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Fri"
    const dateNum = date.getDate(); // e.g., 28

    const isToday = i === 0;

    dates.push({ formatted, day, date: dateNum, isToday });
  }

  return dates;
};

// Loading skeleton for slots
const SlotsSkeleton = () => (
  <div className="flex flex-wrap gap-2 mb-4">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="px-3 py-1 rounded-full border border-gray-300 bg-gray-200 animate-pulse w-20 h-8"></div>
    ))}
  </div>
);

const AppointmentSelector = ({ doctorId, hospital, selectedDate, setSelectedDate, selectedSlot, setSelectedSlot }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const dates = generateDates(weekOffset);
  const { slots, loading, error, available } = useSlots(doctorId, selectedDate);
  const { summary, loading: summaryLoading } = useAvailabilitySummary(doctorId);

  const isDateAvailable = (dateStr) => {
    if (summaryLoading || summary.length === 0) return true; // Default to available while loading
    const dateInfo = summary.find(s => s.date === dateStr);
    return dateInfo ? dateInfo.available : true;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md border-t-2 border-r-2 border-gray-200" style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' }}>
      <h4 className="text-sm font-semibold mb-1 text-gray-700">{hospital}</h4>

      <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">SELECT DATE</p>

      {/* Date Picker (Horizontal Scroll) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 mb-2">
        <button
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="flex-shrink-0 p-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:border-indigo-500 transition-all duration-150"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {dates.map((d) => {
          const available = isDateAvailable(d.formatted);
          return (
            <button
              key={d.formatted}
              onClick={() => setSelectedDate(d.formatted)}
              disabled={!available}
              className={`flex flex-col items-center justify-center p-2 rounded-lg w-12 flex-shrink-0 transition-all duration-150
                ${d.formatted === selectedDate ? 'bg-indigo-700 text-white shadow-md' :
                  available ? 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-500' :
                  'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed opacity-40 grayscale-[0.5]'
                }
              `}
            >
              <span className="text-[10px] font-medium">{d.day}</span>
              <span className="text-lg font-bold leading-tight">{d.date}</span>
            </button>
          );
        })}
        <button
          onClick={() => setWeekOffset(prev => prev + 1)}
          className="flex-shrink-0 p-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:border-indigo-500 transition-all duration-150"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="text-[10px] font-bold text-gray-400 mb-2 mt-2 flex items-center uppercase tracking-wider">
        <Clock className="h-3 w-3 mr-1" />
        AVAILABLE SLOTS
      </p>

      {/* Time Slots */}
      {loading ? (
        <SlotsSkeleton />
      ) : error ? (
        <div className="text-center py-4 text-red-600 text-sm">
          Error loading slots: {error}
        </div>
      ) : !available ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          Doctor is not available on this date
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          All slots are booked for this date
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {slots.map((slot, idx) => {
          const isBooked = typeof slot === 'object' ? slot.isBooked : false;
          const isPast = typeof slot === 'object' ? slot.isPast : false;
          const slotTime = typeof slot === 'object' ? slot.time : slot;
          
          return (
            <button
              key={`${slotTime}-${idx}`}
              disabled={isBooked || isPast}
              onClick={() => !isBooked && !isPast && setSelectedSlot(slotTime)}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${
                isPast
                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                : isBooked
                ? "bg-red-50 text-red-400 border-red-200 cursor-not-allowed"
                : slotTime === selectedSlot
                ? "bg-indigo-700 text-white border-indigo-700 font-semibold shadow-sm"
                : "border-blue-400 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-md"
              }`}
              title={isPast ? "Time slot expired" : isBooked ? "Already booked" : "Click to select"}
            >
              <div className="flex flex-col items-center">
                <span>{slotTime}</span>
                {isPast && <span className="text-[9px] uppercase font-bold">Expired</span>}
                {isBooked && !isPast && <span className="text-[9px] uppercase font-bold">Locked</span>}
              </div>
            </button>
          );
        })}
        </div>
      )}
    </div>
  );
};

export default AppointmentSelector;