import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, Calendar as CalendarIcon, Loader2, Mic, MicOff, X } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

export default function HorizontalAppointmentForm({ doctors = [], onSuccess, openDoctorForm, initialData = null }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');
  
  // Interactive Conversational AI Voice Agent states
  const [voiceAgent, setVoiceAgent] = useState({
    isActive: false,
    isListening: false,
    isThinking: false,
    message: '',
    state: {},
  });
  
  const [formData, setFormData] = useState({
    patientId: 'Loading...',
    designation: 'MR.',
    firstName: '',
    lastName: '',
    age: '',
    ageType: 'Year',
    gender: 'Male',
    phone: '',
    department: '',
    doctor: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '',
    symptoms: '',
  });

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
       firstName: '', lastName: '', age: '', ageType: 'Year', gender: '', phone: '', doctor: '', symptoms: ''
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
               firstName: updatedState.firstName || prev.firstName,
               lastName: updatedState.lastName || prev.lastName,
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
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        age: initialData.age || '',
        ageType: initialData.ageType || 'Year',
        gender: initialData.gender || 'Male',
        phone: initialData.patientPhone || initialData.phone || '',
        department: initialData.department || '',
        doctor: initialData.doctor || '',
      }));
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

  // Fetch Slots
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
    }
  }, [formData.doctor, formData.appointmentDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'doctor' || name === 'appointmentDate') {
      setFormData(prev => ({ ...prev, appointmentTime: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.appointmentTime) {
      toast.error('Please select an available time slot');
      return;
    }
    setIsLoading(true);
    try {
      const orgId = user?.organizationId?._id || user?.organizationId || user?.organization?._id;
      if (!orgId) {
        toast.error('Organization information not found. Please log in again.');
        return;
      }
      
      const selectedDoc = doctors.find(d => d._id === formData.doctor);
      const appointmentData = {
        organizationId: orgId,
        patientId: formData.patientId,
        doctorId: formData.doctor,
        doctorName: selectedDoc ? selectedDoc.name : '',
        specialty: selectedDoc ? selectedDoc.specialization : 'General',
        date: formData.appointmentDate,
        time: formData.appointmentTime,
        patientDetails: {
          designation: formData.designation,
          firstName: formData.firstName,
          lastName: formData.lastName,
          age: formData.age,
          ageType: formData.ageType,
          gender: formData.gender,
          phone: formData.phone,
        },
        reason: formData.symptoms, // Pass symptoms mapping to backend reason
        symptoms: formData.symptoms,
      };

      const response = await api.post('/appointments/book-patient', appointmentData);
      if (response.status === 200 || response.status === 201) {
        toast.success('Appointment booked successfully!');
        setFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          age: '',
          phone: '',
          appointmentTime: '',
          symptoms: '',
        }));
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error(error.response?.data?.message || 'Failed to create appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const departments = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];

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
               { key: 'firstName', label: 'First Name' },
               { key: 'lastName', label: 'Last Name' },
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
        {/* Header Action Row */}
        <div className="flex justify-end mb-2">
             <button
               type="button"
               onClick={startVoiceAgent}
               className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105 transition-all text-sm animate-pulse"
             >
               <Mic className="w-5 h-5" />
               Start Conversational AI Agent
             </button>
        </div>

        {/* Row 1: Patient ID, Designation, Name, Age, Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1">Patient ID</label>
            <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{formData.patientId}</span>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Designation
            </label>
            <div className="relative">
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full border border-blue-400 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                required
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

          <div className="flex flex-col md:col-span-1">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter first name"
              className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter last name"
              className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="Enter age"
              className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Type
            </label>
            <div className="relative">
              <select
                name="ageType"
                value={formData.ageType}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                required
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
              <span className="text-red-500 mr-1">*</span> Mobile Number
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
              required
            />
          </div>
        </div>

        {/* Row 2: Gender, Dept, Doctor, Date */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div>
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-2 flex items-center font-semibold italic">
              <span className="text-red-500 mr-1">*</span> Gender
            </label>
            <div className="flex items-center space-x-4">
              {['Male', 'Female', 'Other'].map(option => (
                <label key={option} className="flex items-center cursor-not-allowed">
                  <div className="relative flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      checked={formData.gender === option}
                      readOnly
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border ${formData.gender === option ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} flex items-center justify-center transition-all`}>
                      {formData.gender === option && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    </div>
                  </div>
                  <span className={`ml-2 text-sm ${formData.gender === option ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}`}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-semibold">Department</label>
            <div className="relative">
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700"
              >
                <option value="">All Departments</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Doctor
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <select
                  name="doctor"
                  value={formData.doctor}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700"
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
                onClick={openDoctorForm}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Add New Doctor"
              >
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Date
            </label>
            <div className="relative">
              <input 
                type="date" 
                name="appointmentDate" 
                value={formData.appointmentDate} 
                onChange={handleChange} 
                required 
                min={new Date().toISOString().split('T')[0]} 
                className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 pl-8 bg-white dark:bg-gray-700" 
              />
              <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 3: Symptoms / Reason (Optional) */}
        <div>
          <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-semibold flex items-center justify-between">
            <span>Symptoms / Reason for Visit <span className="text-gray-400 font-normal italic">(Optional)</span></span>
          </label>
          <textarea
            name="symptoms"
            value={formData.symptoms}
            onChange={handleChange}
            placeholder="E.g., Severe headache and fever for 2 days. Known allergy to penicillin."
            rows="2"
            className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 resize-none"
          ></textarea>
        </div>

        {/* Available Slots */}
        <div className="pt-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2 block">Available Slots</label>
          <div className="min-h-[60px]">
            {isFetchingSlots ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading slots...</div>
            ) : formData.doctor && formData.appointmentDate ? (
              availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {availableSlots.map(slot => {
                    const slotTime = typeof slot === 'object' ? slot.time : slot;
                    const isBooked = typeof slot === 'object' ? slot.isBooked : false;
                    const isPast = typeof slot === 'object' ? slot.isPast : false;
                    
                    return (
                      <button 
                        key={slotTime} 
                        type="button" 
                        disabled={isBooked || isPast}
                        onClick={() => setFormData(prev => ({ ...prev, appointmentTime: slotTime }))}
                        className={`py-1.5 px-1 rounded border text-[11px] font-medium transition-all ${
                          formData.appointmentTime === slotTime 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                            : isPast || isBooked
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {slotTime}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-orange-500 py-2 font-medium">{slotError || 'No slots available for this selection'}</div>
              )
            ) : (
              <div className="text-sm text-gray-400 italic py-2">Select doctor and date to view availability</div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="submit"
            disabled={isLoading || !formData.appointmentTime}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center disabled:opacity-50 disabled:shadow-none"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Book Appointment
          </button>
        </div>
      </form>
    </div>
  );
}
