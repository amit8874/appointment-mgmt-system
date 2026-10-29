import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Loader2, Plus, Save, ChevronDown, Mic, MicOff, RotateCcw, Mail, Droplet, MapPin, PhoneCall, ShieldAlert, FileText, Check } from 'lucide-react';
import api, { whatsappApi, clinicalNoteApi } from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

export default function NewAppointmentForm({ onClose, onSuccess, initialData, isDashboardIntegrated = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
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
    noteTitle: 'Appointment Note',
    notePriority: 'medium',
    noteType: 'appointment',
    skipBilling: false,
    paymentMode: 'Pending',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    bloodGroup: '',
    alternateMobile: '',
    emergencyContact: '',
    emergencyPhone: '',
    allergies: '',
    pastMedicalHistory: '',
  });

  const [activeExtraFields, setActiveExtraFields] = useState({
    email: false,
    bloodGroup: false,
    address: false,
    alternateMobile: false,
    emergencyContact: false,
    medicalHistory: false,
  });

  // Small Note Popup states
  const [isNotePopupOpen, setIsNotePopupOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: 'Appointment Note',
    note: '',
    priority: 'medium',
    noteType: 'appointment'
  });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [sendWhatsAppToDoctor, setSendWhatsAppToDoctor] = useState(false);

  const handleOpenNotePopup = () => {
    setNoteForm({
      title: formData.noteTitle || 'Appointment Note',
      note: formData.notes || '',
      priority: formData.notePriority || 'medium',
      noteType: formData.noteType || 'appointment'
    });
    setIsNotePopupOpen(true);
  };

  const handleSaveNotePopup = () => {
    if (!noteForm.note.trim()) {
      toast.warning('Please enter note text');
      return;
    }

    setFormData(prev => ({
      ...prev,
      notes: noteForm.note.trim(),
      noteTitle: noteForm.title || 'Appointment Note',
      notePriority: noteForm.priority || 'medium',
      noteType: noteForm.noteType || 'appointment'
    }));
    toast.success('Doctor note attached to appointment!');
    setIsNotePopupOpen(false);
  };

  const toggleExtraField = (fieldKey) => {
    setActiveExtraFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  const addAllExtraFields = () => {
    setActiveExtraFields({
      email: true,
      bloodGroup: true,
      address: true,
      alternateMobile: true,
      emergencyContact: true,
      medicalHistory: true,
    });
  };

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

  useEffect(() => {
    fetchDoctors();
    
    // Check for rebookData in navigation state (from Re-Appointment button)
    const stateData = location.state?.rebookData;
    if (stateData) {
      const patient = stateData.patient || stateData;
      setFormData(prev => ({
        ...prev,
        fullName: patient.fullName || `${patient.firstName || patient.name?.split(' ')[0] || ''} ${patient.lastName || patient.name?.split(' ').slice(1).join(' ') || ''}`.trim(),
        phone: patient.phone || patient.mobile || patient.contactNumber || patient.contact || '',
        age: patient.age || patient.patientAge || '',
        gender: patient.gender ? (patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase()) : 'Male',
        patientId: patient.patientId || prev.patientId,
        designation: patient.designation || prev.designation,
        ageType: patient.ageType || prev.ageType,
      }));
    } else if (initialData && initialData.patientId && initialData.patientId !== 'Loading...') {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    } else {
      fetchPatientId();
      if (initialData) {
        setFormData(prev => ({
          ...prev,
          ...initialData,
          patientId: 'Loading...'
        }));
      }
    }
  }, [initialData, location.state]);

  const fetchPatientId = async () => {
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

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors?limit=100'); // Fetch a reasonable amount for the dropdown
      // Handle both array (legacy) and object (paginated) responses
      if (response.data && response.data.doctors && Array.isArray(response.data.doctors)) {
        setDoctors(response.data.doctors);
      } else if (Array.isArray(response.data)) {
        setDoctors(response.data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  // Gender auto-selection based on Designation
  useEffect(() => {
    const des = formData.designation.toUpperCase().replace('.', '');
    if (['MR', 'SHRI'].includes(des)) {
      setFormData(prev => ({ ...prev, gender: 'Male' }));
    } else if (['MS', 'MRS', 'MISS', 'SMT'].includes(des)) {
      setFormData(prev => ({ ...prev, gender: 'Female' }));
    }
  }, [formData.designation]);

  const fetchAvailableSlots = async () => {
    if (!formData.doctor || !formData.appointmentDate) return;
    setIsFetchingSlots(true);
    setAvailableSlots([]);
    setSlotError('');
    try {
      const response = await api.get(`/doctors/${formData.doctor}/slots?date=${formData.appointmentDate}&allowPast=true`);
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
    let extraUpdates = {};

    if (name === 'gender') {
      const g = (value || '').toLowerCase();
      const currentDes = (formData.designation || '').toUpperCase().replace(/\./g, '');
      if (g === 'female' && (currentDes === 'MR' || currentDes === 'SHRI')) {
        extraUpdates.designation = 'MS.';
      } else if (g === 'male' && ['MS', 'MRS', 'MISS', 'SMT'].includes(currentDes)) {
        extraUpdates.designation = 'MR.';
      }
    }

    if (name === 'fullName' && value) {
      const firstWord = value.trim().split(/\s+/)[0]?.toUpperCase()?.replace(/\./g, '');
      if (['MISS', 'MRS', 'MS', 'SMT'].includes(firstWord)) {
        extraUpdates.designation = firstWord === 'MISS' ? 'MISS' : `${firstWord}.`;
        extraUpdates.gender = 'Female';
      } else if (['MR', 'SHRI'].includes(firstWord)) {
        extraUpdates.designation = `${firstWord}.`;
        extraUpdates.gender = 'Male';
      } else if (['DR', 'PROF'].includes(firstWord)) {
        extraUpdates.designation = `${firstWord}.`;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value, ...extraUpdates }));
    if (name === 'doctor' || name === 'appointmentDate') {
      setFormData(prev => ({ ...prev, appointmentTime: '' }));
    }
  };

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
    
    // Automatically enable any extra fields present on this patient
    setActiveExtraFields(prev => ({
      ...prev,
      email: !!p.email || prev.email,
      bloodGroup: !!p.bloodGroup || prev.bloodGroup,
      address: !!(p.address || p.city || p.state || p.zip) || prev.address,
      alternateMobile: !!(p.alternateMobile || p.alternatePhone) || prev.alternateMobile,
      emergencyContact: !!(p.emergencyContact || p.emergencyPhone) || prev.emergencyContact,
      medicalHistory: !!(p.pastMedicalHistory || p.allergies) || prev.medicalHistory,
    }));

    setFormData(prev => ({
      ...prev,
      fullName: displayName,
      age: p.age || '',
      ageType: p.ageType || 'Year',
      gender: p.gender || 'Male',
      patientId: p.patientId || prev.patientId,
      designation: p.designation || 'MR.',
      email: p.email || '',
      address: p.address || '',
      city: p.city || '',
      state: p.state || '',
      zip: p.zip || '',
      bloodGroup: p.bloodGroup || '',
      alternateMobile: p.alternateMobile || p.alternatePhone || '',
      emergencyContact: p.emergencyContact || '',
      emergencyPhone: p.emergencyPhone || '',
      allergies: p.allergies || '',
      pastMedicalHistory: p.pastMedicalHistory || '',
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
      // phone remains the same
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
        setIsLoading(false);
        return;
      }

      const selectedDoctor = doctors.find(d => d._id === formData.doctor);
      const nameParts = (formData.fullName || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const paymentStatus = formData.paymentMode === 'Pending' ? 'pending' : 'paid';
      const paymentMethod = formData.paymentMode === 'Pending' ? 'N/A' : formData.paymentMode;

      const appointmentData = {
        organizationId: orgId,
        patientId: selectedExistingId || formData.patientId,
        isNewPatient: !selectedExistingId,
        doctorId: formData.doctor,
        doctorName: selectedDoctor ? selectedDoctor.name : '',
        specialty: selectedDoctor ? selectedDoctor.specialization : 'General',
        date: formData.appointmentDate,
        time: formData.appointmentTime,
        patientDetails: {
          designation: formData.designation,
          firstName: firstName,
          lastName: lastName,
          fullName: formData.fullName,
          age: formData.age,
          ageType: formData.ageType,
          gender: formData.gender,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          bloodGroup: formData.bloodGroup,
          alternateMobile: formData.alternateMobile,
          emergencyContact: formData.emergencyContact,
          emergencyPhone: formData.emergencyPhone,
          allergies: formData.allergies,
          pastMedicalHistory: formData.pastMedicalHistory,
        },
        reason: formData.symptoms,
        symptoms: formData.symptoms,
        notes: formData.notes || '',
        noteTitle: formData.noteTitle || 'Appointment Note',
        notePriority: formData.notePriority || 'medium',
        noteType: formData.noteType || 'appointment',
        skipBilling: formData.skipBilling || false,
        sendWhatsApp: sendWhatsApp,
        sendWhatsAppToDoctor: sendWhatsAppToDoctor,
        paymentStatus,
        paymentMethod,
        status: 'confirmed'
      };

      const response = await api.post('/appointments/book-patient', appointmentData);

      if (response.status === 200 || response.status === 201) {
        // Execute callbacks if provided
        if (onSuccess) onSuccess();
        if (onClose) onClose();
        
        // Final action: Navigate and refresh as per user requirement
        if (!isDashboardIntegrated) {
          if (user?.role === 'receptionist') {
            navigate('/receptionist/appointments');
            window.location.reload();
          } else {
            // Default for Admin or others
            navigate('/admin-dashboard');
            window.location.reload();
          }
        }
      } else {
        toast.error('Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const departments = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];
  const selectedDoctor = doctors.find(d => d._id === formData.doctor || d.doctorId === formData.doctor);
  const doctorHasPhone = Boolean(selectedDoctor?.phone || selectedDoctor?.mobile);

  return (
    <div className={`${isDashboardIntegrated ? 'bg-transparent shadow-none border-none' : 'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800'} overflow-hidden transition-all duration-500`}>
      {!isDashboardIntegrated && (
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold tracking-tight">Assign New Appointment</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Interactive AI Agent Overlay */}
      {voiceAgent.isActive && (
        <div className="absolute inset-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-8 border border-blue-200 dark:border-blue-900 shadow-2xl">
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
             toast.success('Agent gracefully stopped. Extracted fields preserved.');
             stopVoiceAgent();
          }} className="mt-8 px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors">
            Exit Early & Review Form
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${isDashboardIntegrated ? 'p-8 sm:p-10' : 'p-6'} space-y-6 relative`}>
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

        {/* Row 1: Patient ID, Designation, Name, Age */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Patient ID</label>
              <button
                type="button"
                onClick={fetchPatientId}
                title="Generate next sequential ID"
                className="text-[10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-0.5 font-bold cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Auto
              </button>
            </div>
            <input
              type="text"
              name="patientId"
              value={formData.patientId}
              onChange={(e) => {
                const val = e.target.value;
                if (selectedExistingId) setSelectedExistingId(null);
                setFormData(prev => ({ ...prev, patientId: val }));
              }}
              placeholder="e.g. 20261001"
              className="w-full border border-blue-400 dark:border-blue-500 p-2 rounded-lg text-sm font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-center tracking-wide"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
              Designation
            </label>
            <div className="relative">
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full border border-blue-400 p-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 pr-8 bg-white dark:bg-gray-800"
              >
                <option value="MR.">MR.</option>
                <option value="MS.">MS.</option>
                <option value="MRS.">MRS.</option>
                <option value="MISS">MISS</option>
                <option value="SHRI">SHRI</option>
                <option value="SMT.">SMT.</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col md:col-span-2">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
              <span className="text-red-500 mr-1">*</span> Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
              Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="Age"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
              Type
            </label>
            <div className="relative">
              <select
                name="ageType"
                value={formData.ageType}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
              >
                <option value="Year">Year</option>
                <option value="Month">Month</option>
                <option value="Days">Days</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
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
              placeholder="10 digit mobile number"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
            />
            {isCheckingPhone && <div className="text-[10px] text-blue-500 mt-1 animate-pulse font-bold">Checking availability...</div>}
          </div>
        </div>

        {/* Existing Patients Match Alert */}
        {existingPatients.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-full">
                   <CalendarIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                   <h4 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Patient Record(s) Found!</h4>
                   <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">This number is already registered to the following patient(s). Would you like to use an existing record or register a New Patient?</p>
                   
                   <div className="mt-3 flex flex-wrap gap-2">
                      {existingPatients.map(p => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => handleUseExistingPatient(p)}
                          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all group"
                        >
                           <div className="flex flex-col items-start">
                              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{p.fullName || `${p.firstName} ${p.lastName}`}</span>
                              <span className="text-[10px] text-gray-500">ID: {p.patientId}</span>
                           </div>
                           <ChevronDown className="w-4 h-4 text-amber-500 -rotate-90 group-hover:translate-x-1 transition-transform" />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleRegisterNewPatient}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-black shadow-md hover:bg-blue-700 transition-all flex items-center gap-1.5"
                      >
                         <Plus className="w-3.5 h-3.5" />
                         Register for New Patient
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Additional Patient Details (+ Add More) */}
        <div className="bg-slate-50/80 dark:bg-gray-800/50 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Additional Patient Details
              </span>
              <span className="text-[11px] text-gray-400 font-normal italic">(Click to add on-the-spot)</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleExtraField('email')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                  activeExtraFields.email
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <Mail className="w-3 h-3 text-blue-500" />
                Email
                {activeExtraFields.email && <Check className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => toggleExtraField('bloodGroup')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                  activeExtraFields.bloodGroup
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <Droplet className="w-3 h-3 text-red-500" />
                Blood Group
                {activeExtraFields.bloodGroup && <Check className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => toggleExtraField('address')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                  activeExtraFields.address
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <MapPin className="w-3 h-3 text-emerald-500" />
                Address
                {activeExtraFields.address && <Check className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => toggleExtraField('alternateMobile')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                  activeExtraFields.alternateMobile
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <PhoneCall className="w-3 h-3 text-indigo-500" />
                Alt Mobile
                {activeExtraFields.alternateMobile && <Check className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => toggleExtraField('emergencyContact')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                  activeExtraFields.emergencyContact
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <ShieldAlert className="w-3 h-3 text-amber-500" />
                Emergency
                {activeExtraFields.emergencyContact && <Check className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => toggleExtraField('medicalHistory')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                  activeExtraFields.medicalHistory
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                <FileText className="w-3 h-3 text-purple-500" />
                Medical / Allergies
                {activeExtraFields.medicalHistory && <Check className="w-3 h-3 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={addAllExtraFields}
                className="px-2 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
              >
                + Show All
              </button>
            </div>
          </div>

          {/* Active Field Inputs Grid */}
          {(activeExtraFields.email || activeExtraFields.bloodGroup || activeExtraFields.alternateMobile || activeExtraFields.address || activeExtraFields.emergencyContact || activeExtraFields.medicalHistory) && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              {activeExtraFields.email && (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1">
                      <Mail className="w-3 h-3 text-blue-500" /> Email Address
                    </label>
                    <button type="button" onClick={() => toggleExtraField('email')} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="patient@example.com"
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                  />
                </div>
              )}

              {activeExtraFields.bloodGroup && (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1">
                      <Droplet className="w-3 h-3 text-red-500" /> Blood Group
                    </label>
                    <button type="button" onClick={() => toggleExtraField('bloodGroup')} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </div>
                  <div className="relative">
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800 pr-8"
                    >
                      <option value="">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {activeExtraFields.alternateMobile && (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1">
                      <PhoneCall className="w-3 h-3 text-indigo-500" /> Alternate Mobile
                    </label>
                    <button type="button" onClick={() => toggleExtraField('alternateMobile')} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </div>
                  <input
                    type="tel"
                    name="alternateMobile"
                    value={formData.alternateMobile}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData(prev => ({ ...prev, alternateMobile: value }));
                    }}
                    placeholder="Alternate 10-digit number"
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                  />
                </div>
              )}

              {activeExtraFields.emergencyContact && (
                <>
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-500" /> Emergency Person
                      </label>
                      <button type="button" onClick={() => toggleExtraField('emergencyContact')} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                    <input
                      type="text"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                      placeholder="Relation / Name"
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-500" /> Emergency Phone
                    </label>
                    <input
                      type="tel"
                      name="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData(prev => ({ ...prev, emergencyPhone: value }));
                      }}
                      placeholder="Emergency contact number"
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                    />
                  </div>
                </>
              )}

              {activeExtraFields.address && (
                <>
                  <div className="flex flex-col md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500" /> Street Address
                      </label>
                      <button type="button" onClick={() => toggleExtraField('address')} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Flat, House no., Building, Street"
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-bold">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-bold">State & PIN</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="State"
                        className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                      />
                      <input
                        type="text"
                        name="zip"
                        value={formData.zip}
                        onChange={handleChange}
                        placeholder="PIN Code"
                        className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeExtraFields.medicalHistory && (
                <>
                  <div className="flex flex-col md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1">
                        <FileText className="w-3 h-3 text-purple-500" /> Past Medical History
                      </label>
                      <button type="button" onClick={() => toggleExtraField('medicalHistory')} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                    <input
                      type="text"
                      name="pastMedicalHistory"
                      value={formData.pastMedicalHistory}
                      onChange={handleChange}
                      placeholder="e.g. Hypertension, Diabetes, Thyroid"
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="flex flex-col md:col-span-2">
                    <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-bold flex items-center gap-1 text-rose-500">
                      Known Allergies
                    </label>
                    <input
                      type="text"
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      placeholder="e.g. Penicillin, Sulfa, Dust"
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Gender, Dept, Doctor, Date */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div>
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-2.5 flex items-center font-bold italic">
              Gender
            </label>
            <div className="flex items-center space-x-5">
              {['Male', 'Female', 'Other'].map(option => (
                <label key={option} className="flex items-center cursor-not-allowed group">
                  <div className="relative flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      checked={formData.gender === option}
                      readOnly
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 ${formData.gender === option ? 'border-blue-500 bg-blue-500/10' : 'border-gray-300'} flex items-center justify-center transition-all`}>
                      {formData.gender === option && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />}
                    </div>
                  </div>
                  <span className={`ml-2 text-sm ${formData.gender === option ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-400'}`}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {doctors && doctors.length === 1 ? (
            <div className="flex flex-col">
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 font-bold">Department</label>
              <div className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium">
                {formData.department || 'General'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 font-bold">Department</label>
              <div className="relative">
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {doctors && doctors.length === 1 ? (
            <div className="flex flex-col">
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
                Doctor
              </label>
              <div className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium">
                Dr. {doctors[0].name}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
                Doctor
              </label>
              <div className="relative">
                <select
                  name="doctor"
                  value={formData.doctor}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                >
                  <option value="">Select Doctor</option>
                  {doctors.filter(d => !formData.department || d.specialization === formData.department).map(doc => (
                    <option key={doc._id} value={doc._id}>Dr. {doc.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
              Date
            </label>
            <div className="relative">
              <input 
                type="date" 
                name="appointmentDate" 
                value={formData.appointmentDate} 
                onChange={handleChange} 
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 pl-9 bg-white dark:bg-gray-800" 
              />
              <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 3: Symptoms / Reason (Optional) */}
        <div>
          <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 font-bold flex items-center justify-between">
            <span>Symptoms / Reason for Visit <span className="text-gray-400 font-normal italic">(Optional)</span></span>
          </label>
          <textarea
            name="symptoms"
            value={formData.symptoms}
            onChange={handleChange}
            placeholder="E.g., Severe headache and fever for 2 days. Known allergy to penicillin."
            rows="2"
            className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 resize-none"
          ></textarea>
        </div>

          {/* Doctor Note Section */}
        <div className="bg-indigo-50/40 dark:bg-gray-800/60 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                  Doctor's Notes
                  <span className="text-[11px] font-normal text-gray-500 italic">(Saved to Notes Page)</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenNotePopup}
              className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 gap-1.5 self-start sm:self-auto"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{formData.notes ? 'Edit Notes' : 'Notes'}</span>
            </button>
          </div>

          {/* Note Preview or Placeholder */}
          {formData.notes ? (
            <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-indigo-200/80 dark:border-indigo-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  {formData.noteTitle || 'Appointment Note'}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  {formData.notePriority || 'medium'}
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed line-clamp-3">
                {formData.notes}
              </p>
              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  ✓ Note will be saved to Notes Page
                </span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, notes: '' }))}
                  className="text-red-500 hover:text-red-700 hover:underline"
                >
                  Clear Note
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No note added yet. Click <span className="font-semibold text-indigo-600">"Notes"</span> to record doctor observations, clinical findings, or instructions.
            </p>
          )}
        </div>

        {/* Small Note Pop-up Modal */}
        {isNotePopupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                    Doctor's Appointment Note
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotePopupOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Note Title
                  </label>
                  <input
                    type="text"
                    value={noteForm.title}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="E.g., Appointment Note, Tooth Evaluation..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={noteForm.priority}
                      onChange={(e) => setNoteForm(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white font-medium"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={noteForm.noteType}
                      onChange={(e) => setNoteForm(prev => ({ ...prev, noteType: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white font-medium"
                    >
                      <option value="appointment">Appointment</option>
                      <option value="general">General</option>
                      <option value="diagnosis">Diagnosis</option>
                      <option value="treatment">Treatment</option>
                      <option value="follow_up">Follow-up</option>
                      <option value="observation">Observation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Doctor's Note <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="4"
                    value={noteForm.note}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Type doctor's notes, observations, advice, or next steps here..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/50">
                <button
                  type="button"
                  onClick={() => setIsNotePopupOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingNote}
                  onClick={handleSaveNotePopup}
                  className="inline-flex items-center px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50 gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingNote ? 'Saving...' : 'Save Note'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Skip Billing and Payment Mode Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2 border-t border-gray-100 dark:border-gray-800">
          {/* Skip Billing Checkbox */}
          <div className="flex items-center space-x-2.5 py-1">
            <label className="relative flex items-center cursor-pointer group">
              <input
                type="checkbox"
                name="skipBilling"
                checked={formData.skipBilling || false}
                onChange={(e) => setFormData(prev => ({ ...prev, skipBilling: e.target.checked }))}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.skipBilling ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 bg-transparent'}`}>
                {formData.skipBilling && (
                  <svg className="w-3.5 h-3.5 stroke-2 stroke-current" viewBox="0 0 24 24" fill="none">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="ml-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                No Billing: Register patient and book appointment only
              </span>
            </label>
          </div>

          {/* Payment Mode Selector */}
          {!formData.skipBilling && (
            <div className="flex flex-col">
              <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
                Payment Mode
              </label>
              <div className="relative">
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800 font-semibold"
                >
                  <option value="Pending">Pending / Unpaid</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Time Slots Section */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Available Slots</label>
          <div className="min-h-[80px]">
            {isFetchingSlots ? (
              <div className="flex items-center gap-2 text-xs text-blue-500 py-4 font-medium"><Loader2 className="w-5 h-5 animate-spin" /> Fetching latest availability...</div>
            ) : formData.doctor && formData.appointmentDate ? (
              availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
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
                        className={`py-2 px-1 rounded-lg border text-[11px] font-bold transition-all ${
                          formData.appointmentTime === slotTime 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                            : isPast || isBooked
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {slotTime}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-xl text-xs text-orange-600 dark:text-orange-400 font-bold">{slotError || 'No slots found for this selection.'}</div>
              )
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl text-xs text-blue-600 dark:text-blue-400 italic">Please select both a doctor and a date to view current availability.</div>
            )}
          </div>
        </div>

        {/* WhatsApp Notification Options */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {/* Option 1: Send Message to Patient */}
          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Send Message to Patient</span>
              <span className="text-[10px] text-gray-400">Confirmation to {formData.phone || 'patient'}</span>
            </div>
          </label>

          {/* Option 2: Send Message to DR. */}
          <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
            !selectedDoctor
              ? 'opacity-60 cursor-not-allowed'
              : !doctorHasPhone
              ? 'opacity-70 cursor-not-allowed'
              : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}>
            <input
              type="checkbox"
              checked={sendWhatsAppToDoctor}
              disabled={!selectedDoctor || !doctorHasPhone}
              onChange={(e) => setSendWhatsAppToDoctor(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                Send Message to DR.
                {selectedDoctor && (
                  <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">
                    ({selectedDoctor.name})
                  </span>
                )}
              </span>
              <span className="text-[10px] text-gray-400">
                {!selectedDoctor
                  ? 'Select doctor from dropdown'
                  : !doctorHasPhone
                  ? `No phone number for ${selectedDoctor.name}`
                  : `Alert to ${selectedDoctor.phone || selectedDoctor.mobile}`}
              </span>
            </div>
          </label>
        </div>

        {/* Footer Actions */}
        <div className={`flex ${isDashboardIntegrated ? 'justify-end' : 'gap-4'} pt-6 border-t border-gray-100 dark:border-gray-800`}>
          {!isDashboardIntegrated && (
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={`${isDashboardIntegrated ? 'px-12 w-auto' : 'flex-[2]'} py-3 bg-blue-600 text-white rounded-xl font-extrabold hover:bg-blue-700 shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:shadow-none`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            Book Appointment
          </button>
        </div>
      </form>
    </div>
  );
}
