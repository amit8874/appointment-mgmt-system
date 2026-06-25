import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, Calendar as CalendarIcon, Loader2, Mic, MicOff, X, Clock, Star, Heart } from 'lucide-react';
import api, { whatsappApi } from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HorizontalAppointmentForm({ doctors = [], onSuccess, openDoctorForm, initialData = null, limits, totalDoctors = 0 }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Interactive Conversational AI Voice Agent states
  const [voiceAgent, setVoiceAgent] = useState({
    isActive: false,
    isListening: false,
    isThinking: false,
    message: '',
    state: {},
  });

  const [existingPatients, setExistingPatients] = useState([]);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [selectedExistingId, setSelectedExistingId] = useState(null);
  
  const [formData, setFormData] = useState({
    patientId: 'Loading...',
    designation: 'MR.',
    fullName: '',
    age: '',
    ageType: 'Year',
    gender: 'Male',
    phone: '',
    department: '',
    doctor: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '',
    symptoms: '',
    notes: '',
  });

  const [bookingMode, setBookingMode] = useState('APPOINTMENT'); // Force APPOINTMENT mode to enable calendar and slots
  const [billingData, setBillingData] = useState({
    status: 'Pending',
    paymentMode: 'Pending'
  });
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [skipBilling, setSkipBilling] = useState(false);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [categorizedSlots, setCategorizedSlots] = useState({ morning: [], afternoon: [], evening: [] });
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');

  // Handle Voice-to-Text Conversational Loop
  const stopVoiceAgent = () => {
    window.speechSynthesis.cancel();
    setVoiceAgent(prev => ({ ...prev, isActive: false, isListening: false }));
  };

  const startVoiceAgent = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Browser does not support Speech Recognition. Please use Chrome.');
      return;
    }
    
    // Hard reset
    const initialState = {
       fullName: '', age: '', ageType: 'Year', gender: '', phone: '', doctor: '', symptoms: ''
    };

    setVoiceAgent({
      isActive: true,
      isListening: false,
      isThinking: true,
      message: 'Connecting to AI Assistant...',
      state: initialState
    });

    // Send empty transcript to trigger the first question safely
    processInteractiveTranscript('hello', initialState);
  };

  const speakAndListen = (text, currentState) => {
     window.speechSynthesis.cancel();
     const utterance = new SpeechSynthesisUtterance(text);
     
     utterance.onend = () => {
        // Start listening immediately after AI finishes speaking
        setVoiceAgent(prev => ({ ...prev, isListening: true, isThinking: false }));
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        let hasResult = false;

        recognition.onresult = async (event) => {
          hasResult = true;
          const currentTranscript = event.results[0][0].transcript;
          setVoiceAgent(prev => ({ ...prev, isListening: false, isThinking: true }));
          await processInteractiveTranscript(currentTranscript, currentState, text);
        };

        recognition.onerror = (event) => {
          if (event.error !== 'no-speech') {
             toast.error('Voice input failed: ' + event.error);
             stopVoiceAgent();
          }
        };
        
        recognition.onend = () => {
           if (!hasResult) {
              setVoiceAgent(prev => {
                  if (prev.isActive) {
                      try { recognition.start(); return { ...prev, isListening: true, isThinking: false }; } catch(e) {}
                  }
                  return prev;
              });
           }
        };
        
        try {
          recognition.start();
        } catch(e) {}
     };

     setVoiceAgent(prev => ({ ...prev, message: text }));
     window.speechSynthesis.speak(utterance);
  };

  const processInteractiveTranscript = async (transcript, currentState, lastAgentMessage = '') => {
    try {
      const res = await api.post('/appointments/intake-chat', { transcript, currentState, lastAgentMessage });
      if (res.data) {
        const { updatedState, reply, isComplete } = res.data;
        
        setVoiceAgent(prev => ({ ...prev, state: updatedState }));

        if (isComplete) {
           window.speechSynthesis.speak(new SpeechSynthesisUtterance("All done! I am filling the form now."));
           
           let matchingDoctorId = formData.doctor;
           if (updatedState.doctor) {
              const matchedDoc = doctors.find(d => d.name.toLowerCase().includes(updatedState.doctor.toLowerCase()));
              if (matchedDoc) matchingDoctorId = matchedDoc._id;
           }

           setFormData(prev => {
             let newDesignation = prev.designation;
             const returnedGender = (updatedState.gender || prev.gender)?.toLowerCase();
             if (returnedGender === 'female') {
                if (['MR.', 'SHRI.'].includes(prev.designation)) newDesignation = 'MS.';
             } else if (returnedGender === 'male') {
                if (['MS.', 'MRS.', 'MISS.', 'SMT.'].includes(prev.designation)) newDesignation = 'MR.';
             }

             return {
               ...prev,
               designation: newDesignation,
               fullName: updatedState.fullName || (updatedState.firstName ? `${updatedState.firstName} ${updatedState.lastName || ''}`.trim() : prev.fullName),
               age: updatedState.age || prev.age,
               ageType: updatedState.ageType || prev.ageType,
               gender: updatedState.gender || prev.gender,
               phone: updatedState.phone || prev.phone,
               symptoms: updatedState.symptoms || prev.symptoms,
               doctor: matchingDoctorId || prev.doctor
             };
           });

           setVoiceAgent(prev => ({ ...prev, isActive: false }));
           toast.success('Patient details successfully captured from AI Agent!');
        } else {
           speakAndListen(reply, updatedState);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('AI disconnected. Please try again.');
      stopVoiceAgent();
    }
  };

  // Handle initialData for re-appointments or pre-filled forms
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        patientId: initialData.patientId || prev.patientId,
        designation: initialData.designation || 'MR.',
        fullName: initialData.fullName || `${initialData.firstName || ''} ${initialData.lastName || ''}`.trim(),
        age: initialData.age || initialData.patientAge || '',
        ageType: initialData.ageType || 'Year',
        gender: initialData.gender
          ? (initialData.gender.charAt(0).toUpperCase() + initialData.gender.slice(1).toLowerCase())
          : 'Male',
        phone: initialData.phone || initialData.patientPhone || '',
        department: initialData.department || initialData.specialty || '',
        doctor: initialData.doctor || initialData.doctorId || '',
        symptoms: initialData.symptoms || initialData.reason || '',
      }));
      // Use the existing patient record (don't generate a new patient ID)
      if (initialData.patientId) {
        setSelectedExistingId(initialData.patientId);
      }
    }
  }, [initialData]);

  useEffect(() => {
    const fetchPatientId = async () => {
      // If we already have a patient ID from initialData (re-appointment), don't fetch a new one
      if (initialData && initialData.patientId) return;
      
      try {
        const orgId = user?.organizationId?._id || user?.organizationId || user?.organization?._id;
        if (!orgId) return;
        const response = await api.get(`/patients/generate-id?organizationId=${orgId}`);
        if (response.data && response.data.patientId) {
          setFormData(prev => ({ ...prev, patientId: response.data.patientId }));
        }
      } catch (error) {
        console.error('Error fetching patient ID:', error);
      }
    };
    fetchPatientId();
  }, [user, initialData]);

  // Gender auto-selection based on Designation
  useEffect(() => {
    const des = formData.designation.toUpperCase().replace('.', '');
    if (['MR', 'SHRI'].includes(des)) {
      setFormData(prev => ({ ...prev, gender: 'Male' }));
    } else if (['MS', 'MRS', 'MISS', 'SMT'].includes(des)) {
      setFormData(prev => ({ ...prev, gender: 'Female' }));
    }
  }, [formData.designation]);

  // Auto-select doctor and department if there is only a single doctor in the clinic
  useEffect(() => {
    if (doctors && doctors.length === 1) {
      const singleDoc = doctors[0];
      setFormData(prev => ({
        ...prev,
        doctor: singleDoc._id,
        department: singleDoc.specialization || ''
      }));
    }
  }, [doctors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'doctor' || name === 'appointmentDate') {
      setFormData(prev => ({ ...prev, appointmentTime: '' }));
    }
  };

  const fetchAvailableSlots = async () => {
    if (!formData.doctor || !formData.appointmentDate) return;
    setIsFetchingSlots(true);
    setAvailableSlots([]);
    setCategorizedSlots({ morning: [], afternoon: [], evening: [] });
    setSlotError('');
    try {
      const response = await api.get(`/doctors/${formData.doctor}/slots?date=${formData.appointmentDate}`);
      const data = response.data;
      if (response.status === 200 && data.available && data.slots && data.slots.length > 0) {
        setAvailableSlots(data.slots);
        setCategorizedSlots(data.categorizedSlots || { morning: [], afternoon: [], evening: [] });
      } else if (data.message) {
        setSlotError(data.message);
      } else {
        setSlotError('No slots available');
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setSlotError('Failed to load slots');
    } finally {
      setIsFetchingSlots(false);
    }
  };

  useEffect(() => {
    if (formData.doctor && formData.appointmentDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setCategorizedSlots({ morning: [], afternoon: [], evening: [] });
    }
  }, [formData.doctor, formData.appointmentDate]);

  // Real-time Patient Lookup by Phone
  useEffect(() => {
    const checkPhone = async () => {
      if (formData.phone.length === 10) {
        setIsCheckingPhone(true);
        try {
          const res = await api.get(`/patients/by-mobile/${formData.phone}`);
          if (res.data && Array.isArray(res.data)) {
            setExistingPatients(res.data);
          } else if (res.data && typeof res.data === 'object') {
            setExistingPatients([res.data]);
          }
        } catch (err) {
          setExistingPatients([]);
        } finally {
          setIsCheckingPhone(false);
        }
      } else {
        setExistingPatients([]);
        setSelectedExistingId(null);
      }
    };
    checkPhone();
  }, [formData.phone]);

  const handleUseExistingPatient = (p) => {
    setSelectedExistingId(p.patientId || p._id);
    const displayName = p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim();
    setFormData(prev => ({
      ...prev,
      fullName: displayName,
      age: p.age || '',
      ageType: p.ageType || 'Year',
      gender: p.gender || 'Male',
      patientId: p.patientId || prev.patientId,
      designation: p.designation || 'MR.',
    }));
    setExistingPatients([]);
    toast.info(`Using existing record for ${displayName}`);
  };

  const handleRegisterNewPatient = () => {
    setSelectedExistingId(null);
    setExistingPatients([]);
    setFormData(prev => ({
      ...prev,
      fullName: '',
      age: '',
    }));
    toast.success("Proceeding with new patient registration.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const orgId = user?.organizationId?._id || user?.organizationId || user?.organization?._id;
      if (!orgId) {
        toast.error('Organization information not found. Please log in again.');
        return;
      }
      
      const selectedDoc = doctors.find(d => d._id === formData.doctor);
      
      if (bookingMode === 'WALK_IN') {
        const walkInData = {
          designation: formData.designation || 'MR.',
          firstName: (formData.fullName || '').trim().split(/\s+/)[0] || '',
          lastName: (formData.fullName || '').trim().split(/\s+/).slice(1).join(' ') || '',
          fullName: formData.fullName,
          age: formData.age,
          ageType: formData.ageType,
          mobileNumber: formData.phone,
          gender: formData.gender || 'Male',
          department: formData.department || (selectedDoc ? selectedDoc.specialization : ''),
          doctorId: formData.doctor,
          doctorName: selectedDoc ? selectedDoc.name : '',
          symptoms: '',
          administrativeNotes: '',
          billingStatus: billingData.paymentMode === 'Pending' ? 'Pending' : 'Paid',
          paymentMode: billingData.paymentMode === 'Pending' ? 'N/A' : billingData.paymentMode,
          sendWhatsApp: sendWhatsApp,
          skipBilling: skipBilling
        };

        const response = await api.post('/appointments/walk-in', walkInData);
        if (response.data.success) {
          toast.success(response.data.message);
          if (response.data.warning) toast.warn(response.data.warning);
          
          resetForm();
          if (onSuccess) onSuccess();
        }
      } else {
        const nameParts = (formData.fullName || '').trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const paymentStatus = billingData.paymentMode === 'Pending' ? 'pending' : 'paid';
        const paymentMethod = billingData.paymentMode === 'Pending' ? 'N/A' : billingData.paymentMode;

        // Standard Appointment
        const appointmentData = {
          organizationId: orgId,
          patientId: selectedExistingId || formData.patientId,
          doctorId: formData.doctor,
          doctorName: selectedDoc ? selectedDoc.name : '',
          specialty: selectedDoc ? selectedDoc.specialization : 'General',
          date: formData.appointmentDate,
          time: formData.appointmentTime,
          paymentStatus,
          paymentMethod,
          sendWhatsApp: sendWhatsApp,
          skipBilling: skipBilling,
          patientDetails: {
            designation: formData.designation || 'MR.',
            firstName: firstName,
            lastName: lastName,
            fullName: formData.fullName,
            age: formData.age,
            ageType: formData.ageType,
            gender: formData.gender || 'Male',
            phone: formData.phone,
          },
          reason: '',
          symptoms: '',
          notes: '',
        };

        const response = await api.post('/appointments/book-patient', appointmentData);
        if (response.status === 200 || response.status === 201) {
          toast.success('Appointment booked successfully!');
          resetForm();
          
          const patientIdStr = response.data.patientDbId || response.data.patientId;
          if (patientIdStr) {
             const basePath = user?.role === 'receptionist' ? '/receptionist' : '/admin';
             navigate(`${basePath}/patient/${patientIdStr}`);
          } else {
             if (onSuccess) onSuccess();
          }
        }
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error(error.response?.data?.message || 'Failed to create appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      fullName: '',
      age: '',
      phone: '',
      symptoms: '',
      notes: '',
      appointmentTime: '',
    }));
    setSelectedExistingId(null);
    setExistingPatients([]);
    setSendWhatsApp(false);
    setSkipBilling(false);
  };

  const departments = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  // Calculate if doctor limit is reached
  const isLimitReached = limits && typeof limits.doctors === 'number' && limits.doctors !== -1 && (totalDoctors >= limits.doctors);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 w-full mb-6 relative">
      
      {/* Interactive AI Agent Overlay */}
      {voiceAgent.isActive && (
        <div className="absolute inset-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-8 border border-blue-200 dark:border-blue-900 shadow-2xl">
          <button onClick={stopVoiceAgent} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
             <X className="w-6 h-6" />
          </button>
          
          {voiceAgent.isListening ? (
             <div className="flex flex-col items-center animate-pulse">
                <div className="p-6 bg-blue-100 dark:bg-blue-900 rounded-full mb-4 shadow-[0_0_25px_rgba(59,130,246,0.6)]">
                  <Mic className="w-12 h-12 text-blue-600 dark:text-blue-300" />
                </div>
                <p className="text-blue-700 dark:text-blue-300 font-black text-2xl mb-1">Listening...</p>
                <p className="text-gray-500 text-sm">Speak clearly to answer the agent.</p>
             </div>
          ) : voiceAgent.isThinking ? (
             <div className="flex flex-col items-center mb-4">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                <p className="text-purple-700 dark:text-purple-300 font-extrabold text-xl">AI is processing...</p>
             </div>
          ) : (
             <div className="flex flex-col items-center mb-4 hidden">
                <div className="p-6 bg-green-100 dark:bg-green-900 rounded-full mb-4 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <Mic className="w-12 h-12 text-green-600 dark:text-green-300" />
                </div>
                <p className="text-green-700 dark:text-green-300 font-extrabold text-2xl mb-1">Agent is Speaking...</p>
             </div>
          )}

          <div className="max-w-xl text-center mt-6 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 w-full shadow-inner transform transition-all hover:scale-105">
             <p className="text-xl text-blue-900 dark:text-blue-100 font-bold italic">"{voiceAgent.message}"</p>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl text-sm">
             {[
               { key: 'fullName', label: 'Full Name' },
               { key: 'age', label: 'Age / Dob' },
               { key: 'phone', label: 'Mobile' },
               { key: 'gender', label: 'Gender' },
               { key: 'symptoms', label: 'Symptoms' }
             ].map(field => (
               <div key={field.key} className={`flex justify-between items-center p-3 rounded-lg border shadow-sm transition-colors ${
                 voiceAgent.state[field.key] ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
               }`}>
                 <span className={`font-semibold ${voiceAgent.state[field.key] ? 'text-green-800 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                   {field.label}
                 </span>
                 <span className="font-bold text-lg">{voiceAgent.state[field.key] ? '✅' : '⏳'}</span>
               </div>
             ))}
          </div>
          
          <button onClick={() => {
             // Force stop and keep what we have
             toast.success('Agent gracefully stopped. Extracted fields preserved.');
             stopVoiceAgent();
          }} className="mt-8 px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors">
            Exit Early & Review Form
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Action Row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
            Add Patient
          </h3>

          <button
            type="button"
            onClick={startVoiceAgent}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105 transition-all text-sm animate-pulse w-full md:w-auto justify-center"
          >
            <Mic className="w-5 h-5" />
            Start Conversational AI Agent
          </button>
        </div>

        {/* Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-9 gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1">Patient ID</label>
            <span className="text-xl font-bold text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-200 dark:border-gray-600 block text-center">{formData.patientId}</span>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              Designation
            </label>
            <div className="relative">
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full border border-blue-400 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              >
                <option value="MR.">MR.</option>
                <option value="MS.">MS.</option>
                <option value="MRS.">MRS.</option>
                <option value="MISS">MISS</option>
                <option value="SHRI">SHRI</option>
                <option value="SMT.">SMT.</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col sm:col-span-2 md:col-span-2">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Gender
            </label>
            <div className="flex items-center space-x-4 h-[38px]">
              {['Male', 'Female', 'Other'].map(option => (
                <label key={option} className="flex items-center cursor-pointer">
                  <div className="relative flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      checked={formData.gender === option}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border ${formData.gender === option ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} flex items-center justify-center transition-all`}>
                      {formData.gender === option && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    </div>
                  </div>
                  <span className={`ml-2 text-sm ${formData.gender === option ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:col-span-2 md:col-span-2">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="Enter age"
              className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              Type
            </label>
            <div className="relative">
              <select
                name="ageType"
                value={formData.ageType}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              >
                <option value="Year">Year</option>
                <option value="Month">Month</option>
                <option value="Days">Days</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              Mobile Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData(prev => ({ ...prev, phone: value }));
              }}
              placeholder="10 digit mobile"
              className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            />
            {isCheckingPhone && <div className="text-[10px] text-blue-500 mt-1 animate-pulse font-bold">Checking...</div>}
          </div>
        </div>

        {/* Existing Patients Match Alert */}
        {existingPatients.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-full">
                <CalendarIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Existing Records Found</h4>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Choose an existing patient or register a new one for this number.</p>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {existingPatients.map(p => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => handleUseExistingPatient(p)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 transition-all"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-bold">{p.fullName || `${p.firstName} ${p.lastName}`}</span>
                        <span className="text-[10px] text-gray-500">ID: {p.patientId}</span>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleRegisterNewPatient}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Add New Patient
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Department, Doctor, Date Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {doctors && doctors.length === 1 ? (
            <div className="flex flex-col">
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-semibold">Department</label>
              <div className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2 rounded text-sm text-gray-800 dark:text-gray-200 font-medium">
                {formData.department || 'General'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-semibold">Department</label>
              <div className="relative">
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {doctors && doctors.length === 1 ? (
            <div className="flex flex-col">
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
                Doctor
              </label>
              <div className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-2 rounded text-sm text-gray-800 dark:text-gray-200 font-medium">
                Dr. {doctors[0].name}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
                Doctor
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <select
                    name="doctor"
                    value={formData.doctor}
                    onChange={handleChange}
                    className="w-full border border-gray-300 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.filter(d => !formData.department || d.specialization === formData.department).map(doc => (
                      <option key={doc._id} value={doc._id}>Dr. {doc.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
                </div>
                <button 
                  type="button" 
                  onClick={isLimitReached ? null : openDoctorForm}
                  disabled={isLimitReached}
                  className={`p-2 border rounded transition-colors ${
                    isLimitReached 
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed border-gray-200" 
                    : "border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  title={isLimitReached ? "Doctor limit reached. Upgrade your plan to add more." : "Add New Doctor"}
                >
                  <Plus className={`w-4 h-4 ${isLimitReached ? 'text-gray-300' : 'text-gray-600 dark:text-gray-300'}`} />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              {bookingMode === 'WALK_IN' ? 'Visit Date' : 'Date'}
            </label>
            <div className="relative">
              <input 
                type="date" 
                name="appointmentDate" 
                value={formData.appointmentDate} 
                onChange={handleChange} 
                min={new Date().toISOString().split('T')[0]} 
                className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 pl-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100" 
              />
              <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Time Slots Section */}
        {formData.doctor && formData.appointmentDate && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Available Slots</label>
            
            {isFetchingSlots ? (
              <div className="flex items-center gap-2 text-xs text-blue-500 py-4 font-medium">
                <Loader2 className="w-5 h-5 animate-spin" /> Fetching latest availability...
              </div>
            ) : slotError ? (
              <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-xl text-xs text-orange-600 dark:text-orange-400 font-bold">
                {slotError}
              </div>
            ) : categorizedSlots.morning.length === 0 && categorizedSlots.afternoon.length === 0 && categorizedSlots.evening.length === 0 ? (
              <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-xl text-xs text-orange-600 dark:text-orange-400 font-bold">
                No slots available on this date. Please try another date.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Morning Slots */}
                {categorizedSlots.morning.length > 0 && (
                  <div className="flex flex-col md:flex-row gap-4 items-start border-b border-gray-50 dark:border-gray-700/30 pb-3">
                    <div className="w-28 flex items-center gap-1.5 text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider pt-2.5">
                      <Clock size={14} /> Morning
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {categorizedSlots.morning.map((slot, idx) => (
                        <button
                          key={`morning-${idx}`}
                          type="button"
                          disabled={slot.isBooked}
                          onClick={() => setFormData(prev => ({ ...prev, appointmentTime: slot.time }))}
                          className={`px-3 py-1.5 border font-bold rounded-lg transition-all text-xs flex flex-col items-center justify-center min-w-[75px] ${
                            formData.appointmentTime === slot.time
                              ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                              : slot.isBooked
                              ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50 dark:bg-gray-700/20 dark:border-gray-800"
                              : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800"
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {categorizedSlots.afternoon.length > 0 && (
                  <div className="flex flex-col md:flex-row gap-4 items-start border-b border-gray-50 dark:border-gray-700/30 pb-3">
                    <div className="w-28 flex items-center gap-1.5 text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider pt-2.5">
                      <Star size={14} /> Afternoon
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {categorizedSlots.afternoon.map((slot, idx) => (
                        <button
                          key={`afternoon-${idx}`}
                          type="button"
                          disabled={slot.isBooked}
                          onClick={() => setFormData(prev => ({ ...prev, appointmentTime: slot.time }))}
                          className={`px-3 py-1.5 border font-bold rounded-lg transition-all text-xs flex flex-col items-center justify-center min-w-[75px] ${
                            formData.appointmentTime === slot.time
                              ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                              : slot.isBooked
                              ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50 dark:bg-gray-700/20 dark:border-gray-800"
                              : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800"
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evening Slots */}
                {categorizedSlots.evening.length > 0 && (
                  <div className="flex flex-col md:flex-row gap-4 items-start pb-2">
                    <div className="w-28 flex items-center gap-1.5 text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-wider pt-2.5">
                      <Heart size={14} /> Evening
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {categorizedSlots.evening.map((slot, idx) => (
                        <button
                          key={`evening-${idx}`}
                          type="button"
                          disabled={slot.isBooked}
                          onClick={() => setFormData(prev => ({ ...prev, appointmentTime: slot.time }))}
                          className={`px-3 py-1.5 border font-bold rounded-lg transition-all text-xs flex flex-col items-center justify-center min-w-[75px] ${
                            formData.appointmentTime === slot.time
                              ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                              : slot.isBooked
                              ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50 dark:bg-gray-700/20 dark:border-gray-800"
                              : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-gray-800"
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp & Register button row */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Send WhatsApp Message</span>
                <span className="text-[10px] text-gray-400">Confirmation will be sent to {formData.phone || 'patient'}</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="checkbox"
                checked={skipBilling}
                onChange={(e) => setSkipBilling(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">No Billing (Free Visit)</span>
                <span className="text-[10px] text-gray-400">Skip generating consultation bill</span>
              </div>
            </label>

            {!skipBilling && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-150 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-750 dark:text-gray-250">Payment Mode:</span>
                <select
                  value={billingData.paymentMode}
                  onChange={(e) => setBillingData({ ...billingData, paymentMode: e.target.value })}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-650 rounded px-2.5 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Pending">Pending / Unpaid</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-10 py-3 text-white rounded-xl font-extrabold shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:shadow-none bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Register Patient
          </button>
        </div>
      </form>
    </div>
  );
}
