import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { X, Loader2, Save } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import BillingModal from "../../components/Shared/BillingModal";
import api from "../../services/api";

export default function NewAppointmentForm({ onClose, onSuccess, initialData }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const location = useLocation();
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotError, setSlotError] = useState('');

  // Billing modal state
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingInitData, setBillingInitData] = useState({});
  const billingAppointmentIdRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    day: "",
    month: "",
    year: "",
    gender: "",
    bloodGroup: "",
    phone: "",
    email: "",
    streetAddress: "",
    streetAddress2: "",
    city: "",
    state: "",
    postalCode: "",
    previouslyApplied: "",
    department: "",
    procedure: "",
    appointmentDate: "",
    appointmentTime: ""
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Initialize form with initialData if provided
  useEffect(() => {
    const combinedData = initialData || location.state?.rebookData;
    if (combinedData) {
      // Handle Date of Birth split
      let dobParts = { day: "", month: "", year: "" };
      if (combinedData.dateOfBirth) {
        try {
          const dob = new Date(combinedData.dateOfBirth);
          if (!isNaN(dob.getTime())) {
            dobParts.day = dob.getDate().toString();
            dobParts.month = (dob.getMonth() + 1).toString();
            dobParts.year = dob.getFullYear().toString();
          }
        } catch (e) {
          console.error("Error parsing DOB:", e);
        }
      }

      setFormData(prev => ({
        ...prev,
        ...combinedData,
        // Day/Month/Year from DOB
        ...dobParts,
        // Ensure values are strings for form compatibility
        doctor: combinedData.doctorId || combinedData.doctor || prev.doctor,
        appointmentDate: combinedData.date || combinedData.appointmentDate || prev.appointmentDate,
        appointmentTime: combinedData.time || combinedData.appointmentTime || prev.appointmentTime,
        procedure: combinedData.reason || combinedData.procedure || prev.procedure,
        // Prefer specific firstName/lastName over splitting full name
        firstName: combinedData.firstName || (combinedData.patientName ? combinedData.patientName.split(' ')[0] : prev.firstName),
        lastName: combinedData.lastName || (combinedData.patientName ? combinedData.patientName.split(' ').slice(1).join(' ') : prev.lastName),
        // Normalize gender
        gender: combinedData.gender ? combinedData.gender.toLowerCase() : prev.gender,
      }));

      // If we have doctor and date, fetch slots
      const docId = combinedData.doctorId || combinedData.doctor;
      const appDate = combinedData.date || combinedData.appointmentDate;
      if (docId && appDate) {
        fetchAvailableSlotsExplicit(docId, appDate);
      }
    }
  }, [initialData, location.state]);

  // Helper for explicit slot fetching during initialization
  const fetchAvailableSlotsExplicit = async (docId, date) => {
    setIsFetchingSlots(true);
    setAvailableSlots([]);
    setSlotError('');
    try {
      const response = await api.get(`/doctors/${docId}/slots?date=${date}`);
      const data = response.data;
      if (response.status === 200 && data.available && data.slots && data.slots.length > 0) {
        setAvailableSlots(data.slots);
      } else {
        setSlotError(data.message || 'No slots available');
      }
    } catch (error) {
      setSlotError('Failed to load slots');
    } finally {
      setIsFetchingSlots(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      if (response.status === 200) {
        const data = response.data;
        setDoctors(data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!formData.doctor || !formData.appointmentDate) return;
    setIsFetchingSlots(true);
    setAvailableSlots([]);
    setSlotError('');
    try {
      const response = await api.get(`/doctors/${formData.doctor}/slots?date=${formData.appointmentDate}`);
      const data = response.data;
      if (response.status === 200 && data.available && data.slots && data.slots.length > 0) {
        setAvailableSlots(data.slots);
      } else if (data.message) {
        setSlotError(data.message);
      } else {
        setSlotError('No slots available for this date');
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setSlotError('Failed to load available slots');
    } finally {
      setIsFetchingSlots(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'doctor' || name === 'appointmentDate') {
      setFormData(prev => ({ ...prev, appointmentTime: "" }));
      // Fetch available slots when either doctor or date changes
      if ((name === 'doctor' && formData.appointmentDate) ||
        (name === 'appointmentDate' && formData.doctor)) {
        fetchAvailableSlots();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const selectedDoctor = doctors.find(d => d._id === formData.doctor);

      // Calculate age from DOB
      let age = null;
      if (formData.year && formData.month && formData.day) {
        const birthDate = new Date(formData.year, formData.month - 1, formData.day);
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        age = calculatedAge;
      }

      const appointmentData = {
        patientDetails: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email,
          address: `${formData.streetAddress}${formData.streetAddress2 ? ', ' + formData.streetAddress2 : ''}${formData.city ? ', ' + formData.city : ''}${formData.state ? ', ' + formData.state : ''}${formData.postalCode ? ', ' + formData.postalCode : ''}`,
          age: age,
          gender: formData.gender,
          dateOfBirth: formData.year ? `${formData.year}-${String(formData.month).padStart(2, '0')}-${String(formData.day).padStart(2, '0')}` : null,
          bloodGroup: formData.bloodGroup
        },
        doctorId: formData.doctor,
        doctorName: selectedDoctor ? selectedDoctor.name : '',
        specialty: selectedDoctor ? selectedDoctor.specialization : '',
        date: formData.appointmentDate,
        time: formData.appointmentTime,
        reason: formData.procedure
      };

      const response = await api.post('/appointments', appointmentData);

      if (response.status === 201 || response.status === 200) {
        const appointment = response.data;

        // Store appointment ID for billing
        billingAppointmentIdRef.current = appointment._id;

        // Prepare billing data
        setBillingInitData({
          patientId: appointment.patientId,
          patientName: `${formData.firstName} ${formData.lastName}`.trim(),
          age: age,
          gender: formData.gender,
          contactNumber: formData.phone,
          email: formData.email,
          bloodGroup: formData.bloodGroup || '',
          doctorId: formData.doctor,
          doctorName: selectedDoctor ? selectedDoctor.name : '',
          appointmentId: appointment._id,
          appointmentDate: formData.appointmentDate,
          appointmentTime: formData.appointmentTime,
          total: selectedDoctor?.consultationFee || 500,
        });

        // Open billing modal
        setBillingOpen(true);
        setIsLoading(false);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create appointment');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
      setIsLoading(false);
    }
  };

  // Handle billing completion
  const handleBillingComplete = async (bill) => {
    console.log('Billing completed:', bill);
    toast.success('Payment completed successfully!');
    setBillingOpen(false);
    if (onSuccess) onSuccess();
    if (onClose) onClose();
  };

  const departments = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  return (
    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">New Appointment</h2>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="text-sm">
        {/* Patient Info - Compact Grid */}
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Patient Information</h3>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required placeholder="First Name *" className="border p-1.5 rounded text-sm" />
            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required placeholder="Last Name *" className="border p-1.5 rounded text-sm" />
          </div>
        </div>

        {/* DOB & Gender */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Date of Birth</label>
            <select name="day" value={formData.day} onChange={handleChange} className="border p-1.5 rounded text-xs w-full">
              <option value="">Day</option>
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">&nbsp;</label>
            <select name="month" value={formData.month} onChange={handleChange} className="border p-1.5 rounded text-xs w-full">
              <option value="">Month</option>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">&nbsp;</label>
            <select name="year" value={formData.year} onChange={handleChange} className="border p-1.5 rounded text-xs w-full">
              <option value="">Year</option>
              {years.slice(0, 50).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className="border p-1.5 rounded text-xs w-full">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Phone & Email */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Phone *" className="border p-1.5 rounded text-sm" />
          <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="border p-1.5 rounded text-sm" />
        </div>

        {/* Address - Compact */}
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Address</h3>
          <input type="text" name="streetAddress" value={formData.streetAddress} onChange={handleChange} placeholder="Street Address" className="border p-1.5 rounded text-sm w-full mb-1" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" className="border p-1.5 rounded text-sm" />
            <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="State" className="border p-1.5 rounded text-sm" />
          </div>
        </div>

        {/* Department & Procedure */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <select name="department" value={formData.department} onChange={handleChange} className="border p-1.5 rounded text-xs">
            <option value="">Department</option>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
          <input type="text" name="procedure" value={formData.procedure} onChange={handleChange} placeholder="Procedure/Reason" className="border p-1.5 rounded text-sm" />
        </div>

        {/* Appointment Details */}
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Appointment</h3>
          <div className="grid grid-cols-2 gap-2">
            <select name="doctor" value={formData.doctor} onChange={handleChange} required className="border p-1.5 rounded text-xs">
              <option value="">Select Doctor</option>
              {doctors.filter(d => !formData.department || d.specialization === formData.department).map(doctor => (
                <option key={doctor._id} value={doctor._id}>Dr. {doctor.name}</option>
              ))}
            </select>
            <input type="date" name="appointmentDate" value={formData.appointmentDate} onChange={handleChange} required min={new Date().toISOString().split('T')[0]} className="border p-1.5 rounded text-xs" />
          </div>
        </div>

        {/* Time Slots */}
        <div className="mb-4">
          <label className="text-xs text-gray-600 block mb-1">Available Slots</label>
          {isFetchingSlots ? (
            <div className="flex items-center gap-1 text-xs text-gray-500"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</div>
          ) : formData.doctor && formData.appointmentDate ? (
            availableSlots.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {availableSlots.map(slot => {
                  const isBooked = typeof slot === 'object' ? slot.isBooked : false;
                  const isPast = typeof slot === 'object' ? slot.isPast : false;
                  const slotTime = typeof slot === 'object' ? slot.time : slot;
                  
                  return (
                    <button 
                      key={slotTime} 
                      type="button" 
                      disabled={isBooked || isPast}
                      onClick={() => !isBooked && !isPast && setFormData(prev => ({ ...prev, appointmentTime: slotTime }))}
                      className={`px-2 py-1 rounded text-xs transition-colors duration-150 flex flex-col items-center ${
                        formData.appointmentTime === slotTime 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : isPast
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                            : isBooked 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60' 
                            : 'border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                      }`}
                      title={isPast ? "Time slot expired" : isBooked ? "This slot is already booked" : "Click to select"}
                    >
                      <span>{slotTime}</span>
                      {isPast && <span className="text-[7px] uppercase font-bold">Expired</span>}
                      {isBooked && !isPast && <span className="text-[7px] uppercase font-bold">Locked</span>}
                    </button>
                  );
                })}
              </div>
            ) : slotError ? (
              <span className="text-xs text-orange-600">{slotError}</span>
            ) : (
              <span className="text-xs text-red-500">No slots available</span>
            )
          ) : <span className="text-xs text-gray-400">Select doctor & date</span>}
        </div>

        {/* Submit */}
        <button type="submit" disabled={isLoading}
          className="w-full bg-green-500 text-white py-2 rounded font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Create Appointment
        </button>
      </form>

      {/* Billing Modal */}
      {billingOpen && (
        <BillingModal
          initialData={billingInitData}
          onClose={() => setBillingOpen(false)}
          onComplete={handleBillingComplete}
        />
      )}

      <ToastContainer />
    </div>
  );
}
