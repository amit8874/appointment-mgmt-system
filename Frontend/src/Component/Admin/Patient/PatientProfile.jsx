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
  Calendar as CalendarIcon,
  Smile,
  ChevronDown,
  Activity,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';
import api, { patientApi, appointmentApi, medicalRecordApi, emailApi, whatsappApi, prescriptionTemplateApi, invoiceTemplateApi, organizationApi, centralDoctorApi, billingApi, authApi, patientProgressImageApi, patientProgressComparisonApi, translationApi, clinicalNoteApi, progressNoteApi, followUpReminderApi } from '../../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { getToothLabel } from './dentalUtils';
import { format } from 'date-fns';
import { calculateInvoiceTotals, formatDateDMY } from '../../../utils/billingCalculations';
import { normalizePharmacyInvoice } from '../../../utils/pharmacyInvoiceCalculator';
import PrescriptionModal from './PrescriptionModal';
import DentalPrescriptionModal from './DentalPrescriptionModal';
import TemplateModal from './TemplateModal';
import InvoiceTemplateModal from './InvoiceTemplateModal';
import PrintablePrescription from './PrintablePrescription';
import InvoiceTemplate from '../../../components/Shared/InvoiceTemplate';
import OviaanDefaultPharmacyInvoiceTemplate from '../../../components/billing/templates/OviaanDefaultPharmacyInvoiceTemplate';
import { useAuth } from '../../../context/AuthContext';
import DentalConsentFormModal from './DentalConsentFormModal';
import AddPharmacyMedicineBillModal from './AddPharmacyMedicineBillModal';
import DentalBillingCreatorModal from './DentalBillingCreatorModal';
import Pagination from '../../../components/common/Pagination';
import AddFollowUpReminderModal from '../../../components/reminders/AddFollowUpReminderModal';
import DentalChart from './DentalChart';
import DentalTreatmentTab from './DentalTreatmentTab';
import DentalImagesTab from './DentalImagesTab';
import ToothHistoryTab from './ToothHistoryTab';
import LabWorkTab from './LabWorkTab';
import MobileAppNavigation from '../../../components/common/MobileAppNavigation';

// --- Utility Components ---

const getImageUrl = (path) => {
  if (!path) return null;
  const pathStr = typeof path === 'string' ? path : (path?.url || path?.src || String(path || ''));
  if (!pathStr || pathStr === '[object Object]') return null;
  if (pathStr.startsWith('data:') || pathStr.startsWith('http://') || pathStr.startsWith('https://') || pathStr.startsWith('blob:')) return pathStr;
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const serverUrl = baseUrl.replace(/\/api$/, '') || 'http://localhost:5000';
  const cleanPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
  return `${serverUrl}${cleanPath}`;
};

const convertUrlToBase64 = async (url) => {
  if (!url) return null;
  const urlStr = typeof url === 'string' ? url : (url?.url || url?.src || '');
  if (!urlStr || urlStr === '[object Object]') return null;
  if (urlStr.startsWith('data:')) return urlStr;
  try {
    const fullUrl = getImageUrl(urlStr);
    if (!fullUrl) return null;
    const response = await fetch(fullUrl, { cache: 'force-cache' });
    if (!response.ok) return fullUrl;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(fullUrl);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Could not pre-convert image to base64 for printing:", err);
    return getImageUrl(urlStr);
  }
};

