import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Phone,
  Calendar,
  Heart,
  Edit2,
  RefreshCcw,
  Pill,
  FileText,
  IndianRupee,
  CheckCircle,
  CreditCard,
  Search,
  Filter,
  Download,
  Printer,
  MapPin,
  Trash2,
  Eye,
  X,
  Plus,
  MoreVertical,
  Loader2,
  Share2,
  User,
  ClipboardList,
  FlaskConical,
  ArrowLeft,
  Shield,
  Stethoscope,
  Clock,
  BookOpen,
  Image,
  Columns,
  LayoutGrid,
  List,
  Camera,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Mic,
  MicOff,
  Globe,
  Languages,
  RotateCcw,
  Check,
  Save,
  StickyNote,
  ShieldCheck,
  AlertCircle,
  History,
  Layout,
  Bell,
  Tag,
  Calendar as CalendarIcon
} from 'lucide-react';
import { patientApi, appointmentApi, medicalRecordApi, emailApi, whatsappApi, prescriptionTemplateApi, invoiceTemplateApi, organizationApi, centralDoctorApi, billingApi, authApi, patientProgressImageApi, patientProgressComparisonApi, translationApi, clinicalNoteApi, progressNoteApi, followUpReminderApi } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { calculateInvoiceTotals } from '../../../utils/billingCalculations';
import { normalizePharmacyInvoice } from '../../../utils/pharmacyInvoiceCalculator';
import PrescriptionModal from './PrescriptionModal';
import TemplateModal from './TemplateModal';
import InvoiceTemplateModal from './InvoiceTemplateModal';
import PrintablePrescription from './PrintablePrescription';
import InvoiceTemplate from '../../../components/Shared/InvoiceTemplate';
import OviaanDefaultPharmacyInvoiceTemplate from '../../../components/billing/templates/OviaanDefaultPharmacyInvoiceTemplate';
import { useAuth } from '../../../context/AuthContext';
import Pagination from '../../../components/common/Pagination';
import AddFollowUpReminderModal from '../../../components/reminders/AddFollowUpReminderModal';

// --- Utility Components ---

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const serverUrl = baseUrl.replace(/\/api$/, '') || 'http://localhost:5000';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${serverUrl}${cleanPath}`;
};

const VoiceInputButton = ({ onTranscript, className = "" }) => {
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const recognition = React.useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = false;
    recognition.current.interimResults = false;
    // Set to Hindi-India to handle local nuances/languages better
    recognition.current.lang = 'hi-IN'; 

    recognition.current.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setIsTranslating(true);
      
      try {
        // Automatically translate captured speech to English as the clinical standard
        const { translatedText } = await translationApi.translate(transcript, 'English');
        onTranscript(translatedText);
      } catch (err) {
        console.error('Auto-translation failed:', err);
        // Fallback to original transcript if translation fails
        onTranscript(transcript);
        toast.warn('Auto-translation failed, showing original text');
      } finally {
        setIsTranslating(false);
      }
    };

    recognition.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied');
      }
    };

    recognition.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognition.current) recognition.current.abort();
    };
  }, [onTranscript]);

  const toggleListening = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      recognition.current.stop();
    } else {
      try {
        setIsListening(true);
        recognition.current.start();
      } catch (err) {
        setIsListening(false);
      }
    }
  };


  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    return null;
  }

  return (
    <button
      onClick={toggleListening}
      type="button"
      disabled={isTranslating}
      className={`p-1.5 rounded-md transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse shadow-lg ring-4 ring-rose-100' : isTranslating ? 'bg-indigo-100 text-indigo-600' : 'bg-white hover:bg-slate-50 text-slate-400 border border-slate-200 shadow-sm'} ${className}`}
      title={isListening ? 'Listening... Speak in any language' : isTranslating ? 'Converting to English...' : 'Speak-to-English (Any Language)'}
    >
      {isTranslating ? (
        <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      ) : isListening ? (
        <MicOff size={14} />
      ) : (
        <Mic size={14} />
      )}
    </button>
  );
};

