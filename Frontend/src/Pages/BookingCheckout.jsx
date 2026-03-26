import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronDown, Clock, Calendar, MapPin, 
  ChevronLeft, Home, Smartphone, CheckCircle,
  Copy, User, Mail, MessageCircle, Info,
  ExternalLink, CalendarDays, X, ShieldCheck

} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const STEPS = {
  MOBILE_ENTRY: 'MOBILE_ENTRY',
  PATIENT_DETAILS: 'PATIENT_DETAILS',
  CONFIRMATION: 'CONFIRMATION',
  CANCEL_CONFIRMATION: 'CANCEL_CONFIRMATION',
  CANCEL_SUCCESS: 'CANCEL_SUCCESS'
};


const BookingCheckout = () => {
  const { doctorId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  const dateStr = queryParams.get('date');
  const slot = queryParams.get('slot');

  const [currentStep, setCurrentStep] = useState(STEPS.MOBILE_ENTRY);
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [mobileNumber, setMobileNumber] = useState('');
  const [patientDetails, setPatientDetails] = useState({
    fullName: '',
    email: '',
    isForSelf: true,
    whatsappUpdates: true
  });
  
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);

  useEffect(() => {
    fetchCheckoutDetails();
  }, [doctorId]);

  const fetchCheckoutDetails = async () => {
    try {
      const res = await api.get(`/doctors/public/checkout-details/${doctorId}`);
      setBookingData(res.data);
    } catch (err) {
      console.error("Error fetching checkout details:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleMobileSubmit = () => {
    if (mobileNumber.length === 10) {
      setCurrentStep(STEPS.PATIENT_DETAILS);
    }
  };

  const handleBookingConfirm = async () => {
    if (!patientDetails.fullName.trim()) return;
    
    setSubmitting(true);
    try {
      const payload = {
        doctorId,
        date: dateStr,
        time: slot,
        patientName: patientDetails.fullName,
        patientPhone: mobileNumber,
        patientEmail: patientDetails.email,
        isForSelf: patientDetails.isForSelf
      };
      
      const res = await api.post('/appointments/public/book', payload);
      setConfirmedAppointment(res.data.appointment);
      setCurrentStep(STEPS.CONFIRMATION);
    } catch (err) {
      console.error("Booking error:", err);
      alert(err.response?.data?.message || "Failed to book appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!confirmedAppointment) return;
    
    setSubmitting(true);
    try {
      await api.post(`/appointments/public/cancel/${confirmedAppointment.shortId}`);
      setCurrentStep(STEPS.CANCEL_SUCCESS);
    } catch (err) {
      console.error("Cancellation error:", err);
      alert("Failed to cancel appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const startReschedule = () => {
    // Go back to the search page or a previous step to select a new slot
    // For now, let's navigate back to the doctor's page to pick a new slot
    navigate(`/find-doctors?doctorId=${doctorId}`);
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-[#14bef0] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Booking details not found</h2>
        <p className="text-slate-500 mb-6">We couldn't retrieve the information for this appointment.</p>
        <Link to="/find-doctors" className="text-[#14bef0] font-bold hover:underline">Go back to search</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0f5] font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-20 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-3 h-3 bg-[#14bef0] rounded-full"></div>
          <span className="text-2xl font-black tracking-tighter text-[#2d2d32]">Slotify<span className="text-[#14bef0]">.</span></span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link to="/login" className="px-4 py-1.5 border border-slate-300 rounded text-sm font-medium hover:bg-slate-50 transition-all">
            Login / Signup
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 md:py-20 flex flex-col md:flex-row gap-12 items-start">
        {/* Left Section: Appointment Summary */}
        <div className={`w-full md:w-[480px] shrink-0 ${[STEPS.CONFIRMATION, STEPS.CANCEL_CONFIRMATION, STEPS.CANCEL_SUCCESS].includes(currentStep) ? 'hidden md:block' : ''}`}>

          <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
            {/* Header Title */}
            <div className="p-5 flex items-center gap-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-[#14bef0] flex items-center justify-center text-white">
                <Home size={16} fill="white" />
              </div>
              <h2 className="text-lg font-bold text-slate-700">In-clinic Appointment</h2>
            </div>
            
            {/* Date and Time Info */}
            <div className="p-5 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-700 italic">On {formatDate(dateStr)}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Clock size={16} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">At {slot}</span>
                  </div>
                </div>
              </div>
              {currentStep !== STEPS.CONFIRMATION && (
                <button 
                  onClick={() => navigate(-1)}
                  className="text-[#14bef0] text-xs font-bold hover:underline"
                >
                  Change Date & Time
                </button>
              )}
            </div>

            {/* Doctor Info */}
            <div className="p-5 flex gap-4 border-b border-slate-100">
              <div className="w-20 h-20 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                {bookingData.doctor.photo ? (
                  <img src={bookingData.doctor.photo} alt={bookingData.doctor.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                    <CheckCircle size={32} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-base leading-tight">Dr. {bookingData.doctor.name}</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tight">
                  {bookingData.doctor.qualification || "BDS, MDS"} - {bookingData.doctor.specialization}
                </p>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed line-clamp-2">
                  {bookingData.doctor.specialization}, Cosmetic/Aesthetic Dentist, Implantologist, Dental Surgeon
                </p>
              </div>
            </div>

            {/* Clinic Info */}
            <div className="p-5 flex gap-4">
              <div className="w-16 h-16 rounded border border-slate-200 flex items-center justify-center shrink-0 p-2">
                 <div className="w-full h-full flex flex-col items-center justify-center text-[8px] font-black text-slate-300 text-center leading-[1]">
                    <div className="border-[1.5px] border-slate-200 w-8 h-8 rounded-sm mb-1 flex items-center justify-center">
                       <MapPin size={12} className="text-slate-300" />
                    </div>
                    {bookingData.clinic.name.split(' ').slice(0,3).join('\n')}
                 </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-700 text-sm">{bookingData.clinic.name}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  {bookingData.clinic.address}
                </p>
                <button className="text-[#14bef0] text-xs font-bold mt-1 hover:underline flex items-center gap-1">
                  Get Directions
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/find-doctors')}
            className="mt-8 text-[#14bef0] text-[13px] font-bold hover:underline"
          >
            Go back to my results
          </button>
        </div>

        {/* Right Section: Stepper Content */}
        <div className="flex-1 w-full overflow-hidden">
          <AnimatePresence mode="wait">
            {currentStep === STEPS.MOBILE_ENTRY && (
              <motion.div 
                key="mobile-entry"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full flex flex-col items-center md:items-start md:pt-4"
              >
                <h1 className="text-3xl font-black text-slate-800 mb-10 tracking-tight">Enter your mobile number</h1>
                <div className="w-full max-w-sm">
                  <div className="relative mb-4">
                    <label className="text-xs font-bold text-slate-500 absolute -top-2 left-3 bg-[#f0f0f5] px-1 z-10">
                      Mobile<span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center border border-slate-300 rounded bg-white overflow-hidden shadow-sm focus-within:border-[#14bef0] transition-colors">
                      <div className="pl-4 pr-2 py-3 border-r border-slate-100 flex items-center gap-1">
                         <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Flag_of_India.svg/20px-Flag_of_India.svg.png" alt="IN" className="w-5" />
                         <span className="text-sm font-bold text-slate-400">+91</span>
                      </div>
                      <input 
                        type="text" 
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Mobile Number"
                        autoFocus
                        className="w-full py-3 px-4 text-sm font-medium outline-none text-slate-700 placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-6">
                    You will receive an OTP shortly.<br />
                    We will send appointment-related communications on this number.
                  </p>
                  <button 
                    onClick={handleMobileSubmit}
                    disabled={mobileNumber.length !== 10}
                    className={`w-full py-3 rounded font-black text-sm tracking-wide transition-all ${
                      mobileNumber.length === 10 
                      ? "bg-[#14bef0] text-white shadow-md active:scale-[0.98]" 
                      : "bg-slate-300 text-white cursor-not-allowed"
                    }`}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === STEPS.PATIENT_DETAILS && (
              <motion.div 
                key="patient-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-lg"
              >
                <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <User size={24} className="text-slate-400" />
                  Patient Details
                </h1>
                
                <div className="space-y-6">
                  {/* For Selection */}
                  <div>
                    <p className="text-sm font-bold text-slate-600 mb-3 italic">This in-clinic appointment is for:</p>
                    <div className="space-y-2">
                      <button 
                        onClick={() => setPatientDetails({...patientDetails, isForSelf: true})}
                        className={`w-full flex items-center justify-between p-4 border rounded transition-all ${patientDetails.isForSelf ? 'border-[#14bef0] bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                         <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${patientDetails.isForSelf ? 'border-[#14bef0]' : 'border-slate-300'}`}>
                               {patientDetails.isForSelf && <div className="w-2.5 h-2.5 bg-[#14bef0] rounded-full" />}
                            </div>
                            <span className={`text-sm font-bold ${patientDetails.isForSelf ? 'text-slate-800' : 'text-slate-600'}`}>Myself</span>
                         </div>
                      </button>
                      <button 
                         onClick={() => setPatientDetails({...patientDetails, isForSelf: false})}
                         className={`w-full flex items-center justify-between p-4 border rounded transition-all ${!patientDetails.isForSelf ? 'border-[#14bef0] bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                         <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!patientDetails.isForSelf ? 'border-[#14bef0]' : 'border-slate-300'}`}>
                               {!patientDetails.isForSelf && <div className="w-2.5 h-2.5 bg-[#14bef0] rounded-full" />}
                            </div>
                            <span className={`text-sm font-bold ${!patientDetails.isForSelf ? 'text-slate-800' : 'text-slate-600'}`}>Someone Else</span>
                         </div>
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-slate-600 mb-2 mt-8 italic">Please provide following information about user:</p>
                  
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Full Name<span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={patientDetails.fullName}
                        onChange={(e) => setPatientDetails({...patientDetails, fullName: e.target.value})}
                        placeholder="Enter Your Full Name"
                        className="w-full py-3 px-4 border border-slate-300 rounded text-sm font-medium focus:border-[#14bef0] outline-none placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Mobile (Fixed) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Mobile<span className="text-red-500">*</span></label>
                      <button 
                        onClick={() => setCurrentStep(STEPS.MOBILE_ENTRY)}
                        className="text-[10px] font-bold text-[#14bef0] hover:underline uppercase tracking-wider"
                      >
                        Change
                      </button>
                    </div>
                    <div className="relative flex items-center group">
                      <div className="absolute left-4 flex items-center gap-1 text-slate-400 font-bold border-r border-slate-100 pr-2">
                         <span className="text-xs">+91</span>
                      </div>
                      <input 
                        type="text"
                        value={mobileNumber}
                        readOnly
                        className="w-full py-3 pl-12 pr-10 border border-slate-200 rounded text-sm font-medium bg-slate-50 text-slate-400 cursor-default focus:outline-none"
                      />
                      <ShieldCheck size={18} className="absolute right-4 text-slate-300 group-hover:text-[#14bef0] transition-colors" />
                    </div>
                  </div>


                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Your Email</label>
                    <input 
                      type="email"
                      value={patientDetails.email}
                      onChange={(e) => setPatientDetails({...patientDetails, email: e.target.value})}
                      placeholder="Enter Your Email ID (Optional)"
                      className="w-full py-3 px-4 border border-slate-300 rounded text-sm font-medium focus:border-[#14bef0] outline-none placeholder:text-slate-300"
                    />
                  </div>

                  {/* WhatsApp Checkbox */}
                  <div className="flex items-start gap-3 mt-4">
                     <div className="relative flex items-center h-5">
                       <input 
                         type="checkbox" 
                         checked={patientDetails.whatsappUpdates}
                         onChange={() => setPatientDetails({...patientDetails, whatsappUpdates: !patientDetails.whatsappUpdates})}
                         className="w-4 h-4 text-[#14bef0] border-slate-300 rounded"
                       />
                     </div>
                     <div className="flex items-center gap-2">
                        <MessageCircle size={16} fill="#25D366" className="text-white" />
                        <label className="text-xs font-bold text-slate-500">Get updates on WhatsApp number +91{mobileNumber}</label>
                     </div>

                  </div>

                  {/* Payment Selection */}
                  <div className="pt-6">
                    <p className="text-sm font-bold text-slate-600 mb-4 italic">Choose a payment option to Book Appointment</p>
                    <div className="p-4 border border-[#14bef0] rounded bg-blue-50/30 flex items-center gap-4">
                       <div className="w-5 h-5 rounded-full border-2 border-[#14bef0] flex items-center justify-center">
                           <div className="w-2.5 h-2.5 bg-[#14bef0] rounded-full" />
                       </div>
                       <div>
                          <p className="text-sm font-bold text-slate-800">₹{bookingData.doctor.fee || (bookingData.doctor.consultationFee || 300)}</p>
                          <p className="text-xs font-medium text-slate-600">Pay later at the clinic</p>
                       </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleBookingConfirm}
                    disabled={!patientDetails.fullName.trim() || submitting}
                    className={`mt-8 w-full py-3.5 rounded font-black text-sm tracking-widest uppercase transition-all shadow-md ${
                      patientDetails.fullName.trim() && !submitting
                      ? "bg-[#ababaf] hover:bg-[#2d2d32] text-white active:scale-[0.98]" 
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {submitting ? "Booking..." : "Confirm Clinic Visit"}
                  </button>

                  <div className="mt-4 flex flex-col gap-3">
                     <div className="flex gap-2">
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">1.</span>
                        <p className="text-[10px] font-medium text-slate-400">Updates will be sent to +91{mobileNumber}</p>
                     </div>
                     <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        By booking this appointment, you agree to Slotify's <span className="text-[#14bef0] cursor-pointer hover:underline">Terms and Conditions</span>.<br />
                        You can also Pre-pay for this appointment by selecting Pay Online option. You can read our <span className="text-[#14bef0] cursor-pointer hover:underline">payment FAQs</span>.
                     </p>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === STEPS.CONFIRMATION && confirmedAppointment && (
              <motion.div 
                key="confirmation"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col md:pt-4"
              >
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                      <CheckCircle size={20} fill="white" />
                   </div>
                   <h1 className="text-2xl font-bold text-slate-800">Appointment Confirmed</h1>
                </div>

                <div className="space-y-1 mb-8">
                   <p className="text-sm font-medium text-slate-700">Your appointment ID is <span className="font-black text-slate-900">{confirmedAppointment.shortId}</span></p>
                   <p className="text-xs text-slate-500 leading-relaxed">We have sent you an email and SMS with the details.</p>
                   <p className="text-xs text-slate-500">This appointment is covered under <span className="text-[#9333ea] font-black italic">Prime</span> <ShieldCheck size={14} className="inline text-[#9333ea] fill-white" /></p>
                </div>

                {/* Prime Benefits Box */}
                <div className="bg-[#fdfaff] border border-purple-100 rounded p-6 mb-10 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 opacity-50" />
                   <h2 className="text-xl font-bold text-[#9333ea] mb-6 flex items-center gap-1">
                      Prime <CheckCircle size={18} fill="#9333ea" className="text-white" /> benefits
                   </h2>
                   <p className="text-xs font-bold text-slate-400 mb-6 tracking-tight">Our promise to you</p>
                   <ul className="space-y-4 relative z-10">
                      <li className="flex items-center gap-3">
                         <CheckCircle size={16} fill="#9333ea" className="text-white shrink-0" />
                         <span className="text-xs font-bold text-slate-600">Verified consultation fees of ₹{confirmedAppointment.amount || (bookingData.doctor.fee || 300)}</span>
                      </li>
                      <li className="flex items-center gap-3">
                         <CheckCircle size={16} fill="#9333ea" className="text-white shrink-0" />
                         <span className="text-xs font-bold text-slate-600">Verified Location</span>
                      </li>
                   </ul>
                </div>

                {/* Patient Summary */}
                <div className="space-y-4 mb-10 border-t border-slate-100 pt-8">
                   <div className="grid grid-cols-2 gap-y-4 max-w-sm">
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Patient Name</p>
                         <p className="text-sm font-bold text-slate-800">{confirmedAppointment.patientName}</p>
                      </div>
                      <div className="hidden md:block"></div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                         <p className="text-sm font-bold text-slate-800 break-all">{confirmedAppointment.patientEmail || "Not Provided"}</p>
                      </div>
                      <div className="hidden md:block"></div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile</p>
                         <p className="text-sm font-bold text-slate-800">+91{confirmedAppointment.patientPhone}</p>
                      </div>
                   </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-6">
                   <button 
                     onClick={() => setCurrentStep(STEPS.CANCEL_CONFIRMATION)}
                     className="px-6 py-2 border border-[#14bef0] rounded text-[13px] font-bold text-[#14bef0] hover:bg-blue-50 transition-all"
                   >
                      Cancel Appointment
                   </button>
                   <button 
                     onClick={startReschedule}
                     className="px-6 py-2 border border-[#14bef0] rounded text-[13px] font-bold text-[#14bef0] hover:bg-blue-50 transition-all"
                   >
                      Reschedule Appointment
                   </button>
                </div>
              </motion.div>
            )}

            {currentStep === STEPS.CANCEL_CONFIRMATION && (
               <motion.div 
                 key="cancel-confirmation"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="w-full bg-white p-10 rounded border border-slate-200"
               >
                  <h1 className="text-2xl font-black text-slate-800 mb-6">Cancel Appointment</h1>
                  <p className="text-sm font-bold text-slate-600 mb-8 italic">Do you want to cancel the appointment?</p>
                  
                  <button 
                    onClick={handleCancelAppointment}
                    disabled={submitting}
                    className="bg-[#00a300] text-white px-6 py-2 rounded font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-sm"
                  >
                    {submitting ? "Cancelling..." : "Yes, go ahead"}
                  </button>
               </motion.div>
            )}

            {currentStep === STEPS.CANCEL_SUCCESS && (
               <motion.div 
                 key="cancel-success"
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="w-full flex flex-col items-center md:items-start pt-10"
               >
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white">
                        <X size={24} />
                     </div>
                     <h1 className="text-2xl font-bold text-slate-800">Appointment Cancelled</h1>
                  </div>
                  <p className="text-sm font-medium text-slate-500 mb-10 text-center md:text-left">
                     Your appointment has been successfully cancelled and removed from our records.
                  </p>
                  <button 
                    onClick={() => navigate('/find-doctors')}
                    className="text-[#14bef0] font-black text-sm hover:underline"
                  >
                     Go back to Doctors
                  </button>
               </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default BookingCheckout;