const waitForPrintImagesReady = async (containerSelector, maxWaitMs = 3500) => {
  const startTime = Date.now();

  // 1. Wait until container element appears in DOM (React commit phase)
  while (!document.querySelector(containerSelector)) {
    if (Date.now() - startTime > 1500) break;
    await new Promise(r => requestAnimationFrame(r));
  }

  const container = document.querySelector(containerSelector);
  if (!container) return;

  // 2. Query all images inside print area
  const images = Array.from(container.querySelectorAll('img'));

  if (images.length > 0) {
    await Promise.all(
      images.map(img => {
        if (!img.src) return Promise.resolve();

        // If already loaded and has dimensions, decode immediately
        if (img.complete && img.naturalWidth !== 0) {
          if (typeof img.decode === 'function') {
            return img.decode().catch(() => {});
          }
          return Promise.resolve();
        }

        // Otherwise wait for load and decode
        return new Promise(resolve => {
          let timeoutId;
          const onFinish = () => {
            clearTimeout(timeoutId);
            if (typeof img.decode === 'function') {
              img.decode().catch(() => {}).then(resolve);
            } else {
              resolve();
            }
          };

          if (img.complete && img.naturalWidth !== 0) {
            onFinish();
          } else {
            img.addEventListener('load', onFinish, { once: true });
            img.addEventListener('error', () => {
              clearTimeout(timeoutId);
              resolve();
            }, { once: true });

            const remaining = Math.max(500, maxWaitMs - (Date.now() - startTime));
            timeoutId = setTimeout(() => {
              img.removeEventListener('load', onFinish);
              resolve();
            }, remaining);
          }
        });
      })
    );
  }

  // 3. Ensure fonts are fully loaded
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {}
  }

  // 4. Double RAF to ensure compositor layout is committed to screen/buffer
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  // 5. Short stable buffer to let raster surface settle
  await new Promise(r => setTimeout(r, 200));
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
      type="button"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      title={label}
      aria-label={label}
      animate={{ width: isHovered ? 'auto' : '38px' }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={`flex items-center justify-center gap-1.5 p-2 sm:p-2.5 rounded-xl transition-colors duration-200 ${colorClass} ${isHovered ? hoverBg : ''} overflow-hidden whitespace-nowrap shadow-sm border border-transparent hover:border-slate-100 touch-manipulation`}
    >
      <Icon size={16} className="shrink-0 sm:w-[18px] sm:h-[18px]" />
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

const TabPersonalInfo = ({ data, appointments = [], onEdit, onRebook, user, onNavigateTab, availableTabs = [] }) => {
  const [activeVisitDropdown, setActiveVisitDropdown] = useState(null);

  const defaultNavSections = [
    { key: 'prescriptions', name: 'Prescriptions', icon: Pill },
    { key: 'appointments', name: 'Appointments', icon: CalendarIcon },
    { key: 'treatment-plan', name: 'Treatment Plan', icon: ClipboardList },
    { key: 'billing', name: 'Billing', icon: IndianRupee },
    { key: 'dental-chart', name: 'Dental Chart', icon: Smile },
    { key: 'dental-images', name: 'Dental Images', icon: Image },
    { key: 'tooth-history', name: 'Tooth History', icon: History },
    { key: 'follow-ups', name: 'Follow-ups', icon: Bell },
    { key: 'lab-work', name: 'Lab Work', icon: FlaskConical },
    { key: 'clinical-notes', name: 'Clinical Notes', icon: StickyNote },
    { key: 'other', name: 'Other', icon: MoreHorizontal }
  ];

  const visitNavSections = availableTabs.length > 0
    ? availableTabs.filter(t => t.key !== 'personal')
    : defaultNavSections;

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
          <InfoItem label="Date of Birth" value={data.dateOfBirth ? formatDateDMY(data.dateOfBirth) : 'N/A'} />
          <InfoItem label="Gender" value={data.gender} />
          <InfoItem label="Blood Group" value={data.bloodGroup} />
          <InfoItem label="Religion" value={data.religion} />
          <InfoItem label="Age" value={data.age ? `${data.age} ${data.ageType || 'Year'}` : 'N/A'} />
          <InfoItem label="Appointment Date" value={(() => {
            const d = data.appointmentDate || data.lastVisit || (appointments && appointments[0]?.date);
            if (!d) return 'N/A';
            return formatDateDMY(d);
          })()} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 tracking-widest uppercase">
            <div className="p-1.5 bg-indigo-50 rounded-lg"><Phone size={14} className="text-indigo-600" /></div> Contact Information
          </h3>
        </div>
        <div className="space-y-4">
          <InfoItem label="Main Contact Number" value={data.contactNumber || data.mobile} icon={Phone} />
          <InfoItem label="Alternate Mobile Number" value={data.alternateMobile || data.alternatePhone} icon={Phone} />
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
            return activeAppts.map(appt => {
              const isDropdownOpen = activeVisitDropdown === appt._id;
              const formattedDate = appt.date ? new Date(appt.date).toLocaleDateString() : 'N/A';

              return (
                <div key={appt._id} className="relative flex items-center">
                  <div className="absolute -left-[11px] w-5 h-5 bg-emerald-500 rounded-full border-4 border-white shadow-sm"></div>
                  <div className="w-8 border-b-2 border-black"></div>
                  
                  <div className="ml-2 relative flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveVisitDropdown(isDropdownOpen ? null : appt._id)}
                      className="group flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Click to jump to a patient section for this visit date"
                    >
                      <span className="font-extrabold text-slate-800 group-hover:text-indigo-900 text-xs tracking-tight">
                        {formattedDate} {appt.time ? `at ${appt.time}` : ''}
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 group-hover:text-indigo-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                      {appt.status?.toLowerCase() === 'pending' ? 'Confirmed' : (appt.status || 'Confirmed')}
                    </span>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveVisitDropdown(null)} />
                        <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-2 w-64 animate-fade space-y-1">
                          <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/70 rounded-t-xl">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Go to section for visit:</span>
                            <span className="text-[9px] font-black text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md border border-indigo-200">
                              {formattedDate}
                            </span>
                          </div>

                          <div className="max-h-64 overflow-y-auto custom-scrollbar py-1 space-y-0.5">
                            {visitNavSections.map(sec => (
                              <button
                                key={sec.key}
                                type="button"
                                onClick={() => {
                                  setActiveVisitDropdown(null);
                                  if (onNavigateTab) {
                                    onNavigateTab(sec.key, appt.date);
                                  }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 hover:text-indigo-950 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
                              >
                                <sec.icon size={15} className="text-slate-400 group-hover:text-indigo-600 shrink-0" />
                                <span>{sec.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            });
          })()}

          {/* Past appts */}
          {appointments.filter(a => !['confirmed', 'pending', 'scheduled'].includes(a.status?.toLowerCase())).slice(0, 5).map(appt => {
            const isDropdownOpen = activeVisitDropdown === appt._id;
            const formattedDate = appt.date ? new Date(appt.date).toLocaleDateString() : 'N/A';

            return (
              <div key={appt._id} className="relative flex items-center">
                <div className="absolute -left-[11px] w-5 h-5 bg-indigo-600 rounded-full border-4 border-white shadow-sm"></div>
                <div className="w-8 border-b-2 border-black"></div>
                
                <div className="ml-2 relative flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveVisitDropdown(isDropdownOpen ? null : appt._id)}
                    className="group flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Click to jump to a patient section for this visit date"
                  >
                    <span className="font-extrabold text-slate-800 group-hover:text-indigo-900 text-xs tracking-tight">
                      {formattedDate} {appt.time ? `at ${appt.time}` : ''}
                    </span>
                    <ChevronDown size={14} className={`text-slate-400 group-hover:text-indigo-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                    {appt.status || 'Completed'}
                  </span>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveVisitDropdown(null)} />
                      <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-2 w-64 animate-fade space-y-1">
                        <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/70 rounded-t-xl">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Go to section for visit:</span>
                          <span className="text-[9px] font-black text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md border border-indigo-200">
                            {formattedDate}
                          </span>
                        </div>

                        <div className="max-h-64 overflow-y-auto custom-scrollbar py-1 space-y-0.5">
                          {visitNavSections.map(sec => (
                            <button
                              key={sec.key}
                              type="button"
                              onClick={() => {
                                setActiveVisitDropdown(null);
                                if (onNavigateTab) {
                                  onNavigateTab(sec.key, appt.date);
                                }
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 hover:text-indigo-950 hover:bg-indigo-50/80 transition-colors group cursor-pointer"
                            >
                              <sec.icon size={15} className="text-slate-400 group-hover:text-indigo-600 shrink-0" />
                              <span>{sec.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
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
const EditProfileModal = ({ data, appointments = [], onClose, onSave }) => {
  const activeAppt = (appointments && appointments.length > 0)
    ? (appointments.find(a => ['confirmed', 'pending', 'scheduled'].includes(a.status?.toLowerCase())) || appointments[0])
    : null;

  const initialApptDate = (() => {
    if (activeAppt?.date) {
      try {
        const d = new Date(activeAppt.date);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch (e) {}
      return activeAppt.date;
    }
    if (data.appointmentDate) {
      try {
        const d = new Date(data.appointmentDate);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch (e) {}
      return data.appointmentDate;
    }
    if (data.lastVisit) {
      try {
        const d = new Date(data.lastVisit);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch (e) {}
      return data.lastVisit;
    }
    return '';
  })();

  const initialApptTime = activeAppt?.time || data.appointmentTime || '';
  const initialApptId = activeAppt?._id || '';

  const [form, setForm] = useState({
    appointmentDate: initialApptDate,
    appointmentTime: initialApptTime,
    appointmentId: initialApptId,
    patientId: data.patientId || '',
    designation: data.designation || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    age: data.age || '',
    ageType: data.ageType || 'Year',
    gender: data.gender || '',
    bloodGroup: data.bloodGroup || '',
    religion: data.religion || '',
    mobile: data.mobile || data.contactNumber || '',
    alternateMobile: data.alternateMobile || data.alternatePhone || '',
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
        patientId: form.patientId ? form.patientId.trim() : data.patientId,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        appointmentId: form.appointmentId,
        lastVisit: form.appointmentDate,
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
        alternateMobile: form.alternateMobile,
        medicalHistory: form.pastMedicalHistory,
        vitals: { bloodPressure: form.bloodPressure, weight: form.weight, height: form.height }
      });
      toast.success('Patient profile updated successfully!');
      onSave(updated);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile. Please try again.');
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
              <Field label="Patient ID" value={form.patientId} onChange={set('patientId')} />
              <Field label="Designation" value={form.designation} onChange={set('designation')} options={['', 'MR.', 'MS.', 'MRS.', 'MISS', 'SHRI', 'SMT.']} />
              <Field label="First Name" value={form.firstName} onChange={set('firstName')} />
              <Field label="Last Name" value={form.lastName} onChange={set('lastName')} />
              <Field label="Gender" value={form.gender} onChange={set('gender')} options={['', 'Male', 'Female', 'Other']} />
              <Field label="Age" value={form.age} onChange={set('age')} type="number" />
              <Field label="Age Type" value={form.ageType} onChange={set('ageType')} options={['Year', 'Month', 'Days']} />
              <Field label="Blood Group" value={form.bloodGroup} onChange={set('bloodGroup')} options={['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
              <Field label="Religion" value={form.religion} onChange={set('religion')} options={['', 'Hindu', 'Muslim', 'Sikh', 'Christian', 'Jain', 'Buddhist', 'Other']} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CalendarIcon size={14} /> Appointment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field 
                label="Appointment Date (Previous, Today, or Future)" 
                value={form.appointmentDate} 
                onChange={set('appointmentDate')} 
                type="date" 
              />
              <Field 
                label="Appointment Time" 
                value={form.appointmentTime} 
                onChange={set('appointmentTime')} 
                placeholder="e.g. 10:30 AM" 
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Select any date (previous/back-dated, today, or future) to update or correct this patient's appointment.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Phone size={14} /> Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Mobile Number (Primary)" value={form.mobile} onChange={set('mobile')} type="tel" />
              <Field label="Alternate Mobile Number (Record Only)" value={form.alternateMobile} onChange={set('alternateMobile')} type="tel" />
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



const TreatmentBadgeItem = ({ itemGroup }) => {
  const [showTeeth, setShowTeeth] = useState(false);
  const teethList = itemGroup.teeth || [];

  return (
    <div className="relative inline-flex items-center">
      <span className="px-2.5 py-0.5 bg-teal-100/80 text-teal-900 rounded-md text-xs font-semibold border border-teal-200 flex items-center gap-1.5">
        <span>{itemGroup.name}</span>
        {teethList.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTeeth(!showTeeth);
            }}
            className="p-0.5 hover:bg-teal-200 rounded text-teal-700 transition-colors cursor-pointer flex items-center justify-center"
            title="View tooth details"
          >
            <Eye size={12} />
          </button>
        )}
      </span>

      {showTeeth && teethList.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 z-[999] bg-slate-900 text-white text-[11px] p-2 rounded-lg shadow-lg border border-slate-700 min-w-[140px]">
          <div className="font-bold text-[9px] text-teal-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Teeth ({teethList.length})</span>
            <button onClick={() => setShowTeeth(false)} className="text-slate-400 hover:text-white cursor-pointer">
              <X size={10} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {teethList.map(tNum => (
              <span key={tNum} className="px-1.5 py-0.5 bg-slate-800 rounded font-semibold text-[10px] border border-slate-700">
                Tooth #{getToothLabel(tNum)}
              </span>
            ))}
          </div>
        </div>
      )}
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
      {(data.complaints?.length > 0 || data.chiefComplaint) && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-amber-50/30">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <ClipboardList size={12} className="text-amber-500 shrink-0" />
            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest">Complaints</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {data.complaints?.length > 0 
              ? data.complaints.map(c => `${typeof c === 'string' ? c : c.name}${c.duration || data.complaintDuration ? ` (${c.duration || data.complaintDuration})` : ''}`).join(', ')
              : `${data.chiefComplaint}${data.complaintDuration ? ` (${data.complaintDuration})` : ''}`
            }
          </p>
        </div>
      )}

      {/* 3.1 MEDICAL & DENTAL HISTORY */}
      {(data.medicalDentalHistory || data.medicalHistory || data.dentalHistory) && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-rose-50/25">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <Activity size={12} className="text-rose-500 shrink-0" />
            <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-widest">History</span>
          </div>
          <div className="space-y-1">
            {data.medicalHistory && (
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                <span className="font-bold text-slate-900">Medical: </span>{data.medicalHistory}
              </p>
            )}
            {data.dentalHistory && (
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                <span className="font-bold text-slate-900">Dental: </span>{data.dentalHistory}
              </p>
            )}
            {!data.medicalHistory && !data.dentalHistory && data.medicalDentalHistory && (
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {data.medicalDentalHistory}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3.2 ORAL EXAMINATION FINDINGS */}
      {(() => {
        if (!data.oralExamination) return null;
        const labelMap = {
          stains: 'Stains',
          calculus: 'Calculus',
          decayedTeeth: 'Decayed Teeth',
          grosslyDecayedTeeth: 'Grossly Decayed Teeth',
          mobileTeeth: 'Mobile Teeth',
          top: 'Tenderness on Percussion (TOP)',
          otherFindings: 'Other Findings'
        };
        const items = [];
        if (typeof data.oralExamination === 'string') {
          items.push(data.oralExamination);
        } else {
          Object.entries(data.oralExamination).forEach(([k, v]) => {
            if (v && (v.active || (typeof v === 'string' && v.trim()))) {
              const l = labelMap[k] || k;
              const s = v.severity ? ` (${v.severity})` : '';
              const n = v.notes ? `: ${v.notes}` : '';
              items.push(`${l}${s}${n}`);
            }
          });
        }
        if (!items.length) return null;
        return (
          <div className="flex items-start gap-3 px-4 py-2.5 bg-cyan-50/30">
            <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
              <Smile size={12} className="text-cyan-600 shrink-0" />
              <span className="text-[10px] font-semibold text-cyan-600 uppercase tracking-widest">Oral Exam</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-white border border-cyan-200 text-cyan-900 font-medium">
                  {item}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 3.3 AFFECTED TEETH (ODONTOGRAM) */}
      {data.selectedTeeth?.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-amber-50/20">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <Sparkles size={12} className="text-amber-600 shrink-0" />
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Teeth Chart</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.selectedTeeth.map((t, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900 font-bold">
                #{t.toothId || t.toothNumber} ({t.condition}{t.notes ? ` - ${t.notes}` : ''})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3.4 PROCEDURE PERFORMED TODAY */}
      {data.treatmentPerformedToday && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-emerald-50/30">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">Done Today</span>
          </div>
          <p className="text-sm font-semibold text-emerald-950 leading-relaxed">
            {data.treatmentPerformedToday}
          </p>
        </div>
      )}

      {/* 3.5 TREATMENT PLAN */}
      {(data.treatmentPlans?.length > 0 || data.dentalTreatments?.length > 0) && (() => {
        const rawList = data.treatmentPlans || data.dentalTreatments || [];
        const groupedMap = {};
        rawList.forEach(t => {
          const name = typeof t === 'string' ? t : (t.procedure || t.name || t.treatmentName);
          if (!name) return;
          if (!groupedMap[name]) {
            groupedMap[name] = { name, teeth: [] };
          }
          if (t.teeth && Array.isArray(t.teeth)) {
            t.teeth.forEach(tn => {
              if (!groupedMap[name].teeth.includes(tn)) groupedMap[name].teeth.push(tn);
            });
          } else if (t.toothNumber && !groupedMap[name].teeth.includes(t.toothNumber)) {
            groupedMap[name].teeth.push(t.toothNumber);
          }
        });
        const groupedTreatments = Object.values(groupedMap);
        if (!groupedTreatments.length) return null;

        return (
          <div className="flex items-start gap-3 px-4 py-2.5 bg-teal-50/40">
            <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
              <ClipboardList size={12} className="text-teal-600 shrink-0" />
              <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-widest">Treatment</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {groupedTreatments.map((itemGroup, i) => (
                <TreatmentBadgeItem key={i} itemGroup={itemGroup} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* 4. MEDICATIONS (Rx) */}
      {data.medications?.length > 0 && (
        <div className="bg-white overflow-x-auto">
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

      {/* 5.5 NEXT APPOINTMENT */}
      {data.nextAppointmentDate && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-50/40">
          <div className="flex items-center gap-1.5 w-28 shrink-0">
            <Calendar size={12} className="text-indigo-600 shrink-0" />
            <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest">Next Visit</span>
          </div>
          <p className="text-xs font-bold text-indigo-950">
            {new Date(data.nextAppointmentDate).toLocaleDateString('en-GB')}
          </p>
        </div>
      )}

      {/* 5.6 DOCTOR'S NOTES */}
      {(data.nextAppointmentNotes || data.doctorNotes || (typeof data.notes === 'string' && !data.notes.startsWith('{') && data.notes)) && (
        <div className="flex items-start gap-3 px-4 py-2.5 bg-amber-50/50">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <FileText size={12} className="text-amber-600 shrink-0" />
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Notes</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
            {data.nextAppointmentNotes || data.doctorNotes || data.notes}
          </p>
        </div>
      )}

      {/* 5.7 FOOTER NOTICE / SUB-TEXT */}
      {(data.footerText || data.footerSubText || data.customFooterText) && (
        <div className="flex items-start gap-3 px-4 py-2 bg-slate-50/80">
          <div className="flex items-center gap-1.5 w-28 shrink-0 pt-0.5">
            <ClipboardList size={12} className="text-slate-500 shrink-0" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Footer Notice</span>
          </div>
          <div className="text-xs text-slate-700 space-y-0.5">
            {data.footerText && <p className="font-bold text-red-600">{data.footerText}</p>}
            {(data.footerSubText || data.customFooterText) && (
              <p className="font-medium text-slate-800">{data.footerSubText || data.customFooterText}</p>
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

const TabPrescriptions = ({ appointments = [], medicalRecords = [], onNewPrescription, onOpenTemplateModal, onEmail, onWhatsApp, onPrint, onDownload, onEdit, onDelete, templates = [], selectedTemplate, setSelectedTemplate, pdfProgress }) => {
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Prescription History</h3>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">{allPrescriptions.length} Records</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">Prescription Layout</span>
            <select 
              value={selectedTemplate?._id || 'default'} 
              onChange={(e) => {
                if (e.target.value === 'default') {
                  const t = { _id: 'default', templateName: 'Oviaan Default Template' };
                  setSelectedTemplate(t);
                  try { localStorage.setItem('cms_selected_prescription_template', JSON.stringify(t)); } catch (err) {}
                } else if (e.target.value === 'global_a4_blank') {
                  const t = { _id: 'global_a4_blank', templateName: 'Pre-Printed Letterhead Pad (Data Only)', headerType: 'a4_blank' };
                  setSelectedTemplate(t);
                  try { localStorage.setItem('cms_selected_prescription_template', JSON.stringify(t)); } catch (err) {}
                } else if (e.target.value === 'global_a4') {
                  const t = { _id: 'global_a4', templateName: 'A4 Full Template (Digital Letterhead)', headerType: 'a4' };
                  setSelectedTemplate(t);
                  try { localStorage.setItem('cms_selected_prescription_template', JSON.stringify(t)); } catch (err) {}
                } else if (e.target.value === 'default_v2') {
                  const t = { _id: 'default_v2', templateName: 'Oviaan Default Template 2' };
                  setSelectedTemplate(t);
                  try { localStorage.setItem('cms_selected_prescription_template', JSON.stringify(t)); } catch (err) {}
                } else {
                  const t = templates.find(temp => temp._id === e.target.value);
                  if (t) {
                    setSelectedTemplate(t);
                    try { localStorage.setItem('cms_selected_prescription_template', JSON.stringify(t)); } catch (err) {}
                  }
                }
              }}
              className="bg-white border-2 border-indigo-100 rounded-xl px-4 py-1.5 text-[11px] font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:border-indigo-300 transition-all min-w-[180px]"
            >
              <option value="default">Oviaan Default Template (Default)</option>
              <option value="global_a4_blank">Pre-Printed Letterhead Pad (Data Only)</option>
              <option value="global_a4">A4 Full Template (Digital Letterhead)</option>
              <option value="default_v2">Oviaan Default Template 2</option>
              {templates.filter(t => t._id && t._id !== 'global_a4' && t._id !== 'global_a4_blank' && (t.templateName || t.name)).map(t => (
                <option key={t._id} value={t._id}>
                  {t.templateName || t.name}
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
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shadow-lg shadow-indigo-100 ${p.type === 'Record' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white`}>
                    <Pill size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 tracking-tight">{formatDateDMY(p.date)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {p.doctorName?.toLowerCase().startsWith('dr') ? '' : 'Dr. '}{p.doctorName}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 lg:gap-4 mt-2 lg:mt-0">
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
                  <button onClick={() => onDelete && onDelete(p)} className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 transition-colors bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 hover:border-rose-300">
                    <Trash2 size={16} />
                    <span className="text-sm font-bold uppercase tracking-wider">Delete</span>
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

const TabAppointments = ({ appointments, onRebook, onReschedule, onCancel }) => {
  const upcoming = appointments.filter(a => a.status?.toLowerCase() === 'pending' || a.status?.toLowerCase() === 'confirmed');
  const past = appointments.filter(a => a.status?.toLowerCase() === 'completed' || a.status?.toLowerCase() === 'cancelled');

  const AppointmentItem = ({ appt }) => {
    const statusLower = (appt.status || '').toLowerCase();
    const isCancelled = statusLower === 'cancelled';
    const isCompleted = statusLower === 'completed';

    return (
      <div className={`p-4 rounded-xl border-2 transition-all duration-300 ${statusLower === 'confirmed' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${statusLower === 'confirmed' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
              <CalendarIcon size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-800">{new Date(appt.date).toLocaleDateString()} at {appt.time}</p>
              <p className="text-xs text-slate-500 font-medium flex items-center mt-0.5">
                <Stethoscope size={12} className="mr-1" /> {appt.doctorName} ({appt.specialty || 'General'})
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            statusLower === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
            statusLower === 'pending' ? 'bg-emerald-100 text-emerald-700' :
            statusLower === 'completed' ? 'bg-blue-100 text-blue-700' :
            statusLower === 'cancelled' ? 'bg-rose-100 text-rose-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {statusLower === 'pending' ? 'Confirmed' : appt.status}
          </span>
        </div>
        <p className="text-sm text-slate-600 italic bg-white/50 p-2 rounded-lg border border-slate-50 mb-4">"{appt.reason || 'No reason specified'}"</p>
        <div className="flex justify-end items-center gap-2 flex-wrap">
          {!isCancelled && !isCompleted && onReschedule && (
            <button
              type="button"
              onClick={() => onReschedule(appt)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              title="Reschedule Appointment"
            >
              <Calendar size={12} /> Reschedule
            </button>
          )}
          {!isCancelled && !isCompleted && onCancel && (
            <button
              type="button"
              onClick={() => onCancel(appt)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition-colors shadow-sm"
              title="Cancel Appointment"
            >
              <XCircle size={12} /> Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => onRebook(appt)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <RefreshCcw size={12} /> Re-book
          </button>
        </div>
      </div>
    );
  };

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

const CancelAppointmentModal = ({ appointment, patient, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  if (!appointment) return null;

  const patientName = appointment.patientName || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || patient?.name || 'Patient';
  const patientPhone = appointment.patientPhone || patient?.mobile || patient?.phone || '';
  const doctorName = appointment.doctorName || 'Doctor';
  const formattedDate = appointment.date ? new Date(appointment.date).toLocaleDateString() : 'N/A';

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      await appointmentApi.updateStatus(appointment._id, 'cancelled', reason);
      toast.success("Appointment cancelled successfully. Cancellation message sent to patient.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
      toast.error(err?.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Cancel Appointment</h3>
              <p className="text-xs text-slate-500 font-medium">Are you really sure you want to cancel?</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Patient:</span>
              <span className="font-bold text-slate-800">{patientName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Doctor:</span>
              <span className="font-bold text-slate-800">Dr. {doctorName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Scheduled:</span>
              <span className="font-bold text-slate-800">{formattedDate} at {appointment.time}</span>
            </div>
          </div>

          <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
            <span className="text-base leading-none">📱</span>
            <div>
              A cancellation WhatsApp notification will automatically be sent to the patient ({patientPhone || 'registered phone'}) using the cancellation template.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reason for Cancellation <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Patient requested cancellation, Doctor unavailable..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={cancelling}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Keep Appointment
          </button>
          <button
            type="button"
            disabled={cancelling}
            onClick={handleConfirmCancel}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-200 hover:shadow-rose-300 transition-all active:scale-95 disabled:opacity-50"
          >
            {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            <span>{cancelling ? 'Cancelling...' : 'Yes, Cancel Appointment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const RescheduleAppointmentModal = ({ appointment, patient, onClose, onSuccess }) => {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState(appointment?.doctorId || '');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    if (appointment?.date) {
      try {
        const d = new Date(appointment.date);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch (e) {}
    }
    return new Date().toISOString().split('T')[0];
  });
  const [appointmentTime, setAppointmentTime] = useState(appointment?.time || '');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [reason, setReason] = useState(appointment?.reason || '');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [sendWhatsAppToPatient, setSendWhatsAppToPatient] = useState(true);
  const [sendWhatsAppToDoctor, setSendWhatsAppToDoctor] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch doctors on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const docs = await centralDoctorApi.getAll();
        const list = Array.isArray(docs) ? docs : (docs?.doctors || []);
        setDoctors(list);

        if (list.length > 0) {
          const match = list.find(d => 
            (appointment?.doctorId && (d._id === appointment.doctorId || d.doctorId === appointment.doctorId)) ||
            (appointment?.doctorName && d.name?.toLowerCase() === appointment.doctorName?.toLowerCase())
          );
          if (match) {
            setSelectedDoctorId(match._id);
          } else if (!selectedDoctorId) {
            setSelectedDoctorId(list[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  // Fetch slots whenever selected doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !appointmentDate) return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSlotError('');
      try {
        const response = await api.get(`/doctors/${selectedDoctorId}/slots?date=${appointmentDate}&allowPast=true`);
        const data = response.data;
        if (response.status === 200 && data.available && Array.isArray(data.slots) && data.slots.length > 0) {
          setAvailableSlots(data.slots);
        } else {
          setAvailableSlots([]);
          setSlotError('No slots available for this doctor on selected date.');
        }
      } catch (err) {
        console.error('Error fetching doctor slots:', err);
        setAvailableSlots([]);
        setSlotError('Could not load slots for selected date.');
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDoctorId, appointmentDate]);

  const selectedDoctorObj = doctors.find(d => d._id === selectedDoctorId);
  const patientName = appointment?.patientName || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || patient?.name || 'Patient';
  const patientPhone = appointment?.patientPhone || patient?.mobile || patient?.phone || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentDate) {
      toast.error('Please select an appointment date');
      return;
    }
    if (!appointmentTime) {
      toast.error('Please select a time slot');
      return;
    }

    setSubmitting(true);
    try {
      await appointmentApi.reschedule(appointment._id, {
        appointmentDate,
        appointmentTime,
        doctorId: selectedDoctorId,
        doctorName: selectedDoctorObj?.name || appointment?.doctorName,
        specialty: selectedDoctorObj?.specialty || selectedDoctorObj?.department || appointment?.specialty,
        reason,
        notes,
        sendWhatsAppToPatient,
        sendWhatsAppToDoctor
      });

      toast.success("Appointment rescheduled successfully! Messages sent to patient & doctor.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to reschedule appointment:', err);
      toast.error(err?.response?.data?.message || 'Failed to reschedule appointment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-50 via-orange-50 to-indigo-50 border-b border-amber-100/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-200">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Reschedule Appointment</h3>
              <p className="text-xs text-slate-500 font-medium">Update date, slot, or change doctor</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Patient Details (Auto-filled) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                {patientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{patientName}</p>
                <p className="text-[11px] text-slate-500">{patientPhone || 'No phone'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                {patient?.gender || 'Patient'} {patient?.age ? `• ${patient.age} yrs` : ''}
              </span>
            </div>
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Stethoscope size={13} className="text-indigo-600" />
              <span>Select Doctor</span>
              <span className="text-[11px] text-slate-400 font-normal">(change if needed)</span>
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => {
                setSelectedDoctorId(e.target.value);
                setAppointmentTime('');
              }}
              disabled={loadingDoctors}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              {loadingDoctors ? (
                <option value="">Loading clinic doctors...</option>
              ) : doctors.length === 0 ? (
                <option value="">No doctors found</option>
              ) : (
                doctors.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    Dr. {doc.name} {doc.specialty || doc.department ? `(${doc.specialty || doc.department})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <CalendarIcon size={13} className="text-indigo-600" />
              <span>Appointment Date</span>
            </label>
            <input
              type="date"
              value={appointmentDate}
              onChange={(e) => {
                setAppointmentDate(e.target.value);
                setAppointmentTime('');
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Time Slots */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={13} className="text-indigo-600" />
                <span>Select Time Slot</span>
              </label>
              {appointmentTime && (
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  Selected: {appointmentTime}
                </span>
              )}
            </div>

            {slotsLoading ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span>Fetching doctor's available slots...</span>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {availableSlots.map((slot, idx) => {
                  const isSelected = appointmentTime === slot.time;
                  const isBooked = slot.isBooked;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setAppointmentTime(slot.time)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border-indigo-600 scale-[1.02]'
                          : isBooked
                          ? 'bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed line-through opacity-50'
                          : 'bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 border border-slate-200/80 active:scale-95'
                      }`}
                      title={isBooked ? 'Slot already booked' : slot.time}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-orange-50/70 border border-orange-100 rounded-xl text-xs text-orange-700 font-medium">
                {slotError || 'No predefined slots available for this doctor on selected date.'}
                <div className="mt-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Enter Custom Slot Time:</label>
                  <input
                    type="text"
                    placeholder="e.g., 10:00 AM - 11:00 AM"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Visit</label>
            <input
              type="text"
              placeholder="e.g., Follow-up, Routine Checkup, Root Canal..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* WhatsApp Notifications section */}
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>🔔</span> WhatsApp Notifications
            </p>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={sendWhatsAppToPatient}
                onChange={(e) => setSendWhatsAppToPatient(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Send Reschedule message to Patient ({patientPhone || 'Mobile'})</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={sendWhatsAppToDoctor}
                onChange={(e) => setSendWhatsAppToDoctor(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Send Appointment Alert to Doctor (Dr. {selectedDoctorObj?.name || 'Selected Doctor'})</span>
            </label>
          </div>

          {/* Submit buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !appointmentTime}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
              <span>{submitting ? 'Rescheduling...' : 'Confirm Reschedule & Send Messages'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BillViewModal = ({ bill, onClose, clinicInfo, patient, onPrint, onDownload, onWhatsApp, onUpdateBill }) => {
  const [newInstallmentAmount, setNewInstallmentAmount] = useState('');
  const [newInstallmentMode, setNewInstallmentMode] = useState('Cash');
  const [newInstallmentDate, setNewInstallmentDate] = useState(() => {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  });
  const [newInstallmentTxId, setNewInstallmentTxId] = useState('');
  const [newInstallmentNotes, setNewInstallmentNotes] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState('');
  const [savingInstallment, setSavingInstallment] = useState(false);
  const [installmentError, setInstallmentError] = useState('');
  const [editingInstallmentIdx, setEditingInstallmentIdx] = useState(null);
  const [editingInstallmentDate, setEditingInstallmentDate] = useState('');
  const [savingInstallmentEdit, setSavingInstallmentEdit] = useState(false);

  if (!bill) return null;
  
  const totals = bill.billType === 'Pharmacy' ? normalizePharmacyInvoice(bill) : calculateInvoiceTotals(bill);
  const items = bill.items || bill.services || [];

  const handleAddInstallment = async (e) => {
    e.preventDefault();
    setInstallmentError('');
    const amt = parseFloat(newInstallmentAmount);
    if (isNaN(amt) || amt <= 0) {
      setInstallmentError('Please enter a valid installment amount.');
      return;
    }
    const currentDue = bill.dueAmount !== undefined ? bill.dueAmount : totals.dueAmount;
    if (amt > currentDue) {
      setInstallmentError(`Installment amount cannot exceed remaining due (₹${currentDue}).`);
      return;
    }

    setSavingInstallment(true);
    try {
      const baseRcpt = bill.receiptNumber || `RCPT-${(String(bill.invoiceNumber || bill.billId || '').replace(/\D/g, '') || '1001')}`;
      const baseInstallments = (bill.installments && bill.installments.length > 0)
        ? bill.installments
        : (totals.paidAmount > 0
            ? [{
                date: bill.date || bill.createdAt || new Date(),
                amount: totals.paidAmount,
                paymentMethod: bill.paymentMethod || 'Cash',
                receiptNumber: baseRcpt,
                procedureName: items[0]?.description || '',
                transactionId: bill.transactionId || '',
                notes: 'Initial payment'
              }]
            : []);

      const nextReceiptNumber = `${baseRcpt}-${baseInstallments.length + 1}`;
      const paymentDate = newInstallmentDate ? new Date(newInstallmentDate) : new Date();

      // Resolve targeted procedure
      const targetProcedureName = selectedProcedure || (
        items.find(it => {
          const cost = parseFloat(it.subtotal || it.amount || (it.unitPrice || it.price || 0) * (it.qty || 1)) || 0;
          const paid = parseFloat(it.paidAmount !== undefined ? it.paidAmount : 0);
          return (cost - paid) > 0;
        })?.description || items[0]?.description || ''
      );

      const updatedInstallments = [
        ...baseInstallments,
        {
          date: paymentDate,
          amount: amt,
          paymentMethod: newInstallmentMode,
          transactionId: newInstallmentTxId,
          receiptNumber: nextReceiptNumber,
          procedureName: targetProcedureName || '',
          notes: newInstallmentNotes || (targetProcedureName ? `Payment for ${targetProcedureName}` : 'Subsequent installment payment')
        }
      ];

      // Update specific procedure item's paidAmount, dueAmount, status and paymentMode
      // CRITICAL: Explicitly preserve each treatment item's original clinical date so procedure date never changes!
      let updatedItems = (bill.items || []).map(it => ({
        ...it,
        date: it.date || bill.date || bill.createdAt
      }));

      if (targetProcedureName && Array.isArray(bill.items)) {
        updatedItems = updatedItems.map(it => {
          if ((it.description || it.procedureName) === targetProcedureName) {
            const cost = parseFloat(it.subtotal || it.total || ((it.qty || 1) * (it.price || 0) - (it.discount || 0))) || 0;
            const currentPaid = parseFloat(it.paidAmount !== undefined ? it.paidAmount : (it.status === 'Pending' ? 0 : cost)) || 0;
            const newPaid = Math.min(cost, currentPaid + amt);
            const newDue = Math.max(0, cost - newPaid);
            return {
              ...it,
              subtotal: cost,
              total: cost,
              paidAmount: newPaid,
              dueAmount: newDue,
              status: newDue === 0 ? 'Paid' : 'Partial',
              paymentMode: newInstallmentMode,
              paymentMethod: newInstallmentMode
            };
          }
          return it;
        });
      }

      const totalPaidSum = updatedItems.reduce((s, it) => s + (parseFloat(it.paidAmount) || 0), 0);
      const totalDueSum = updatedItems.reduce((s, it) => s + (parseFloat(it.dueAmount) || 0), 0);

      const updatedBill = await billingApi.update(bill._id, {
        installments: updatedInstallments,
        items: updatedItems,
        paidAmount: totalPaidSum,
        dueAmount: totalDueSum,
        status: totalDueSum === 0 ? 'Paid' : 'Due'
      });

      if (onUpdateBill) {
        onUpdateBill(updatedBill);
      }
      
      setNewInstallmentAmount('');
      setNewInstallmentTxId('');
      setNewInstallmentNotes('');
      setSelectedProcedure('');
      const today = new Date();
      setNewInstallmentDate(today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'));
      toast.success("Installment payment recorded successfully");
    } catch (err) {
      console.error(err);
      setInstallmentError('Failed to record installment payment. Please try again.');
    } finally {
      setSavingInstallment(false);
    }
  };

  const handleSaveInstallmentDate = async (index) => {
    if (!editingInstallmentDate) {
      setEditingInstallmentIdx(null);
      return;
    }
    setSavingInstallmentEdit(true);
    try {
      const currentInstallments = [...paymentHistory];
      if (currentInstallments[index]) {
        currentInstallments[index] = {
          ...currentInstallments[index],
          date: new Date(editingInstallmentDate)
        };
        const updatedBill = await billingApi.update(bill._id, {
          installments: currentInstallments
        });
        if (onUpdateBill) {
          onUpdateBill(updatedBill);
        }
        toast.success("Payment date updated successfully");
      }
      setEditingInstallmentIdx(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update payment date");
    } finally {
      setSavingInstallmentEdit(false);
    }
  };

  const paymentHistory = (bill.installments && bill.installments.length > 0)
    ? bill.installments
    : (totals.paidAmount > 0
        ? [{
            date: bill.date || bill.createdAt || new Date(),
            amount: totals.paidAmount,
            paymentMethod: bill.paymentMethod || 'N/A',
            transactionId: bill.transactionId || '',
            notes: 'Single payment'
          }]
        : []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col border-2 sm:border-4 border-black my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b-2 border-black flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
          <div>
            <h3 className="text-xl font-black text-black">Invoice Details</h3>
            <p className="text-xs font-black text-black uppercase tracking-widest">{bill.invoiceNumber || bill.billId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-black font-black" />
          </button>
        </div>

        <div className="p-4 sm:p-8 overflow-y-auto space-y-5 sm:space-y-8 flex-1 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-black uppercase tracking-widest">Billed To</p>
              <p className="text-lg font-black text-black">{patient.fullName || `${patient.firstName} ${patient.lastName}`}</p>
              <p className="text-sm font-bold text-black">ID: {patient.patientId}</p>
              <p className="text-sm font-bold text-black">Ph: {patient.mobile || patient.contactNumber}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black text-black uppercase tracking-widest">Invoice Date</p>
              <p className="text-lg font-black text-black">{formatDateDMY(bill.date || bill.billDate || bill.createdAt)}</p>
              <div className="flex justify-end mt-2">
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border border-black ${
                  bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-900 border-emerald-400' : 'bg-rose-100 text-rose-900 border-rose-400'
                }`}>
                  {bill.status}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">Itemized Breakdown & Treatment Payments</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-black text-black uppercase tracking-widest text-left border-b border-black">
                    <th className="pb-2">Description / Procedure</th>
                    <th className="pb-2 text-center">Mode</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Cost (₹)</th>
                    <th className="pb-2 text-center">Status</th>
                    <th className="pb-2 text-right">Paid (₹)</th>
                    <th className="pb-2 text-right">Pending / Due (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.length > 0 ? items.map((item, idx) => {
                    const cost = parseFloat(item.subtotal || item.amount || (item.unitPrice || item.price || 0) * (item.qty || 1));
                    const itemPaid = item.paidAmount !== undefined 
                      ? parseFloat(item.paidAmount)
                      : ((paymentHistory && paymentHistory.length > 0)
                          ? paymentHistory
                              .filter(inst => (inst.procedureName && (inst.procedureName === item.description || inst.procedureName === item.procedureName)) || (inst.notes && inst.notes.includes(item.description || '')))
                              .reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0)
                          : (totals.dueAmount === 0 ? cost : Math.min(cost, totals.paidAmount)));
                    const itemDue = item.dueAmount !== undefined 
                      ? parseFloat(item.dueAmount) 
                      : Math.max(0, cost - itemPaid);
                    const itemStatus = item.status || (itemDue === 0 ? 'Paid' : (itemPaid > 0 ? 'Partial' : 'Pending'));

                    return (
                      <tr key={idx} className="text-sm">
                        <td className="py-3 font-bold text-black">
                          {item.description || item.procedureName}
                          {item.toothNumber && <span className="text-xs text-indigo-600 ml-1 font-semibold font-mono">(Tooth #{item.toothNumber})</span>}
                        </td>
                        <td className="py-3 text-center">
                          <span className="text-[10px] px-2 py-0.5 font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {item.paymentMode || item.paymentMethod || bill.paymentMethod || 'Cash'}
                          </span>
                        </td>
                        <td className="py-3 text-center font-bold text-black">{item.qty || 1}</td>
                        <td className="py-3 text-right font-bold text-black">₹{cost.toFixed(2)}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${
                            itemStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            itemStatus === 'Partial' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {itemStatus}
                          </span>
                        </td>
                        <td className="py-3 text-right font-black text-emerald-700">₹{itemPaid.toFixed(2)}</td>
                        <td className={`py-3 text-right font-black ${itemDue > 0 ? 'text-rose-700' : 'text-slate-400'}`}>₹{itemDue.toFixed(2)}</td>
                      </tr>
                    );
                  }) : (
                    <tr className="text-sm">
                      <td className="py-3 font-bold text-black">General Consultation</td>
                      <td className="py-3 text-center"><span className="text-[10px] px-2 py-0.5 font-bold rounded-md bg-indigo-50 text-indigo-700">{bill.paymentMethod || 'Cash'}</span></td>
                      <td className="py-3 text-center font-bold text-black">1</td>
                      <td className="py-3 text-right font-bold text-black">₹{bill.amount?.toFixed(2)}</td>
                      <td className="py-3 text-center"><span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-100 text-emerald-800">{bill.status}</span></td>
                      <td className="py-3 text-right font-black text-emerald-700">₹{(bill.paidAmount || 0).toFixed(2)}</td>
                      <td className="py-3 text-right font-black text-rose-700">₹{(bill.dueAmount || 0).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Installments / History Section */}
          {paymentHistory.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-black uppercase tracking-widest border-b-2 border-black pb-2">Payment Installments / History</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-black rounded-lg overflow-hidden">
                  <thead>
                    <tr className="text-[10px] font-black text-white bg-black uppercase tracking-widest text-left">
                      <th className="p-2 border-r border-white">Date</th>
                      <th className="p-2 border-r border-white">Receipt #</th>
                      <th className="p-2 border-r border-white">Mode</th>
                      <th className="p-2 border-r border-white">For Treatment</th>
                      <th className="p-2 border-r border-white">Transaction ID</th>
                      <th className="p-2 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-black">
                    {paymentHistory.map((inst, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 font-bold border-r border-slate-200">
                          {editingInstallmentIdx === index ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={editingInstallmentDate}
                                onChange={(e) => setEditingInstallmentDate(e.target.value)}
                                className="p-1 border border-black rounded text-[11px] font-bold bg-white text-black outline-none focus:ring-1 focus:ring-black"
                              />
                              <button
                                type="button"
                                disabled={savingInstallmentEdit}
                                onClick={() => handleSaveInstallmentDate(index)}
                                className="p-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold cursor-pointer transition shadow-xs"
                                title="Save Date"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingInstallmentIdx(null)}
                                className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition"
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1 group">
                              <span>{formatDateDMY(inst.date)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const d = inst.date ? new Date(inst.date) : new Date();
                                  const formatted = !isNaN(d.getTime()) 
                                    ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
                                    : '';
                                  setEditingInstallmentIdx(index);
                                  setEditingInstallmentDate(formatted);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-black transition-opacity cursor-pointer"
                                title="Change this payment date"
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-2 font-mono text-[10px] font-bold border-r border-slate-200">
                          {inst.receiptNumber || (bill.receiptNumber ? (paymentHistory.length > 1 ? `${bill.receiptNumber}-${index + 1}` : bill.receiptNumber) : `RCPT-${index + 1}`)}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                            inst.paymentMethod === 'Cash' ? 'bg-orange-100 text-orange-900 border-orange-300' :
                            inst.paymentMethod === 'UPI' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                            inst.paymentMethod === 'Card' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-gray-100 text-gray-900 border-gray-300'
                          }`}>
                            {inst.paymentMethod}
                          </span>
                        </td>
                        <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                          {inst.procedureName || inst.notes || 'General Bill'}
                        </td>
                        <td className="p-2 font-mono text-[10px] font-bold border-r border-slate-200">{inst.transactionId || '—'}</td>
                        <td className="p-2 text-right font-black">₹{(inst.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Record New Payment Section: ONLY displays treatments that have pending due */}
          {(() => {
            // Compute remaining due for each treatment
            const pendingTreatments = items.map((it, idx) => {
              const name = it.description || it.procedureName || `Treatment ${idx + 1}`;
              const cost = parseFloat(it.subtotal || it.amount || (it.unitPrice || it.price || 0) * (it.qty || 1)) || 0;
              const itemPaid = it.paidAmount !== undefined 
                ? parseFloat(it.paidAmount) 
                : ((paymentHistory && paymentHistory.length > 0)
                    ? paymentHistory
                        .filter(inst => (inst.procedureName && (inst.procedureName === it.description || inst.procedureName === it.procedureName)) || (inst.notes && inst.notes.includes(it.description || '')))
                        .reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0)
                    : (totals.dueAmount === 0 ? cost : Math.min(cost, totals.paidAmount)));
              const itemDue = it.dueAmount !== undefined 
                ? parseFloat(it.dueAmount) 
                : Math.max(0, cost - itemPaid);
              return {
                ...it,
                name,
                cost,
                paid: itemPaid,
                due: itemDue
              };
            }).filter(t => t.due > 0);

            const overallRemainingDue = bill.dueAmount !== undefined ? bill.dueAmount : totals.dueAmount;

            if (overallRemainingDue <= 0 || pendingTreatments.length === 0) {
              return (
                <div className="p-4 border-2 border-emerald-500 rounded-2xl bg-emerald-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
                    <CheckCircle className="w-5 h-5 text-emerald-600" /> All treatments are fully paid. No pending dues.
                  </div>
                </div>
              );
            }

            return (
              <div className="p-4 border-2 border-black rounded-2xl bg-amber-50/30">
                <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-1.5">
                  <h4 className="text-xs font-black text-black uppercase tracking-widest">
                    Record Payment for Pending Treatment
                  </h4>
                  <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    {pendingTreatments.length} treatment{pendingTreatments.length > 1 ? 's' : ''} pending
                  </span>
                </div>
                {installmentError && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-black">
                    {installmentError}
                  </div>
                )}
                <form onSubmit={handleAddInstallment} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    {/* Select Procedure / Treatment (ONLY UNPAID TREATMENTS) */}
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">
                        Select Pending Treatment
                      </label>
                      <select
                        value={selectedProcedure || (pendingTreatments[0]?.name || '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedProcedure(val);
                          const targetProc = pendingTreatments.find(p => p.name === val) || pendingTreatments[0];
                          if (targetProc) {
                            setNewInstallmentAmount(String(targetProc.due));
                            if (targetProc.paymentMode) setNewInstallmentMode(targetProc.paymentMode);
                          }
                        }}
                        className="w-full p-2 border border-black bg-white rounded-lg text-xs font-black text-black outline-none focus:ring-2 focus:ring-black"
                      >
                        {pendingTreatments.map((t, idx) => (
                          <option key={idx} value={t.name}>
                            {t.name} (Pending Due: ₹{t.due})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Date (Selectable: Past, Present, Future) */}
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={newInstallmentDate}
                        onChange={(e) => setNewInstallmentDate(e.target.value)}
                        className="w-full p-2 border border-black bg-white rounded-lg text-xs font-black text-black outline-none focus:ring-2 focus:ring-black cursor-pointer"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={newInstallmentMode}
                        onChange={(e) => setNewInstallmentMode(e.target.value)}
                        className="w-full p-2 border border-black bg-white rounded-lg text-xs font-black text-black outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Insurance">Insurance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={bill.dueAmount !== undefined ? bill.dueAmount : totals.dueAmount}
                        value={newInstallmentAmount}
                        onChange={(e) => setNewInstallmentAmount(e.target.value)}
                        placeholder={`Max ₹${bill.dueAmount !== undefined ? bill.dueAmount : totals.dueAmount}`}
                        className="w-full p-2 border border-black bg-white rounded-lg text-xs font-black text-black outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={savingInstallment || !newInstallmentAmount}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-50 border border-black cursor-pointer shadow-md"
                      >
                        {savingInstallment ? 'Recording...' : 'Record Payment'}
                      </button>
                    </div>
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {newInstallmentMode !== 'Cash' ? (
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">
                        Transaction ID / Reference
                      </label>
                      <input
                        type="text"
                        value={newInstallmentTxId}
                        onChange={(e) => setNewInstallmentTxId(e.target.value)}
                        placeholder="e.g. UTR / UPI Ref Number"
                        className="w-full p-2 border border-black bg-white rounded-lg text-xs font-black text-black outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  ) : (
                    <div className="hidden sm:block"></div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-black uppercase tracking-wider mb-1">
                      Notes / Remarks
                    </label>
                    <input
                      type="text"
                      value={newInstallmentNotes}
                      onChange={(e) => setNewInstallmentNotes(e.target.value)}
                      placeholder="Installment payment notes..."
                      className="w-full p-2 border border-black bg-white rounded-lg text-xs font-black text-black outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              </form>
            </div>
          );
        })()}

          <div className="bg-slate-50 p-6 rounded-2xl border border-black flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-black font-bold">Subtotal:</span>
                <span className="font-black text-black">₹{totals.grossAmount.toFixed(2)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-rose-700 font-bold border-b border-dashed border-rose-200 pb-1">
                  <span>Discount:</span>
                  <span className="font-black">-₹{totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-black font-bold">Tax ({totals.taxValue}%):</span>
                  <span className="font-black text-black">₹{totals.taxAmount.toFixed(2)}</span>
                </div>
              )}
              
              {bill.installments && bill.installments.length > 0 ? (
                <>
                  <div className="flex justify-between text-sm text-green-700 border-t border-black pt-2 font-bold">
                    <span>Paid So Far:</span>
                    <span className="font-black">₹{(bill.paidAmount !== undefined ? bill.paidAmount : totals.paidAmount).toFixed(2)}</span>
                  </div>
                  {((bill.dueAmount !== undefined ? bill.dueAmount : totals.dueAmount) > 0) ? (
                    <div className="flex justify-between text-sm text-rose-700 font-black">
                      <span>Remaining Due:</span>
                      <span>₹{(bill.dueAmount !== undefined ? bill.dueAmount : totals.dueAmount).toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm text-green-700 font-black border-t border-black pt-1">
                      <span>STATUS:</span>
                      <span>FULLY PAID</span>
                    </div>
                  )}
                </>
              ) : (
                bill.status === 'Paid' && (
                  <div className="flex justify-between text-sm text-green-700 border-t border-black pt-2 font-bold">
                    <span>Amount Paid:</span>
                    <span className="font-black">₹{totals.grandTotal.toFixed(2)}</span>
                  </div>
                )
              )}

              <div className="pt-3 border-t-2 border-black flex justify-between items-center">
                <span className="text-lg font-black text-black uppercase tracking-tighter">Grand Total</span>
                <span className="text-2xl font-black text-indigo-900">₹{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {bill.notes && (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-black uppercase tracking-widest">Additional Notes</p>
              <p className="text-sm text-black font-bold bg-amber-50 p-3 rounded-xl border border-black italic">
                {bill.notes}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 bg-slate-50 border-t-2 border-black flex flex-col-reverse sm:flex-row justify-between gap-3 shrink-0">
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => onDownload(bill)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-black hover:bg-indigo-700 border border-black transition-colors cursor-pointer"
            >
              <Download size={15} /> Download
            </button>
            <button 
              onClick={() => onPrint(bill)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-black hover:bg-slate-900 border border-black transition-colors cursor-pointer"
            >
              <Printer size={15} /> Print
            </button>
            <button 
              onClick={() => onWhatsApp && onWhatsApp(bill)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-green-650 text-white rounded-xl text-xs sm:text-sm font-black hover:bg-green-700 border border-black transition-colors cursor-pointer"
            >
              <Phone size={15} /> WhatsApp
            </button>
          </div>
          <button onClick={onClose} className="w-full sm:w-auto px-6 py-2 border-2 border-black text-black bg-white rounded-xl text-xs sm:text-sm font-black hover:bg-slate-50 transition-colors cursor-pointer">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const BillEditModal = ({ bill, onClose, onSave }) => {
  const formatToYMD = (d) => {
    if (!d) return new Date().toISOString().split('T')[0];
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return new Date().toISOString().split('T')[0];
      return dt.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const [formData, setFormData] = useState(() => {
    const rawItems = bill?.items && bill.items.length > 0 ? bill.items : [];
    const initialItems = rawItems.length > 0
      ? rawItems.map(it => {
          const q = parseFloat(it.qty ?? it.quantity ?? 1) || 1;
          const p = parseFloat(it.price ?? it.unitPrice ?? 0) || 0;
          const d = parseFloat(it.discount ?? it.discountAmount ?? 0) || 0;
          const sub = Math.max(0, Math.round(((q * p) - d) * 100) / 100);
          
          let paid = it.paidAmount !== undefined 
            ? parseFloat(it.paidAmount) 
            : (bill?.status === 'Paid' || Number(bill?.dueAmount) === 0 ? sub : (it.status === 'Pending' ? 0 : Math.min(sub, Number(bill?.paidAmount) || 0)));
          paid = Math.min(sub, Math.max(0, isNaN(paid) ? 0 : paid));
          const due = Math.max(0, Math.round((sub - paid) * 100) / 100);
          const stat = it.status || (due === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending'));

          return {
            _id: it._id,
            productId: it.productId,
            description: it.description || it.procedureName || '',
            toothNumber: it.toothNumber || '',
            paymentMode: it.paymentMode || it.paymentMethod || bill?.paymentMethod || 'Cash',
            qty: q,
            price: p,
            discount: d,
            subtotal: sub,
            status: stat,
            paidAmount: paid,
            dueAmount: due
          };
        })
      : [{
          description: 'Consultation / Dental Treatment',
          toothNumber: '',
          paymentMode: bill?.paymentMethod || 'Cash',
          qty: 1,
          price: bill?.amount || 0,
          discount: bill?.discount || 0,
          subtotal: bill?.amount || 0,
          status: (bill?.status === 'Pending' ? 'Pending' : (bill?.dueAmount === 0 ? 'Paid' : 'Partial')),
          paidAmount: bill?.paidAmount !== undefined ? bill.paidAmount : (bill?.dueAmount === 0 ? (bill?.amount || 0) : 0),
          dueAmount: bill?.dueAmount !== undefined ? bill.dueAmount : 0
        }];

    return {
      _id: bill?._id,
      billId: bill?.billId,
      date: formatToYMD(bill?.date || bill?.billDate || bill?.createdAt),
      status: bill?.status || 'Pending',
      paymentMethod: bill?.paymentMethod || 'Cash',
      amount: bill?.amount || 0,
      paidAmount: bill?.paidAmount || 0,
      dueAmount: bill?.dueAmount || 0,
      notes: bill?.notes || '',
      items: initialItems,
      discount: bill?.discount || bill?.discountAmount || 0
    };
  });

  const [loading, setLoading] = useState(false);

  // Recalculates gross, discount, grand total, paid and due from treatment items
  const recalculateTotals = (itemsList, overallDiscountVal) => {
    let gross = 0;
    let itemDiscountSum = 0;
    let totalPaid = 0;
    let totalDue = 0;

    itemsList.forEach(it => {
      const q = parseFloat(it.qty) || 1;
      const p = parseFloat(it.price) || 0;
      const d = parseFloat(it.discount) || 0;
      gross += (q * p);
      itemDiscountSum += d;
      totalPaid += (parseFloat(it.paidAmount) || 0);
      totalDue += (parseFloat(it.dueAmount) || 0);
    });

    const ovDisc = parseFloat(overallDiscountVal) || 0;
    const totalDiscount = ovDisc > 0 ? ovDisc : itemDiscountSum;
    const grandTotal = Math.max(0, gross - totalDiscount);

    return {
      grossAmount: Math.round(gross * 100) / 100,
      discountAmount: Math.round(totalDiscount * 100) / 100,
      taxableAmount: Math.round(grandTotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      paidAmount: Math.round(totalPaid * 100) / 100,
      dueAmount: Math.round(totalDue * 100) / 100
    };
  };

  const handleItemFieldChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.items];
      const currentItem = { ...updated[index] };

      if (field === 'status') {
        currentItem.status = value;
        const sub = currentItem.subtotal || 0;
        if (value === 'Paid') {
          currentItem.paidAmount = sub;
          currentItem.dueAmount = 0;
        } else if (value === 'Pending') {
          currentItem.paidAmount = 0;
          currentItem.dueAmount = sub;
        } else if (value === 'Partial') {
          if (currentItem.paidAmount <= 0 || currentItem.paidAmount >= sub) {
            currentItem.paidAmount = Math.round((sub / 2) * 100) / 100;
          }
          currentItem.dueAmount = Math.max(0, Math.round((sub - currentItem.paidAmount) * 100) / 100);
        }
      } else if (field === 'paidAmount') {
        const sub = currentItem.subtotal || 0;
        const val = value === '' ? 0 : parseFloat(value);
        const p = Math.min(sub, Math.max(0, isNaN(val) ? 0 : val));
        currentItem.paidAmount = p;
        currentItem.dueAmount = Math.max(0, Math.round((sub - p) * 100) / 100);
        currentItem.status = currentItem.dueAmount === 0 ? 'Paid' : (p > 0 ? 'Partial' : 'Pending');
      } else if (field === 'dueAmount') {
        const sub = currentItem.subtotal || 0;
        const val = value === '' ? 0 : parseFloat(value);
        const d = Math.min(sub, Math.max(0, isNaN(val) ? 0 : val));
        currentItem.dueAmount = d;
        currentItem.paidAmount = Math.max(0, Math.round((sub - d) * 100) / 100);
        currentItem.status = d === 0 ? 'Paid' : (currentItem.paidAmount > 0 ? 'Partial' : 'Pending');
      } else {
        currentItem[field] = value;
        if (field === 'qty' || field === 'price' || field === 'discount') {
          const q = parseFloat(field === 'qty' ? value : currentItem.qty) || 1;
          const p = parseFloat(field === 'price' ? value : currentItem.price) || 0;
          const d = parseFloat(field === 'discount' ? value : currentItem.discount) || 0;
          const sub = Math.max(0, Math.round(((q * p) - d) * 100) / 100);
          currentItem.subtotal = sub;
          if (currentItem.status === 'Paid') {
            currentItem.paidAmount = sub;
            currentItem.dueAmount = 0;
          } else if (currentItem.status === 'Pending') {
            currentItem.paidAmount = 0;
            currentItem.dueAmount = sub;
          } else {
            currentItem.paidAmount = Math.min(sub, currentItem.paidAmount || 0);
            currentItem.dueAmount = Math.max(0, Math.round((sub - currentItem.paidAmount) * 100) / 100);
          }
        }
      }

      updated[index] = currentItem;
      const totals = recalculateTotals(updated, prev.discount);
      return {
        ...prev,
        items: updated,
        amount: totals.grandTotal,
        grossAmount: totals.grossAmount,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
        status: totals.dueAmount === 0 ? 'Paid' : (totals.paidAmount > 0 ? 'Due' : 'Pending')
      };
    });
  };

  const handleAddItem = () => {
    setFormData(prev => {
      const newItem = {
        description: '',
        toothNumber: '',
        paymentMode: prev.paymentMethod !== 'Multiple' ? prev.paymentMethod : 'Cash',
        qty: 1,
        price: 0,
        discount: 0,
        subtotal: 0,
        status: 'Paid',
        paidAmount: 0,
        dueAmount: 0
      };
      const updated = [...prev.items, newItem];
      const totals = recalculateTotals(updated, prev.discount);
      return {
        ...prev,
        items: updated,
        amount: totals.grandTotal,
        grossAmount: totals.grossAmount,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
        status: totals.dueAmount === 0 ? 'Paid' : (totals.paidAmount > 0 ? 'Due' : 'Pending')
      };
    });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) {
      toast.warning("A bill must have at least one procedure or item.");
      return;
    }
    setFormData(prev => {
      const updated = prev.items.filter((_, i) => i !== index);
      const totals = recalculateTotals(updated, prev.discount);
      return {
        ...prev,
        items: updated,
        amount: totals.grandTotal,
        grossAmount: totals.grossAmount,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
        status: totals.dueAmount === 0 ? 'Paid' : (totals.paidAmount > 0 ? 'Due' : 'Pending')
      };
    });
  };

  const handleOverallDiscountChange = (val) => {
    const d = parseFloat(val) || 0;
    setFormData(prev => {
      const totals = recalculateTotals(prev.items, d);
      return {
        ...prev,
        discount: d,
        amount: totals.grandTotal,
        grossAmount: totals.grossAmount,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
        status: totals.dueAmount === 0 ? 'Paid' : (totals.paidAmount > 0 ? 'Due' : 'Pending')
      };
    });
  };

  const computedTotals = recalculateTotals(formData.items, formData.discount);

  const handleUpdate = async () => {
    if (!formData.items || formData.items.length === 0) {
      toast.error("Please add at least one item or procedure.");
      return;
    }

    if (formData.items.some(i => !i.description.trim())) {
      toast.error("Please fill in procedure descriptions for all items.");
      return;
    }

    setLoading(true);
    try {
      const totals = computedTotals;
      const status = totals.dueAmount === 0 ? 'Paid' : (totals.paidAmount > 0 ? 'Due' : 'Pending');

      const formattedItems = formData.items.map(it => {
        const q = parseFloat(it.qty) || 1;
        const p = parseFloat(it.price) || 0;
        const d = parseFloat(it.discount) || 0;
        const sub = Math.max(0, Math.round(((q * p) - d) * 100) / 100);
        const itemPaid = parseFloat(it.paidAmount) || 0;
        const itemDue = Math.max(0, Math.round((sub - itemPaid) * 100) / 100);
        const itemStatus = it.status || (itemDue === 0 ? 'Paid' : (itemPaid > 0 ? 'Partial' : 'Pending'));

        return {
          _id: it._id,
          productId: it.productId,
          description: it.description.trim(),
          procedureName: it.description.trim(),
          toothNumber: it.toothNumber ? String(it.toothNumber).trim() : '',
          paymentMode: it.paymentMode || formData.paymentMethod || 'Cash',
          paymentMethod: it.paymentMode || formData.paymentMethod || 'Cash',
          qty: q,
          quantity: q,
          price: p,
          unitPrice: p,
          discount: d,
          discountAmount: d,
          subtotal: sub,
          total: sub,
          status: itemStatus,
          paidAmount: itemPaid,
          dueAmount: itemDue
        };
      });

      const uniqueModes = [...new Set(formattedItems.map(it => it.paymentMode).filter(Boolean))];
      let resolvedPaymentMethod = formData.paymentMethod;
      if (uniqueModes.length > 1) {
        resolvedPaymentMethod = 'Multiple';
      } else if (uniqueModes.length === 1 && (!formData.paymentMethod || formData.paymentMethod === 'Multiple')) {
        resolvedPaymentMethod = uniqueModes[0];
      }

      // Generate or preserve installments to match treatment paid amounts
      const baseRcpt = bill.receiptNumber || `RCPT-${(String(bill.invoiceNumber || bill.billId || '').replace(/\D/g, '') || '1001')}`;
      const updatedInstallments = [];
      formattedItems.forEach((it, idx) => {
        if (it.paidAmount > 0) {
          updatedInstallments.push({
            date: formData.date ? new Date(formData.date) : new Date(),
            amount: it.paidAmount,
            paymentMethod: it.paymentMode || resolvedPaymentMethod || 'Cash',
            procedureName: it.description || 'Procedure',
            receiptNumber: formattedItems.length > 1 ? `${baseRcpt}-${idx + 1}` : baseRcpt,
            notes: it.dueAmount === 0 
              ? `Full payment for ${it.description || 'Procedure'}` 
              : `Part payment for ${it.description || 'Procedure'} (Pending: ₹${it.dueAmount})`
          });
        }
      });

      const updatedData = {
        date: formData.date ? new Date(formData.date) : new Date(),
        billDate: formData.date,
        status,
        paymentMethod: resolvedPaymentMethod,
        items: formattedItems,
        installments: updatedInstallments,
        amount: totals.grandTotal,
        grossAmount: totals.grossAmount,
        discount: totals.discountAmount,
        discountAmount: totals.discountAmount,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
        notes: formData.notes
      };

      await billingApi.update(bill._id, updatedData);
      toast.success("Bill and treatment payments updated successfully!");
      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Failed to update bill.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white shrink-0">
          <div>
            <h3 className="text-lg font-bold">Edit Bill & Treatment Payments</h3>
            <p className="text-xs text-indigo-100 font-medium">Invoice #{formData.billId || bill?._id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Top metadata grid: Date, Default Payment Mode, Auto Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                <Calendar size={12} className="text-indigo-600" /> Bill Date (Past / Present / Future)
              </label>
              <input 
                type="date"
                value={formData.date}
                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Default Payment Mode</label>
              <select 
                value={formData.paymentMethod}
                onChange={e => {
                  const val = e.target.value;
                  setFormData(p => ({
                    ...p,
                    paymentMethod: val,
                    items: val !== 'Multiple' ? p.items.map(it => ({ ...it, paymentMode: val })) : p.items
                  }));
                }}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Insurance">Insurance</option>
                <option value="Multiple">Multiple / Split</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Overall Bill Status</label>
              <div className={`p-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-between border shadow-2xs ${
                computedTotals.dueAmount === 0 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : (computedTotals.paidAmount > 0 ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-rose-50 text-rose-800 border-rose-300')
              }`}>
                <span>{computedTotals.dueAmount === 0 ? 'Fully Paid' : (computedTotals.paidAmount > 0 ? 'Due / Partial' : 'Pending')}</span>
                <span className="text-[9px] font-bold opacity-70 lowercase">(auto computed)</span>
              </div>
            </div>
          </div>

          {/* Treatments & Line Items Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Treatments & Procedures</h4>
                <p className="text-[11px] text-slate-500">Set treatment name, tooth #, payment mode, paid amount, and pending due per treatment</p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={14} /> Add Treatment
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, idx) => (
                <div key={idx} className="bg-slate-50/90 border border-slate-200 p-4 rounded-2xl space-y-3 shadow-2xs hover:border-indigo-300 transition-colors">
                  {/* Top line of treatment row: Number, Procedure Description, Tooth #, Remove */}
                  <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    
                    {/* Procedure description */}
                    <div className="flex-1 w-full min-w-[180px]">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest sm:hidden">Procedure / Treatment</label>
                      <input 
                        type="text"
                        placeholder="e.g. RCT, Ceramic Crown, Dental Cleaning..."
                        value={item.description}
                        onChange={e => handleItemFieldChange(idx, 'description', e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    {/* Tooth number */}
                    <div className="w-full sm:w-20">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest sm:hidden">Tooth #</label>
                      <input 
                        type="text"
                        placeholder="Tooth #"
                        value={item.toothNumber || ''}
                        onChange={e => handleItemFieldChange(idx, 'toothNumber', e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                        title="Tooth Number (e.g. 18, 36, or All)"
                      />
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={formData.items.length <= 1}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 self-end sm:self-center"
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Financial & Per-Treatment Payment Line */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 pt-2 border-t border-slate-200/80 items-end">
                    {/* Qty */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Qty</label>
                      <input 
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => handleItemFieldChange(idx, 'qty', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none text-center focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Price (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        value={item.price || ''}
                        placeholder="0"
                        onChange={e => handleItemFieldChange(idx, 'price', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none text-right focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Discount */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Disc (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        value={item.discount || ''}
                        placeholder="0"
                        onChange={e => handleItemFieldChange(idx, 'discount', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none text-right focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Subtotal */}
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1 text-right">Total (₹)</label>
                      <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-900 text-right">
                        ₹{(item.subtotal || 0).toLocaleString()}
                      </div>
                    </div>

                    {/* Mode of payment for this treatment */}
                    <div>
                      <label className="text-[9px] font-black text-indigo-700 uppercase tracking-wider block mb-1">Mode</label>
                      <select
                        value={item.paymentMode || formData.paymentMethod || 'Cash'}
                        onChange={e => handleItemFieldChange(idx, 'paymentMode', e.target.value)}
                        className="w-full p-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs font-black text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank</option>
                        <option value="Insurance">Insurance</option>
                      </select>
                    </div>

                    {/* Treatment Payment Status */}
                    <div>
                      <label className="text-[9px] font-black text-indigo-700 uppercase tracking-wider block mb-1">Payment Status</label>
                      <select
                        value={item.status || (item.dueAmount === 0 ? 'Paid' : (item.paidAmount > 0 ? 'Partial' : 'Pending'))}
                        onChange={e => handleItemFieldChange(idx, 'status', e.target.value)}
                        className={`w-full p-2 border rounded-xl text-xs font-black outline-none cursor-pointer shadow-2xs ${
                          (item.status === 'Paid' || item.dueAmount === 0) 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : (item.status === 'Partial' || item.paidAmount > 0 ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-rose-50 text-rose-800 border-rose-300')
                        }`}
                      >
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>

                    {/* Paid / Advance for this treatment */}
                    <div>
                      <label className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block mb-1">Paid (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        max={item.subtotal || 0}
                        value={item.paidAmount !== undefined ? item.paidAmount : (item.status === 'Pending' ? 0 : item.subtotal)}
                        onChange={e => handleItemFieldChange(idx, 'paidAmount', e.target.value)}
                        className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs font-black text-emerald-800 outline-none text-right focus:ring-2 focus:ring-emerald-500"
                        title="Amount paid/advance for this treatment"
                      />
                    </div>

                    {/* Pending / Due for this treatment */}
                    <div>
                      <label className="text-[9px] font-black text-rose-700 uppercase tracking-wider block mb-1">Pending (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        max={item.subtotal || 0}
                        value={item.dueAmount !== undefined ? item.dueAmount : 0}
                        onChange={e => handleItemFieldChange(idx, 'dueAmount', e.target.value)}
                        className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs font-black text-rose-800 outline-none text-right focus:ring-2 focus:ring-rose-500"
                        title="Amount pending for this treatment"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial summary: Subtotal, Discount, Grand Total, Paid, Due */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Total</label>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900">
                ₹{computedTotals.grossAmount.toLocaleString()}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Discount (₹)</label>
              <input 
                type="number" 
                min="0"
                value={formData.discount || ''}
                onChange={e => handleOverallDiscountChange(e.target.value)}
                placeholder="0"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Grand Total (₹)</label>
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-black text-indigo-700">
                ₹{computedTotals.grandTotal.toLocaleString()}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Total Paid (₹)</label>
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-black text-emerald-800">
                ₹{computedTotals.paidAmount.toLocaleString()}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-4 flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-500">Overall Pending Due Amount:</span>
              <span className={`text-sm font-black ${computedTotals.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                ₹{computedTotals.dueAmount.toLocaleString()} {computedTotals.dueAmount === 0 ? '(All Treatments Fully Paid)' : ''}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Additional Notes</label>
            <textarea 
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              rows="2"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              placeholder="Clinical or billing notes..."
            />
          </div>
        </div>

        <div className="p-3.5 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
          <button 
            onClick={handleUpdate}
            disabled={loading}
            className="flex-1 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Save Bill & Treatment Payments'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const TabBilling = ({
  patient,
  appointments = [],
  onPrint,
  onDownload,
  onWhatsApp,
  clinicInfo,
  setIsDownloading,
  setDownloadProgress,
  setDownloadFileName,
  invoiceTemplates = [],
  selectedInvoiceTemplate = null,
  setSelectedInvoiceTemplate = () => {},
  onOpenTemplateModal,
  isDentistClinic,
  onNewPharmacyBill,
  onBillCreated
}) => {
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState({ totalBilled: 0, totalPaid: 0, totalDue: 0, invoiceCount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [billingTab, setBillingTab] = useState('Consultant');
  const [showDentalBillingModal, setShowDentalBillingModal] = useState(false);
  
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
      const billType = billingTab === 'Consultant' ? 'General' : (billingTab === 'Pharmacy' ? 'Pharmacy' : 'Dental');
      const lookupId = patient?._id || patient?.patientId || '';
      const response = await billingApi.getByPatient(lookupId, { 
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
      const cleanPatientName = (patient.fullName || patient.patientId || 'Patient').trim().replace(/\s+/g, '_');
      const payload = { 
        billIds: selectedBillIds,
        templateId: selectedInvoiceTemplate?._id,
        action: action
      };
      
      if (action === 'download') {
        toast.info("Preparing billing invoices PDF...");
        setIsDownloading(true);
        setDownloadProgress(0);
        const fileName = `Invoices-${cleanPatientName}.pdf`;
        setDownloadFileName(fileName);
        
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
              link.setAttribute('download', response.statement.fileName || fileName);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setIsDownloading(false);
              toast.success("Invoices downloaded successfully!");
            }, 500);
          } else {
            setIsDownloading(false);
            toast.error("Failed to generate invoices URL");
          }
        } catch (err) {
          clearInterval(timer);
          setIsDownloading(false);
          toast.error("Invoices generation failed");
        }
      } else if (action === 'print') {
        toast.info("Preparing invoices for print...");
        try {
          const response = await billingApi.generateStatement(patient.patientId || patient._id, { ...payload, disposition: 'inline', action: 'print' });
          if (response && response.statement?.signedUrl) {
            const printWindow = window.open(response.statement.signedUrl, '_blank');
            if (printWindow) {
              printWindow.focus();
            }
          } else {
            toast.error("Failed to load invoices for printing");
          }
        } catch (err) {
          console.error("Bulk print error:", err);
          toast.error("Failed to prepare invoices for printing");
        }
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
    <div className="space-y-4 sm:space-y-6 relative pb-36 md:pb-28 lg:pb-12">
      {/* Billing Type Tabs */}
      <div className="flex items-center gap-2 sm:gap-4 border-b border-slate-100 pb-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setBillingTab('Consultant')}
          className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all relative shrink-0 whitespace-nowrap ${
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
          className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all relative shrink-0 whitespace-nowrap ${
            billingTab === 'Pharmacy' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Medical Pharmacy Billing
          {billingTab === 'Pharmacy' && (
            <motion.div layoutId="activeBillingTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />
          )}
        </button>
        {isDentistClinic && (
          <button
            onClick={() => setBillingTab('Dental')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all relative shrink-0 whitespace-nowrap ${
              billingTab === 'Dental' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Dental Billing
            {billingTab === 'Dental' && (
              <motion.div layoutId="activeBillingTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />
            )}
          </button>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {(() => {
          const calculatedTotals = filteredBills.map(b => 
            b.billType === 'Pharmacy' ? normalizePharmacyInvoice(b) : calculateInvoiceTotals(b)
          );
          const currentTotalBilled = calculatedTotals.reduce((sum, t) => sum + t.grandTotal, 0);
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
              className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2.5 sm:gap-4"
            >
              <div className={`p-2 sm:p-3 ${stat.color} rounded-xl shadow-inner shrink-0`}><stat.icon size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{stat.label}</p>
                <p className={`text-sm sm:text-xl font-bold truncate ${stat.valColor || 'text-slate-800'}`}>{stat.value}</p>
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
          {billingTab === 'Dental' && (
            <button 
              type="button"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              onClick={() => setShowDentalBillingModal(true)}
              title="Create Dental Bill"
            >
              <IndianRupee size={15} />
              Create Bill
            </button>
          )}
          {billingTab === 'Pharmacy' && (
            <>
              <button 
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                onClick={onNewPharmacyBill}
              >
                <Plus size={16} className="text-indigo-500" />
                Add Medicine
              </button>
              <button 
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm group"
                onClick={onOpenTemplateModal}
              >
                <Layout size={16} className="text-indigo-500 group-hover:rotate-12 transition-transform" />
                Choose Template
              </button>
            </>
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
            className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-[50] w-full max-w-2xl px-4"
          >
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800/50 backdrop-blur-md bg-opacity-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg">
                  {selectedBillIds.length}
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-tighter">Invoices Selected</p>
                  <p className="text-[10px] font-bold text-slate-400">All invoices formatted with official clinic template</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => handleBulkAction('print')}
                  disabled={bulkLoading}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-semibold"
                  title="Print All Invoices"
                >
                  <Printer size={18} />
                  <span>Print All</span>
                </button>
                <button 
                  onClick={() => handleBulkAction('download')}
                  disabled={bulkLoading}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-semibold shadow-md shadow-indigo-600/30"
                  title="Download All Invoices (PDF)"
                >
                  {bulkLoading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  <span>Download All</span>
                </button>
                <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block"></div>
                <button 
                  onClick={() => setSelectedBillIds([])}
                  className="p-2.5 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors"
                  title="Clear Selection"
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
              className={`group bg-white border rounded-2xl p-3.5 sm:p-5 transition-all duration-300 flex flex-col sm:flex-row gap-3 sm:gap-5 ${
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
                              {formatDateDMY(bill.date || bill.billDate || bill.createdAt)} • Dr. {bill.doctorName}
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

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  {(() => {
                    const totals = bill.billType === 'Pharmacy' ? normalizePharmacyInvoice(bill) : calculateInvoiceTotals(bill);
                    return (
                      <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 w-full sm:w-auto flex-wrap">
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
                        <div className="hidden sm:block w-px h-8 bg-slate-100"></div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Due</p>
                          <p className="text-sm font-bold text-rose-600">₹{totals.dueAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                    <div className="flex p-0.5 sm:p-1 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
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

                    <div className="flex p-0.5 sm:p-1 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                      <ActionButton 
                        icon={Download} 
                        label="PDF" 
                        onClick={() => onDownload(bill)} 
                        colorClass="text-slate-500" 
                        hoverBg="bg-white text-blue-600 shadow-sm" 
                      />
                      <ActionButton 
                        icon={Printer} 
                        label="Print" 
                        onClick={() => onPrint(bill)} 
                        colorClass="text-slate-500" 
                        hoverBg="bg-white text-emerald-600 shadow-sm" 
                      />
                      <ActionButton 
                        icon={Phone} 
                        label="WhatsApp" 
                        onClick={() => onWhatsApp && onWhatsApp(bill)} 
                        colorClass="text-slate-500" 
                        hoverBg="bg-white text-green-600 shadow-sm" 
                      />
                    </div>

                    <div className="flex p-0.5 sm:p-1 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
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
            {billingTab === 'Dental' && (
              <button
                type="button"
                onClick={() => setShowDentalBillingModal(true)}
                className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <IndianRupee size={15} />
                Create Dental Bill
              </button>
            )}
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
            onPrint={onPrint}
            onWhatsApp={onWhatsApp}
            onUpdateBill={(updatedBill) => {
              setViewingBill(updatedBill);
              fetchBills(currentPage);
            }}
          />
        )}
        {editingBill && (
          <BillEditModal 
            bill={editingBill} 
            onClose={() => setEditingBill(null)} 
            onSave={fetchBills} 
          />
        )}
        {showDentalBillingModal && (
          <DentalBillingCreatorModal
            patientId={patient?._id || patient?.patientId}
            patientData={patient}
            appointments={appointments}
            onClose={() => setShowDentalBillingModal(false)}
            onComplete={() => {
              setShowDentalBillingModal(false);
              fetchBills(currentPage);
              if (onBillCreated) onBillCreated();
            }}
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
  TabOther - Other Services & Doctor Visit Billing
-------------------------------------------------- */

// Common procedures list for instant selection or custom typing
const COMMON_PROCEDURES = [
  'Consultation / Checkup',
  'Root Canal Treatment (RCT)',
  'Tooth Extraction',
  'Surgical Extraction / Impaction',
  'Dental Implant Placement',
  'Crown & Bridge Preparation',
  'Orthodontic Treatment / Aligners',
  'Teeth Scaling & Polishing',
  'Periodontal Flap Surgery',
  'Complete / Partial Denture',
  'Composite / Laser Filling',
  'Pediatric Pulpectomy',
  'Minor Oral Surgery',
  'Cyst Enucleation / Biopsy',
  'Bleaching / Teeth Whitening',
  'Dental Veneers / Laminates'
];

// Helper to resolve patient profile details correctly
const getPatientInfo = (patient) => {
  const name = (
    patient?.fullName ||
    `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() ||
    patient?.name ||
    patient?.patientName ||
    'Patient'
  ).replace(/\b(MR|MS|MRS|DR|SHRI|SMT)\.?\s+\1\.?\b/gi, '$1.').trim() || 'Patient';

  const phone = patient?.mobile || patient?.phone || patient?.contactNumber || patient?.contact || 'N/A';
  const id = patient?.patientId || patient?._id || 'N/A';
  const age = patient?.age || 'N/A';
  const gender = patient?.gender || 'N/A';

  return { name, phone, id, age, gender };
};

const DoctorVisitReceiptModal = ({ isOpen, onClose, bill, patient, clinicInfo }) => {
  if (!isOpen || !bill) return null;

  const vDetails = bill.visitingDoctorDetails || {};
  const patientInfo = getPatientInfo(patient);
  const printReceipt = () => {
    window.print();
  };

  const proceduresList = vDetails.procedures && vDetails.procedures.length > 0
    ? vDetails.procedures
    : (bill.items && bill.items.length > 0
        ? bill.items.map(it => ({ name: it.procedureName || it.description || 'Procedure', amount: it.cost || it.unitPrice || it.subtotal || 0 }))
        : [{ name: vDetails.procedureName || 'Specialist Consultation', amount: vDetails.paidToDoctor || bill.amount || 0 }]
      );

  const totalExpense = Number(vDetails.paidToDoctor || bill.amount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #doctor-visit-receipt-print-area, #doctor-visit-receipt-print-area * { visibility: visible; }
          #doctor-visit-receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print-area { display: none !important; }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Action Bar */}
        <div className="p-4 bg-slate-100 flex items-center justify-between border-b no-print-area">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-purple-700" />
            <span className="text-sm font-black uppercase tracking-wider text-slate-800">Doctor Visit Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={printReceipt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="doctor-visit-receipt-print-area" className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Clinic Brand Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                {clinicInfo.name || clinicInfo.clinicName || 'Clinic Management System'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {typeof clinicInfo.address === 'string' ? clinicInfo.address : (clinicInfo.address?.street ? `${clinicInfo.address.street}, ${clinicInfo.address.city || ''}` : 'Specialist & Multispeciality Clinic')}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Phone: {clinicInfo.phone || clinicInfo.mobile || 'N/A'} | Email: {clinicInfo.email || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 uppercase tracking-wider">
                Doctor Visit Voucher
              </span>
              <p className="text-xs font-mono font-bold text-slate-600 mt-1">Receipt: #{bill.billId || bill.invoiceNumber || 'N/A'}</p>
              <p className="text-xs text-slate-500 font-medium">Date: {bill.date ? new Date(bill.date).toLocaleDateString() : new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Patient & Doctor Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Patient Details</p>
              <p className="font-extrabold text-slate-900 text-sm">{patientInfo.name}</p>
              <p className="text-xs text-slate-600 font-medium">Patient ID: <span className="font-bold">{patientInfo.id}</span></p>
              <p className="text-xs text-slate-600 font-medium">Phone: {patientInfo.phone}</p>
              <p className="text-xs text-slate-600 font-medium">Age/Gender: {patientInfo.age} / {patientInfo.gender}</p>
            </div>

            <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200">
              <p className="text-[10px] font-black uppercase text-purple-700 tracking-widest mb-1">Visiting Specialist Doctor</p>
              <p className="font-extrabold text-purple-950 text-sm">Dr. {vDetails.doctorName || bill.doctorName || 'Visiting Doctor'}</p>
              <p className="text-xs text-purple-800 font-medium">Specialty: <span className="font-bold">{vDetails.doctorSpecialty || 'Specialist'}</span></p>
              {vDetails.doctorPhone && (
                <p className="text-xs text-purple-800 font-medium">Phone: {vDetails.doctorPhone}</p>
              )}
              <p className="text-xs text-purple-800 font-medium">Payment Mode: <span className="font-bold text-slate-900">{vDetails.doctorPaymentMode || 'Cash'}</span></p>
            </div>
          </div>

          {/* Procedures Breakdown */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Procedure / Treatment Done</th>
                  <th className="p-3 text-right">Amount Given to Doctor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {proceduresList.map((proc, idx) => (
                  <tr key={idx}>
                    <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{proc.name || proc.procedureName}</td>
                    <td className="p-3 text-right font-extrabold text-slate-900">₹{Number(proc.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="p-3 text-right text-xs uppercase tracking-wider text-slate-600">Total Amount Given to Doctor (Clinic Expense):</td>
                  <td className="p-3 text-right text-sm font-black text-purple-950">₹{totalExpense.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes if available */}
          {bill.notes && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Clinical Notes / Procedure Observation</span>
              <p className="text-slate-800 whitespace-pre-wrap">{bill.notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-center text-xs">
            <div>
              <div className="w-36 border-b border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-700">Visiting Doctor Signature</p>
            </div>
            <div>
              <div className="w-36 border-b border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-700">Authorized Clinic Stamp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DoctorVisitModal = ({ isOpen, onClose, onSave, editingBill, patient, clinicInfo }) => {
  if (!isOpen) return null;

  const patientInfo = getPatientInfo(patient);

  const [doctorName, setDoctorName] = useState(editingBill?.visitingDoctorDetails?.doctorName || editingBill?.doctorName || '');
  const [doctorSpecialty, setDoctorSpecialty] = useState(editingBill?.visitingDoctorDetails?.doctorSpecialty || '');
  const [doctorPhone, setDoctorPhone] = useState(editingBill?.visitingDoctorDetails?.doctorPhone || '');
  const [visitDate, setVisitDate] = useState(() => {
    if (editingBill?.date) {
      try {
        return new Date(editingBill.date).toISOString().slice(0, 16);
      } catch (e) {
        return new Date().toISOString().slice(0, 16);
      }
    }
    return new Date().toISOString().slice(0, 16);
  });
  
  // Procedures array (supports multiple procedures with dropdown selection and custom typing)
  const [procedures, setProcedures] = useState(() => {
    if (editingBill?.visitingDoctorDetails?.procedures && editingBill.visitingDoctorDetails.procedures.length > 0) {
      return editingBill.visitingDoctorDetails.procedures.map(p => ({
        name: p.name || p.procedureName || '',
        amount: p.amount !== undefined ? p.amount : ''
      }));
    }
    if (editingBill?.items && editingBill.items.length > 0) {
      return editingBill.items.map(it => ({
        name: it.procedureName || it.description || '',
        amount: it.cost !== undefined ? it.cost : (it.unitPrice !== undefined ? it.unitPrice : it.subtotal || '')
      }));
    }
    if (editingBill?.visitingDoctorDetails?.procedureName) {
      return [{
        name: editingBill.visitingDoctorDetails.procedureName,
        amount: editingBill.visitingDoctorDetails.paidToDoctor || editingBill.visitingDoctorDetails.doctorFee || editingBill.amount || ''
      }];
    }
    return [{ name: '', amount: '' }];
  });

  const [doctorPaymentMode, setDoctorPaymentMode] = useState(editingBill?.visitingDoctorDetails?.doctorPaymentMode || editingBill?.paymentMethod || 'Cash');
  const [notes, setNotes] = useState(editingBill?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  // Procedure list handlers
  const handleAddProcedure = () => {
    setProcedures(prev => [...prev, { name: '', amount: '' }]);
  };

  const handleProcedureChange = (index, field, value) => {
    setProcedures(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveProcedure = (index) => {
    if (procedures.length <= 1) return;
    setProcedures(prev => prev.filter((_, i) => i !== index));
  };

  // Total amount given to doctor is the sum of procedure amounts
  const totalAmountGivenToDoctor = procedures.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const handleSubmit = async (e, shouldPrintReceipt = false) => {
    e.preventDefault();
    if (!doctorName.trim()) {
      toast.error('Please enter the Visiting Doctor Name');
      return;
    }
    
    const validProcedures = procedures.filter(p => p.name.trim().length > 0);
    if (validProcedures.length === 0) {
      toast.error('Please enter or select at least one procedure');
      return;
    }

    setSubmitting(true);
    try {
      const procedureSummaryName = validProcedures.map(p => p.name.trim()).join(', ');
      const items = validProcedures.map(p => ({
        description: p.name.trim(),
        procedureName: p.name.trim(),
        qty: 1,
        unitPrice: parseFloat(p.amount) || 0,
        cost: parseFloat(p.amount) || 0,
        subtotal: parseFloat(p.amount) || 0,
        total: parseFloat(p.amount) || 0,
        price: parseFloat(p.amount) || 0,
        status: 'Paid',
        paidAmount: parseFloat(p.amount) || 0,
        dueAmount: 0
      }));

      const payload = {
        patientId: patientInfo.id !== 'N/A' ? patientInfo.id : 'PATIENT',
        patientName: patientInfo.name,
        patientPhone: patientInfo.phone !== 'N/A' ? patientInfo.phone : '',
        doctorId: `VISITING_${doctorName.trim().replace(/\s+/g, '_')}`,
        doctorName: doctorName.trim(),
        billType: 'DoctorVisit',
        amount: totalAmountGivenToDoctor,
        paidAmount: totalAmountGivenToDoctor,
        dueAmount: 0,
        status: 'Paid',
        paymentMethod: doctorPaymentMode || 'Cash',
        date: visitDate ? new Date(visitDate) : new Date(),
        items: items,
        visitingDoctorDetails: {
          doctorName: doctorName.trim(),
          doctorSpecialty: doctorSpecialty.trim(),
          doctorPhone: doctorPhone.trim(),
          procedureName: procedureSummaryName,
          procedures: validProcedures.map(p => ({
            name: p.name.trim(),
            amount: parseFloat(p.amount) || 0
          })),
          doctorFee: totalAmountGivenToDoctor,
          paidToDoctor: totalAmountGivenToDoctor,
          doctorDue: 0,
          doctorPayoutStatus: 'Paid',
          doctorPaymentMode: doctorPaymentMode || 'Cash',
          clinicShare: 0
        },
        notes: notes.trim()
      };

      let savedBill;
      if (editingBill?._id) {
        savedBill = await billingApi.update(editingBill._id, payload);
        toast.success('Doctor visit billing record updated successfully!');
      } else {
        savedBill = await billingApi.create(payload);
        toast.success('Doctor visit record created! Expense added to Expense Dashboard.');
      }

      onSave(savedBill, shouldPrintReceipt);
      onClose();
    } catch (err) {
      console.error('Error saving doctor visit bill:', err);
      toast.error(err.response?.data?.message || 'Failed to save doctor visit record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[95vh] border border-slate-100">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Stethoscope className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">
                {editingBill ? 'Edit Doctor Visit Record' : 'Record Doctor Visit & Billing'}
              </h2>
              <p className="text-xs text-purple-200 font-medium">
                Log visiting specialist doctor, multiple procedures & clinic expense payout
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 overflow-y-auto space-y-6">
          {/* 1. Patient Info Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Patient</span>
              <p className="font-extrabold text-slate-900 text-sm">{patientInfo.name}</p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Patient ID</span>
              <p className="font-bold text-slate-700 text-xs">{patientInfo.id}</p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Phone</span>
              <p className="font-bold text-slate-700 text-xs">{patientInfo.phone}</p>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Age / Gender</span>
              <p className="font-bold text-slate-700 text-xs">{patientInfo.age} / {patientInfo.gender}</p>
            </div>
          </div>

          {/* 2. Visiting Doctor Details */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5 mb-3">
              <User className="w-4 h-4 text-purple-700" /> Visiting Specialist Doctor
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Doctor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specialty / Field
                </label>
                <input
                  type="text"
                  placeholder="e.g. Orthodontist, Oral Surgeon"
                  value={doctorSpecialty}
                  onChange={(e) => setDoctorSpecialty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Doctor Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={doctorPhone}
                  onChange={(e) => setDoctorPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* 3. Procedure & Visit Details */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-purple-700" /> Procedures Performed & Amount Given to Doctor
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Visit Date:</label>
                <input
                  type="datetime-local"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>
            </div>

            {/* Datalist for instant autocomplete while allowing custom typing */}
            <datalist id="doctor-visit-common-procedures">
              {COMMON_PROCEDURES.map((pName, i) => (
                <option key={i} value={pName} />
              ))}
            </datalist>

            {/* Multiple Procedures Rows */}
            <div className="space-y-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider px-1">
                <span>Procedure / Service (Select from dropdown or type)</span>
                <span className="w-44 text-right pr-2">Amount Given to Dr (₹)</span>
              </div>

              {procedures.map((proc, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      list="doctor-visit-common-procedures"
                      type="text"
                      placeholder="Select from dropdown or write custom procedure..."
                      value={proc.name}
                      onChange={(e) => handleProcedureChange(idx, 'name', e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    />
                  </div>

                  <div className="w-44">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="₹ Amount to Dr"
                      value={proc.amount}
                      onChange={(e) => handleProcedureChange(idx, 'amount', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-amber-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    />
                  </div>

                  {procedures.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProcedure(idx)}
                      title="Remove Procedure"
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddProcedure}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold transition"
                >
                  <Plus className="w-4 h-4" /> Add Another Procedure
                </button>
              </div>
            </div>
          </div>

          {/* 4. Side-by-side: Amount Given to Doctor (Left) & Clinical Notes (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* Left Column: Total Amount Given to Doctor (Expense) & Payment Mode */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-amber-50/40 border-2 border-purple-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-900 tracking-wider block mb-1">
                  Total Amount Given to Doctor (Clinic Expense)
                </span>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-black text-purple-950">
                    ₹ {totalAmountGivenToDoctor.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    Expense
                  </span>
                </div>

                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Mode Given to Doctor
                </label>
                <select
                  value={doctorPaymentMode}
                  onChange={(e) => setDoctorPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <p className="text-[11px] text-purple-800 font-semibold mt-3 pt-2 border-t border-purple-200/60 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                This ₹{totalAmountGivenToDoctor.toLocaleString('en-IN')} is automatically added to Expense Dashboard and subtracted from revenue.
              </p>
            </div>

            {/* Right Column: Clinical Notes / Procedure Observation */}
            <div className="flex flex-col">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Notes / Procedure Observation
              </label>
              <textarea
                rows={5}
                placeholder="Enter clinical findings, tooth numbers, notes or recommendations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full flex-1 px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-purple-700" /> Save & Print Receipt
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-lg shadow-purple-700/20 transition flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingBill ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TabOther = ({ patient, patientId, user }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [receiptBill, setReceiptBill] = useState(null);

  const patientInfo = getPatientInfo(patient);

  const fetchDoctorVisitBills = async () => {
    try {
      setLoading(true);
      const res = await billingApi.getByPatient(patientId, { billType: 'DoctorVisit' }).catch(() => null);
      let list = res?.bills || (Array.isArray(res) ? res : []);
      if (!list || list.length === 0) {
        const fallbackRes = await billingApi.getAll({ patientId: patientInfo.id !== 'N/A' ? patientInfo.id : patientId, billType: 'DoctorVisit' });
        list = fallbackRes?.bills || (Array.isArray(fallbackRes) ? fallbackRes : []);
      }
      setBills(list.filter(b => b.billType === 'DoctorVisit'));
    } catch (err) {
      console.error('Error fetching doctor visit bills:', err);
      toast.error('Failed to load doctor visit billing records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchDoctorVisitBills();
    }
  }, [patientId]);

  const handleDelete = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this Doctor Visit record? The corresponding expense in the Expense Dashboard will also be removed.')) return;
    try {
      await billingApi.delete(billId);
      toast.success('Doctor visit record and linked expense deleted successfully');
      fetchDoctorVisitBills();
    } catch (err) {
      toast.error('Failed to delete doctor visit record');
    }
  };

  const handleSaved = (savedBill, shouldPrintReceipt) => {
    fetchDoctorVisitBills();
    if (shouldPrintReceipt && savedBill) {
      setReceiptBill(savedBill);
    }
  };

  // Metrics calculation
  const totalVisits = bills.length;
  const totalDoctorPaid = bills.reduce((sum, b) => sum + (b.visitingDoctorDetails?.paidToDoctor || b.amount || 0), 0);
  const totalProcedures = bills.reduce((sum, b) => {
    const procs = b.visitingDoctorDetails?.procedures;
    return sum + (procs && procs.length > 0 ? procs.length : (b.items?.length || 1));
  }, 0);

  const filteredBills = bills.filter(b => {
    const q = searchQuery.toLowerCase();
    const docName = (b.visitingDoctorDetails?.doctorName || b.doctorName || '').toLowerCase();
    const procName = (b.visitingDoctorDetails?.procedureName || b.items?.[0]?.procedureName || '').toLowerCase();
    const specialty = (b.visitingDoctorDetails?.doctorSpecialty || '').toLowerCase();
    const billId = (b.billId || b.invoiceNumber || '').toLowerCase();
    return docName.includes(q) || procName.includes(q) || specialty.includes(q) || billId.includes(q);
  });

  const clinicInfo = user?.organization || user?.organizationId || {};

  return (
    <div className="space-y-8">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Specialist Visits', value: totalVisits, icon: Stethoscope, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Paid to Doctors (Expense)', value: `₹${totalDoctorPaid.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Procedures Performed', value: totalProcedures, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Patient', value: patientInfo.name, icon: User, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl`}><stat.icon size={22} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-slate-800 truncate max-w-[140px]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <Stethoscope className="w-5 h-5 text-purple-600" /> Doctor Visit Billing
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Visiting specialist doctors, procedures done & clinic expense payouts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search doctor, procedure..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
            />
          </div>

          <button
            onClick={() => { setEditingBill(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-purple-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> Record Doctor Visit Bill
          </button>
        </div>
      </div>

      {/* Billing Records List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Doctor Visit Records...</p>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
            <Stethoscope size={32} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">No Doctor Visit Records Yet</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm mt-1">
              When an external doctor comes to perform procedures on this patient, record them here. The amount given to the doctor will automatically log as clinic expense.
            </p>
          </div>
          <button
            onClick={() => { setEditingBill(null); setShowModal(true); }}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow transition"
          >
            + Record First Doctor Visit
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-5">Date & Invoice</th>
                  <th className="py-4 px-5">Visiting Doctor</th>
                  <th className="py-4 px-5">Procedures Performed</th>
                  <th className="py-4 px-5 text-right">Amount Given to Dr (Expense)</th>
                  <th className="py-4 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredBills.map((b) => {
                  const v = b.visitingDoctorDetails || {};
                  const dPaid = Number(v.paidToDoctor || b.amount || 0);
                  const dateStr = b.date ? new Date(b.date).toLocaleDateString() : 'N/A';

                  const procsDisplay = v.procedures && v.procedures.length > 0
                    ? v.procedures.map(p => `${p.name} (₹${Number(p.amount || 0).toLocaleString('en-IN')})`).join(', ')
                    : (v.procedureName || b.items?.[0]?.procedureName || 'Specialist Procedure');

                  return (
                    <tr key={b._id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-slate-900 block">{b.billId || b.invoiceNumber || 'INV-001'}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">Dr. {v.doctorName || b.doctorName}</p>
                            <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">{v.doctorSpecialty || 'Specialist'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className="font-bold text-slate-800 block">{procsDisplay}</span>
                        {b.notes && <span className="text-[10px] text-slate-400 truncate max-w-xs block mt-0.5">{b.notes}</span>}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <span className="font-black text-amber-800 text-sm block">₹{dPaid.toLocaleString('en-IN')}</span>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-800 mt-0.5">
                          Paid via {v.doctorPaymentMode || b.paymentMethod || 'Cash'}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setReceiptBill(b)}
                            title="Print / View Receipt"
                            className="p-2 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingBill(b); setShowModal(true); }}
                            title="Edit Record"
                            className="p-2 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(b._id)}
                            title="Delete Record"
                            className="p-2 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Doctor Visit Modal (Create / Edit) */}
      <DoctorVisitModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingBill(null); }}
        onSave={handleSaved}
        editingBill={editingBill}
        patient={patient}
        clinicInfo={clinicInfo}
      />

      {/* Doctor Visit Receipt Modal */}
      <DoctorVisitReceiptModal
        isOpen={Boolean(receiptBill)}
        onClose={() => setReceiptBill(null)}
        bill={receiptBill}
        patient={patient}
        clinicInfo={clinicInfo}
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
  const { user, updateUser, isDentistClinic } = useAuth();
  const clinicInfo = user?.organization || user?.organizationId || {};
  const [data, setData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState("");
  const [printingStatement, setPrintingStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(new URLSearchParams(location.search).get('tab') || 'personal');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showDentalPrescriptionModal, setShowDentalPrescriptionModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showInvoiceTemplateModal, setShowInvoiceTemplateModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentFormType, setConsentFormType] = useState('general');
  const [consentDropdownOpen, setConsentDropdownOpen] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [cancelAppointmentTarget, setCancelAppointmentTarget] = useState(null);

  const reloadAppointments = async () => {
    try {
      const canonicalPatientId = data?._id || id;
      const summaryResponse = await appointmentApi.getSummary(canonicalPatientId);
      setAppointments(summaryResponse || []);
      if (typeof fetchTodayAppointments === 'function') {
        fetchTodayAppointments();
      }
    } catch (err) {
      console.warn('Could not reload appointments:', err);
    }
  };
  const [billingRefreshKey, setBillingRefreshKey] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState('');
  const [defaultTemplate, setDefaultTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    try {
      const saved = localStorage.getItem('cms_selected_prescription_template');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { _id: 'default', templateName: 'Oviaan Default Template' };
  });
  const [printingPrescription, setPrintingPrescription] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(null);
  const [invoiceTemplates, setInvoiceTemplates] = useState([]);
  const [selectedInvoiceTemplate, setSelectedInvoiceTemplate] = useState(null);
  const [orgDetails, setOrgDetails] = useState(null);
  const [pdfProgress, setPdfProgress] = useState({ isGenerating: false, percent: 0, prescriptionId: null });
  const [printingClinicalReport, setPrintingClinicalReport] = useState(null);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [selectedVisitDate, setSelectedVisitDate] = useState(null);

  const handleVisitNavigation = (tabKey, visitDate) => {
    setActiveTab(tabKey);
    setSelectedVisitDate(visitDate);
    const targetTab = tabs.find(t => t.key === tabKey);
    if (visitDate) {
      const dateStr = new Date(visitDate).toLocaleDateString();
      toast.info(`Navigated to ${targetTab?.name || tabKey} for visit on ${dateStr}`);
    }
  };

  // Today's appointments states for the far-left navigation sidebar
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loadingTodayAppts, setLoadingTodayAppts] = useState(false);
  const [isTodayApptsCollapsed, setIsTodayApptsCollapsed] = useState(() => window.innerWidth < 1024);
  const [todaySearch, setTodaySearch] = useState(() => {
    return sessionStorage.getItem('patientSidebarTodaySearch') || '';
  });

  // Patient Directory States for the far-left sidebar
  const [sidebarMode, setSidebarMode] = useState(() => {
    return sessionStorage.getItem('patientSidebarMode') || 'today';
  }); // 'today' or 'all'
  const [allPatients, setAllPatients] = useState([]);
  const [allPatientsPage, setAllPatientsPage] = useState(() => {
    return parseInt(sessionStorage.getItem('patientSidebarPage'), 10) || 1;
  });
  const [allPatientsTotalPages, setAllPatientsTotalPages] = useState(1);
  const [loadingAllPatients, setLoadingAllPatients] = useState(false);
  const [allSearch, setAllSearch] = useState(() => {
    return sessionStorage.getItem('patientSidebarSearch') || '';
  });

  const fetchTemplates = async () => {
    if (user) {
      try {
        const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null) || user?._id;
        
        let hasA4 = false;
        let templateData = null;
        try {
          const settings = await organizationApi.getPrescriptionTemplateSettings();
          if (settings?.data) {
            templateData = settings.data;
            if (settings.data.templateUrl && settings.data.enabled !== false) {
              hasA4 = true;
            }
          }
        } catch (e) {
          console.error("Failed to fetch prescription template settings", e);
        }

        if (templateData) {
          setOrgDetails(prev => {
            const mergedTemplate = {
              ...(prev?.prescriptionTemplate || {}),
              ...templateData
            };
            return {
              ...(prev || {}),
              prescriptionTemplate: mergedTemplate,
              footerBarcode: templateData.footerBarcode || prev?.footerBarcode || '',
              footerText: templateData.footerText || prev?.footerText || '',
              footerSubText: templateData.footerSubText || prev?.footerSubText || ''
            };
          });
        }

        const response = await prescriptionTemplateApi.list(orgId);
        if (response && response.templates) {
          let loadedTemplates = response.templates;
          if (hasA4) {
            loadedTemplates = [
              {
                _id: 'global_a4_blank',
                templateName: 'Pre-Printed Letterhead Pad (Data Only)',
                headerType: 'a4_blank',
                isDefault: false
              },
              {
                _id: 'global_a4',
                templateName: 'A4 Full Template (Digital Letterhead)',
                headerType: 'a4',
                isDefault: false
              },
              ...loadedTemplates
            ];
          }
          setTemplates(loadedTemplates);

          // By default, ALWAYS use Oviaan Default Template unless doctor explicitly chose another template
          let currentSelection = { _id: 'default', templateName: 'Oviaan Default Template' };
          try {
            const saved = localStorage.getItem('cms_selected_prescription_template');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed?._id === 'global_a4_blank' || parsed?.headerType === 'a4_blank') {
                const match = loadedTemplates.find(t => t._id === 'global_a4_blank');
                if (match) currentSelection = match;
              } else if (parsed?._id === 'global_a4' || parsed?.headerType === 'a4') {
                const match = loadedTemplates.find(t => t._id === 'global_a4');
                if (match) currentSelection = match;
              } else if (parsed?._id === 'default_v2') {
                currentSelection = { _id: 'default_v2', templateName: 'Oviaan Default Template 2' };
              } else if (parsed?._id && parsed._id !== 'default') {
                const match = loadedTemplates.find(t => t._id === parsed._id);
                if (match) currentSelection = match;
              }
            }
          } catch (e) {}

          setDefaultTemplate({ _id: 'default', templateName: 'Oviaan Default Template' });
          setSelectedTemplate(currentSelection);
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

  const fetchTodayAppointments = async () => {
    try {
      setLoadingTodayAppts(true);
      const data = await appointmentApi.getTodayAppointments();
      setTodayAppointments(data || []);
    } catch (error) {
      console.error("Failed to fetch today's appointments", error);
    } finally {
      setLoadingTodayAppts(false);
    }
  };

  const handleTodayApptClick = (apptPatientId) => {
    let resolvedId = apptPatientId;
    if (allPatients && allPatients.length > 0) {
      const match = allPatients.find(p => 
        (p._id && p._id.toString() === String(apptPatientId)) ||
        (p.patientId && String(p.patientId) === String(apptPatientId)) ||
        (p.id && String(p.id) === String(apptPatientId))
      );
      if (match && match._id) {
        resolvedId = match._id;
      }
    }
    const isAdmin = location.pathname.startsWith('/admin');
    const pathPrefix = isAdmin ? '/admin/patient/' : '/receptionist/patient/';
    navigate(`${pathPrefix}${resolvedId}?tab=${activeTab}`);
  };

  const fetchAllPatients = async (page = 1, searchQuery = '') => {
    try {
      setLoadingAllPatients(true);
      const res = await patientApi.getAll({
        page,
        limit: 20,
        search: searchQuery
      });
      if (res) {
        setAllPatients(res.patients || []);
        setAllPatientsTotalPages(res.totalPages || 1);
        setAllPatientsPage(res.currentPage || 1);
      }
    } catch (error) {
      console.error("Failed to fetch all patients", error);
    } finally {
      setLoadingAllPatients(false);
    }
  };

  const handleAllSearchChange = (e) => {
    setAllSearch(e.target.value);
    setAllPatientsPage(1);
  };

  useEffect(() => {
    if (sidebarMode === 'all') {
      fetchAllPatients(allPatientsPage, allSearch);
    }
  }, [sidebarMode, allPatientsPage, allSearch]);

  // --- Sidebar State & Scroll Syncing to sessionStorage ---
  const sidebarScrollRef = React.useRef(null);

  useEffect(() => {
    sessionStorage.setItem('patientSidebarMode', sidebarMode);
  }, [sidebarMode]);

  useEffect(() => {
    sessionStorage.setItem('patientSidebarPage', allPatientsPage.toString());
  }, [allPatientsPage]);

  useEffect(() => {
    sessionStorage.setItem('patientSidebarSearch', allSearch);
  }, [allSearch]);

  useEffect(() => {
    sessionStorage.setItem('patientSidebarTodaySearch', todaySearch);
  }, [todaySearch]);

  const handleSidebarScroll = (e) => {
    sessionStorage.setItem('patientSidebarScrollTop', e.currentTarget.scrollTop.toString());
  };

  useEffect(() => {
    if (sidebarScrollRef.current) {
      const savedScroll = sessionStorage.getItem('patientSidebarScrollTop');
      if (savedScroll) {
        const container = sidebarScrollRef.current;
        setTimeout(() => {
          if (container) {
            container.scrollTop = parseInt(savedScroll, 10);
          }
        }, 100);
      }
    }
  }, [sidebarMode, loadingAllPatients, loadingTodayAppts]);

  const fetchOrgDetails = async () => {
    const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null) || user?._id;
    if (!orgId) return;
    try {
      const org = await organizationApi.getById(orgId);
      if (org) {
        try {
          const settingsData = await organizationApi.getPrescriptionTemplateSettings();
          if (settingsData && settingsData.data) {
            org.prescriptionTemplate = {
              ...(org.prescriptionTemplate || {}),
              ...settingsData.data
            };
            if (settingsData.data.footerBarcode) {
              org.footerBarcode = settingsData.data.footerBarcode;
            }
            if (settingsData.data.footerText) {
              org.footerText = settingsData.data.footerText;
            }
            if (settingsData.data.footerSubText) {
              org.footerSubText = settingsData.data.footerSubText;
            }
          }
        } catch (settingsError) {
          console.error("Failed to fetch prescription template settings in fetchOrgDetails", settingsError);
        }
        setOrgDetails(org);
      }
    } catch (error) {
      console.error("Failed to fetch organization details", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTemplates();
      fetchInvoiceTemplates();
      fetchOrgDetails();
      fetchTodayAppointments();
    }
  }, [user?.organizationId, user?.organization?._id]);

  useEffect(() => {
    let isCancelled = false;

    if (printingPrescription) {
      const executePrint = async () => {
        try {
          await waitForPrintImagesReady('#prescription-print-area', 3500);
          if (!isCancelled) {
            window.print();
          }
        } catch (err) {
          console.error("Error waiting for prescription print images:", err);
          if (!isCancelled) {
            window.print();
          }
        }
      };

      executePrint();
    }

    return () => {
      isCancelled = true;
    };
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

      let doctorQual = prescription.qualification || prescription.doctorQualification;
      let doctorSpec = prescription.specialty || prescription.doctorSpecialization;
      let doctorName = prescription.doctorName;

      if (prescription.doctorId && (!doctorQual || !doctorSpec)) {
        try {
          const doc = await centralDoctorApi.getById(prescription.doctorId);
          if (doc) {
            doctorQual = doc.qualification || doctorQual;
            doctorSpec = doc.specialization || doctorSpec || doc.department;
            if (doc.name) doctorName = doc.name;
          }
        } catch (docErr) {
          console.error("Failed to fetch doctor details for PDF download:", docErr);
        }
      }
      
      const progressInterval = setInterval(() => {
        setPdfProgress(prev => {
          if (prev.percent >= 90) return prev;
          const increment = Math.max(1, Math.floor((90 - prev.percent) / 5));
          return { ...prev, percent: prev.percent + increment };
        });
      }, 500);

      const pdfData = {
        organizationId: orgId,
        prescriptionData: {
          ...prescription,
          doctorName,
          doctorQualification: doctorQual,
          doctorSpecialization: doctorSpec,
          footerSubText: orgDetails?.prescriptionTemplate?.footerSubText || orgDetails?.branding?.footerSubText || orgDetails?.footerSubText || ''
        },
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
      
      let doctorQual = prescription.qualification || prescription.doctorQualification;
      let doctorSpec = prescription.specialty || prescription.doctorSpecialization;
      let doctorName = prescription.doctorName;

      if (prescription.doctorId && (!doctorQual || !doctorSpec)) {
        try {
          const doc = await centralDoctorApi.getById(prescription.doctorId);
          if (doc) {
            doctorQual = doc.qualification || doctorQual;
            doctorSpec = doc.specialization || doctorSpec || doc.department;
            if (doc.name) doctorName = doc.name;
          }
        } catch (docErr) {
          console.error("Failed to fetch doctor details for WhatsApp prescription:", docErr);
        }
      }

      await whatsappApi.sendPrescriptionPdf({
        phone: data.mobile || data.phone,
        patientId: data.patientId,
        prescriptionData: prescription.notes,
        doctorId: prescription.doctorId,
        doctorName: doctorName,
        doctorQualification: doctorQual,
        doctorSpecialization: doctorSpec,
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
      
      let doctorQual = p.qualification || p.doctorQualification;
      let doctorSpec = p.specialty || p.doctorSpecialization;
      let doctorName = p.doctorName;

      if (p.doctorId && (!doctorQual || !doctorSpec)) {
        try {
          const doc = await centralDoctorApi.getById(p.doctorId);
          if (doc) {
            doctorQual = doc.qualification || doctorQual;
            doctorSpec = doc.specialization || doctorSpec || doc.department;
            if (doc.name) doctorName = doc.name;
          }
        } catch (docErr) {
          console.error("Failed to fetch doctor details for email prescription:", docErr);
        }
      }

      await emailApi.sendPrescription({
        email: data.email,
        patientName: data.fullName || `${data.firstName} ${data.lastName}`,
        patientId: data.patientId,
        notes: p.notes,
        doctorName: doctorName,
        doctorQualification: doctorQual,
        doctorSpecialization: doctorSpec,
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
    let prescriptionObj = { ...(p || {}) };
    let latestSettings = null;

    try {
      // Refresh prescription template settings dynamically so new footer sub-text or barcode edits in admin profile are immediately loaded
      const settingsData = await organizationApi.getPrescriptionTemplateSettings().catch(() => null);
      if (settingsData && settingsData.data) {
        latestSettings = settingsData.data;
        setOrgDetails(prev => ({
          ...(prev || {}),
          ...settingsData.data,
          prescriptionTemplate: {
            ...(prev?.prescriptionTemplate || {}),
            ...settingsData.data
          },
          footerBarcode: settingsData.data.footerBarcode || prev?.footerBarcode || '',
          footerText: settingsData.data.footerText || prev?.footerText || '',
          footerSubText: settingsData.data.footerSubText || prev?.footerSubText || ''
        }));
        if (!prescriptionObj.footerBarcode && settingsData.data.footerBarcode) {
          prescriptionObj.footerBarcode = settingsData.data.footerBarcode;
        }
        if (!prescriptionObj.footerSubText && settingsData.data.footerSubText) {
          prescriptionObj.footerSubText = settingsData.data.footerSubText;
        }
        if (!prescriptionObj.footerText && settingsData.data.footerText) {
          prescriptionObj.footerText = settingsData.data.footerText;
        }
      }
    } catch (templateErr) {
      console.warn("Could not reload latest template settings on print:", templateErr);
    }

    try {
      let doctor = prescriptionObj.doctor || null;
      if (!doctor && prescriptionObj.doctorId) {
        if (user?._id === prescriptionObj.doctorId || user?.id === prescriptionObj.doctorId) {
          doctor = user;
        }
        try {
          const fetched = await centralDoctorApi.getById(prescriptionObj.doctorId);
          if (fetched) doctor = { ...(doctor || {}), ...fetched };
        } catch (err) {
          console.warn("Could not fetch central doctor:", err);
        }
      }
      if (!doctor && (user?.role === 'doctor' || user?.isDoctor || user?.specialization || user?.qualification)) {
        doctor = user;
      }
      if (doctor) {
        prescriptionObj.qualification = doctor.qualification || prescriptionObj.qualification || '';
        prescriptionObj.specialty = doctor.specialization || doctor.specialty || prescriptionObj.specialty || '';
        if (doctor.name) prescriptionObj.doctorName = doctor.name;
        if (!doctor.doctorSignature && (prescriptionObj.doctorSignature || user?.doctorSignature)) {
          doctor.doctorSignature = prescriptionObj.doctorSignature || user?.doctorSignature;
        }
        if (!doctor.doctorStamp && (prescriptionObj.doctorStamp || user?.doctorStamp)) {
          doctor.doctorStamp = prescriptionObj.doctorStamp || user?.doctorStamp;
        }
        prescriptionObj.doctor = doctor;
      }
    } catch (error) {
      console.error("Failed to fetch doctor details for print", error);
    }

    // Pre-convert and preload all print images as base64 Data URLs so the browser never races network requests during print preview
    try {
      const isA4Blank = selectedTemplate?._id === 'global_a4_blank' || selectedTemplate?.headerType === 'a4_blank';
      const isA4 = selectedTemplate?._id === 'global_a4' || selectedTemplate?.headerType === 'a4' || selectedTemplate?.layoutType === 'a4' || isA4Blank;

      prescriptionObj.isLetterheadPad = isA4Blank;

      // 1. A4 background template image (Skip loading if in pre-printed letterhead pad mode)
      const a4Url = orgDetails?.prescriptionTemplate?.templateUrl || latestSettings?.templateUrl;
      if (isA4 && a4Url && !isA4Blank) {
        prescriptionObj.resolvedTemplateUrl = await convertUrlToBase64(a4Url);
      } else if (isA4Blank) {
        prescriptionObj.resolvedTemplateUrl = null;
      }

      // 2. Clinic Logo
      const logoPath = orgDetails?.branding?.logo || orgDetails?.logo || user?.organization?.branding?.logo || user?.organization?.logo;
      if (logoPath) {
        prescriptionObj.resolvedLogo = await convertUrlToBase64(logoPath);
      }

      // 3. Footer Barcode / QR Code
      const barcodePath = prescriptionObj?.footerBarcode || 
        prescriptionObj?.parsedNotes?.footerBarcode || 
        latestSettings?.footerBarcode || 
        orgDetails?.prescriptionTemplate?.footerBarcode || 
        orgDetails?.branding?.footerBarcode || 
        orgDetails?.footerBarcode || 
        user?.organization?.prescriptionTemplate?.footerBarcode || 
        user?.organization?.footerBarcode;
      if (barcodePath) {
        prescriptionObj.resolvedBarcode = await convertUrlToBase64(barcodePath);
      }

      // 4. Doctor Signature & Stamp
      const sigPath = prescriptionObj.doctor?.doctorSignature || prescriptionObj.doctorSignature || user?.doctorSignature;
      if (sigPath) {
        prescriptionObj.resolvedSignature = await convertUrlToBase64(sigPath);
      }
      const stampPath = prescriptionObj.doctor?.doctorStamp || prescriptionObj.doctorStamp || user?.doctorStamp;
      if (stampPath) {
        prescriptionObj.resolvedStamp = await convertUrlToBase64(stampPath);
      }
    } catch (e) {
      console.error("Failed to pre-convert template images for printing:", e);
    }

    setPrintingPrescription(prescriptionObj);
  };

  const isDentalDoctor = Boolean(
    user?.organization?.clinicType === 'Dental' ||
    user?.organization?.specialist === 'Dentist' ||
    user?.organization?.enabledModules?.dentist === true ||
    user?.specialization?.toLowerCase()?.includes('dent') ||
    user?.clinicType === 'Dental' ||
    data?.treatmentPlans?.length > 0 ||
    data?.dentalTreatments?.length > 0
  );

  const handleOpenNewPrescription = () => {
    setEditingPrescription(null);
    if (isDentalDoctor) {
      setShowDentalPrescriptionModal(true);
    } else {
      setShowPrescriptionModal(true);
    }
  };

  const handleEditPrescription = (p) => {
    setEditingPrescription(p);
    let isDentalRecord = isDentalDoctor;
    try {
      const desc = p.description || p.notes;
      if (typeof desc === 'string' && desc.trim().startsWith('{')) {
        const parsed = JSON.parse(desc);
        if (parsed.isDental || parsed.oralExamination || parsed.treatmentPerformedToday) {
          isDentalRecord = true;
        }
      }
    } catch (e) {}

    if (isDentalRecord) {
      setShowDentalPrescriptionModal(true);
    } else {
      setShowPrescriptionModal(true);
    }
  };

  const handleDeletePrescription = async (p) => {
    if (!window.confirm("Are you sure you want to delete this prescription?")) return;
    
    try {
      if (p.type === 'Visit Note') {
        await appointmentApi.updateNotes(p.id, '');
        toast.success("Prescription deleted successfully!");
      } else {
        await medicalRecordApi.delete(p.id);
        toast.success("Prescription deleted successfully!");
      }
      fetchData(false);
    } catch (error) {
      console.error("Error deleting prescription:", error);
      toast.error(error.response?.data?.message || "Failed to delete prescription");
    }
  };

  const tabs = isDentistClinic ? [
    { key: 'personal', name: 'Personal Info', icon: User },
    { key: 'prescriptions', name: 'Prescriptions', icon: Pill },
    { key: 'appointments', name: 'Appointments', icon: CalendarIcon },
    { key: 'treatment-plan', name: 'Treatment Plan', icon: ClipboardList },
    { key: 'billing', name: 'Billing', icon: IndianRupee },
    { key: 'dental-chart', name: 'Dental Chart', icon: Smile },
    { key: 'dental-images', name: 'Dental Images', icon: Image },
    { key: 'tooth-history', name: 'Tooth History', icon: History },
    { key: 'follow-ups', name: 'Follow-ups', icon: Bell },
    { key: 'lab-work', name: 'Lab Work', icon: FlaskConical },
    { key: 'clinical-notes', name: 'Clinical Notes', icon: StickyNote },
    { key: 'other', name: 'Other', icon: MoreHorizontal }
  ] : [
    { key: 'personal', name: 'Personal Info', icon: User },
    { key: 'prescriptions', name: 'Prescriptions', icon: Pill },
    { key: 'appointments', name: 'Appointments', icon: CalendarIcon },
    { key: 'billing', name: 'Billing', icon: IndianRupee },
    { key: 'progress', name: 'Progress Gallery', icon: Camera },
    { key: 'follow-ups', name: 'Follow-ups', icon: Bell },
    { key: 'clinical-notes', name: 'Clinical Notes', icon: StickyNote },
    { key: 'other', name: 'Other', icon: MoreHorizontal }
  ];



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
    }, 2000);
  };

  const handleInvoiceWhatsApp = async (bill) => {
    const loadingToast = toast.loading("Sending invoice via WhatsApp...");
    try {
      await billingApi.sendWhatsApp(bill._id || bill.id);
      toast.update(loadingToast, {
        render: "Invoice sent via WhatsApp successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
    } catch (err) {
      console.error("WhatsApp error:", err);
      toast.update(loadingToast, {
        render: err.response?.data?.message || "Failed to send WhatsApp message.",
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
    }
  };

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) {
        if (!data) {
          setLoading(true);
        } else {
          setProfileLoading(true);
        }
      }
      const patientData = await patientApi.getById(id);
      setData(patientData);

      const canonicalPatientId = patientData?._id || id;

      // If the URL parameter was a sequential ID (like "20261001"),
      // update browser URL bar to the canonical MongoDB _id without interrupting component state
      if (patientData?._id && String(id) !== String(patientData._id)) {
        const isAdmin = location.pathname.startsWith('/admin');
        const pathPrefix = isAdmin ? '/admin/patient/' : '/receptionist/patient/';
        try {
          window.history.replaceState(null, '', `${pathPrefix}${patientData._id}?tab=${activeTab}`);
        } catch (e) {}
      }

      const [summaryResponse, records] = await Promise.all([
        appointmentApi.getSummary(canonicalPatientId).catch(err => {
          console.warn('Could not fetch appointment summary:', err);
          return [];
        }),
        medicalRecordApi.getByPatient(canonicalPatientId).catch(err => {
          console.warn('Could not fetch medical records:', err);
          return [];
        })
      ]);

      setAppointments(summaryResponse || []);
      setMedicalRecords(records || []);
    } catch (error) {
      console.error('Error fetching patient profile data:', error);
    } finally {
      setLoading(false);
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTodayAppointments();
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
      phone: data.mobile || data.phone || data.contactNumber || data.contact || '',
      patientPhone: data.mobile || data.phone || data.contactNumber || data.contact || '',
      patientEmail: data.email || '',
      gender: data.gender,
      age: data.age,
      patientAge: data.age,
      ageType: data.ageType || 'Year',
      designation: data.designation || '',
      doctor: appt.doctorId || '',
      doctorId: appt.doctorId,
      doctorName: appt.doctorName,
      department: appt.specialty || '',
      specialty: appt.specialty,
      symptoms: appt.reason || '',
      reason: appt.reason,
      patient: data
    };
    if (location.pathname.startsWith('/admin')) {
      navigate('/admin-dashboard', { state: { rebookData } });
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
      <div className="min-h-screen lg:h-screen lg:max-h-screen bg-[#f8fafc] font-sans print:hidden flex flex-col lg:flex-row lg:overflow-hidden">
        {/* Today's Appointments Collapsible Left Navigation Sidebar */}
        <aside 
          className={`h-screen bg-white border-r border-slate-200 flex flex-col sticky top-0 z-40 transition-all duration-300 shrink-0 ${
            isTodayApptsCollapsed 
              ? 'w-14 hidden lg:flex' 
              : 'w-full lg:w-72 flex'
          }`}
        >
          {isTodayApptsCollapsed ? (
            /* Collapsed Sidebar View (Slim ribbon) */
            <div className="flex flex-col items-center h-full py-4 justify-between">
              <button 
                onClick={() => setIsTodayApptsCollapsed(false)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
                title="Expand Appointments Queue"
              >
                <ChevronRight size={18} />
              </button>
              
              <div className="flex-1 flex flex-col items-center justify-center gap-6 py-6 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <CalendarIcon size={16} />
                </div>
                <span 
                  className="uppercase tracking-[0.25em] text-[9px] font-bold text-slate-400/80 whitespace-nowrap"
                  style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                >
                  {sidebarMode === 'today' ? "Today's Queue" : "Directory"}
                </span>
              </div>
              
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                <span className="text-[10px] font-bold">
                  {sidebarMode === 'today' ? todayAppointments.length : allPatients.length}
                </span>
              </div>
            </div>
          ) : (
            /* Expanded Sidebar View (Interactive Queue) */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 tracking-tight uppercase">
                    {sidebarMode === 'today' ? "Today's Queue" : "Patient Directory"}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsTodayApptsCollapsed(true)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>

              {/* Segmented Switch Tabs */}
              <div className="p-2 border-b border-slate-100 bg-slate-50/20 flex gap-1 shrink-0">
                <button
                  onClick={() => setSidebarMode('today')}
                  className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition-all border ${
                    sidebarMode === 'today'
                      ? 'bg-white text-indigo-600 border-slate-200/60 shadow-sm'
                      : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Today's Queue ({todayAppointments.length})
                </button>
                <button
                  onClick={() => setSidebarMode('all')}
                  className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition-all border ${
                    sidebarMode === 'all'
                      ? 'bg-white text-indigo-600 border-slate-200/60 shadow-sm'
                      : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  All Patients
                </button>
              </div>

              {/* Real-time Search Input */}
              <div className="p-3 border-b border-slate-100 shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder={sidebarMode === 'today' ? "Search name, ID, doc..." : "Search all patients..."}
                    value={sidebarMode === 'today' ? todaySearch : allSearch}
                    onChange={sidebarMode === 'today' ? (e) => setTodaySearch(e.target.value) : handleAllSearchChange}
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-slate-800 placeholder-slate-400"
                  />
                  {(sidebarMode === 'today' ? todaySearch : allSearch) && (
                    <button 
                      onClick={() => sidebarMode === 'today' ? setTodaySearch('') : setAllSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Appointments / Directory List Container */}
              <div 
                ref={sidebarScrollRef}
                onScroll={handleSidebarScroll}
                className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2"
              >
                {sidebarMode === 'today' ? (
                  /* Today's Queue List */
                  loadingTodayAppts ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <Loader2 size={22} className="text-indigo-600 animate-spin" />
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">Fetching today's queue...</p>
                    </div>
                  ) : (() => {
                    const filteredAppts = todayAppointments.filter(appt => {
                      const searchLower = todaySearch.toLowerCase();
                      const fullName = `${appt.designation || ''} ${appt.firstName || ''} ${appt.lastName || ''} ${appt.patientName || ''}`.toLowerCase();
                      const phone = (appt.patientPhone || '').toLowerCase();
                      const doc = (appt.doctorName || '').toLowerCase();
                      const reason = (appt.reason || '').toLowerCase();
                      const patId = (appt.patientId || '').toLowerCase();
                      return fullName.includes(searchLower) || phone.includes(searchLower) || doc.includes(searchLower) || reason.includes(searchLower) || patId.includes(searchLower);
                    });

                    if (filteredAppts.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3 border border-slate-100">
                            <CalendarIcon size={18} />
                          </div>
                          <p className="text-xs font-semibold text-slate-600">No appointments found</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Try a different search query</p>
                        </div>
                      );
                    }

                    return filteredAppts.map(appt => {
                      const isActive = data && (
                        appt.patientId === data.patientId ||
                        appt.patientId === data._id ||
                        appt.patientId === id
                      );
                      
                      const getStatusStyles = (status) => {
                        const s = (status || '').toLowerCase();
                        switch (s) {
                          case 'confirmed':
                            return 'bg-emerald-50 text-emerald-700 border-emerald-100';
                          case 'in-progress':
                            return 'bg-blue-50 text-blue-700 border-blue-100';
                          case 'pending':
                            return 'bg-amber-50 text-amber-700 border-amber-100';
                          case 'completed':
                            return 'bg-indigo-50 text-indigo-700 border-indigo-100';
                          case 'cancelled':
                            return 'bg-rose-50 text-rose-700 border-rose-100';
                          default:
                            return 'bg-slate-50 text-slate-700 border-slate-100';
                        }
                      };

                      return (
                        <button
                          key={appt._id}
                          onClick={() => {
                            const matched = allPatients?.find(p => 
                              (p.patientId && String(p.patientId) === String(appt.patientId)) ||
                              (p.mobile && String(p.mobile) === String(appt.patientPhone))
                            );
                            handleTodayApptClick(matched?._id || appt.patient?._id || appt.patient || appt.patientId);
                          }}
                          className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 shadow-sm group relative ${
                            isActive 
                              ? 'bg-indigo-50/30 border-indigo-200 border-l-4 border-l-indigo-600' 
                              : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
                          }`}
                        >
                          {/* Name and Designation */}
                          <div className="flex items-start justify-between gap-1.5 w-full">
                            <span className={`text-xs font-bold truncate ${isActive ? 'text-indigo-900' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                              {appt.designation ? `${appt.designation} ` : ''}{appt.firstName || appt.patientName}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-bold rounded uppercase tracking-wider shrink-0">
                              {appt.patientId}
                            </span>
                          </div>

                          {/* Age and Doctor Details */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>
                              {appt.patientAge ? `${appt.patientAge} ${appt.ageType || 'Year'}` : 'N/A'}
                            </span>
                            <span className="truncate max-w-[120px] font-medium text-slate-500 flex items-center gap-1">
                              <Stethoscope size={10} className="text-indigo-500/70 shrink-0" />
                              Dr. {appt.doctorName}
                            </span>
                          </div>

                          {/* Time & Status Badges */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 gap-2 mt-0.5">
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                              <Clock size={10} className="text-slate-400" />
                              <span>{appt.time}</span>
                            </div>
                            
                            <span className={`px-2 py-0.5 border text-[8px] font-extrabold uppercase rounded tracking-wider ${getStatusStyles(appt.status)}`}>
                              {appt.status}
                            </span>
                          </div>
                        </button>
                      );
                    });
                  })()
                ) : (
                  /* All Patients Directory List */
                  loadingAllPatients ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <Loader2 size={22} className="text-indigo-600 animate-spin" />
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">Loading patient directory...</p>
                    </div>
                  ) : (() => {
                    if (allPatients.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3 border border-slate-100">
                            <User size={18} />
                          </div>
                          <p className="text-xs font-semibold text-slate-600">No patients found</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Try searching another name or ID</p>
                        </div>
                      );
                    }

                    return allPatients.map(pat => {
                      const isActive = data && (
                        pat.patientId === data.patientId ||
                        pat._id === data._id ||
                        pat._id === id ||
                        pat.patientId === id
                      );

                      return (
                        <button
                          key={pat._id || pat.id}
                          onClick={() => handleTodayApptClick(pat._id || pat.id || pat.patientId)}
                          className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 shadow-sm group relative ${
                            isActive 
                              ? 'bg-indigo-50/30 border-indigo-200 border-l-4 border-l-indigo-600' 
                              : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
                          }`}
                        >
                          {/* Name and Sequential ID */}
                          <div className="flex items-start justify-between gap-1.5 w-full">
                            <span className={`text-xs font-bold truncate ${isActive ? 'text-indigo-900' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                              {pat.name || pat.fullName}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-bold rounded uppercase tracking-wider shrink-0">
                              {pat.patientId || pat.id}
                            </span>
                          </div>

                          {/* Age, Gender & Blood Group details */}
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>
                              {pat.age ? `${pat.age} ${pat.ageType || 'Year'}` : 'Age N/A'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-200 shrink-0"></span>
                            <span className="capitalize">{pat.gender || 'Gender N/A'}</span>
                          </div>

                          {/* Contact & Doctor details */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-50 gap-2 mt-0.5 text-[10px] text-slate-500">
                            {pat.phone || pat.contact ? (
                              <span className="flex items-center gap-1">
                                <Phone size={10} className="text-slate-400 shrink-0" />
                                {pat.phone || pat.contact}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic">No contact</span>
                            )}
                            
                            <span className="truncate max-w-[110px] font-medium text-slate-500 flex items-center gap-1">
                              <Stethoscope size={10} className="text-indigo-500/70 shrink-0" />
                              Dr. {pat.assignedDoctor || pat.doc || 'Unassigned'}
                            </span>
                          </div>
                        </button>
                      );
                    });
                  })()
                )}
              </div>

              {/* Sidebar Pagination Footer for directory view */}
              {sidebarMode === 'all' && allPatientsTotalPages > 1 && (
                <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 text-slate-600">
                  <button
                    onClick={() => setAllPatientsPage(prev => Math.max(1, prev - 1))}
                    disabled={allPatientsPage === 1}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-500 transition-all shadow-sm"
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  
                  <span className="text-[10px] font-bold text-slate-500">
                    Page {allPatientsPage} of {allPatientsTotalPages}
                  </span>
                  
                  <button
                    onClick={() => setAllPatientsPage(prev => Math.min(allPatientsTotalPages, prev + 1))}
                    disabled={allPatientsPage === allPatientsTotalPages}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-500 transition-all shadow-sm"
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Sidebar */}
        <aside className={`w-full lg:w-40 bg-white border-r border-slate-200 flex flex-col shrink-0 lg:h-screen relative lg:sticky lg:top-0 z-40 ${profileLoading ? 'opacity-65 transition-opacity duration-200' : ''}`}>
          {/* Sidebar Header: Patient Info */}
          <div className="p-3 border-b border-slate-100 shrink-0 flex lg:flex-col justify-between lg:justify-start items-center lg:items-stretch">
            <div className="flex items-center gap-2 lg:mb-4">
              <button onClick={handleGoBack} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100" title="Go Back">
                <ArrowLeft size={16} />
              </button>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider hidden lg:block">Patient Profile</div>
            </div>

            <div className="flex flex-row lg:flex-col items-center text-left lg:text-center gap-2.5 lg:gap-0">
              <div className="relative lg:mb-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-14 lg:h-14 rounded-xl bg-slate-50 flex items-center justify-center border-2 border-white shadow-md shadow-slate-200/50">
                  <User size={18} className="text-slate-400 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>

              <div>
                <h1 className="text-xs sm:text-sm lg:text-[14px] font-bold text-slate-900 leading-tight px-1">
                  {(() => {
                    const fullName = (data.fullName || `${data.firstName || ''} ${data.lastName || ''}`).trim();
                    return fullName.replace(/\b(MR|MS|MRS|DR|SHRI|SMT)\.?\s+\1\.?\b/gi, '$1.');
                  })()}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 lg:mt-1 justify-start lg:justify-center">
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-bold rounded uppercase tracking-wider">
                    ID: {data.patientId}
                  </span>
                  <span className="lg:hidden text-[10px] text-slate-400 font-bold">
                    {data.gender || ''} {data.age ? `• ${data.age}${data.ageType || 'Y'}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Edit Profile Button in Header */}
            <button
              onClick={() => setShowEditModal(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 transition-colors"
              title="Edit Profile"
            >
              <Edit2 size={14} />
            </button>

            <div className="hidden lg:grid mt-4 grid-cols-2 gap-2">
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
          <nav className="flex-row overflow-x-auto no-scrollbar lg:overflow-y-auto lg:flex-col flex lg:flex-1 custom-scrollbar w-full border-b lg:border-b-0 border-slate-100">
            {(() => {
              const tabColors = {
                personal: {
                  bg: 'bg-slate-100 dark:bg-slate-900',
                  text: 'text-slate-950 dark:text-slate-100',
                  border: 'lg:border-l-slate-700 border-b-slate-700',
                  icon: 'text-slate-800 dark:text-slate-200'
                },
                prescriptions: {
                  bg: 'bg-emerald-50 dark:bg-emerald-950/20',
                  text: 'text-emerald-950 dark:text-emerald-250',
                  border: 'lg:border-l-emerald-600 border-b-emerald-600',
                  icon: 'text-emerald-600'
                },
                appointments: {
                  bg: 'bg-amber-50 dark:bg-amber-950/20',
                  text: 'text-amber-950 dark:text-amber-250',
                  border: 'lg:border-l-amber-600 border-b-amber-600',
                  icon: 'text-amber-600'
                },
                billing: {
                  bg: 'bg-rose-50 dark:bg-rose-950/20',
                  text: 'text-rose-950 dark:text-rose-250',
                  border: 'lg:border-l-rose-600 border-b-rose-600',
                  icon: 'text-rose-600'
                },
                'dental-chart': {
                  bg: 'bg-sky-50 dark:bg-sky-950/20',
                  text: 'text-sky-950 dark:text-sky-250',
                  border: 'lg:border-l-sky-600 border-b-sky-600',
                  icon: 'text-sky-600'
                },
                'treatment-plan': {
                  bg: 'bg-violet-50 dark:bg-violet-950/20',
                  text: 'text-violet-950 dark:text-violet-250',
                  border: 'lg:border-l-violet-600 border-b-violet-600',
                  icon: 'text-violet-600'
                },
                'dental-images': {
                  bg: 'bg-purple-50 dark:bg-purple-950/20',
                  text: 'text-purple-950 dark:text-purple-250',
                  border: 'lg:border-l-purple-600 border-b-purple-600',
                  icon: 'text-purple-600'
                },
                'tooth-history': {
                  bg: 'bg-cyan-50 dark:bg-cyan-950/20',
                  text: 'text-cyan-950 dark:text-cyan-250',
                  border: 'lg:border-l-cyan-600 border-b-cyan-600',
                  icon: 'text-cyan-600'
                },
                progress: {
                  bg: 'bg-orange-50 dark:bg-orange-950/20',
                  text: 'text-orange-950 dark:text-orange-250',
                  border: 'lg:border-l-orange-650 border-b-orange-650',
                  icon: 'text-orange-600'
                },
                'follow-ups': {
                  bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20',
                  text: 'text-fuchsia-950 dark:text-fuchsia-250',
                  border: 'lg:border-l-fuchsia-600 border-b-fuchsia-600',
                  icon: 'text-fuchsia-600'
                },
                'lab-work': {
                  bg: 'bg-indigo-50 dark:bg-indigo-950/20',
                  text: 'text-indigo-950 dark:text-indigo-250',
                  border: 'lg:border-l-indigo-600 border-b-indigo-600',
                  icon: 'text-indigo-600'
                },
                'clinical-notes': {
                  bg: 'bg-teal-50 dark:bg-teal-950/20',
                  text: 'text-teal-950 dark:text-teal-250',
                  border: 'lg:border-l-teal-600 border-b-teal-600',
                  icon: 'text-teal-600'
                },
                'other': {
                  bg: 'bg-purple-50 dark:bg-purple-950/20',
                  text: 'text-purple-950 dark:text-purple-250',
                  border: 'lg:border-l-purple-600 border-b-purple-600',
                  icon: 'text-purple-600'
                }
              };

              return tabs.map(tab => {
                const colors = tabColors[tab.key] || {
                  bg: 'bg-indigo-50 dark:bg-indigo-950/20',
                  text: 'text-indigo-950 dark:text-indigo-250',
                  border: 'lg:border-l-indigo-600 border-b-indigo-600',
                  icon: 'text-indigo-600'
                };
                const isActive = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-none lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-wider transition-all duration-200 border-b-2 lg:border-b lg:border-r-0 border-slate-100 group relative ${
                      isActive
                        ? `${colors.bg} ${colors.text} lg:border-l-4 ${colors.border}`
                        : 'text-slate-950 dark:text-slate-200 hover:bg-slate-50 lg:border-l-4 lg:border-l-transparent border-b-transparent'
                    }`}
                  >
                    <tab.icon 
                      size={14} 
                      className={`${isActive ? colors.icon : 'text-slate-900 dark:text-slate-350 group-hover:text-indigo-600'} transition-colors`} 
                    />
                    <span className="text-left whitespace-nowrap">{tab.name}</span>
                  </button>
                );
              });
            })()}
          </nav>

          {/* Sidebar Footer (Desktop only) */}
          <div className="hidden lg:block p-4 border-t border-slate-100 bg-slate-50/20 shrink-0">
            <button
              onClick={() => setShowEditModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Edit2 size={14} /> Edit Profile
            </button>
          </div>
        </aside>


        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 lg:min-h-screen lg:max-h-screen lg:overflow-hidden bg-[#f8fafc]">
          {/* Top Header */}
          <header className={`h-16 lg:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between shrink-0 z-30 ${profileLoading ? 'opacity-65 transition-opacity duration-200' : ''}`}>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight capitalize">
                {activeTab === 'progress' ? 'Treatment Gallery' : tabs.find(t => t.key === activeTab)?.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Active Patient Record Session</span>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-6">
              <div className="hidden xl:flex flex-col items-end">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Primary Contact</div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Phone size={14} className="text-indigo-500" />
                  {data.contactNumber || data.mobile || 'N/A'}
                </div>
              </div>
              
              <div className="h-10 w-[1px] bg-slate-200 hidden xl:block"></div>

              <div className="flex items-center gap-2 lg:gap-3">
                {isDentistClinic && (
                  <div className="relative">
                    <button
                      onClick={() => setConsentDropdownOpen(prev => !prev)}
                      className="flex items-center gap-2 px-3 py-2.5 lg:px-5 lg:py-3.5 bg-white border-2 border-slate-100 text-slate-700 rounded-[1.25rem] text-xs lg:text-sm font-bold hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                    >
                      <FileText size={16} className="text-indigo-600" />
                      <span className="hidden sm:inline">Consent Forms</span>
                      <ChevronDown size={14} className="text-slate-400" />
                    </button>

                    {consentDropdownOpen && (
                      <div 
                        className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-left"
                        onClick={() => setConsentDropdownOpen(false)}
                      >
                        <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                          Select Consent Form
                        </div>
                        <button
                          onClick={() => {
                            setConsentFormType('general');
                            setShowConsentModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-left transition-colors"
                        >
                          <FileText size={14} className="text-indigo-500 shrink-0" />
                          <span>General Dental Consent</span>
                        </button>
                        <button
                          onClick={() => {
                            setConsentFormType('endodontic');
                            setShowConsentModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-left transition-colors"
                        >
                          <FileText size={14} className="text-indigo-500 shrink-0" />
                          <span>Endodontic (Root Canal) Consent</span>
                        </button>
                        <button
                          onClick={() => {
                            setConsentFormType('extraction');
                            setShowConsentModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-left transition-colors"
                        >
                          <FileText size={14} className="text-indigo-500 shrink-0" />
                          <span>Removal of Teeth (Extraction) Consent</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setShowFollowUpModal(true)}
                  className="flex items-center gap-2 px-3 py-2.5 lg:px-6 lg:py-3.5 bg-white border-2 border-slate-100 text-slate-700 rounded-[1.25rem] text-xs lg:text-sm font-bold hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                >
                  <Bell size={16} className="text-indigo-600" />
                  <span className="hidden sm:inline">Add Follow-up</span>
                </button>
                <button
                  onClick={() => handleRebook({ doctorId: data.assignedDoctorId, doctorName: data.assignedDoctor, specialty: 'General' })}
                  className="flex items-center gap-2 px-3 py-2.5 lg:px-6 lg:py-3.5 bg-slate-900 text-white rounded-[1.25rem] text-xs lg:text-sm font-bold hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 hover:shadow-indigo-100 group"
                >
                  <CalendarIcon size={16} className="group-hover:rotate-12 transition-transform" />
                  <span className="hidden sm:inline">New Appointment</span>
                </button>
              </div>
            </div>
          </header>

          {/* Tab Content Area */}
          <main className="flex-1 lg:overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-40 md:pb-32 lg:pb-16 custom-scrollbar">
            {profileLoading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <Loader2 size={36} className="text-indigo-600 animate-spin" />
                <p className="mt-4 text-slate-500 font-semibold animate-pulse text-sm">Updating patient profile...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-[1400px] mx-auto pb-8 sm:pb-12"
                >
                  {activeTab === 'personal' && (
                    <TabPersonalInfo 
                      data={data} 
                      appointments={appointments} 
                      onEdit={() => setShowEditModal(true)} 
                      onRebook={() => handleRebook({ doctorId: data.assignedDoctorId, doctorName: data.assignedDoctor, specialty: 'General' })} 
                      user={user} 
                      onNavigateTab={handleVisitNavigation} 
                      availableTabs={tabs} 
                    />
                  )}

                  {activeTab === 'prescriptions' && (
                    <TabPrescriptions
                      appointments={appointments}
                      medicalRecords={medicalRecords}
                      onEmail={handleEmail}
                      onWhatsApp={handlePrescriptionWhatsApp}
                      onPrint={handlePrint}
                      onDownload={handleDownloadPDF}
                      onEdit={handleEditPrescription}
                      onDelete={handleDeletePrescription}
                      onNewPrescription={handleOpenNewPrescription}
                      onOpenTemplateModal={() => setShowTemplateModal(true)}
                      templates={templates}
                      selectedTemplate={selectedTemplate}
                      setSelectedTemplate={setSelectedTemplate}
                      pdfProgress={pdfProgress}
                      selectedVisitDate={selectedVisitDate}
                    />
                  )}
                  {activeTab === 'appointments' && (
                    <TabAppointments 
                      appointments={appointments} 
                      onRebook={handleRebook} 
                      onReschedule={(appt) => setRescheduleAppointment(appt)}
                      onCancel={(appt) => setCancelAppointmentTarget(appt)}
                      selectedVisitDate={selectedVisitDate} 
                    />
                  )}
                  {activeTab === 'treatment-plan' && <DentalTreatmentTab patientId={data?._id || id} patientData={data} appointments={appointments} selectedVisitDate={selectedVisitDate} />}
                  {activeTab === 'billing' && (
                    <TabBilling
                      key={`${billingRefreshKey}-${data?._id || id}`}
                      patient={data}
                      appointments={appointments}
                      onPrint={handleBillingPrint}
                      onDownload={handleBillingDownload}
                      onWhatsApp={handleInvoiceWhatsApp}
                      clinicInfo={clinicInfo}
                      setIsDownloading={setIsDownloading}
                      setDownloadProgress={setDownloadProgress}
                      setDownloadFileName={setDownloadFileName}
                      invoiceTemplates={invoiceTemplates}
                      selectedInvoiceTemplate={selectedInvoiceTemplate}
                      setSelectedInvoiceTemplate={setSelectedInvoiceTemplate}
                      onOpenTemplateModal={() => setShowInvoiceTemplateModal(true)}
                      isDentistClinic={isDentistClinic}
                      onNewPharmacyBill={() => setShowAddMedicineModal(true)}
                      selectedVisitDate={selectedVisitDate}
                      onBillCreated={() => fetchData(false)}
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
                  {activeTab === 'dental-chart' && <DentalChart patientId={data?._id || id} patientData={data} appointments={appointments} selectedVisitDate={selectedVisitDate} />}
                  {activeTab === 'dental-images' && <DentalImagesTab patientId={data?._id || id} selectedVisitDate={selectedVisitDate} />}
                  {activeTab === 'tooth-history' && <ToothHistoryTab patientId={data?._id || id} selectedVisitDate={selectedVisitDate} />}
                  {activeTab === 'lab-work' && <LabWorkTab patientId={data?._id || id} patientData={data} appointments={appointments} selectedVisitDate={selectedVisitDate} />}
                  {activeTab === 'follow-ups' && (
                    <TabFollowUps 
                       patient={data}
                       user={user}
                       selectedVisitDate={selectedVisitDate}
                    />
                  )}
                  {activeTab === 'clinical-notes' && (
                    <TabClinicalNotes
                      patientId={id}
                      user={user}
                      selectedVisitDate={selectedVisitDate}
                    />
                  )}
                  {activeTab === 'other' && (
                    <TabOther
                      patient={data}
                      patientId={id}
                      user={user}
                      selectedVisitDate={selectedVisitDate}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>

        {showEditModal && (
            <EditProfileModal 
              data={data} 
              appointments={appointments} 
              onClose={() => setShowEditModal(false)} 
              onSave={(updated) => {
                setData(prev => ({ ...prev, ...updated }));
                fetchData(false);
              }} 
            />
          )}
        <DentalConsentFormModal 
          isOpen={showConsentModal} 
          onClose={() => setShowConsentModal(false)} 
          patientData={data} 
          initialFormType={consentFormType}
        />
        <AddPharmacyMedicineBillModal 
          isOpen={showAddMedicineModal} 
          onClose={() => setShowAddMedicineModal(false)} 
          patientData={data} 
          onComplete={() => setBillingRefreshKey(prev => prev + 1)} 
          onPrint={handleBillingPrint} 
          onDownload={handleBillingDownload} 
          onWhatsApp={handleInvoiceWhatsApp} 
        />
        <DentalPrescriptionModal
          isOpen={showDentalPrescriptionModal}
          onClose={() => { setShowDentalPrescriptionModal(false); setEditingPrescription(null); }}
          patient={data}
          onSaveSuccess={async () => {
            await fetchData(false);
            setBillingRefreshKey(prev => prev + 1);
            setEditingPrescription(null);
          }}
          editData={editingPrescription}
          onSwitchToGeneral={() => {
            setShowDentalPrescriptionModal(false);
            setShowPrescriptionModal(true);
          }}
          onPrintDirect={async (prescriptionToPrint) => {
            await handlePrint(prescriptionToPrint);
          }}
        />
        <PrescriptionModal 
          isOpen={showPrescriptionModal} 
          onClose={() => { setShowPrescriptionModal(false); setEditingPrescription(null); }} 
          patient={data} 
          onSaveSuccess={async () => {
            await fetchData(false);
            setBillingRefreshKey(prev => prev + 1);
            setEditingPrescription(null);
          }} 
          editData={editingPrescription}
          onSwitchToDental={() => {
            setShowPrescriptionModal(false);
            setShowDentalPrescriptionModal(true);
          }}
        />
        <TemplateModal 
          isOpen={showTemplateModal} 
          onClose={() => setShowTemplateModal(false)} 
          onSaveSuccess={(layout) => {
            if (layout === 'a4_blank') {
              const t = {
                _id: 'global_a4_blank',
                templateName: 'Pre-Printed Letterhead Pad (Data Only)',
                headerType: 'a4_blank'
              };
              setSelectedTemplate(t);
              try { localStorage.setItem('cms_selected_prescription_template', JSON.stringify(t)); } catch (err) {}
            } else if (layout === 'a4') {
              const t = {
                _id: 'global_a4',
                templateName: 'A4 Full Template (Digital Letterhead)',
                headerType: 'a4'
              };
              setSelectedTemplate(t);
              try { localStorage.setItem('cms_selected_prescription_template', JSON.stringify(t)); } catch (err) {}
            } else {
              const t = { _id: 'default', templateName: 'Oviaan Default Template' };
              setSelectedTemplate(t);
              try { localStorage.setItem('cms_selected_prescription_template', JSON.stringify(t)); } catch (err) {}
            }
          }} 
        />
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
        
        {rescheduleAppointment && (
          <RescheduleAppointmentModal
            appointment={rescheduleAppointment}
            patient={data}
            onClose={() => setRescheduleAppointment(null)}
            onSuccess={() => {
              setRescheduleAppointment(null);
              reloadAppointments();
            }}
          />
        )}

        {cancelAppointmentTarget && (
          <CancelAppointmentModal
            appointment={cancelAppointmentTarget}
            patient={data}
            onClose={() => setCancelAppointmentTarget(null)}
            onSuccess={() => {
              setCancelAppointmentTarget(null);
              reloadAppointments();
            }}
          />
        )}
        
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
            orgTemplateUrl={printingPrescription?.resolvedTemplateUrl || orgDetails?.prescriptionTemplate?.templateUrl}
            printableArea={orgDetails?.prescriptionTemplate?.printableArea}
            headerArea={orgDetails?.prescriptionTemplate?.headerArea}
            bodyArea={orgDetails?.prescriptionTemplate?.bodyArea}
            templateMode={orgDetails?.prescriptionTemplate?.templateMode}
            aiHeaderArea={orgDetails?.prescriptionTemplate?.aiHeaderArea}
            aiBodyArea={orgDetails?.prescriptionTemplate?.aiBodyArea}
            fontSize={orgDetails?.prescriptionTemplate?.fontSize}
            isTemplateEnabled={orgDetails?.prescriptionTemplate?.enabled !== false}
            letterheadPrintMode={orgDetails?.prescriptionTemplate?.letterheadPrintMode}
            printBackground={selectedTemplate?._id !== 'global_a4_blank' && selectedTemplate?.headerType !== 'a4_blank'}
            prescription={printingPrescription}
            patient={data}
            clinicName={orgDetails?.name || user?.organization?.name || user?.clinicName}
            clinicContact={orgDetails?.phone || user?.organization?.phone || user?.phone}
            clinicEmail={orgDetails?.email || user?.organization?.email || user?.email}
            clinicWebsite={orgDetails?.website || user?.organization?.website || ''}
            clinicAddress={
              (() => {
                const addr = orgDetails?.address || user?.organization?.address || user?.organizationId?.address || {};
                const parts = [addr.street, addr.city, addr.state, addr.zipCode || addr.zip].filter(p => p && String(p).trim() !== '');
                return parts.join(', ');
              })()
            }
            clinicLogo={printingPrescription?.resolvedLogo || orgDetails?.branding?.logo || orgDetails?.logo || user?.organization?.branding?.logo || user?.organization?.logo}
            footerBarcode={printingPrescription?.resolvedBarcode || printingPrescription?.footerBarcode || printingPrescription?.parsedNotes?.footerBarcode || orgDetails?.prescriptionTemplate?.footerBarcode || orgDetails?.footerBarcode || orgDetails?.branding?.footerBarcode || user?.organization?.prescriptionTemplate?.footerBarcode || user?.organization?.footerBarcode}
            footerText={printingPrescription?.footerText || printingPrescription?.parsedNotes?.footerText || orgDetails?.prescriptionTemplate?.footerText || orgDetails?.branding?.footerText || orgDetails?.footerText || ''}
            footerSubText={printingPrescription?.footerSubText || printingPrescription?.parsedNotes?.footerSubText || printingPrescription?.additionalFooterNote || printingPrescription?.parsedNotes?.additionalFooterNote || orgDetails?.prescriptionTemplate?.footerSubText || orgDetails?.branding?.footerSubText || orgDetails?.footerSubText || user?.organization?.prescriptionTemplate?.footerSubText || user?.organization?.footerSubText || ''}
            doctor={printingPrescription?.doctor || (printingPrescription?.doctorId === user?._id || printingPrescription?.doctorId === user?.id || !printingPrescription?.doctorId ? user : undefined)}
          />
        </div>
      )}

      {printingInvoice && (
        <div className="hidden-print">
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

            return (
              <InvoiceTemplate 
                clinicInfo={clinicInfo}
                template={selectedInvoiceTemplate || invoiceTemplates.find(t => t.isDefault) || invoiceTemplates[0]}
                invoiceData={{
                  billId: printingInvoice.invoiceNumber || printingInvoice.billId,
                  receiptNumber: printingInvoice.receiptNumber || printingInvoice.transactionId,
                  date: printingInvoice.date || printingInvoice.createdAt,
                  patientName: (data.fullName || `${data.firstName || ''} ${data.lastName || ''}`).trim().replace(/\b(MR|MS|MRS|DR|SHRI|SMT)\.?\s+\1\.?\b/gi, '$1.'),
                  patientId: data.patientId,
                  patientPhone: data.mobile || data.phone || data.contactNumber,
                  patientAddress: data.address,
                  gender: data.gender,
                  age: data.age,
                  doctorName: printingInvoice.doctorName || 'N/A',
                  doctorId: printingInvoice.doctorId,
                  doctorStamp: printingInvoice.doctorStamp,
                  doctorSignature: printingInvoice.doctorSignature,
                  items: (printingInvoice.items && printingInvoice.items.length > 0)
                    ? printingInvoice.items.map(i => ({ 
                        description: i.description || i.medicineName || i.name || i.procedureName || 'Medicine/Treatment', 
                        price: parseFloat(i.unitPrice || i.price || i.rate || i.cost || 0),
                        quantity: parseInt(i.qty || i.quantity || 1),
                        subtotal: i.subtotal,
                        toothNumber: i.toothNumber,
                        paymentMode: i.paymentMode || i.paymentMethod,
                        date: i.date || printingInvoice.date || printingInvoice.createdAt
                      }))
                    : [
                        { description: printingInvoice.billType === 'Pharmacy' ? 'Medicines Charges' : 'Consultation Fee', price: totals.grossAmount, quantity: 1, date: printingInvoice.date || printingInvoice.createdAt }
                      ],
                  subtotal: totals.grossAmount,
                  discount: totals.discountAmount,
                  taxRate: totals.taxValue,
                  taxAmount: totals.taxAmount,
                  total: totals.grandTotal,
                  notes: printingInvoice.notes || '',
                  paymentMethod: printingInvoice.paymentMethod || 'N/A',
                  status: printingInvoice.status,
                  installments: printingInvoice.installments || [],
                  paidAmount: totals.paidAmount,
                  dueAmount: totals.dueAmount
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

      {/* Mobile Bottom Navigation for Admin View (Receptionist has it in ReceptionistDashboard) */}
      {!location.pathname.startsWith('/receptionist') && (
        <MobileAppNavigation />
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
            <p className="font-bold text-slate-900">{formatDateDMY(bill.date || bill.billDate || bill.createdAt)}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</h3>
            <p className="font-bold text-slate-900">{formatDateDMY(bill.date || bill.billDate || bill.createdAt)}</p>
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
                <td className="py-4 px-4 font-bold text-slate-800">
                  {item.description || item.procedureName || 'Dental Procedure'}
                  {item.toothNumber ? <span className="text-xs text-indigo-600 ml-2 font-semibold font-mono">(Tooth #{item.toothNumber})</span> : null}
                  {(item.paymentMode || item.paymentMethod) && (
                    <span className="text-[10px] ml-2 px-2 py-0.5 font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {item.paymentMode || item.paymentMethod}
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-center text-slate-600 font-medium">{item.qty || item.quantity || 1}</td>
                <td className="py-4 px-4 text-right text-slate-600 font-medium">₹{(item.unitPrice || item.price || item.rate || 0).toFixed(2)}</td>
                <td className="py-4 px-4 text-right font-bold text-slate-900">₹{(item.subtotal || item.total || item.amount || 0).toFixed(2)}</td>
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
                <span className="text-xs font-bold text-slate-500">{formatDateDMY(bill.date || bill.createdAt)}</span>
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