const LanguageTranslator = ({ text, onTranslated, onReset, className = "" }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isTranslating, setIsTranslating] = useState(false);

  const languages = [
    'English', 'Hindi', 'Hinglish', 'Urdu', 'Marathi', 'Bengali', 'Gujarati', 
    'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Assamese'
  ];

  const handleTranslate = async () => {
    if (!text || selectedLanguage === 'English') {
      onReset();
      return;
    }
    
    setIsTranslating(true);
    try {
      const { translatedText } = await translationApi.translate(text, selectedLanguage);
      onTranslated(translatedText);
      toast.success(`Translated to ${selectedLanguage}`);
    } catch (err) {
      console.error('Translation error:', err);
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 p-1 bg-white/50 backdrop-blur-sm rounded-md border border-slate-200/60 shadow-sm w-fit ${className}`}>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1.5 flex items-center gap-1">
        <Globe size={10} /> Translate to:
      </span>
      <select 
        value={selectedLanguage}
        onChange={(e) => setSelectedLanguage(e.target.value)}
        className="bg-white border border-slate-200 text-[10px] font-bold py-0.5 px-2 rounded-sm outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
      >
        {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
      </select>
      <button 
        onClick={handleTranslate}
        disabled={isTranslating || !text}
        className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-sm hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1.5"
      >
        {isTranslating ? (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Languages size={11} />
        )}
        {selectedLanguage === 'English' ? 'Reset' : 'Convert'}
      </button>
      {selectedLanguage !== 'English' && (
        <button 
          onClick={() => { setSelectedLanguage('English'); onReset(); }}
          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-sm transition-all"
          title="Back to English"
        >
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );
};

const DetailCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 transition duration-300 hover:shadow-md h-full">
    <div className="flex items-center text-indigo-600 mb-4">
      <div className="p-2 bg-indigo-50 rounded-lg mr-3">
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    </div>
    <div className="text-slate-600 text-sm">
      {children}
    </div>
  </div>
);

const ActionButton = ({ icon: Icon, label, onClick, colorClass, hoverBg }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.button
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      animate={{ width: isHovered ? 'auto' : '40px' }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={`flex items-center gap-2 p-2.5 rounded-xl transition-colors duration-200 ${colorClass} ${isHovered ? hoverBg : ''} overflow-hidden whitespace-nowrap shadow-sm border border-transparent hover:border-slate-100`}
    >
      <Icon size={18} className="shrink-0" />
      <AnimatePresence>
        {isHovered && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="text-[10px] font-bold uppercase tracking-wider"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

const InfoItem = ({ label, value, icon: Icon }) => (
  <div className="flex items-start space-x-3 py-2 border-b border-slate-50 last:border-0">
    {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5" />}
    <div className="flex-1">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{label}</span>
      <span className="text-slate-700 font-semibold break-words">{value || 'N/A'}</span>
    </div>
  </div>
);

// --- Tab Content Renderers ---

const TabPersonalInfo = ({ data, appointments = [], onEdit, onRebook, user }) => {
  const past = appointments.filter(a => a.status?.toLowerCase() === 'completed' || a.status?.toLowerCase() === 'cancelled' || a.status?.toLowerCase() === 'pending' || a.status?.toLowerCase() === 'confirmed');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t border-slate-200 mt-4 bg-white/50 rounded-b-3xl">
      {/* Column 1: Basic Details */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
            <User size={16} className="text-indigo-400" /> Basic Details
          </h3>
          <button onClick={onEdit} className="text-slate-400 hover:text-indigo-600"><Edit2 size={14} /></button>
        </div>
        <div className="space-y-4 mb-8">
          <InfoItem label="Full Name" value={data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim()} />
          <InfoItem label="Date of Birth" value={data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : 'N/A'} />
          <InfoItem label="Gender" value={data.gender} />
          <InfoItem label="Blood Group" value={data.bloodGroup} />
          <InfoItem label="Age" value={data.age ? `${data.age} ${data.ageType || 'Year'}` : 'N/A'} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
            <div className="p-1.5 bg-indigo-50 rounded-lg"><Phone size={14} className="text-indigo-600" /></div> Contact Information
          </h3>
        </div>
        <div className="space-y-4">
          <InfoItem label="Contact Number" value={data.contactNumber || data.mobile} icon={Phone} />
          <InfoItem label="Email Address" value={data.email} icon={Mail} />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Residential Address</span>
            <p className="text-slate-700 font-medium text-sm">
              {[data.address, data.city, data.state, data.zip].filter(Boolean).join(', ') || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Column 2: Past Visits Timeline */}
      <div className="border-l-2 border-r-2 border-black/90 p-6 relative">
        <div className="flex items-center gap-2 mb-6">
          <CalendarIcon size={16} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-indigo-900 tracking-widest uppercase">Past Visits</h3>
        </div>

        <div className="relative border-l-2 border-black ml-4 space-y-10 py-6 min-h-[300px]">
          {/* Active appts logic */}
          {(() => {
            const activeAppts = appointments.filter(a => ['confirmed', 'pending', 'scheduled'].includes(a.status?.toLowerCase()));
            if (activeAppts.length === 0) {
              return (
                <div className="relative flex items-center">
                  <div className="absolute -left-[11px] w-5 h-5 bg-emerald-500 rounded-full border-4 border-white"></div>
                  <div className="w-8 border-b-2 border-black"></div>
                  <span className="ml-2 px-3 py-1 bg-slate-100/50 text-slate-400 font-bold text-sm rounded-lg backdrop-blur-sm shadow-sm border border-slate-100">No active appointments</span>
                </div>
              );
            }
            return activeAppts.map(appt => (
              <div key={appt._id} className="relative flex items-center">
                <div className="absolute -left-[11px] w-5 h-5 bg-emerald-500 rounded-full border-4 border-white"></div>
                <div className="w-8 border-b-2 border-black"></div>
                <div className="ml-2 flex items-center gap-3">
                  <span className="font-bold text-slate-800 text-sm tracking-tight">
                    {new Date(appt.date).toLocaleDateString()} at {appt.time}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                    {appt.status || 'Upcoming'}
                  </span>
                </div>
              </div>
            ));
          })()}

          {/* Past appts */}
          {appointments.filter(a => !['confirmed', 'pending', 'scheduled'].includes(a.status?.toLowerCase())).slice(0, 5).map(appt => (
            <div key={appt._id} className="relative flex items-center">
              <div className="absolute -left-[11px] w-5 h-5 bg-indigo-600 rounded-full border-4 border-white"></div>
              <div className="w-8 border-b-2 border-black"></div>
              <div className="ml-2 flex items-center gap-3">
                <span className="font-bold text-slate-800 text-sm tracking-tight">
                  {new Date(appt.date).toLocaleDateString()} at {appt.time}
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                  {appt.status || 'Completed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 3: Vitals & Medical */}
      <div className="p-6">
        {user?.role !== 'receptionist' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
                <div className="p-1.5 bg-indigo-50 rounded-lg"><Heart size={14} className="text-indigo-600" /></div> Vitals & Metrics
              </h3>
            </div>
            <div className="flex items-center justify-between border-b-4 border-black pb-4">
              <div className="flex flex-col border-r border-slate-200 pr-4">
                <span className="text-xl font-bold text-slate-800">
                  {(() => {
                    const h = parseFloat(data.vitals?.height || data.height || 0) / 100;
                    const w = parseFloat(data.vitals?.weight || data.weight || 0);
                    return (h > 0 && w > 0) ? (w / (h * h)).toFixed(1) : '--';
                  })()}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">BMI</span>
              </div>
              <div className="flex flex-col border-r border-slate-200 px-4">
                <span className="text-xl font-bold text-slate-800">{data.vitals?.weight || data.weight || '--'} <span className="text-sm">kg</span></span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Weight</span>
              </div>
              <div className="flex flex-col border-r border-slate-200 px-4">
                <span className="text-xl font-bold text-slate-800">{data.vitals?.height || data.height || '--'} <span className="text-sm">cm</span></span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Height</span>
              </div>
              <div className="flex flex-col pl-4">
                <span className="text-xl font-bold text-slate-800">{data.vitals?.bloodPressure || data.bloodPressure || '--'}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Blood pressure</span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
              <div className="p-1.5 bg-indigo-50 rounded-lg"><Shield size={14} className="text-indigo-600" /></div> Emergency Contact
            </h3>
            <button onClick={onEdit} className="text-slate-400 hover:text-indigo-600"><Edit2 size={14} /></button>
          </div>
          <div className="flex items-center justify-between border-b-4 border-black pb-4">
            <InfoItem label="Contact Person" value={data.emergencyContact} icon={User} />
            <InfoItem label="Emergency Phone" value={data.emergencyPhone} icon={Phone} />
          </div>
        </div>

        {user?.role !== 'receptionist' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
                <div className="p-1.5 bg-indigo-50 rounded-lg"><BookOpen size={14} className="text-indigo-600" /></div> Conditions & Allergies
              </h3>
              <button onClick={onEdit} className="text-slate-400 hover:text-indigo-600"><Edit2 size={14} /></button>
            </div>
            <div className="space-y-4 border-l-4 border-black pl-4 py-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Past Medical History</span>
                <div className="bg-slate-50 border border-slate-100 p-2 rounded text-sm text-slate-600 font-medium">
                  {data.pastMedicalHistory || data.medicalHistory || 'No history recorded'}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-1">Known Allergies</span>
                <div className="bg-rose-50 border border-rose-100 p-2 rounded text-sm text-rose-600 font-medium italic">
                  {data.allergies || 'None reported'}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Medications</span>
                <div className="bg-slate-50 border border-slate-100 p-2 rounded text-sm text-slate-600 font-medium">
                  {data.currentMedications || 'None recorded'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Reusable Form Field Components ---
const Field = ({ label, value, onChange, type = 'text', options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    {options ? (
      <select
        value={value}
        onChange={onChange}
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        {options.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      />
    )}
  </div>
);

const TextArea = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <textarea
      rows={3}
      value={value}
      onChange={onChange}
      className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
    />
  </div>
);

// --- Edit Profile Modal ---
const EditProfileModal = ({ data, onClose, onSave }) => {
  const [form, setForm] = useState({
    designation: data.designation || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    age: data.age || '',
    ageType: data.ageType || 'Year',
    gender: data.gender || '',
    bloodGroup: data.bloodGroup || '',
    mobile: data.mobile || data.contactNumber || '',
    email: data.email || '',
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    zip: data.zip || '',
    emergencyContact: data.emergencyContact || '',
    emergencyPhone: data.emergencyPhone || '',
    allergies: data.allergies || '',
    pastMedicalHistory: data.pastMedicalHistory || data.medicalHistory || '',
    currentMedications: data.currentMedications || '',
    bloodPressure: data.vitals?.bloodPressure || data.bloodPressure || '',
    weight: data.vitals?.weight || data.weight || '',
    height: data.vitals?.height || data.height || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await patientApi.update(data._id, {
        ...form,
        fullName: (() => {
          const designation = form.designation ? form.designation.trim() : '';
          let firstName = form.firstName.trim();
          const lastName = form.lastName.trim();

          if (designation && firstName.toUpperCase().startsWith(designation.toUpperCase().replace(/\./g, ''))) {
            return `${firstName} ${lastName}`.trim();
          }

          return `${designation ? designation + ' ' : ''}${firstName} ${lastName}`.trim();
        })(),
        contactNumber: form.mobile,
        medicalHistory: form.pastMedicalHistory,
        vitals: { bloodPressure: form.bloodPressure, weight: form.weight, height: form.height }
      });
      toast.success('Patient profile updated successfully!');
      onSave(updated);
      onClose();
    } catch (err) {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-8 py-5 flex justify-between items-center rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Patient Profile</h2>
            <p className="text-xs text-slate-400 mt-0.5">Changes will be saved to the database</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="px-8 py-6 space-y-8">
          <section>
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User size={14} /> Personal Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Designation" value={form.designation} onChange={set('designation')} options={['', 'MR.', 'MS.', 'MRS.', 'MISS', 'SHRI', 'SMT.']} />
              <Field label="First Name" value={form.firstName} onChange={set('firstName')} />
              <Field label="Last Name" value={form.lastName} onChange={set('lastName')} />
              <Field label="Gender" value={form.gender} onChange={set('gender')} options={['', 'Male', 'Female', 'Other']} />
              <Field label="Age" value={form.age} onChange={set('age')} type="number" />
              <Field label="Age Type" value={form.ageType} onChange={set('ageType')} options={['Year', 'Month', 'Days']} />
              <Field label="Blood Group" value={form.bloodGroup} onChange={set('bloodGroup')} options={['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Phone size={14} /> Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Mobile Number" value={form.mobile} onChange={set('mobile')} type="tel" />
              <Field label="Email Address" value={form.email} onChange={set('email')} type="email" />
              <Field label="Address" value={form.address} onChange={set('address')} />
              <Field label="City" value={form.city} onChange={set('city')} />
              <Field label="State" value={form.state} onChange={set('state')} />
              <Field label="Zip / Pin Code" value={form.zip} onChange={set('zip')} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield size={14} /> Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact Person Name" value={form.emergencyContact} onChange={set('emergencyContact')} />
              <Field label="Contact Person Phone" value={form.emergencyPhone} onChange={set('emergencyPhone')} type="tel" />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Heart size={14} /> Medical Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Field label="Blood Pressure" value={form.bloodPressure} onChange={set('bloodPressure')} />
              <Field label="Weight (kg)" value={form.weight} onChange={set('weight')} type="number" />
              <Field label="Height (cm)" value={form.height} onChange={set('height')} type="number" />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <TextArea label="Past Medical History" value={form.pastMedicalHistory} onChange={set('pastMedicalHistory')} />
              <TextArea label="Known Allergies" value={form.allergies} onChange={set('allergies')} />
              <TextArea label="Current Medications" value={form.currentMedications} onChange={set('currentMedications')} />
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-8 py-5 flex justify-end gap-3 rounded-b-3xl">
          <button onClick={onClose} className="px-6 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60">
            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : <><Save size={16} />Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};



const PrescriptionContent = ({ notes }) => {
  let data = null;
  try {
    if (notes && typeof notes === 'string' && notes.trim().startsWith('{')) {
      data = JSON.parse(notes);
    }
  } catch (e) {
    data = null;
  }

  if (!data) {
    return (
      <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 text-slate-700 text-sm leading-relaxed font-medium whitespace-pre-wrap italic">
        {notes}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden mt-3">
      {/* 1. VITALS */}
      {data.vitals && Object.values(data.vitals).some(v => v) && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-rose-50/40">
          <div className="flex items-center gap-1.5 w-28 shrink-0">
            <Heart size={12} className="text-rose-500 shrink-0" />
            <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-widest">Vitals</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {Object.entries(data.vitals).map(([key, val]) => val && (
              <span key={key} className="text-sm text-slate-700">
                <span className="text-slate-400 text-xs">{key.replace('_', ' ')}: </span>
                <span className="font-semibold">{val}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. DIAGNOSIS */}
      {data.diagnosis?.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-indigo-50/30">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <Stethoscope size={12} className="text-indigo-500 shrink-0" />
            <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest">Diagnosis</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {data.diagnosis.map(d => d.name).join(', ')}
          </p>
        </div>
      )}

      {/* 3. CHIEF COMPLAINTS */}
      {data.complaints?.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-amber-50/30">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <ClipboardList size={12} className="text-amber-500 shrink-0" />
            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest">Complaints</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {data.complaints.map(c => `${c.name} (${c.severity || 'Mild'})`).join(', ')}
          </p>
        </div>
      )}

      {/* 4. MEDICATIONS (Rx) */}
      {data.medications?.length > 0 && (
        <div className="bg-white">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border-b border-slate-100">
            <Pill size={12} className="text-slate-500 shrink-0" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Rx • Medications</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Medicine</th>
                <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Dose</th>
                <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Timing</th>
                <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Frequency</th>
                <th className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.medications.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="text-sm font-semibold text-slate-800">{m.name}</div>
                    {(m.composition || m.genericName) && (
                      <div className="text-[11px] text-slate-400 italic mt-0.5">
                        {m.composition || m.genericName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-sm font-semibold text-indigo-600">{m.dose}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.when?.toLowerCase().includes('before') ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                      {m.when}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-slate-600">{m.frequency}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-500">{m.duration || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. CLINICAL ADVICE */}
      {data.advice && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-blue-50/30">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <BookOpen size={12} className="text-blue-500 shrink-0" />
            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest">Advice</span>
          </div>
          <div>
            <p className="text-sm text-slate-700 leading-relaxed italic">"{data.advice}"</p>
            {data.translatedAdvice && (
              <p className="text-xs text-slate-500 mt-1.5">
                <span className="font-semibold">Translated:</span> {data.translatedAdvice}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 6. INVESTIGATIONS */}
      {data.testsRequested?.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-purple-50/30">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <FlaskConical size={12} className="text-purple-500 shrink-0" />
            <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-widest">Tests</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.testsRequested.map((t, i) => (
              <span key={i} className="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium border border-purple-200">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TabPrescriptions = ({ appointments = [], medicalRecords = [], onNewPrescription, onOpenTemplateModal, onEmail, onWhatsApp, onPrint, onDownload, onEdit, templates = [], selectedTemplate, setSelectedTemplate, pdfProgress }) => {
  const allPrescriptions = [
    ...appointments.filter(a => a.visitNotes).map(a => ({
      id: a._id,
      date: a.date,
      time: a.time,
      doctorName: a.doctorName,
      doctorId: a.doctorId,
      specialty: a.specialty || a.doctorSpecialization,
      qualification: a.doctorQualification,
      notes: a.visitNotes,
      type: 'Visit Note',
      reason: a.reason || 'General Visit'
    })),
    ...medicalRecords.filter(r => r.type === 'Prescription').map(r => ({
      id: r._id,
      date: r.date,
      time: new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      doctorName: r.doctorName,
      doctorId: r.doctorId,
      specialty: r.specialty || r.doctorSpecialization,
      qualification: r.doctorQualification,
      notes: r.description,
      type: 'Record',
      reason: r.title
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Prescription History</h3>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">{allPrescriptions.length} Records</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">Prescription Layout</span>
            <select 
              value={selectedTemplate?._id || 'default'} 
              onChange={(e) => {
                if (e.target.value === 'default') {
                  setSelectedTemplate(null);
                } else {
                  const t = templates.find(temp => temp._id === e.target.value);
                  setSelectedTemplate(t);
                }
              }}
              className="bg-white border-2 border-indigo-100 rounded-xl px-4 py-1.5 text-[11px] font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:border-indigo-300 transition-all min-w-[180px]"
            >
              <option value="default">Oviaan System Default</option>
              {templates.filter(t => t._id && t.templateName).map(t => (
                <option key={t._id} value={t._id}>
                  {t.templateName} {t.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={onOpenTemplateModal}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
          >
            <BookOpen size={14} /> Choose Template
          </button>
          <button 
            onClick={onNewPrescription}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <Plus size={14} /> New Prescription
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {allPrescriptions.length > 0 ? (
          allPrescriptions.map((p, idx) => (
            <div key={p.id || idx} className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 relative overflow-hidden group hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 rounded-r-full"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shadow-lg shadow-indigo-100 ${p.type === 'Record' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white`}>
                    <Pill size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 tracking-tight">{new Date(p.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {p.doctorName?.toLowerCase().startsWith('dr') ? '' : 'Dr. '}{p.doctorName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => onEmail(p)} className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors">
                    <Mail size={16} />
                    <span className="text-sm font-semibold">Email</span>
                  </button>
                  <button onClick={() => onWhatsApp(p)} className="flex items-center gap-1.5 text-emerald-500 hover:text-emerald-600 transition-colors">
                    <Phone size={16} />
                    <span className="text-sm font-semibold">WhatsApp</span>
                  </button>
                  <button 
                    onClick={() => onDownload(p)} 
                    disabled={pdfProgress?.isGenerating && pdfProgress?.prescriptionId === p.id}
                    className={`flex items-center gap-1.5 transition-colors ${pdfProgress?.isGenerating && pdfProgress?.prescriptionId === p.id ? 'text-indigo-500 cursor-not-allowed opacity-80' : 'text-blue-500 hover:text-blue-600'}`}
                  >
                    {pdfProgress?.isGenerating && pdfProgress?.prescriptionId === p.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                        <span className="text-sm font-semibold whitespace-nowrap">Creating {pdfProgress.percent}%</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span className="text-sm font-semibold">Download</span>
                      </>
                    )}
                  </button>
                  <button onClick={() => onPrint(p)} className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors">
                    <Printer size={16} />
                    <span className="text-sm font-semibold">Print</span>
                  </button>
                  <button onClick={() => onEdit(p)} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 hover:border-indigo-300">
                    <Edit2 size={16} />
                    <span className="text-sm font-bold uppercase tracking-wider">Edit</span>
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-bold text-slate-500 uppercase tracking-widest shadow-sm ml-2">
                    <Clock size={10} />
                    {p.time}
                  </div>
                </div>
              </div>
              <PrescriptionContent notes={p.notes} />
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">Context:</span>
                <span className={`text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-md ${p.type === 'Record' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {p.reason}
                </span>
                <span className="text-[9px] font-bold text-slate-300 ml-auto uppercase tracking-tighter">{p.type}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Pill size={32} />
            </div>
            <div>
              <p className="text-slate-800 font-bold">No Prescriptions Found</p>
              <p className="text-slate-400 text-xs mt-1">Prescriptions are automatically added here after visit notes are saved.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};const TabFollowUps = ({ patient, user }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const patientId = patient.patientId || patient._id;
      const response = await followUpReminderApi.getFollowUpReminders({ patientId });
      setReminders(response.reminders || []);
    } catch (error) {
      console.error("Failed to fetch reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient) fetchReminders();
  }, [patient]);

  const handleAction = async (actionFn, id, successMsg) => {
    try {
      await actionFn(id);
      toast.success(successMsg);
      fetchReminders();
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this reminder?")) {
      handleAction(followUpReminderApi.deleteFollowUpReminder, id, "Deleted");
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-50 text-red-700 border-red-100';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'MEDIUM': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'LOW': return 'bg-gray-50 text-gray-700 border-gray-100';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      case 'PENDING': return 'bg-blue-100 text-blue-700';
      case 'SNOOZED': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Follow-up Reminders</h3>
          <p className="text-xs text-gray-500">Track care coordination for this patient</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Add Reminder
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 flex flex-col items-center">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : reminders.length > 0 ? (
          reminders.map((r) => (
            <div key={r._id} className="bg-white border rounded-lg p-4 hover:border-blue-300 transition-colors shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 border ${getPriorityStyle(r.priority)}`}>
                    <Bell size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-black text-sm">{r.title}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase ${getPriorityStyle(r.priority)}`}>
                        {r.priority}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase ${getStatusStyle(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-600">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={12} className="text-gray-400" />
                        {new Date(r.reminderAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag size={12} className="text-gray-400" />
                        {r.reminderType?.replace(/_/g, ' ')}
                      </div>
                    </div>
                    {r.note && (
                      <p className="mt-2 text-xs text-gray-700 bg-gray-50 p-2 rounded border border-dashed">
                        {r.note}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
                    <>
                      <button 
                        onClick={() => handleAction(followUpReminderApi.completeFollowUpReminder, r._id, "Done")}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      >
                        <CheckCircle size={16} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => handleDelete(r._id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed rounded-lg">
            <Bell size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No follow-ups scheduled</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddFollowUpReminderModal 
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchReminders();
          }}
          patient={patient}
        />
      )}
    </div>
  );
};

const TabAppointments = ({ appointments, onRebook }) => {
  const upcoming = appointments.filter(a => a.status?.toLowerCase() === 'pending' || a.status?.toLowerCase() === 'confirmed');
  const past = appointments.filter(a => a.status?.toLowerCase() === 'completed' || a.status?.toLowerCase() === 'cancelled');

  const AppointmentItem = ({ appt }) => (
    <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${appt.status?.toLowerCase() === 'confirmed' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${appt.status?.toLowerCase() === 'confirmed' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
            <CalendarIcon size={18} />
          </div>
          <div>
            <p className="font-bold text-slate-800">{new Date(appt.date).toLocaleDateString()} at {appt.time}</p>
            <p className="text-xs text-slate-500 font-medium flex items-center mt-0.5">
              <Stethoscope size={12} className="mr-1" /> {appt.doctorName} ({appt.specialty})
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${appt.status?.toLowerCase() === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
          appt.status?.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-700' :
            appt.status?.toLowerCase() === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
          }`}>
          {appt.status}
        </span>
      </div>
      <p className="text-sm text-slate-600 italic bg-white/50 p-2 rounded-lg border border-slate-50 mb-4">"{appt.reason || 'No reason specified'}"</p>
      <div className="flex justify-end gap-2">
        <button onClick={() => onRebook(appt)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">
          <RefreshCcw size={12} /> Re-book
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Current & Upcoming</h3>
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold">{upcoming.length}</span>
        </div>
        <div className="space-y-3">
          {upcoming.length > 0 ? (
            upcoming.map(appt => <AppointmentItem key={appt._id} appt={appt} />)
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm font-medium">No active appointments</p>
            </div>
          )}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">History</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{past.length}</span>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {past.map(appt => <AppointmentItem key={appt._id} appt={appt} />)}
        </div>
      </div>
    </div>
  );
};

const BillViewModal = ({ bill, onClose, clinicInfo, patient }) => {
  if (!bill) return null;
  
  const totals = bill.billType === 'Pharmacy' ? normalizePharmacyInvoice(bill) : calculateInvoiceTotals(bill);
  const items = bill.items || bill.services || [];
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Invoice Details</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{bill.invoiceNumber || bill.billId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billed To</p>
              <p className="text-lg font-bold text-slate-800">{patient.fullName || `${patient.firstName} ${patient.lastName}`}</p>
              <p className="text-sm text-slate-500">ID: {patient.patientId}</p>
              <p className="text-sm text-slate-500">Ph: {patient.mobile || patient.contactNumber}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Date</p>
              <p className="text-lg font-bold text-slate-800">{new Date(bill.date || bill.createdAt).toLocaleDateString()}</p>
              <div className="flex justify-end mt-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                  bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {bill.status}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b pb-2">Itemized Breakdown</h4>
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length > 0 ? items.map((item, idx) => (
                  <tr key={idx} className="text-sm">
                    <td className="py-3 font-medium text-slate-700">{item.description}</td>
                    <td className="py-3 text-center text-slate-500">{item.qty || 1}</td>
                    <td className="py-3 text-right text-slate-500">₹{(parseFloat(item.unitPrice || item.price || 0)).toFixed(2)}</td>
                    <td className="py-3 text-right font-bold text-slate-800">₹{(parseFloat(item.subtotal || item.amount || 0)).toFixed(2)}</td>
                  </tr>
                )) : (
                  <tr className="text-sm">
                    <td className="py-3 font-medium text-slate-700">General Consultation</td>
                    <td className="py-3 text-center text-slate-500">1</td>
                    <td className="py-3 text-right text-slate-500">₹{bill.amount?.toFixed(2)}</td>
                    <td className="py-3 text-right font-bold text-slate-800">₹{bill.amount?.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-bold text-slate-800">₹{totals.grossAmount.toFixed(2)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-rose-600">
                  <span>Discount:</span>
                  <span className="font-bold">-₹{totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax ({totals.taxValue}%):</span>
                  <span className="font-bold text-slate-800">₹{totals.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-lg font-bold text-slate-800 uppercase tracking-tighter">Grand Total</span>
                <span className="text-2xl font-bold text-indigo-600">₹{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {bill.notes && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Additional Notes</p>
              <p className="text-sm text-slate-600 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 italic">
                {bill.notes}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-4">
          <div className="flex gap-2">
            <button 
              onClick={() => onDownload(bill)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
            >
              <Download size={16} /> Download
            </button>
            <button 
              onClick={() => onPrint(bill)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors"
            >
              <Printer size={16} /> Print
            </button>
          </div>
          <button onClick={onClose} className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-white transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const BillEditModal = ({ bill, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    status: bill?.status || 'Pending',
    paymentMethod: bill?.paymentMethod || 'Cash',
    amount: bill?.amount || 0,
    paidAmount: bill?.paidAmount || 0,
    dueAmount: bill?.dueAmount || 0,
    notes: bill?.notes || '',
    items: bill?.items || [],
    discount: bill?.discount || 0
  });
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const totals = calculateInvoiceTotals(formData);
      const updatedData = { 
        ...formData,
        amount: totals.grandTotal, // The 'amount' field in the DB usually stores the net payable
        grossAmount: totals.grossAmount,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        taxableAmount: totals.taxableAmount,
        dueAmount: totals.dueAmount,
        paidAmount: totals.paidAmount
      };
      
      // Auto-adjust status based on payments
      if (totals.paidAmount >= totals.grandTotal && totals.grandTotal > 0) {
        updatedData.status = 'Paid';
      } else if (totals.paidAmount > 0) {
        updatedData.status = 'Partial';
      } else if (updatedData.status === 'Paid' && totals.paidAmount < totals.grandTotal) {
        updatedData.status = 'Due';
      }

      await billingApi.update(bill._id, updatedData);
      toast.success("Bill updated successfully");
      onSave();
      onClose();
    } catch (error) {
      toast.error("Failed to update bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">Edit Bill</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Due">Due</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Payment Mode</label>
              <select 
                value={formData.paymentMethod}
                onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value }))}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Insurance">Insurance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Total Amount (₹)</label>
              <input 
                type="number" 
                value={formData.amount || ''}
                onChange={e => setFormData(p => ({ ...p, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Paid Amount (₹)</label>
              <input 
                type="number" 
                value={formData.paidAmount || ''}
                onChange={e => setFormData(p => ({ ...p, paidAmount: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Discount (₹)</label>
              <input 
                type="number" 
                value={formData.discount || ''}
                onChange={e => setFormData(p => ({ ...p, discount: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Final Total (₹)</label>
              <div className="w-full p-3 bg-slate-100 border border-slate-100 rounded-xl text-sm font-bold text-indigo-600">
                ₹{calculateInvoiceTotals(formData).grandTotal.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Additional Notes</label>
            <textarea 
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              rows="3"
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              placeholder="Internal notes or remarks..."
            />
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={handleUpdate}
            disabled={loading}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Update Bill Details'}
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const TabBilling = ({
  patient,
  onPrint,
  onDownload,
  clinicInfo,
  setIsDownloading,
  setDownloadProgress,
  setDownloadFileName,
  invoiceTemplates = [],
  selectedInvoiceTemplate = null,
  setSelectedInvoiceTemplate = () => {},
  onOpenTemplateModal
}) => {
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState({ totalBilled: 0, totalPaid: 0, totalDue: 0, invoiceCount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [billingTab, setBillingTab] = useState('Consultant');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 10 });
  
  // Selection & Action States
  const [selectedBillIds, setSelectedBillIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [viewingBill, setViewingBill] = useState(null);
  const [editingBill, setEditingBill] = useState(null);

  const fetchBills = async (page = 1) => {
    setLoading(true);
    try {
      const billType = billingTab === 'Consultant' ? 'General' : 'Pharmacy';
      const response = await billingApi.getByPatient(patient.patientId || patient._id, { 
        page, 
        limit: 10,
        search: searchQuery,
        status: filterStatus === 'All' ? '' : filterStatus,
        billType: billType
      });
      setBills(response.bills || []);
      setSummary(response.summary || { totalBilled: 0, totalPaid: 0, totalDue: 0, invoiceCount: 0 });
      setPagination(response.pagination || { total: 0, totalPages: 0, limit: 10 });
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to fetch bills:", error);
      toast.error("Failed to load billing records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patient) fetchBills(1);
  }, [patient, filterStatus, billingTab]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (patient) fetchBills(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggleSelect = (id) => {
    setSelectedBillIds(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedBillIds.length === filteredBills.length) {
      setSelectedBillIds([]);
    } else {
      setSelectedBillIds(filteredBills.map(b => b._id));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedBillIds.length === 0) return;
    
    setBulkLoading(true);
    try {
      const payload = { billIds: selectedBillIds };
      
      if (action === 'download') {
        toast.info("Preparing billing statement PDF...");
        setIsDownloading(true);
        setDownloadProgress(0);
        setDownloadFileName(`Statement-${patient.fullName || patient.patientId}.pdf`);
        
        const timer = setInterval(() => {
          setDownloadProgress(prev => (prev < 90 ? prev + 10 : prev));
        }, 500);

        try {
          const response = await billingApi.generateStatement(patient.patientId || patient._id, payload);
          clearInterval(timer);
          setDownloadProgress(100);

          if (response && response.statement?.signedUrl) {
            setTimeout(() => {
              const link = document.createElement('a');
              link.href = response.statement.signedUrl;
              link.target = "_blank";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setIsDownloading(false);
              toast.success("Statement download started!");
            }, 500);
          } else {
            setIsDownloading(false);
            toast.error("Failed to generate statement URL");
          }
        } catch (err) {
          clearInterval(timer);
          setIsDownloading(false);
          toast.error("Statement generation failed");
        }
      } else if (action === 'print') {
        const selectedBills = bills.filter(b => selectedBillIds.includes(b._id));
        const totalBilled = selectedBills.reduce((sum, b) => sum + (b.amount || 0), 0);
        const totalDiscount = selectedBills.reduce((sum, b) => sum + (b.discount || 0), 0);
        const totalPaid = selectedBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
        const totalDue = selectedBills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);
        
        const printWindow = window.open('', '_blank', 'width=900,height=800');
        
        const billsHtml = selectedBills.map(bill => `
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; overflow: hidden;">
            <div style="background: #f8fafc; padding: 10px 15px; display: flex; justify-between; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: bold;">Invoice: ${bill.invoiceNumber || bill.billId}</span>
              <span style="font-size: 12px; color: #64748b; margin-left: auto;">${new Date(bill.date || bill.createdAt).toLocaleDateString()}</span>
            </div>
            <div style="padding: 15px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="text-align: left; border-bottom: 1px solid #f1f5f9; color: #94a3b8;">
                    <th style="padding-bottom: 8px;">Description</th>
                    <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                    <th style="padding-bottom: 8px; text-align: right;">Price</th>
                    <th style="padding-bottom: 8px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(bill.items || []).map(item => `
                    <tr>
                      <td style="padding: 8px 0; font-weight: 500;">${item.description}</td>
                      <td style="padding: 8px 0; text-align: center;">${item.qty || 1}</td>
                      <td style="padding: 8px 0; text-align: right;">₹${(item.unitPrice || 0).toLocaleString()}</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: bold;">₹${(item.subtotal || 0).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                <div style="width: 200px; text-align: right; font-size: 13px;">
                  <div style="display: flex; justify-content: space-between; color: #64748b;"><span>Subtotal:</span><span>₹${bill.amount.toLocaleString()}</span></div>
                  ${bill.discount > 0 ? `<div style="display: flex; justify-content: space-between; color: #ef4444;"><span>Discount:</span><span>-₹${bill.discount.toLocaleString()}</span></div>` : ''}
                  <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #f1f5f9; margin-top: 5px; padding-top: 5px;"><span>Net:</span><span>₹${(bill.amount - bill.discount).toLocaleString()}</span></div>
                  <div style="display: flex; justify-content: space-between; color: #10b981;"><span>Paid:</span><span>₹${bill.paidAmount.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        `).join('');

        const html = `
          <html>
            <head>
              <title>Billing Statement - ${patient.fullName}</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
                .header { border-bottom: 4px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
                .patient-box { background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                .stat-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; }
                .stat-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; }
                .stat-value { font-size: 18px; font-weight: 800; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 2px dashed #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: white; padding: 30px; border-radius: 16px; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px;">BILLING STATEMENT</h1>
                  <p style="margin: 5px 0 0; color: #64748b; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Financial Summary</p>
                </div>
                <div style="text-align: right;">
                  <h2 style="margin: 0; color: #4f46e5; font-size: 18px; font-weight: 900;">${clinicInfo.clinicName || clinicInfo.name || "Clinic"}</h2>
                  <p style="margin: 5px 0 0; font-size: 11px; color: #64748b;">Generated on: ${new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div class="patient-box">
                <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px;">Patient Information</div>
                <div style="font-size: 22px; font-weight: 900;">${patient.fullName || `${patient.firstName} ${patient.lastName}`}</div>
                <div style="font-size: 12px; color: #4f46e5; font-weight: bold; margin-top: 2px;">Patient ID: ${patient.patientId}</div>
              </div>

              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-label">Total Billed</div>
                  <div class="stat-value">₹${totalBilled.toLocaleString()}</div>
                </div>
                <div class="stat-card" style="border-color: #fecaca; background: #fff1f2;">
                  <div class="stat-label" style="color: #f43f5e;">Discount Applied</div>
                  <div class="stat-value" style="color: #be123c;">₹${totalDiscount.toLocaleString()}</div>
                </div>
                <div class="stat-card" style="border-color: #a7f3d0; background: #f0fdf4;">
                  <div class="stat-label" style="color: #10b981;">Total Paid</div>
                  <div class="stat-value" style="color: #047857;">₹${totalPaid.toLocaleString()}</div>
                </div>
              </div>

              ${billsHtml}

              <div class="footer">
                <div>
                  <div style="font-size: 10px; font-weight: 800; opacity: 0.6; text-transform: uppercase; letter-spacing: 2px;">Current Balance Due</div>
                  <div style="font-size: 32px; font-weight: 900;">₹${totalDue.toLocaleString()}</div>
                </div>
                <div style="text-align: right;">
                  <p style="margin: 0; font-size: 14px; font-weight: bold;">Thank you for choosing our services.</p>
                  <p style="margin: 5px 0 0; font-size: 11px; opacity: 0.5;">This statement covers ${selectedBills.length} invoices.</p>
                </div>
              </div>

              <script>
                window.onload = () => {
                  setTimeout(() => {
                    window.print();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Bulk action failed:", error);
      toast.error("Failed to process bulk action");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleMarkPaid = async (bill) => {
    try {
      await billingApi.update(bill._id, { status: 'Paid', paidAmount: bill.amount, dueAmount: 0 });
      toast.success("Bill marked as Paid");
      fetchBills();
    } catch (error) {
      toast.error("Failed to update bill status");
    }
  };

  const handleDelete = async (billId) => {
    if (window.confirm("Are you sure you want to delete this bill? This action cannot be undone.")) {
      try {
        await billingApi.delete(billId);
        toast.success("Bill deleted successfully");
        fetchBills();
      } catch (error) {
        toast.error("Failed to delete bill");
      }
    }
  };

  const filteredBills = bills; // Now filtered on server-side

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium">Fetching billing history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative pb-20">
      {/* Billing Type Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-1">
        <button
          onClick={() => setBillingTab('Consultant')}
          className={`px-6 py-3 text-sm font-bold transition-all relative ${
            billingTab === 'Consultant' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Consultant Billing
          {billingTab === 'Consultant' && (
            <motion.div layoutId="activeBillingTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setBillingTab('Pharmacy')}
          className={`px-6 py-3 text-sm font-bold transition-all relative ${
            billingTab === 'Pharmacy' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Medical Pharmacy Billing
          {billingTab === 'Pharmacy' && (
            <motion.div layoutId="activeBillingTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(() => {
          const calculatedTotals = filteredBills.map(b => 
            b.billType === 'Pharmacy' ? normalizePharmacyInvoice(b) : calculateInvoiceTotals(b)
          );
          const currentTotalBilled = calculatedTotals.reduce((sum, t) => sum + t.grossAmount, 0);
          const currentTotalPaid = calculatedTotals.reduce((sum, t) => sum + t.paidAmount, 0);
          const currentTotalDue = calculatedTotals.reduce((sum, t) => sum + t.dueAmount, 0);
          
          return [
            { label: 'Total Invoices', value: filteredBills.length, icon: FileText, color: 'bg-indigo-50 text-indigo-600' },
            { label: 'Total Billed', value: `₹${currentTotalBilled.toLocaleString()}`, icon: IndianRupee, color: 'bg-blue-50 text-blue-600' },
            { label: 'Total Paid', value: `₹${currentTotalPaid.toLocaleString()}`, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Total Due', value: `₹${currentTotalDue.toLocaleString()}`, icon: CreditCard, color: 'bg-rose-50 text-rose-600', valColor: 'text-rose-600' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
            >
              <div className={`p-3 ${stat.color} rounded-xl shadow-inner`}><stat.icon size={22} strokeWidth={2.5} /></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.valColor || 'text-slate-800'}`}>{stat.value}</p>
              </div>
            </motion.div>
          ));
        })()}
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search invoice number..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400 w-4 h-4" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="All">All Invoices</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Due">Due</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          {/* Template Selector */}
          {invoiceTemplates.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 hidden sm:inline">Branding:</span>
              <select
                value={selectedInvoiceTemplate?._id || ''}
                onChange={(e) => {
                  const t = invoiceTemplates.find(temp => temp._id === e.target.value);
                  setSelectedInvoiceTemplate(t);
                }}
                className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-xs font-bold text-indigo-600 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
              >
                {invoiceTemplates.map(t => (
                  <option key={t._id} value={t._id}>{t.name || t.templateName} {t.isDefault ? '(Default)' : ''}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {billingTab === 'Pharmacy' && (
            <button 
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm group"
              onClick={onOpenTemplateModal}
            >
              <Layout size={16} className="text-indigo-500 group-hover:rotate-12 transition-transform" />
              Choose Template
            </button>
          )}
          <button 
            onClick={handleSelectAll}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              selectedBillIds.length === filteredBills.length && filteredBills.length > 0
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {selectedBillIds.length === filteredBills.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* Bulk Action Sticky Bar */}
      <AnimatePresence>
        {selectedBillIds.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[50] w-full max-w-2xl px-4"
          >
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800/50 backdrop-blur-md bg-opacity-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg">
                  {selectedBillIds.length}
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-tighter">Invoices Selected</p>
                  <p className="text-[10px] font-bold text-slate-400">Merged statement will be generated</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => handleBulkAction('download')}
                  disabled={bulkLoading}
                  className="flex-1 sm:flex-none p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
                  title="Download Statement"
                >
                  {bulkLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                </button>
                <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block"></div>
                <button 
                  onClick={() => setSelectedBillIds([])}
                  className="p-2.5 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bill List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredBills.length > 0 ? (
          filteredBills.map(bill => (
            <motion.div 
              key={bill._id} 
              layout
              className={`group bg-white border rounded-2xl p-5 transition-all duration-300 flex flex-col sm:flex-row gap-5 ${
                selectedBillIds.includes(bill._id) 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/20 shadow-md' 
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {/* Selection Checkbox */}
              <div className="flex items-center justify-center sm:justify-start">
                <button 
                  onClick={() => handleToggleSelect(bill._id)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    selectedBillIds.includes(bill._id)
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'border-slate-200 text-transparent hover:border-indigo-400'
                  }`}
                >
                  <Plus size={14} className={selectedBillIds.includes(bill._id) ? 'rotate-45' : ''} />
                </button>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {(() => {
                    const totals = bill.billType === 'Pharmacy' ? normalizePharmacyInvoice(bill) : calculateInvoiceTotals(bill);
                    return (
                      <>
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-2xl ${bill.status === 'Paid' ? 'bg-emerald-50' : 'bg-rose-50'} transition-colors`}>
                            <FileText size={20} className={bill.status === 'Paid' ? 'text-emerald-600' : 'text-rose-600'} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-800 text-lg">
                                {bill.invoiceNumber || bill.billId}
                              </h4>
                              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full ${
                                bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                bill.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {bill.status}
                              </span>
                              {bill.billType && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-widest rounded-full">
                                  {bill.billType}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                              {new Date(bill.createdAt || bill.date).toLocaleDateString(undefined, { dateStyle: 'long' })} • Dr. {bill.doctorName}
                            </p>
                          </div>
                        </div>

                        <div className="text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end gap-2 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Amount</p>
                            <p className="text-2xl font-bold text-slate-900 tracking-tighter">₹{totals.grandTotal.toLocaleString()}</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Payment Mode</span>
                            <span className="text-xs font-bold text-indigo-600 px-2 py-1 bg-indigo-50 rounded-lg">{bill.paymentMethod || 'Cash'}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  {(() => {
                    const totals = bill.billType === 'Pharmacy' ? normalizePharmacyInvoice(bill) : calculateInvoiceTotals(bill);
                    return (
                      <div className="flex items-center gap-6 w-full sm:w-auto">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Billed</p>
                          <p className="text-sm font-bold text-slate-600">₹{totals.grossAmount.toLocaleString()}</p>
                        </div>
                        {totals.discountAmount > 0 && (
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">Discount</p>
                            <p className="text-sm font-bold text-rose-600">-₹{totals.discountAmount.toLocaleString()}</p>
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Paid</p>
                          <p className="text-sm font-bold text-emerald-600">₹{totals.paidAmount.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-100"></div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Due</p>
                          <p className="text-sm font-bold text-rose-600">₹{totals.dueAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
                      <ActionButton 
                        icon={Eye} 
                        label="View" 
                        onClick={() => setViewingBill(bill)} 
                        colorClass="text-slate-500" 
                        hoverBg="bg-white text-indigo-600 shadow-sm" 
                      />
                      <ActionButton 
                        icon={Edit2} 
                        label="Edit" 
                        onClick={() => setEditingBill(bill)} 
                        colorClass="text-slate-500" 
                        hoverBg="bg-white text-amber-600 shadow-sm" 
                      />
                    </div>

                    <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
                      <ActionButton 
                        icon={Download} 
                        label="PDF" 
                        onClick={() => onDownload(bill)} 
                        colorClass="text-slate-500" 
                        hoverBg="bg-white text-blue-600 shadow-sm" 
                      />
                    </div>

                    <ActionButton 
                      icon={Trash2} 
                      label="Delete" 
                      onClick={() => handleDelete(bill._id)} 
                      colorClass="text-slate-300 hover:text-rose-600" 
                      hoverBg="bg-rose-50" 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
              <FileText className="text-slate-200 w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Invoices Yet</h3>
            <p className="text-slate-400 font-medium max-w-[250px] mx-auto mt-2">
              Generate bills to track patient payments and financial history.
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="mt-8">
          <Pagination 
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={fetchBills}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
          />
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {viewingBill && (
          <BillViewModal 
            bill={viewingBill} 
            onClose={() => setViewingBill(null)} 
            clinicInfo={clinicInfo} 
            patient={patient} 
            onDownload={onDownload}
          />
        )}
        {editingBill && (
          <BillEditModal 
            bill={editingBill} 
            onClose={() => setEditingBill(null)} 
            onSave={fetchBills} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
const TabProgressGallery = ({ patientId, user, patientName, appointments = [], onPrintReport }) => {
  const [images, setImages] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galleryMode, setGalleryMode] = useState('comparison'); // 'single' or 'comparison'
  const [viewingImage, setViewingImage] = useState(null);
  const [viewingComparison, setViewingComparison] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showComparisonUploadModal, setShowComparisonUploadModal] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editingComparison, setEditingComparison] = useState(null);
  const [filterType, setFilterType] = useState('All');

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const [imagesData, comparisonsData] = await Promise.all([
        patientProgressImageApi.list(patientId),
        patientProgressComparisonApi.list(patientId)
      ]);
      setImages(imagesData || []);
      setComparisons(comparisonsData || []);
    } catch (error) {
      console.error("Gallery fetch failed:", error);
      toast.error("Failed to load clinical gallery");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [patientId]);

  const handleDeleteCase = async (id, type) => {
    if (window.confirm('Are you sure you want to delete this clinical record?')) {
      try {
        if (type === 'single') await patientProgressImageApi.delete(patientId, id);
        else await patientProgressComparisonApi.delete(patientId, id);
        toast.success('Record deleted');
        fetchGallery();
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  const filteredComparisons = comparisons.filter(c => 
    filterType === 'All' || c.treatmentArea?.toLowerCase().includes(filterType.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Gallery Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-sm">
            <button 
              onClick={() => setGalleryMode('comparison')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${galleryMode === 'comparison' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Columns size={16} /> Comparison Cases
            </button>
            <button 
              onClick={() => setGalleryMode('single')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${galleryMode === 'single' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid size={16} /> Single Records
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium hover:bg-black transition-all"
          >
            <Plus size={16} /> New Treatment Case
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Loading clinical gallery...</p>
        </div>
      ) : galleryMode === 'single' ? (
        <>
          {images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {images.map((img) => (
                <div key={img._id} className="group relative bg-white border border-slate-200 overflow-hidden">
                  <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                    <img src={img.signedUrl} alt={img.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-3 border-t border-slate-100">
                    <p className="text-sm font-medium text-slate-900 truncate">{img.title || 'No Title'}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{new Date(img.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => setViewingImage(img)} className="p-2 bg-white text-slate-900 hover:bg-slate-50 transition-colors"><Maximize2 size={18} /></button>
                    <button onClick={() => setEditingImage(img)} className="p-2 bg-white text-slate-900 hover:bg-slate-50 transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => handleDeleteCase(img._id, 'single')} className="p-2 bg-white text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-slate-200">
              <Camera size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500">No individual clinical images recorded</p>
            </div>
          )}
        </>
      ) : (
        <>
          {comparisons.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {comparisons.map((comp) => (
                <div key={comp._id} className="bg-white border border-slate-200 overflow-hidden flex flex-col group">
                  <div className="flex divide-x divide-slate-200 h-64 bg-slate-900 overflow-hidden">
                    <div className="relative flex-1 flex items-center justify-center cursor-pointer" onClick={() => setViewingComparison(comp)}>
                      <img src={comp.beforeSignedUrl} alt="Before" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all" />
                      <div className="absolute top-3 left-3 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-medium uppercase tracking-wider">Before</div>
                    </div>
                    <div className="relative flex-1 flex items-center justify-center cursor-pointer" onClick={() => setViewingComparison(comp)}>
                      <img src={comp.afterSignedUrl} alt="After" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all" />
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-medium uppercase tracking-wider">After</div>
                    </div>
                  </div>
                  <div className="p-4 flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-medium text-slate-900">{comp.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-4">
                        <span>{new Date(comp.createdAt).toLocaleDateString()}</span>
                        <span>{comp.treatmentArea || 'General'}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingComparison(comp)} className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"><Edit2 size={18} /></button>
                      <button onClick={() => handleDeleteCase(comp._id, 'comparison')} className="p-2 hover:bg-rose-50 text-rose-600 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-slate-200">
              <Columns size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500">No comparison cases recorded for this patient</p>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showUploadModal || showComparisonUploadModal) && (
          <ProgressCaseModal
            patientId={patientId}
            organizationId={user?.organization?._id || user?.organizationId}
            defaultDoctorName={appointments[0]?.doctorName}
            defaultAppointmentId={appointments[0]?._id}
            onClose={() => { setShowUploadModal(false); setShowComparisonUploadModal(false); }}
            onSuccess={() => { setShowUploadModal(false); setShowComparisonUploadModal(false); fetchGallery(); }}
          />
        )}
        {editingComparison && (
          <ProgressCaseModal
            patientId={patientId}
            organizationId={user?.organization?._id || user?.organizationId}
            comparison={editingComparison}
            onClose={() => setEditingComparison(null)}
            onSuccess={() => { setEditingComparison(null); fetchGallery(); }}
          />
        )}
        {editingImage && (
          <ProgressImageEditModal
            patientId={patientId}
            image={editingImage}
            onClose={() => setEditingImage(null)}
            onSuccess={() => { setEditingImage(null); fetchGallery(); }}
          />
        )}
        {viewingImage && (
          <ProgressImageViewModal
            image={viewingImage}
            onClose={() => setViewingImage(null)}
          />
        )}
        {viewingComparison && (
          <ProgressComparisonViewModal
            comparison={viewingComparison}
            patientName={patientName}
            onClose={() => setViewingComparison(null)}
            onPrint={() => onPrintReport(viewingComparison)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};


/* --------------------------------------------------
Clinical Progress Modals
-------------------------------------------------- */

const SavedNotesManager = ({ value, onSelect, fieldType, organizationId, doctorId }) => {
  const [notes, setNotes] = useState([]);
  const [showList, setShowList] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    try {
      const response = await progressNoteApi.list(organizationId);
      setNotes(response.notes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (showList) fetchNotes();
  }, [showList]);

  const handleSave = async () => {
    if (!value?.trim()) return;
    setLoading(true);
    try {
      await progressNoteApi.save({
        note: value,
        noteType: fieldType,
        organizationId,
        doctorId
      });
      toast.success('Note saved to library');
      fetchNotes();
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await progressNoteApi.delete(id);
      setNotes(notes.filter(n => n._id !== id));
      toast.success('Note removed');
    } catch (err) {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <AnimatePresence>
        {value?.trim() && !notes.some(n => n.note === value) && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded border border-indigo-100 hover:bg-indigo-100 transition-colors"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            Save Note
          </motion.button>
        )}
      </AnimatePresence>

      <div className="relative">
        <button
          onClick={() => setShowList(!showList)}
          className={`p-1 rounded transition-colors ${showList ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
          title="Saved Notes Library"
        >
          <History size={16} />
        </button>

        {showList && (
          <>
            <div className="fixed inset-0 z-[110]" onClick={() => setShowList(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-[120] overflow-hidden flex flex-col max-h-64"
            >
              <div className="p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Note Library</span>
                <button onClick={() => setShowList(false)}><X size={12} /></button>
              </div>
              <div className="overflow-y-auto custom-scrollbar p-1">
                {notes.length === 0 ? (
                  <div className="p-4 text-center text-[10px] text-slate-400">No saved notes yet</div>
                ) : (
                  notes.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => {
                        onSelect(n.note);
                        setShowList(false);
                      }}
                      className="group p-2 hover:bg-indigo-50 rounded cursor-pointer transition-all border-b border-slate-50 last:border-0 flex justify-between items-start gap-2"
                    >
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{n.note}</p>
                      <button
                        onClick={(e) => handleDelete(e, n._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};


const ProgressCaseModal = ({ patientId, organizationId, comparison, onClose, onSuccess, defaultDoctorName, defaultAppointmentId }) => {
  const [loading, setLoading] = useState(false);
  const [dragActiveBefore, setDragActiveBefore] = useState(false);
  const [dragActiveAfter, setDragActiveAfter] = useState(false);
  
  const [formData, setFormData] = useState({
    title: comparison?.title || '',
    treatmentArea: comparison?.treatmentArea || '',
    beforeNote: comparison?.beforeNote || '',
    afterNote: comparison?.afterNote || '',
    resultNote: comparison?.resultNote || '',
    doctorName: comparison?.doctorName || defaultDoctorName || '',
    appointmentId: comparison?.appointmentId || defaultAppointmentId || ''
  });

  // Track the base English version of notes for high-quality re-translations
  const [originalNotes, setOriginalNotes] = useState({
    beforeNote: comparison?.beforeNote || '',
    afterNote: comparison?.afterNote || '',
    resultNote: comparison?.resultNote || ''
  });

  const handleTranscript = (field, transcript) => {
    // transcript is already translated to English by VoiceInputButton
    setOriginalNotes(prev => ({ ...prev, [field]: (prev[field] + ' ' + transcript).trim() }));
    setFormData(prev => ({ ...prev, [field]: (prev[field] + ' ' + transcript).trim() }));
  };

  const handleTranslation = (field, translatedText) => {
    setFormData(prev => ({ ...prev, [field]: translatedText }));
  };

  const handleResetTranslation = (field) => {
    setFormData(prev => ({ ...prev, [field]: originalNotes[field] }));
  };

  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState(comparison?.beforeSignedUrl || null);
  const [afterPreview, setAfterPreview] = useState(comparison?.afterSignedUrl || null);

  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleDrag = (e, setDragActive) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e, setFile, setPreview, setDragActive) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!formData.title) return toast.error('Please enter a case title');
    
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (beforeFile) data.append('beforeImage', beforeFile);
      if (afterFile) data.append('afterImage', afterFile);

      if (comparison) {
        await patientProgressComparisonApi.update(patientId, comparison._id, data);
        toast.success('Treatment case updated');
      } else {
        await patientProgressComparisonApi.create(patientId, data);
        toast.success('New treatment case created');
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save treatment case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-medium text-slate-800">{comparison ? 'Edit Treatment Case' : 'New Clinical Treatment Case'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-md transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Case Title / Treatment Name</label>
              <div className="relative group">
                <input 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Facial Rejuvenation Cycle 1"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-slate-900 outline-none transition-all pr-12"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <SavedNotesManager 
                    value={formData.title}
                    onSelect={text => setFormData(prev => ({ ...prev, title: text }))}
                    fieldType="title"
                    organizationId={organizationId}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Treatment Area / Category</label>
              <div className="relative group">
                <input 
                  value={formData.treatmentArea}
                  onChange={e => setFormData({...formData, treatmentArea: e.target.value})}
                  placeholder="e.g., Dermatology, Aesthetics"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-slate-900 outline-none transition-all pr-12"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <SavedNotesManager 
                    value={formData.treatmentArea}
                    onSelect={text => setFormData(prev => ({ ...prev, treatmentArea: text }))}
                    fieldType="area"
                    organizationId={organizationId}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Treating Doctor</label>
              <input 
                value={formData.doctorName}
                onChange={e => setFormData({...formData, doctorName: e.target.value})}
                placeholder="Doctor's Name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-slate-900 outline-none transition-all font-bold text-indigo-600"
              />
            </div>
          </div>

          {/* Image Sections */}
          <div className="grid grid-cols-2 gap-8">
            {/* Before Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-1">
                <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-medium uppercase tracking-widest rounded-sm">Before Treatment</span>
                <div className="flex items-center gap-2">
                  <LanguageTranslator 
                    text={originalNotes.beforeNote} 
                    onTranslated={text => handleTranslation('beforeNote', text)} 
                    onReset={() => handleResetTranslation('beforeNote')}
                  />
                </div>
              </div>
              <div 
                className={`relative h-64 border-2 border-dashed rounded-md flex flex-col items-center justify-center overflow-hidden transition-all ${dragActiveBefore ? 'bg-slate-50 border-slate-900' : 'bg-slate-50/50 border-slate-200'}`}
                onDragEnter={e => handleDrag(e, setDragActiveBefore)}
                onDragLeave={e => handleDrag(e, setDragActiveBefore)}
                onDragOver={e => handleDrag(e, setDragActiveBefore)}
                onDrop={e => handleDrop(e, setBeforeFile, setBeforePreview, setDragActiveBefore)}
              >
                {beforePreview ? (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <img src={beforePreview} className="max-w-full max-h-full object-contain" alt="Before" />
                    <button 
                      onClick={() => { setBeforeFile(null); setBeforePreview(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 shadow-sm rounded-md text-rose-600 hover:bg-white z-10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <Camera size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500">Drag & Drop or click to upload</p>
                    <input type="file" onChange={e => handleFileChange(e, setBeforeFile, setBeforePreview)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                  </div>
                )}
              </div>
              <div className="relative group">
                <textarea 
                  placeholder="Initial condition notes..."
                  value={formData.beforeNote}
                  onChange={e => {
                    setFormData({...formData, beforeNote: e.target.value});
                    setOriginalNotes({...originalNotes, beforeNote: e.target.value});
                  }}
                  rows="3"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-slate-900 outline-none resize-none pr-12"
                />
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  <SavedNotesManager 
                    value={formData.beforeNote}
                    onSelect={text => {
                      setFormData(prev => ({ ...prev, beforeNote: text }));
                      setOriginalNotes(prev => ({ ...prev, beforeNote: text }));
                    }}
                    fieldType="before"
                    organizationId={organizationId}
                  />
                </div>
                <VoiceInputButton 
                  onTranscript={text => handleTranscript('beforeNote', text)}
                  className="absolute bottom-2 right-2"
                />
              </div>
            </div>

            {/* After Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-1">
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-medium uppercase tracking-widest rounded-sm">After Treatment</span>
                <div className="flex items-center gap-2">
                  <LanguageTranslator 
                    text={originalNotes.afterNote} 
                    onTranslated={text => handleTranslation('afterNote', text)} 
                    onReset={() => handleResetTranslation('afterNote')}
                  />
                </div>
              </div>
              <div 
                className={`relative h-64 border-2 border-dashed rounded-md flex flex-col items-center justify-center overflow-hidden transition-all ${dragActiveAfter ? 'bg-slate-50 border-slate-900' : 'bg-slate-50/50 border-slate-200'}`}
                onDragEnter={e => handleDrag(e, setDragActiveAfter)}
                onDragLeave={e => handleDrag(e, setDragActiveAfter)}
                onDragOver={e => handleDrag(e, setDragActiveAfter)}
                onDrop={e => handleDrop(e, setAfterFile, setAfterPreview, setDragActiveAfter)}
              >
                {afterPreview ? (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <img src={afterPreview} className="max-w-full max-h-full object-contain" alt="After" />
                    <button 
                      onClick={() => { setAfterFile(null); setAfterPreview(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 shadow-sm rounded-md text-rose-600 hover:bg-white z-10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <Camera size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500">Drag & Drop or click to upload</p>
                    <input type="file" onChange={e => handleFileChange(e, setAfterFile, setAfterPreview)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                  </div>
                )}
              </div>
              <div className="relative group">
                <textarea 
                  placeholder="Post-treatment observation notes..."
                  value={formData.afterNote}
                  onChange={e => {
                    setFormData({...formData, afterNote: e.target.value});
                    setOriginalNotes({...originalNotes, afterNote: e.target.value});
                  }}
                  rows="3"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-slate-900 outline-none resize-none pr-12"
                />
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  <SavedNotesManager 
                    value={formData.afterNote}
                    onSelect={text => {
                      setFormData(prev => ({ ...prev, afterNote: text }));
                      setOriginalNotes(prev => ({ ...prev, afterNote: text }));
                    }}
                    fieldType="after"
                    organizationId={organizationId}
                  />
                </div>
                <VoiceInputButton 
                  onTranscript={text => handleTranscript('afterNote', text)}
                  className="absolute bottom-2 right-2"
                />
              </div>
            </div>
          </div>

          {/* Final Result Note */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Final Clinical Outcome / Summary</label>
              <div className="flex items-center gap-2">
                <LanguageTranslator 
                  text={originalNotes.resultNote} 
                  onTranslated={text => handleTranslation('resultNote', text)} 
                  onReset={() => handleResetTranslation('resultNote')}
                />
              </div>
            </div>
            <div className="relative group">
              <textarea 
                placeholder="Enter the overall result and doctor's final observations..."
                value={formData.resultNote}
                onChange={e => {
                  setFormData({...formData, resultNote: e.target.value});
                  setOriginalNotes({...originalNotes, resultNote: e.target.value});
                }}
                rows="4"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-slate-900 outline-none resize-none pr-14"
              />
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                <SavedNotesManager 
                  value={formData.resultNote}
                  onSelect={text => {
                    setFormData(prev => ({ ...prev, resultNote: text }));
                    setOriginalNotes(prev => ({ ...prev, resultNote: text }));
                  }}
                  fieldType="general"
                  organizationId={organizationId}
                />
              </div>
              <VoiceInputButton 
                onTranscript={text => handleTranscript('resultNote', text)}
                className="absolute bottom-3 right-3"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-md transition-all">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="px-8 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-black rounded-md transition-all shadow-sm flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : comparison ? 'Update Clinical Case' : 'Save Treatment Case'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ProgressImageEditModal = ({ patientId, image, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: image.title || '',
    notes: image.notes || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await patientProgressImageApi.update(patientId, image._id, formData);
      toast.success('Image details updated');
      onSuccess();
    } catch (error) {
      toast.error('Failed to update image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-sm font-medium text-slate-800">Edit Image Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-md transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Image Title</label>
            <input 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Clinical Notes</label>
            <textarea 
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              rows="4"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-slate-900 resize-none"
            />
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-black transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Update Record'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ProgressImageViewModal = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-medium text-slate-800">{image.title || 'Clinical Image'}</h3>
            <p className="text-[10px] text-slate-500">{new Date(image.createdAt).toLocaleDateString()} at {new Date(image.createdAt).toLocaleTimeString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.open(image.signedUrl, '_blank')}
              className="p-2 hover:bg-slate-200 rounded-md transition-colors text-slate-600"
              title="Download Image"
            >
              <Download size={18} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-md transition-colors"><X size={20} /></button>
          </div>
        </div>
        <div className="bg-slate-900 flex items-center justify-center min-h-[400px] max-h-[70vh]">
          <img src={image.signedUrl} alt={image.title} className="max-w-full max-h-full object-contain" />
        </div>
        {image.notes && (
          <div className="p-6 bg-white border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Clinical Notes</p>
            <p className="text-sm text-slate-700 leading-relaxed">{image.notes}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const ProgressComparisonViewModal = ({ comparison, patientName, onClose, onPrint }) => {
  const [loading, setLoading] = useState(false);
  if (!comparison) return null;

  const handlePrint = () => {
    onPrint();
    setTimeout(() => {
      window.print();
    }, 300);
  };


  const handleEmail = () => {
    const subject = `Clinical Treatment Progress - ${patientName}`;
    const body = `Case: ${comparison.title}\nArea: ${comparison.treatmentArea}\nObservations: ${comparison.resultNote}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleDownload = async () => {
    let toastId;
    try {
      setLoading(true);
      toastId = toast.loading('Generating clinical report PDF...');
      
      const data = await patientProgressComparisonApi.generatePdf(comparison.patientId, comparison._id);

      if (data.success && data.url) {
        toast.update(toastId, { 
          render: "Report generated successfully", 
          type: "success", 
          isLoading: false, 
          autoClose: 3000 
        });
        window.open(data.url, '_blank');
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (err) {
      console.error('Download failed:', err);
      if (toastId) {
        toast.update(toastId, { 
          render: "Failed to generate report PDF", 
          type: "error", 
          isLoading: false, 
          autoClose: 3000 
        });
      } else {
        toast.error('Failed to generate report PDF');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md print:hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-[90vh]"
        >
          {/* Toolbar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-md transition-colors"><X size={20} /></button>
              <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
              <div>
                <h3 className="text-sm font-medium text-slate-900">{comparison.title}</h3>
                <p className="text-[10px] text-slate-500 flex items-center gap-2">
                  <Calendar size={10} /> {new Date(comparison.createdAt).toLocaleDateString()}
                  <User size={10} className="ml-1" /> {comparison.doctorName || 'Dr. Assigned'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-xs font-medium transition-all"><Printer size={16} /> Print</button>
              <button 
                onClick={handleDownload} 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-xs font-medium transition-all disabled:opacity-50"
              >
                {loading ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> : <Download size={16} />} 
                Download
              </button>
              <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
              <button onClick={handleEmail} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-all" title="Share via Email"><Mail size={20} /></button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-2 gap-8 h-full min-h-[500px]">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Baseline / Before</span>
                  <Clock size={12} className="text-slate-300" />
                </div>
                <div className="flex-1 rounded-md overflow-hidden bg-slate-900 flex items-center justify-center">
                  <img src={comparison.beforeSignedUrl} className="w-full h-full object-contain" alt="Before" />
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-md italic text-sm text-slate-600">
                  "{comparison.beforeNote || 'No baseline notes recorded.'}"
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Progress / After</span>
                  <Clock size={12} className="text-slate-300" />
                </div>
                <div className="flex-1 rounded-md overflow-hidden bg-slate-900 flex items-center justify-center">
                  <img src={comparison.afterSignedUrl} className="w-full h-full object-contain" alt="After" />
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-md italic text-sm text-slate-600">
                  "{comparison.afterNote || 'No progress notes recorded.'}"
                </div>
              </div>
            </div>

            <div className="mt-12 p-8 bg-slate-900 text-white rounded-md relative overflow-hidden shadow-xl">
              <div className="relative z-10">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Clinical Observations & Outcome</h4>
                <p className="text-lg leading-relaxed font-light">{comparison.resultNote || 'No final outcome notes recorded for this case.'}</p>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

/* --------------------------------------------------
Clinical Notes Tab Components
-------------------------------------------------- */

const ClinicalNoteCard = ({ note, onEdit, onDelete, canSeeInternal }) => {
  const isHighPriority = note.priority === 'high';
  const showPrivate = canSeeInternal && (note.visibility === 'internal' || note.visibility === 'both') && note.privateNote;

  const getTypeColor = (type) => {
    switch (type) {
      case 'diagnosis': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'treatment': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'follow_up': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'observation': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'internal': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border-2 rounded-2xl p-6 transition-all hover:shadow-lg ${isHighPriority ? 'border-rose-200 shadow-rose-50' : 'border-slate-100 hover:border-slate-200'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${getTypeColor(note.noteType)}`}>
            {note.noteType?.replace('_', ' ')}
          </div>
          {isHighPriority && (
            <div className="flex items-center gap-1 text-rose-600">
              <AlertCircle size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">High Priority</span>
            </div>
          )}
          {note.visibility === 'internal' && (
            <div className="flex items-center gap-1 text-slate-400">
              <Shield size={12} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Internal Only</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(note)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
          <button onClick={() => onDelete(note._id)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>

      {note.title && <h4 className="text-base font-bold text-slate-800 mb-2">{note.title}</h4>}
      
      <div className="space-y-4">
        <div className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-50">
          {note.note}
        </div>

        {showPrivate && (
          <div className="bg-amber-50/30 border border-amber-100/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2 text-amber-700">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Private Clinical Observations</span>
            </div>
            <p className="text-sm text-slate-700 italic leading-relaxed">
              {note.privateNote}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-slate-50 text-[11px] font-medium text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
            {note.createdBy?.firstName?.[0] || 'U'}
          </div>
          <span>By {note.createdBy?.firstName} {note.createdBy?.lastName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <History size={12} />
          <span>{new Date(note.createdAt).toLocaleDateString()} at {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {note.followUpRequired && (
          <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            <CalendarIcon size={12} />
            <span>Follow-up: {new Date(note.followUpDate).toLocaleDateString()}</span>
          </div>
        )}
        {note.tags?.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            {note.tags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100 text-[9px] uppercase tracking-tighter">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const NoteModal = ({ isOpen, onClose, onSave, note = null, patientId }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    noteType: 'general',
    note: '',
    privateNote: '',
    visibility: 'clinical',
    priority: 'medium',
    followUpRequired: false,
    followUpDate: '',
    tags: ''
  });

  useEffect(() => {
    if (note) {
      setFormData({
        ...note,
        followUpDate: note.followUpDate ? new Date(note.followUpDate).toISOString().split('T')[0] : '',
        tags: note.tags?.join(', ') || ''
      });
    } else {
      setFormData({
        title: '',
        noteType: 'general',
        note: '',
        privateNote: '',
        visibility: 'clinical',
        priority: 'medium',
        followUpRequired: false,
        followUpDate: '',
        tags: ''
      });
    }
  }, [note, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.note) return toast.error('Note content is required');
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      
      if (note) {
        await clinicalNoteApi.update(patientId, note._id, payload);
        toast.success('Clinical note updated');
      } else {
        await clinicalNoteApi.create(patientId, payload);
        toast.success('Clinical note added');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error('Failed to save clinical note');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{note ? 'Edit Clinical Note' : 'Add New Clinical Note'}</h3>
            <p className="text-xs text-slate-400 mt-1">Detailed documentation for patient treatment</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20} className="text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Note Title</label>
              <input 
                type="text"
                placeholder="e.g., Initial Diagnosis, Surgery Notes..."
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Note Type</label>
              <select 
                value={formData.noteType}
                onChange={e => setFormData({...formData, noteType: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-600"
              >
                <option value="general">General</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="treatment">Treatment</option>
                <option value="follow_up">Follow-up</option>
                <option value="observation">Observation</option>
                <option value="complaint">Complaint</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clinical Note Content</label>
              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">Required</span>
            </div>
            <div className="relative">
              <textarea 
                rows="4"
                placeholder="Write clinical observations, symptoms, findings..."
                value={formData.note}
                onChange={e => setFormData({...formData, note: e.target.value})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[120px] resize-none pr-12"
              />
              <VoiceInputButton 
                onTranscript={text => setFormData(prev => ({...prev, note: (prev.note + ' ' + text).trim()}))}
                className="absolute bottom-4 right-4"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Shield size={12} /> Internal / Private Observation Note
            </label>
            <div className="relative">
              <textarea 
                rows="3"
                placeholder="Internal thoughts, sensitive observations (hidden from clinical report)..."
                value={formData.privateNote}
                onChange={e => setFormData({...formData, privateNote: e.target.value})}
                className="w-full px-5 py-4 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px] resize-none italic pr-12"
              />
              <VoiceInputButton 
                onTranscript={text => setFormData(prev => ({...prev, privateNote: (prev.privateNote + ' ' + text).trim()}))}
                className="absolute bottom-4 right-4"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Visibility</label>
              <select 
                value={formData.visibility}
                onChange={e => setFormData({...formData, visibility: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-600"
              >
                <option value="clinical">Clinical Report Only</option>
                <option value="internal">Internal Staff Only</option>
                <option value="both">Both (Clinical + Internal)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Priority Level</label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({...formData, priority: p})}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                      formData.priority === p 
                        ? p === 'high' ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-200' : 
                          p === 'medium' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' :
                          'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div 
                onClick={() => setFormData({...formData, followUpRequired: !formData.followUpRequired})}
                className={`w-12 h-6 rounded-full transition-all cursor-pointer relative ${formData.followUpRequired ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.followUpRequired ? 'left-7' : 'left-1'}`}></div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Follow-up Required</p>
                <p className="text-[10px] text-slate-400">Mark if this case needs follow-up</p>
              </div>
            </div>
            {formData.followUpRequired && (
              <input 
                type="date"
                value={formData.followUpDate}
                onChange={e => setFormData({...formData, followUpDate: e.target.value})}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tags (Comma separated)</label>
            <input 
              type="text"
              placeholder="e.g., critical, review-needed, surgery-prep"
              value={formData.tags}
              onChange={e => setFormData({...formData, tags: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
            />
          </div>
        </form>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-700">Cancel</button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {note ? 'Update Note' : 'Save Clinical Note'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const TabClinicalNotes = ({ patientId, user }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ type: '', priority: '', followUp: false });

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await clinicalNoteApi.list(patientId, filters);
      setNotes(data.notes || []);
    } catch (err) {
      toast.error('Failed to load clinical notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [patientId, filters]);

  const handleDelete = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this clinical note?')) return;
    try {
      await clinicalNoteApi.delete(patientId, noteId);
      toast.success('Note deleted');
      fetchNotes();
    } catch (err) {
      toast.error('Failed to delete note');
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const summary = {
    total: notes.length,
    highPriority: notes.filter(n => n.priority === 'high').length,
    followUp: notes.filter(n => n.followUpRequired).length,
    lastNote: notes[0]?.createdAt ? new Date(notes[0].createdAt).toLocaleDateString() : 'None'
  };

  const canSeeInternal = ['admin', 'doctor', 'superadmin'].includes(user?.role);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Notes', value: summary.total, icon: StickyNote, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Follow-ups', value: summary.followUp, icon: CalendarIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'High Priority', value: summary.highPriority, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Last Note', value: summary.lastNote, icon: History, color: 'text-slate-600', bg: 'bg-slate-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl`}><stat.icon size={22} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by title, notes, or tags..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <Filter size={14} className="text-slate-400" />
              <select 
                value={filters.type}
                onChange={e => setFilters({...filters, type: e.target.value})}
                className="bg-transparent border-none text-xs font-bold text-slate-600 outline-none cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="treatment">Treatment</option>
                <option value="follow_up">Follow-up</option>
                <option value="observation">Observation</option>
                <option value="internal">Internal</option>
              </select>
            </div>
            <button 
              onClick={() => setFilters({...filters, followUp: !filters.followUp})}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-sm ${filters.followUp ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              Follow-up Required
            </button>
          </div>
        </div>
        <button 
          onClick={() => { setEditingNote(null); setShowModal(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-[1.25rem] text-sm font-bold hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
        >
          <Plus size={18} /> Add Clinical Note
        </button>
      </div>

      {/* Timeline/List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-slate-200 animate-spin" />
          <p className="text-slate-400 text-sm mt-4">Loading clinical history...</p>
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
          {filteredNotes.map(note => (
            <ClinicalNoteCard 
              key={note._id} 
              note={note} 
              canSeeInternal={canSeeInternal}
              onEdit={(n) => { setEditingNote(n); setShowModal(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
            <StickyNote size={40} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">No clinical notes found</h3>
            <p className="text-slate-400 text-sm mt-1">Start documenting patient treatment journeys</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="mt-2 px-6 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all"
          >
            Create First Note
          </button>
        </div>
      )}

      <NoteModal 
        isOpen={showModal} 
        onClose={() => { setShowModal(false); setEditingNote(null); }} 
        onSave={fetchNotes} 
        note={editingNote}
        patientId={patientId}
      />
    </div>
  );
};

/* --------------------------------------------------
Main Patient Profile Component
-------------------------------------------------- */

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const clinicInfo = user?.organization || user?.organizationId || {};
  const [data, setData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState("");
  const [printingStatement, setPrintingStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(new URLSearchParams(location.search).get('tab') || 'personal');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showInvoiceTemplateModal, setShowInvoiceTemplateModal] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState('');
  const [defaultTemplate, setDefaultTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [printingPrescription, setPrintingPrescription] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(null);
  const [invoiceTemplates, setInvoiceTemplates] = useState([]);
  const [selectedInvoiceTemplate, setSelectedInvoiceTemplate] = useState(null);
  const [orgDetails, setOrgDetails] = useState(null);
  const [pdfProgress, setPdfProgress] = useState({ isGenerating: false, percent: 0, prescriptionId: null });
  const [printingClinicalReport, setPrintingClinicalReport] = useState(null);
  const [editingPrescription, setEditingPrescription] = useState(null);

  const fetchTemplates = async () => {
    if (user) {
      try {
        const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null) || user?._id;
        const response = await prescriptionTemplateApi.list(orgId);
        if (response && response.templates) {
          setTemplates(response.templates);
          const def = response.templates.find(t => t.isDefault) || response.templates[0];
          setDefaultTemplate(def);
          setSelectedTemplate(def);
        }
      } catch (error) {
        console.error("Failed to fetch templates", error);
      }
    }
  };

  const fetchInvoiceTemplates = async () => {
    if (user) {
      try {
        const data = await invoiceTemplateApi.getAll();
        if (data) {
          setInvoiceTemplates(data);
          
          // Use previous selection if still valid, otherwise pick default
          setSelectedInvoiceTemplate(prev => {
            const stillValid = prev && data.find(t => t._id === prev._id);
            if (stillValid) return data.find(t => t._id === prev._id); // Update with fresh data
            return data.find(t => t.isDefault) || data[0];
          });
        }
      } catch (error) {
        console.error("Failed to fetch invoice templates", error);
      }
    }
  };

  // --- Session Sync (Exact copy from BillingDashboard) ---
  useEffect(() => {
    const syncSession = async () => {
      try {
        const data = await authApi.checkSession();
        if (data && data.user) {
          updateUser(data.user);
        }
      } catch (err) {
        console.warn('Session sync skipped:', err.message);
      }
    };

    const hasContactInfo = clinicInfo.email || clinicInfo.phone || clinicInfo.address;
    const isActuallyPopulated = typeof clinicInfo === 'object' && Object.keys(clinicInfo).length > 5;

    if (!hasContactInfo || !isActuallyPopulated) {
      syncSession();
    }
  }, []);

  const fetchOrgDetails = async () => {
    const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null);
    if (!orgId) return;
    try {
      const org = await organizationApi.getById(orgId);
      if (org) setOrgDetails(org);
    } catch (error) {
      console.error("Failed to fetch organization details", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTemplates();
      fetchInvoiceTemplates();
      fetchOrgDetails();
    }
  }, [user?.organizationId, user?.organization?._id]);

  useEffect(() => {
    if (printingPrescription) {
      setTimeout(() => {
        window.print();
      }, 300);
    }
  }, [printingPrescription]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintingPrescription(null);
      setPrintingInvoice(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleDownloadPDF = async (prescription) => {
    try {
      const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null);
      if (!orgId) {
        toast.error("Organization ID not found");
        return;
      }

      setPdfProgress({ isGenerating: true, percent: 0, prescriptionId: prescription.id });
      
      const progressInterval = setInterval(() => {
        setPdfProgress(prev => {
          if (prev.percent >= 90) return prev;
          const increment = Math.max(1, Math.floor((90 - prev.percent) / 5));
          return { ...prev, percent: prev.percent + increment };
        });
      }, 500);

      const pdfData = {
        organizationId: orgId,
        prescriptionData: prescription,
        patientData: {
          name: (() => {
            let name = data?.fullName || `${data?.firstName || ''} ${data?.lastName || ''}`.trim();
            // Clean redundant prefixes (e.g., "MR. MR.", "Dr. Dr.")
            const prefixes = ['MR', 'MS', 'MRS', 'MISS', 'DR', 'SHRI', 'SMT'];
            let parts = name.split(/\s+/);
            while (parts.length > 1) {
              const p0 = parts[0].toUpperCase().replace(/\./g, '');
              const p1 = parts[1].toUpperCase().replace(/\./g, '');
              if (prefixes.includes(p0) && (p0 === p1 || p1.startsWith(p0))) {
                parts.shift();
              } else {
                break;
              }
            }
            return parts.join(' ');
          })(),
          age: data?.age,
          gender: data?.gender
        },
        templateId: selectedTemplate ? selectedTemplate._id : 'system_default'
      };
      
      console.log("[PatientProfile] generatePdf called.");
      console.log("Selected Template in state:", selectedTemplate);
      console.log("pdfData being sent:", pdfData);

      const response = await prescriptionTemplateApi.generatePdf(pdfData);
      
      clearInterval(progressInterval);
      setPdfProgress(prev => ({ ...prev, percent: 100 }));
      
      if (response && response.url) {
        // Construct full URL pointing to the backend, or use directly if it's already an absolute URL (like S3)
        const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
        let fileUrl = response.url;
        if (!fileUrl.startsWith('http')) {
          fileUrl = fileUrl.startsWith('/') ? `${baseUrl}${fileUrl}` : `${baseUrl}/${fileUrl}`;
        }
        
        // Create a hidden link to trigger the download directly instead of opening a new tab
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = fileUrl;
          // The backend now sends Content-Disposition: attachment for PDFs, which forces the download
          a.setAttribute('download', 'prescription.pdf'); 
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setPdfProgress({ isGenerating: false, percent: 0, prescriptionId: null });
        }, 500);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      setPdfProgress({ isGenerating: false, percent: 0, prescriptionId: null });
      console.error("PDF Download Error:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handlePrescriptionWhatsApp = async (prescription) => {
    if (!data.mobile && !data.phone) {
      toast.warning("Patient phone number is missing.");
      return;
    }
    
    const toastId = toast.loading("Sending Prescription via WhatsApp...");
    
    try {
      const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null);
      
      await whatsappApi.sendPrescriptionPdf({
        phone: data.mobile || data.phone,
        patientId: data.patientId,
        prescriptionData: prescription.notes,
        doctorName: prescription.doctorName,
        doctorQualification: prescription.qualification,
        doctorSpecialization: prescription.specialty,
        templateId: selectedTemplate?._id || 'default',
        organizationId: orgId
      });
      
      toast.update(toastId, {
        render: "Prescription sent via WhatsApp successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
    } catch (error) {
      console.error("WhatsApp Prescription Error:", error);
      toast.update(toastId, {
        render: error.response?.data?.message || "Failed to send WhatsApp prescription.",
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
    }
  };

  const handleEmail = async (p) => {
    if (!data.email) {
      toast.warning("Please provide patient's email first in Personal Info.");
      setActiveTab('personal');
      return;
    }
    try {
      toast.info("Sending email...");
      const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null);
      
      await emailApi.sendPrescription({
        email: data.email,
        patientName: data.fullName || `${data.firstName} ${data.lastName}`,
        patientId: data.patientId,
        notes: p.notes,
        doctorName: p.doctorName,
        doctorQualification: p.qualification,
        doctorSpecialization: p.specialty,
        clinicName: orgDetails?.name || user?.organization?.name || user?.clinicName || "Oviaan Clinic",
        organizationId: orgId,
        useTemplate: true,
        templateId: selectedTemplate?._id
      });
      toast.success("Prescription with branded PDF sent to email successfully!");
    } catch (error) {
      console.error("Email Error:", error);
      toast.error("Failed to send email. Please check configuration.");
    }
  };

  const handlePrint = async (p) => {
    try {
      if (p.doctorId) {
        const doctor = await centralDoctorApi.getById(p.doctorId);
        if (doctor) {
          p.qualification = doctor.qualification || p.qualification;
          p.specialty = doctor.specialization || p.specialty || doctor.specialty;
          if (doctor.name) p.doctorName = doctor.name;
        }
      }
    } catch (error) {
      console.error("Failed to fetch doctor details for print", error);
    }
    setPrintingPrescription(p);
  };

  const handleEditPrescription = (p) => {
    setEditingPrescription(p);
    setShowPrescriptionModal(true);
  };

  const tabs = [
    { key: 'personal', name: 'Personal Info', icon: User },
    { key: 'prescriptions', name: 'Prescriptions', icon: Pill },
    { key: 'appointments', name: 'Appointments', icon: CalendarIcon },
    { key: 'billing', name: 'Billing', icon: IndianRupee },
    { key: 'progress', name: 'Progress Gallery', icon: Camera },
    { key: 'follow-ups', name: 'Follow-ups', icon: Bell },
    { key: 'clinical-notes', name: 'Clinical Notes', icon: StickyNote }
  ].filter(tab => {
    if (user?.role === 'receptionist') {
      return ['personal', 'appointments', 'follow-ups'].includes(tab.key);
    }
    return true;
  });

  useEffect(() => {
    if (user?.role === 'receptionist' && activeTab && !['personal', 'appointments'].includes(activeTab)) {
      setActiveTab('personal');
    }
  }, [user?.role, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') !== activeTab) {
      params.set('tab', activeTab);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [activeTab]);

  const handleBillingDownload = async (bill) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadFileName(`Invoice-${bill.invoiceNumber || bill.billId}.pdf`);
    
    // Simulate generation progress
    const timer = setInterval(() => {
      setDownloadProgress(prev => (prev < 90 ? prev + Math.floor(Math.random() * 15) + 5 : prev));
    }, 400);

    try {
      const response = await billingApi.downloadPDF(bill._id, true, selectedInvoiceTemplate?._id);
      clearInterval(timer);
      setDownloadProgress(100);
      
      if (response && response.url) {
        // Use a hidden iframe or link for more reliable download of S3 presigned URLs
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = response.url;
          link.target = "_blank"; // Safety for some browsers
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setIsDownloading(false);
          toast.success("Download started!");
        }, 500);
      } else {
        setIsDownloading(false);
        toast.warning("Could not retrieve PDF for this invoice.");
      }
    } catch (error) {
      clearInterval(timer);
      setIsDownloading(false);
      console.error("PDF download error:", error);
      toast.error("Failed to prepare download. Please check your internet or try again.");
    }
  };

  const handleBillingPrint = (bill) => {
    setPrintingInvoice(bill);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const patientData = await patientApi.getById(id);
      setData(patientData);
      const summaryResponse = await appointmentApi.getSummary(id);
      setAppointments(summaryResponse);
      const records = await medicalRecordApi.getByPatient(id);
      setMedicalRecords(records);
    } catch (error) {
      console.error('Error fetching patient profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleGoBack = () => {
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin-dashboard?tab=Patients');
    } else {
      navigate('/receptionist/patients');
    }
  };

  const handleRebook = (appt) => {
    const rebookData = {
      patientId: data.patientId,
      patientName: data.fullName || `${data.firstName} ${data.lastName}`,
      firstName: data.firstName || data.fullName?.split(' ')[0] || '',
      lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
      patientPhone: data.mobile || data.phone || data.contactNumber || data.contact || '',
      patientEmail: data.email || '',
      gender: data.gender,
      patientAge: data.age,
      ageType: data.ageType || 'Year',
      doctorId: appt.doctorId,
      doctorName: appt.doctorName,
      specialty: appt.specialty,
      reason: appt.reason,
      patient: data
    };
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin-dashboard', { state: { activeTab: 'Calendar View', rebookData } });
    } else {
      navigate('/receptionist/new-appointment', { state: { rebookData } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
          />
          <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="min-h-screen bg-[#f8fafc] font-sans print:hidden flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full lg:w-40 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-40">
          {/* Sidebar Header: Patient Info */}
          <div className="p-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={handleGoBack} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100">
                <ArrowLeft size={14} />
              </button>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Patient Profile</div>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-2.5">
                <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center border-2 border-white shadow-md shadow-slate-200/50">
                  <User size={24} className="text-slate-400" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>

              <h1 className="text-[14px] font-bold text-slate-900 leading-tight px-1">
                {(() => {
                  const fullName = (data.fullName || `${data.firstName || ''} ${data.lastName || ''}`).trim();
                  return fullName.replace(/\b(MR|MS|MRS|DR|SHRI|SMT)\.?\s+\1\.?\b/gi, '$1.');
                })()}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-bold rounded uppercase tracking-wider">
                  ID: {data.patientId}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Age / Y</div>
                <div className="text-[11px] font-bold text-slate-700">
                  {data.age || 'N/A'} <span className="text-[8px] text-slate-400">{data.ageType || 'Y'}</span>
                </div>
              </div>
              <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Gender</div>
                <div className="text-[11px] font-bold text-slate-700">{data.gender || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex-1 overflow-y-auto custom-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-medium transition-all duration-200 border-b border-slate-50 group relative ${activeTab === tab.key
                  ? 'bg-indigo-50/50 text-indigo-700 border-l-4 border-l-indigo-600'
                  : 'text-slate-500 hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
              >
                <tab.icon size={14} className={`${activeTab === tab.key ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-400'} transition-colors`} />
                <span className="flex-1 text-left uppercase tracking-wider">{tab.name}</span>
              </button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/20 shrink-0">
            <button
              onClick={() => setShowEditModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Edit2 size={14} /> Edit Profile
            </button>
          </div>
        </aside>


        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen max-h-screen overflow-hidden bg-[#f8fafc]">
          {/* Top Header */}
          <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-30">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight capitalize">
                {activeTab === 'progress' ? 'Treatment Gallery' : tabs.find(t => t.key === activeTab)?.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Active Patient Record Session</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden xl:flex flex-col items-end">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Primary Contact</div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Phone size={14} className="text-indigo-500" />
                  {data.contactNumber || data.mobile || 'N/A'}
                </div>
              </div>
              
              <div className="h-10 w-[1px] bg-slate-200 hidden xl:block"></div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFollowUpModal(true)}
                  className="flex items-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-100 text-slate-700 rounded-[1.25rem] text-sm font-bold hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                >
                  <Bell size={16} className="text-indigo-600" />
                  Add Follow-up
                </button>
                <button
                  onClick={() => handleRebook({ doctorId: data.assignedDoctorId, doctorName: data.assignedDoctor, specialty: 'General' })}
                  className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-[1.25rem] text-sm font-bold hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 hover:shadow-indigo-100 group"
                >
                  <CalendarIcon size={16} className="group-hover:rotate-12 transition-transform" />
                  New Appointment
                </button>
              </div>
            </div>
          </header>

          {/* Tab Content Area */}
          <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-[1400px] mx-auto pb-20"
              >
                {activeTab === 'personal' && <TabPersonalInfo data={data} appointments={appointments} onEdit={() => setShowEditModal(true)} onRebook={() => handleRebook({ doctorId: data.assignedDoctorId, doctorName: data.assignedDoctor, specialty: 'General' })} user={user} />}

                {activeTab === 'prescriptions' && (
                  <TabPrescriptions
                    appointments={appointments}
                    medicalRecords={medicalRecords}
                    onEmail={handleEmail}
                    onWhatsApp={handlePrescriptionWhatsApp}
                    onPrint={handlePrint}
                    onDownload={handleDownloadPDF}
                    onEdit={handleEditPrescription}
                    onNewPrescription={() => { setEditingPrescription(null); setShowPrescriptionModal(true); }}
                    onOpenTemplateModal={() => setShowTemplateModal(true)}
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                    pdfProgress={pdfProgress}
                  />
                )}
                {activeTab === 'appointments' && <TabAppointments appointments={appointments} onRebook={handleRebook} />}
                {activeTab === 'billing' && (
                  <TabBilling
                    patient={data}
                    onPrint={handleBillingPrint}
                    onDownload={handleBillingDownload}
                    clinicInfo={clinicInfo}
                    setIsDownloading={setIsDownloading}
                    setDownloadProgress={setDownloadProgress}
                    setDownloadFileName={setDownloadFileName}
                    invoiceTemplates={invoiceTemplates}
                    selectedInvoiceTemplate={selectedInvoiceTemplate}
                    setSelectedInvoiceTemplate={setSelectedInvoiceTemplate}
                    onOpenTemplateModal={() => setShowInvoiceTemplateModal(true)}
                  />
                )}
                {activeTab === 'progress' && (
                  <TabProgressGallery
                    patientId={id}
                    user={user}
                    patientName={data.fullName || `${data.firstName} ${data.lastName}`}
                    appointments={appointments}
                    onPrintReport={(comp) => setPrintingClinicalReport(comp)}
                  />
                )}
                {activeTab === 'follow-ups' && (
                  <TabFollowUps 
                    patient={data}
                    user={user}
                  />
                )}
                {activeTab === 'clinical-notes' && (
                  <TabClinicalNotes
                    patientId={id}
                    user={user}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

        {showEditModal && <EditProfileModal data={data} onClose={() => setShowEditModal(false)} onSave={(updated) => setData(prev => ({ ...prev, ...updated }))} />}
        <PrescriptionModal 
          isOpen={showPrescriptionModal} 
          onClose={() => { setShowPrescriptionModal(false); setEditingPrescription(null); }} 
          patient={data} 
          onSaveSuccess={() => { fetchData(false); setEditingPrescription(null); }} 
          editData={editingPrescription}
        />
        <TemplateModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} onSaveSuccess={fetchTemplates} />
        {showFollowUpModal && (
          <AddFollowUpReminderModal 
            isOpen={showFollowUpModal}
            onClose={() => setShowFollowUpModal(false)}
            onSuccess={() => {
              setShowFollowUpModal(false);
              fetchData(false);
            }}
            patient={data}
          />
        )}
        <InvoiceTemplateModal 
          isOpen={showInvoiceTemplateModal} 
          onClose={() => setShowInvoiceTemplateModal(false)} 
          onSaveSuccess={fetchInvoiceTemplates} 
          onApply={(template) => setSelectedInvoiceTemplate(template)}
        />
        
        {isDownloading && <DownloadProgressModal progress={downloadProgress} fileName={downloadFileName} />}
        
        {printingStatement && (
          <div id="statement-print-area" className="hidden-print">
            <PrintableStatement 
              bills={printingStatement.bills}
              patient={printingStatement.patient}
              clinicInfo={clinicInfo}
            />
          </div>
        )}

      {printingPrescription && (
        <div id="prescription-print-area" className="hidden-print">
          <PrintablePrescription
            template={selectedTemplate}
            prescription={printingPrescription}
            patient={data}
            clinicName={orgDetails?.name || user?.organization?.name || user?.clinicName}
            clinicContact={orgDetails?.phone || user?.organization?.phone || user?.phone}
            clinicEmail={orgDetails?.email || user?.organization?.email || user?.email}
            clinicAddress={
              (() => {
                const addr = orgDetails?.address || user?.organization?.address || user?.organizationId?.address || {};
                const parts = [addr.street, addr.city, addr.state, addr.zipCode || addr.zip].filter(p => p && String(p).trim() !== '');
                return parts.join(', ');
              })()
            }
            clinicLogo={orgDetails?.branding?.logo || orgDetails?.logo || user?.organization?.branding?.logo || user?.organization?.logo}
          />
        </div>
      )}

      {printingInvoice && (
        <div id="invoice-print-area" className="hidden-print">
          {(() => {
            const totals = printingInvoice.billType === 'Pharmacy' ? normalizePharmacyInvoice(printingInvoice) : calculateInvoiceTotals(printingInvoice);
            
            // Safety parse metadata if it comes as a string from the API
            let templateMetadata = selectedInvoiceTemplate?.metadata || {};
            if (typeof templateMetadata === 'string') {
              try {
                templateMetadata = JSON.parse(templateMetadata);
              } catch (e) {
                templateMetadata = {};
              }
            }

            return (printingInvoice.billType === 'Pharmacy') ? (
              <OviaanDefaultPharmacyInvoiceTemplate 
                clinicData={{
                  headerType: selectedInvoiceTemplate?.headerType || 'default',
                  headerImage: (selectedInvoiceTemplate?.headerType === 'custom' && selectedInvoiceTemplate?.headerImage) ? getImageUrl(selectedInvoiceTemplate.headerImage) : null,
                  logo: (selectedInvoiceTemplate?.headerType === 'custom' && selectedInvoiceTemplate?.headerImage) 
                    ? getImageUrl(selectedInvoiceTemplate.headerImage) 
                    : getImageUrl(orgDetails?.branding?.logo || orgDetails?.logo || user?.organization?.branding?.logo || user?.organization?.logo),
                  name: orgDetails?.name || clinicInfo?.name || user?.organization?.name || "Clinic Name",
                  address: (() => {
                    const addr = orgDetails?.address || user?.organization?.address || user?.organizationId?.address || {};
                    if (typeof addr === 'string') return addr;
                    const parts = [addr.street, addr.city, addr.state, addr.zipCode || addr.pincode || addr.zip].filter(p => p && String(p).trim() !== '');
                    const finalAddr = parts.length > 0 ? parts.join(', ') : (clinicInfo?.address || user?.clinicAddress || null);
                    return finalAddr && finalAddr.trim() !== '' ? finalAddr : null;
                  })(),
                  email: orgDetails?.email || clinicInfo?.email || user?.organization?.email || "Clinic Email",
                  phone: orgDetails?.phone || clinicInfo?.phone || user?.organization?.phone || "Clinic Phone",
                  gstNumber: (templateMetadata?.showGst !== false) ? (templateMetadata?.gstNumber || orgDetails?.gstNumber || user?.organization?.gstNumber || '') : '',
                  showGst: templateMetadata?.showGst !== undefined ? templateMetadata.showGst : true,
                  doctorSignature: (selectedInvoiceTemplate?.footerType === 'custom' && selectedInvoiceTemplate?.footerImage) 
                    ? getImageUrl(selectedInvoiceTemplate.footerImage) 
                    : getImageUrl(orgDetails?.doctorSignature || user?.organization?.doctorSignature)
                }}
                billData={{
                  patientName: (data.fullName || `${data.firstName || ''} ${data.lastName || ''}`).trim().replace(/\b(MR|MS|MRS|DR|SHRI|SMT)\.?\s+\1\.?\b/gi, '$1.'),
                  age: data.age || '',
                  gender: data.gender || '',
                  doctorName: printingInvoice.doctorName || 'N/A',
                  patientAddress: data.address?.city || 'N/A',
                  billDate: format(new Date(printingInvoice.date || printingInvoice.createdAt), 'dd/MM/yyyy'),
                  billNo: printingInvoice.invoiceNumber || printingInvoice.billId,
                  paymentMode: printingInvoice.paymentMethod || 'cash',
                  cardNo: printingInvoice.transactionId || '',
                  totalAmount: totals.grossAmount,
                  discountAmount: totals.discountAmount,
                  taxAmount: totals.taxAmount,
                  taxValue: totals.taxValue,
                  netAmount: totals.grandTotal,
                  paidAmount: totals.paidAmount,
                  balanceAmount: totals.dueAmount,
                  amountInWords: printingInvoice.amountInWords || '',
                  medicines: printingInvoice.items || []
                }}
              />
            ) : (
              <InvoiceTemplate 
                clinicInfo={clinicInfo}
                template={selectedInvoiceTemplate || invoiceTemplates.find(t => t.isDefault) || invoiceTemplates[0]}
                invoiceData={{
                  billId: printingInvoice.invoiceNumber || printingInvoice.billId,
                  date: printingInvoice.date || printingInvoice.createdAt,
                  patientName: (data.fullName || `${data.firstName || ''} ${data.lastName || ''}`).trim().replace(/\b(MR|MS|MRS|DR|SHRI|SMT)\.?\s+\1\.?\b/gi, '$1.'),
                  patientId: data.patientId,
                  doctorName: printingInvoice.doctorName || 'N/A',
                  items: (printingInvoice.items && printingInvoice.items.length > 0)
                    ? printingInvoice.items.map(i => ({ 
                        description: i.description, 
                        price: parseFloat(i.unitPrice || i.price || i.rate || 0),
                        quantity: parseInt(i.qty || i.quantity || 1)
                      }))
                    : [
                        { description: 'Consultation Fee', price: totals.grossAmount, quantity: 1 }
                      ],
                  subtotal: totals.grossAmount,
                  discount: totals.discountAmount,
                  taxRate: totals.taxValue,
                  taxAmount: totals.taxAmount,
                  total: totals.grandTotal,
                  notes: printingInvoice.notes || '',
                  paymentMethod: printingInvoice.paymentMethod || 'N/A',
                  status: printingInvoice.status
                }}
              />
            );
          })()}
        </div>
      )}

      {printingClinicalReport && (
        <div id="clinical-report-print-area" className="hidden-print">
          <div className="p-12 bg-white text-slate-900 font-sans">
            <h1 className="text-3xl font-bold mb-2">CLINICAL TREATMENT REPORT</h1>
            <p className="text-slate-500 mb-8 pb-4 border-b border-slate-200">Date: {new Date(printingClinicalReport.createdAt).toLocaleDateString()}</p>
            
            <div className="grid grid-cols-2 gap-12 mb-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Patient Name</p>
                <p className="text-xl font-medium">{data?.fullName || `${data?.firstName || ''} ${data?.lastName || ''}`.trim()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Treatment Case</p>
                <p className="text-xl font-medium">{printingClinicalReport.title}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Clinician</p>
                <p className="text-xl font-medium">{printingClinicalReport.doctorName || 'Staff Physician'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 inline-block mb-2">BEFORE</div>
                <img src={printingClinicalReport.beforeSignedUrl} className="w-full rounded-md mb-4" alt="Before" />
                <p className="text-sm text-slate-600 italic">"{printingClinicalReport.beforeNote}"</p>
              </div>
              <div>
                <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 inline-block mb-2">AFTER</div>
                <img src={printingClinicalReport.afterSignedUrl} className="w-full rounded-md mb-4" alt="After" />
                <p className="text-sm text-slate-600 italic">"{printingClinicalReport.afterNote}"</p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-lg border border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">Clinical Outcome</h3>
              <p className="text-lg leading-relaxed">{printingClinicalReport.resultNote}</p>
            </div>

            <div className="mt-20 pt-8 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Digitally verified clinical record — No signature required</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


// --- Printable Invoice Component ---
const PrintableInvoice = ({ bill, patient, orgDetails, user }) => {
  const totals = bill.billType === 'Pharmacy' ? normalizePharmacyInvoice(bill) : calculateInvoiceTotals(bill);
  const subtotal = totals.grossAmount;
  const tax = totals.taxAmount;
  const total = totals.grandTotal;

  // Use orgDetails or fallback to user data (never hardcode)
  const clinicName = orgDetails?.name || orgDetails?.clinicName || user?.organization?.name || user?.clinicName || "Clinic";
  
  const getAddress = (addr) => {
    if (!addr) return null;
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      return `${addr.street || addr.addressLine1 || ''} ${addr.city || ''} ${addr.state || ''} ${addr.zipCode || addr.zip || ''}`.trim();
    }
    return null;
  };

  const clinicAddress = getAddress(orgDetails?.address) || getAddress(user?.organization?.address) || getAddress(user?.address) || "Address Not Provided";
  const clinicContact = orgDetails?.contactNumber || orgDetails?.phone || user?.organization?.phone || user?.phone || orgDetails?.email || "";

  // Helper to prevent "MR. MR." duplication
  const formatPatientName = () => {
    let name = patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    // If name already starts with "MR. MR.", fix it
    if (name.toUpperCase().startsWith("MR. MR.")) {
      return name.substring(4);
    }
    return name;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white font-sans text-slate-800">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tighter mb-1">INVOICE</h1>
          <p className="text-slate-500 font-bold">#{bill.invoiceNumber || bill.billId}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900">{clinicName}</h2>
          <div className="text-sm text-slate-500 max-w-[250px] ml-auto">
            <p>{clinicAddress}</p>
            <p>{clinicContact}</p>
          </div>
        </div>
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Billed To</h3>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-lg font-bold text-slate-900 mb-1">{formatPatientName()}</p>
            <p className="text-sm text-slate-500">Patient ID: {patient.patientId}</p>
            <p className="text-sm text-slate-500">Attending Doctor: {bill.doctorName}</p>
            <p className="text-xs text-slate-400 mt-2 italic font-medium">Thank you for choosing {clinicName}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice Date</h3>
            <p className="font-bold text-slate-900">{new Date(bill.createdAt || bill.date).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</h3>
            <p className="font-bold text-slate-900">{new Date(bill.createdAt || bill.date).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Mode</h3>
            <p className="font-bold text-slate-900">{bill.paymentMethod || 'UPI'}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</h3>
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
              bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {bill.status}
            </span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-12">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest rounded-tl-lg">Item Description</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-center">QTY</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-right">Price</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-right rounded-tr-lg">Amount</th>
            </tr>
          </thead>
          <tbody className="border-b border-slate-200">
            {bill.items?.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-50 last:border-0">
                <td className="py-4 px-4 font-bold text-slate-800">{item.description}</td>
                <td className="py-4 px-4 text-center text-slate-600 font-medium">{item.qty || item.quantity || 1}</td>
                <td className="py-4 px-4 text-right text-slate-600 font-medium">₹{(item.unitPrice || item.price || item.rate || 0).toFixed(2)}</td>
                <td className="py-4 px-4 text-right font-bold text-slate-900">₹{(item.subtotal || item.amount || 0).toFixed(2)}</td>
              </tr>
            )) || (
              <tr>
                <td className="py-4 px-4 font-bold text-slate-800">Consultation / Services</td>
                <td className="py-4 px-4 text-center text-slate-600 font-medium">1</td>
                <td className="py-4 px-4 text-right text-slate-600 font-medium">₹{(bill.amount || 0).toFixed(2)}</td>
                <td className="py-4 px-4 text-right font-bold text-slate-900">₹{(bill.amount || 0).toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="flex justify-between items-start gap-12">
        <div className="flex-1">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes & Terms</h3>
          <p className="text-xs text-slate-500 leading-relaxed italic">
            Please keep this invoice for your records. For any queries regarding this bill, please contact our billing department.
          </p>
        </div>
        <div className="w-64 space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-bold">Subtotal</span>
            <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-bold">Tax (0%)</span>
            <span className="font-bold text-slate-900">₹{tax.toFixed(2)}</span>
          </div>
          {bill.discount > 0 && (
            <div className="flex justify-between text-sm text-rose-600">
              <span className="font-bold">Discount</span>
              <span className="font-bold">-₹{bill.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-3">
            <span className="text-base font-bold text-slate-900">TOTAL</span>
            <span className="text-xl font-bold text-indigo-600">₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 pt-8 border-t border-slate-100 text-center">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          Computer Generated Invoice — No Signature Required
        </p>
      </div>
    </div>
  );
};

// --- Download Progress Modal ---
const DownloadProgressModal = ({ progress, fileName }) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center"
    >
      <div className="mb-6 relative h-24 w-24 mx-auto">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle className="text-slate-100 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
          <motion.circle 
            className="text-indigo-600 stroke-current" 
            strokeWidth="8" 
            strokeLinecap="round" 
            cx="50" 
            cy="50" 
            r="40" 
            fill="transparent"
            initial={{ strokeDasharray: "251.2", strokeDashoffset: "251.2" }}
            animate={{ strokeDashoffset: 251.2 - (251.2 * progress) / 100 }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
          ></motion.circle>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-slate-800">{progress}%</span>
        </div>
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Generating Invoice</h3>
      <p className="text-sm text-slate-500 mb-6">Please wait while we prepare your document...</p>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-indigo-600" 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
        {fileName}
      </p>
    </motion.div>
  </div>
);

// --- Printable Statement Component ---
const PrintableStatement = ({ bills, patient, clinicInfo }) => {
  const calculatedTotals = bills.map(b => b.billType === 'Pharmacy' ? normalizePharmacyInvoice(b) : calculateInvoiceTotals(b));
  const totalBilled = calculatedTotals.reduce((sum, t) => sum + t.grossAmount, 0);
  const totalDiscount = calculatedTotals.reduce((sum, t) => sum + t.discountAmount, 0);
  const totalPaid = calculatedTotals.reduce((sum, t) => sum + t.paidAmount, 0);
  const totalDue = calculatedTotals.reduce((sum, t) => sum + t.dueAmount, 0);

  const formatAddress = (addr) => {
    if (!addr) return "Address Not Provided";
    if (typeof addr === 'string') return addr;
    const parts = [addr.street, addr.city, addr.state, addr.zipCode || addr.zip].filter(p => p && String(p).trim() !== '');
    return parts.length > 0 ? parts.join(', ') : "Address Not Provided";
  };

  return (
    <div className="p-8 bg-white font-sans text-slate-800">
      <div className="flex justify-between items-start border-b-4 border-indigo-600 pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tighter mb-1">BILLING STATEMENT</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Patient Financial History</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-indigo-600">{clinicInfo.clinicName || clinicInfo.name || "Clinic"}</h2>
          <div className="text-xs text-slate-500 max-w-[300px] ml-auto space-y-0.5 font-medium">
            <p>{formatAddress(clinicInfo.address || clinicInfo.location)}</p>
            <p>{clinicInfo.phone || clinicInfo.contactNumber || ""}</p>
            <p>{clinicInfo.email || ""}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Patient Information</h3>
          <p className="text-2xl font-bold text-slate-900 mb-1">{(patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`).trim()}</p>
          <p className="text-sm font-bold text-indigo-600">Patient ID: {patient.patientId}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <p className="text-[9px] font-bold text-blue-500 uppercase mb-1">Total Billed</p>
            <p className="text-lg font-bold text-blue-900">₹{totalBilled.toLocaleString()}</p>
          </div>
          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
            <p className="text-[9px] font-bold text-rose-500 uppercase mb-1">Discount</p>
            <p className="text-lg font-bold text-rose-900">-₹{totalDiscount.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
            <p className="text-[9px] font-bold text-emerald-500 uppercase mb-1">Total Paid</p>
            <p className="text-lg font-bold text-emerald-900">₹{totalPaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {bills.map((bill, index) => (
          <div key={bill._id} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-3">Invoice</span>
                <span className="text-sm font-bold text-slate-900">{bill.invoiceNumber || bill.billId}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500">{new Date(bill.date || bill.createdAt).toLocaleDateString()}</span>
                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full ${
                  bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {bill.status}
                </span>
              </div>
            </div>
            <div className="p-6">
              <table className="w-full mb-6">
                <thead>
                  <tr className="text-left border-b border-slate-100">
                    <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                    <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Qty</th>
                    <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Price</th>
                    <th className="pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items?.map((item, i) => (
                    <tr key={i} className="text-sm">
                      <td className="py-3 font-bold text-slate-700">{item.description}</td>
                      <td className="py-3 text-center font-medium text-slate-500">{item.qty || item.quantity || 1}</td>
                      <td className="py-3 text-right font-medium text-slate-500">₹{(item.unitPrice || item.price || 0).toLocaleString()}</td>
                      <td className="py-3 text-right font-bold text-slate-900">₹{(item.subtotal || item.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {bill.discount > 0 && (
                    <tr className="text-sm bg-rose-50/30 italic">
                      <td className="py-2 font-bold text-rose-600" colSpan="3">Administrative Discount</td>
                      <td className="py-2 text-right font-bold text-rose-600">-₹{bill.discount.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex justify-end">
                {(() => {
                  const totals = bill.billType === 'Pharmacy' ? normalizePharmacyInvoice(bill) : calculateInvoiceTotals(bill);
                  return (
                    <div className="w-64 space-y-1 text-right">
                      <div className="flex justify-between text-xs text-slate-400 font-bold">
                        <span>Subtotal:</span>
                        <span>₹{totals.grossAmount.toLocaleString()}</span>
                      </div>
                      {totals.discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-rose-500 font-bold">
                          <span>Discount:</span>
                          <span>-₹{totals.discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {totals.taxAmount > 0 && (
                        <div className="flex justify-between text-xs text-slate-500 font-bold">
                          <span>Tax ({totals.taxValue}%):</span>
                          <span>₹{totals.taxAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
                        <span>Net Amount:</span>
                        <span>₹{totals.grandTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs text-emerald-600 font-bold">
                        <span>Paid:</span>
                        <span>₹{totals.paidAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-200">
        <div className="flex justify-between items-center bg-slate-900 text-white p-8 rounded-[2rem]">
          <div>
            <h4 className="text-[10px] font-bold opacity-50 uppercase tracking-[0.2em] mb-2">Statement Balance Due</h4>
            <p className="text-4xl font-bold tracking-tighter">₹{totalDue.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold opacity-70 mb-1">Thank you for your trust.</p>
            <p className="text-xs opacity-50 font-medium">This statement covers {bills.length} invoices.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
