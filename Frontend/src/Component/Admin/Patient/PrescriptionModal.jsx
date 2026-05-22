import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Trash2, Save, Activity, ClipboardList, 
  Stethoscope, Pill, Info, FileSearch, Search,
  ChevronDown, History, BookOpen, User, Loader2, Sparkles,
  Mic, MicOff, Languages, Wand2, Copy, RotateCcw, Check, Calendar, Phone
} from 'lucide-react';
import { medicalRecordApi, appointmentApi, centralDoctorApi, complaintApi, chatbotApi, diagnosisApi, aiApi, patientApi, translationApi } from '../../../services/api';
import { COMPLAINT_FREQUENCY_MAP, COMMON_FREQUENCIES } from '../../../data/complaintFrequencyMap';
import { DIAGNOSIS_DURATION_OPTIONS } from '../../../data/diagnosisDurationMap';
import SmartDiagnosisInput from '../../../components/emr/SmartDiagnosisInput';
import SmartMedicineInput from '../../../components/emr/SmartMedicineInput';
import SmartInvestigationInput from '../../../components/emr/SmartInvestigationInput';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

const DURATION_OPTIONS = ['Days', 'Weeks', 'Months', 'Years'];
const DOSE_OPTIONS = ['1-0-0', '0-1-0', '0-0-1', '1-0-1', '1-1-1', '1-1-0', '0-1-1', '1/2-0-1/2', '2-0-2', '0-0-0'];
const WHEN_OPTIONS = ['After Food', 'Before Food', 'With Food', 'Empty Stomach', 'After Breakfast', 'After Lunch', 'After Dinner', 'At Night'];
const FREQ_OPTIONS = ['Daily', 'Twice Daily (BD)', 'Thrice Daily (TDS)', 'Four Times Daily', 'Alternate Day', 'Weekly', 'SOS (As Needed)', 'Once a Month'];

const VOICE_LANGUAGES = [
  { name: 'English', code: 'en-IN' },
  { name: 'Hindi', code: 'hi-IN' },
  { name: 'Hinglish', code: 'hi-IN' },
  { name: 'Tamil', code: 'ta-IN' },
  { name: 'Telugu', code: 'te-IN' },
  { name: 'Bengali', code: 'bn-IN' },
  { name: 'Marathi', code: 'mr-IN' },
  { name: 'Gujarati', code: 'gu-IN' },
  { name: 'Kannada', code: 'kn-IN' },
  { name: 'Malayalam', code: 'ml-IN' },
  { name: 'Punjabi', code: 'pa-IN' },
  { name: 'Urdu', code: 'ur-IN' }
];

const TARGET_LANGUAGES = [
  'English', 'Hindi', 'Hinglish', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu'
];

// --- Generic Dropdown Input ---
const GenericDropdownInput = ({ value, onChange, options, placeholder, className = "" }) => {
  const [show, setShow] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setShow(true)}>
        <input 
          value={value}
          readOnly={options.length > 0 && !['Dose', 'Dur'].includes(placeholder)} // Allow typing in dose and duration
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent border-none p-0 text-sm font-medium text-slate-800 dark:text-slate-200 focus:ring-0 cursor-pointer ${className}`}
        />
        <ChevronDown size={12} className="text-slate-300" />
      </div>
      {show && (
        <div className="absolute top-[calc(100%+8px)] left-0 min-w-[160px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none shadow-2xl z-[9999] py-1 max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1">
          {options.map(opt => (
            <div 
              key={opt} 
              onMouseDown={() => { onChange(opt); setShow(false); }} 
              className="px-4 py-2 text-[10px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 last:border-0"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
// --- AI Synonyms Mapping ---
const aiSynonyms = {
  'sardi': 'Cold', 'zukaam': 'Cold', 'nazla': 'Cold', 'running nose': 'Cold', 'cheenk': 'Sneezing',
  'saans phulna': 'Shortness of Breath', 'dyspnea': 'Shortness of Breath', 'breathless': 'Shortness of Breath',
  'gala kharab': 'Sore Throat', 'gale mein dard': 'Sore Throat', 'khich khich': 'Sore Throat',
  // Digestive
  'ulti': 'Vomiting', 'nausea': 'Vomiting', 'ji machlana': 'Vomiting', ' à¤œà¥€ à¤®à¤¿à¤šà¤²à¤¾à¤¨à¤¾': 'Vomiting',
  'dast': 'Loose Motion', 'diarrhea': 'Loose Motion', 'loose stool': 'Loose Motion', 'pet kharab': 'Loose Motion',
  'pet dard': 'Abdominal Pain', 'stomach pain': 'Abdominal Pain', 'stomach ache': 'Abdominal Pain', 'muraid': 'Abdominal Pain',
  'bhook na lagna': 'Loss of Appetite', 'anorexia': 'Loss of Appetite', 'indigestion': 'Acidity / Indigestion', 'jalan': 'Heartburn',
  'kabz': 'Constipation', 'constipated': 'Constipation',
  // Pain / General
  'sir dard': 'Headache', 'headache': 'Headache', 'head pain': 'Headache', 'migraine': 'Headache',
  'kamzori': 'Weakness', 'fatigue': 'Weakness', 'tiredness': 'Weakness', 'thakan': 'Weakness',
  'badan dard': 'Body Ache', 'muscle pain': 'Body Ache', 'joint pain': 'Arthralgia / Joint Pain', 'ghutno mein dard': 'Joint Pain',
  'chakkar': 'Dizziness', 'giddiness': 'Dizziness', 'vertigo': 'Dizziness',
  'khujli': 'Itching', ' à¤–à¥à¤œà¤²à¥€': 'Itching', 'rash': 'Skin Rash', 'pitthi': 'Urticaria',
  'seene mein dard': 'Chest Pain', 'chest pain': 'Chest Pain', 'ghabrahat': 'Anxiety / Palpitations',
  'neend na aana': 'Insomnia', 'sleeping problem': 'Insomnia'
};

// --- Frequency Dropdown Component ---
const FrequencyDropdownInput = ({ value, onChange, complaintName, doctorSpecialty, user }) => {
  const [show, setShow] = useState(false);
  const [options, setOptions] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  const organizationId = user?.organizationId?._id || user?.organizationId;

  useEffect(() => {
    if (!complaintName) {
      setOptions(COMMON_FREQUENCIES);
    } else {
      const name = complaintName.toLowerCase();
      // Match exact or partial
      const mapKey = Object.keys(COMPLAINT_FREQUENCY_MAP).find(k => name.includes(k) || k.includes(name));
      setOptions(mapKey ? COMPLAINT_FREQUENCY_MAP[mapKey] : COMMON_FREQUENCIES);
    }
  }, [complaintName]);

  // AI Recommendations
  useEffect(() => {
    if (!value || value.length < 3 || options.includes(value)) {
      setAiSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const prompt = `Act as a clinical expert. The patient has "${complaintName}". The doctor typed "${value}" as frequency. Suggest 3-5 formal, professional clinical frequency terms (like 'Night Aggravated', 'Premenstrual Flare', etc.). Only return the terms separated by commas.`;
        const response = await chatbotApi.chat(prompt, [], organizationId, { name: user?.name, role: 'doctor' }, 'doctor');
        
        if (response?.text) {
          const results = response.text.split(',').map(s => s.trim().replace(/[".]/g, '')).filter(s => s.length > 0 && s.length < 30);
          setAiSuggestions(results.slice(0, 4));
        }
      } catch (error) {
        console.error("Frequency AI Error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [value, complaintName]);

  return (
    <div className="relative" ref={containerRef}>
      <input 
        value={value}
        onClick={() => setShow(true)}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 250)}
        placeholder="Frequency..."
        className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-800 dark:text-slate-300 focus:ring-0 cursor-pointer"
      />
      {show && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-64 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl z-[9999] max-h-60 overflow-y-auto py-2 custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
          
          <div className="px-3 py-1 text-[8px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-50 dark:border-slate-700 mb-1 flex items-center gap-2">
            <Activity size={10} /> Suggested Patterns
          </div>
          
          {options.map((opt) => (
            <div 
              key={opt}
              onMouseDown={() => { onChange(opt); setShow(false); }}
              className="px-4 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              {opt}
            </div>
          ))}

          {isLoading && (
            <div className="px-4 py-2 flex items-center gap-2 animate-pulse">
              <Loader2 size={10} className="animate-spin text-indigo-500" />
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Maya AI analyzing...</span>
            </div>
          )}

          {aiSuggestions.length > 0 && (
            <div className="mt-1 border-t border-indigo-50 dark:border-indigo-900/30 pt-1">
              <div className="px-3 py-1 text-[8px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={10} /> AI Recommendations
              </div>
              {aiSuggestions.map((s) => (
                <div 
                  key={s}
                  onMouseDown={() => { onChange(s); setShow(false); }}
                  className="px-4 py-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors"
                >
                  {s}
                </div>
              ))}
            </div>
          )}

          {value && !options.includes(value) && (
            <div className="mt-1 border-t border-slate-50 dark:border-slate-700 pt-1">
              <div 
                onMouseDown={() => setShow(false)}
                className="px-4 py-2 text-[10px] font-black text-emerald-600 flex flex-col"
              >
                <span className="text-[7px] text-slate-400 uppercase tracking-widest">Use Custom</span>
                {value}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Severity Dropdown Component ---
const SeverityDropdownInput = ({ value, onChange, complaintName, user }) => {
  const [show, setShow] = useState(false);
  const options = ["Mild", "Moderate", "Severe", "Very Severe", "Excruciating", "Intermittent", "Worsening"];
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const organizationId = user?.organizationId?._id || user?.organizationId;

  useEffect(() => {
    if (!value || value.length < 3 || options.includes(value)) {
      setAiSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const prompt = `Translate this casual severity description into a formal medical severity term. Input: "${value}". Only return the term.`;
        const response = await chatbotApi.chat(prompt, [], organizationId, { name: user?.name, role: 'doctor' }, 'doctor');
        if (response?.text) {
          const result = response.text.replace(/[".]/g, '').trim();
          setAiSuggestions([result]);
        }
      } catch (error) { console.error(error); } finally { setIsLoading(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative">
      <input 
        value={value}
        onClick={() => setShow(true)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTimeout(() => setShow(false), 250)}
        placeholder="Severity..."
        className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-800 dark:text-slate-300 focus:ring-0 cursor-pointer"
      />
      {show && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-48 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl z-[9999] py-2 custom-scrollbar overflow-hidden">
          {options.map(opt => (
            <div key={opt} onMouseDown={() => { onChange(opt); setShow(false); }} className="px-4 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer">{opt}</div>
          ))}
          {aiSuggestions.map(s => (
            <div key={s} onMouseDown={() => { onChange(s); setShow(false); }} className="px-4 py-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50/30 cursor-pointer flex items-center gap-2">
               <Sparkles size={10} /> {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Duration Dropdown Component ---
const DurationDropdownInput = ({ value, onChange, user }) => {
  const [show, setShow] = useState(false);
  const options = ["1 Day", "2 Days", "3 Days", "1 Week", "2 Weeks", "1 Month", "3 Months", "6 Months", "1 Year", "Since Childhood"];
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const organizationId = user?.organizationId?._id || user?.organizationId;

  useEffect(() => {
    if (!value || value.length < 2 || options.includes(value)) {
      setAiSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const prompt = `Convert this casual duration description into a formal medical duration. Example: "2 din" -> "2 Days", "1 mahina" -> "1 Month". Input: "${value}". Only return the formal duration.`;
        const response = await chatbotApi.chat(prompt, [], organizationId, { name: user?.name, role: 'doctor' }, 'doctor');
        if (response?.text) {
          const result = response.text.replace(/[".]/g, '').trim();
          setAiSuggestions([result]);
        }
      } catch (error) { console.error(error); } finally { setIsLoading(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative">
      <input 
        value={value}
        onClick={() => setShow(true)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTimeout(() => setShow(false), 250)}
        placeholder="Duration..."
        className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-800 dark:text-slate-300 focus:ring-0 cursor-pointer"
      />
      {show && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-48 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl z-[9999] py-2 custom-scrollbar overflow-hidden">
          {options.map(opt => (
            <div key={opt} onMouseDown={() => { onChange(opt); setShow(false); }} className="px-4 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer">{opt}</div>
          ))}
          {aiSuggestions.map(s => (
            <div key={s} onMouseDown={() => { onChange(s); setShow(false); }} className="px-4 py-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50/30 cursor-pointer flex items-center gap-2">
               <Sparkles size={10} /> {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Diagnosis Duration Dropdown ---
const DiagnosisDurationInput = ({ value, onChange, diagnosisType, user }) => {
  const [show, setShow] = useState(false);
  const options = DIAGNOSIS_DURATION_OPTIONS[diagnosisType] || DIAGNOSIS_DURATION_OPTIONS.Fallback;
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <input 
        value={value}
        onClick={() => setShow(true)}
        onChange={(e) => onChange(e.target.value)}

        placeholder="Duration..."
        className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-800 dark:text-slate-300 focus:ring-0 cursor-pointer"
      />
      {show && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-48 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl z-[9999] py-2 max-h-48 overflow-y-auto custom-scrollbar">
          {options.map(opt => (
            <div key={opt} onMouseDown={() => { onChange(opt); setShow(false); }} className="px-4 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Dropdown Component ---
const ComplaintDropdownInput = ({ index, value, onChange, masterComplaints, onAddMaster, user, doctorSpecialty }) => {
  const [show, setShow] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [mayaAiResult, setMayaAiResult] = useState(null);
  const [isMayaLoading, setIsMayaLoading] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const containerRef = useRef(null);

  const organizationId = user?.organizationId?._id || user?.organizationId;

  // Local Dictionary Matching
  useEffect(() => {
    if (!value) {
      // 1. Priority Sorting based on Doctor Specialty
      let prioritized = [...masterComplaints];
      if (doctorSpecialty) {
        const specialty = doctorSpecialty.toLowerCase();
        prioritized = prioritized.sort((a, b) => {
          const catA = (a.category || '').toLowerCase();
          const catB = (b.category || '').toLowerCase();
          
          // Match logic
          const isMatchA = (specialty.includes('derm') && catA.includes('derm')) || 
                           (specialty.includes('pedia') && catA.includes('pedia')) ||
                           (specialty.includes('cardio') && catA.includes('cvs')) ||
                           (specialty.includes('neuro') && catA.includes('neuro')) ||
                           (specialty.includes('physician') && (catA === 'general' || catA === 'respiratory'));

          const isMatchB = (specialty.includes('derm') && catB.includes('derm')) || 
                           (specialty.includes('pedia') && catB.includes('pedia')) ||
                           (specialty.includes('cardio') && catB.includes('cvs')) ||
                           (specialty.includes('neuro') && catB.includes('neuro')) ||
                           (specialty.includes('physician') && (catB === 'general' || catB === 'respiratory'));

          if (isMatchA && !isMatchB) return -1;
          if (!isMatchA && isMatchB) return 1;
          return 0;
        });
      }
      setFiltered(prioritized);
      setAiSuggestions([]);
      setMayaAiResult(null);
    } else {
      const val = value.toLowerCase().trim();
      const valClean = val.replace(/\s(mein|main|ko|se|ka|ki|ke|me)\s/g, ' ').trim(); 
      
      const matches = masterComplaints.filter(c => {
        const nameMatch = c.name.toLowerCase().startsWith(val) || c.name.toLowerCase().includes(val);
        const keywordMatch = c.keywords?.some(k => k.toLowerCase().includes(valClean) || valClean.includes(k.toLowerCase()));
        return nameMatch || keywordMatch;
      });
      setFiltered(matches);

      const suggestions = [];
      Object.entries(aiSynonyms).forEach(([key, actual]) => {
        if (val.includes(key) || key.includes(val) || valClean.includes(key) || (key.split(' ').every(word => valClean.includes(word)))) {
          if (!matches.some(m => m.name === actual)) {
            if (!suggestions.includes(actual)) suggestions.push(actual);
          }
        }
      });
      setAiSuggestions(suggestions);
    }
    setCursor(-1);
  }, [value, masterComplaints]);

  // Maya AI Integration (Debounced)
  useEffect(() => {
    if (!value || value.length < 3) {
      setMayaAiResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      // Only call Maya if no exact match in master or local ai
      const val = value.toLowerCase().trim();
      const hasExactMatch = masterComplaints.some(c => c.name.toLowerCase() === val) || aiSuggestions.some(s => s.toLowerCase() === val);
      
      if (!hasExactMatch) {
        setIsMayaLoading(true);
        try {
          const prompt = `Act as a clinical expert. Translate this Hinglish/Hindi or casual medical complaint into a formal 1-3 word English medical term. Only return the medical term name. Input: "${value}"`;
          const response = await chatbotApi.chat(prompt, [], organizationId, { name: user?.name, role: 'doctor' }, 'doctor');
          
          if (response?.text && response.text.length < 40) {
            const result = response.text.replace(/[".]/g, '');
            setMayaAiResult(result);
          }
        } catch (error) {
          console.error("Maya AI Error:", error);
        } finally {
          setIsMayaLoading(false);
        }
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (name) => {
    onChange(name);
    setShow(false);
  };

  const handleKeyDown = (e) => {
    const totalOptions = filtered.length + aiSuggestions.length + (mayaAiResult ? 1 : 0) + 1; 
    if (e.key === 'ArrowDown') {
      setCursor(prev => (prev < totalOptions - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      setCursor(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault();
      const mayaIdx = filtered.length + aiSuggestions.length;
      if (cursor < filtered.length) {
        handleSelect(filtered[cursor].name);
      } else if (cursor < filtered.length + aiSuggestions.length) {
        handleSelect(aiSuggestions[cursor - filtered.length]);
      } else if (mayaAiResult && cursor === mayaIdx) {
        handleSelect(mayaAiResult);
      } else {
        setShow(false);
      }
    } else if (e.key === 'Escape') {
      setShow(false);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="relative" ref={containerRef}>
      <input 
        value={value} 
        onClick={() => setShow(true)}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 250)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. Cough, Fever"
        className="w-full bg-transparent border-none p-0 text-sm font-normal text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer"
      />
      {show && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-80 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl z-[9999] max-h-80 overflow-y-auto py-3 custom-scrollbar ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
          {filtered.length === 0 && aiSuggestions.length === 0 && !mayaAiResult && !isMayaLoading && value && (
             <div className="px-4 py-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">No matches found</div>
          )}
          
          {filtered.length > 0 && (
            <div className="pb-2">
              {/* Group by category */}
              {Array.from(new Set(filtered.map(c => c.category || 'General'))).sort().map(cat => {
                const catIcons = {
                  'General': '🩺', 'Respiratory': '🫁', 'ENT': '👂', 'Gastrointestinal': '🤢', 
                  'CVS': '❤️', 'Neurology': '🧠', 'Musculoskeletal': '🦴', 'Skin': '🩹',
                  'Urology': '🚽', 'Gynecology': '👩', 'Pediatric': '👶', 'Chronic': '📅',
                  'Eye': '👁️', 'Dental': '🦷', 'Psychological': '🧘',
                  'Derm: Itching': '🦠', 'Derm: Rash': '🔴', 'Derm: Acne': '💆', 'Derm: Fungal': '🍄',
                  'Derm: Allergy': '🤧', 'Derm: Eczema': '🩸', 'Derm: Psoriasis': '🩹', 
                  'Derm: Pigmentation': '✨', 'Derm: Hair': '💇', 'Derm: Nail': '💅',
                  'Derm: Sensation': '⚡', 'Derm: Boils': '🌋', 'Derm: Warts': '🦠',
                  'Derm: Ulcer': '🩸', 'Derm: Sweating': '💦'
                };
                return (
                  <div key={cat} className="mb-2">
                    <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] border-y border-slate-300/50 dark:border-slate-700/50 flex items-center gap-2">
                      <span>{catIcons[cat] || '📋'}</span>
                      {cat}
                    </div>
                    {filtered.filter(c => (c.category || 'General') === cat).map((c, i) => (
                      <div 
                        key={c._id || i}
                        onMouseDown={() => handleSelect(c.name)}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${cursor === filtered.indexOf(c) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                      >
                        <span className="font-bold">{c.name}</span>
                        {c.organizationId === null && (
                          <span className="text-[9px] bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-indigo-400 font-black uppercase">Standard</span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {aiSuggestions.map((s, i) => (
            <div 
              key={s}
              onMouseDown={() => handleSelect(s)}
              className={`px-4 py-3 cursor-pointer transition-all border-b border-slate-50/50 dark:border-slate-700/50 flex items-center justify-between ${cursor === i + filtered.length ? 'bg-indigo-50/80 text-indigo-700' : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-50/30'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 shrink-0">
                  <Activity size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black tracking-tight">{s}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-400"></div> Medical Term
                  </span>
                </div>
              </div>
              <ChevronDown size={14} className="-rotate-90 text-slate-300" />
            </div>
          ))}

          {isMayaLoading && (
            <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-50 dark:border-slate-700 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <Loader2 size={14} className="text-white animate-spin" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Maya AI is analyzing...</span>
              </div>
            </div>
          )}

          {mayaAiResult && (
            <div 
              onMouseDown={() => handleSelect(mayaAiResult)}
              className={`px-4 py-3 cursor-pointer transition-all border-b border-slate-200 dark:border-indigo-900/50 flex items-center justify-between ${cursor === filtered.length + aiSuggestions.length ? 'bg-indigo-600 text-white' : 'bg-indigo-50/50 text-indigo-700 dark:bg-indigo-900/20'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
                  <Sparkles size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black tracking-tight">{mayaAiResult}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${cursor === filtered.length + aiSuggestions.length ? 'text-indigo-100' : 'text-indigo-500'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div> Maya AI Prediction
                  </span>
                </div>
              </div>
              <ChevronDown size={14} className="-rotate-90 opacity-40" />
            </div>
          )}

          {value && !masterComplaints.some(c => c.name.toLowerCase() === value.toLowerCase()) && (
            <div 
              onMouseDown={() => setShow(false)}
              className={`px-4 py-2.5 text-sm cursor-pointer border-t border-slate-50 dark:border-slate-700 mt-2 flex items-center justify-between ${cursor === filtered.length + aiSuggestions.length + (mayaAiResult ? 1 : 0) ? 'bg-indigo-50' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Custom Entry</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">"{value}"</span>
              </div>
              {isAdmin && (
                <button 
                  onMouseDown={(e) => { e.stopPropagation(); onAddMaster(value); }}
                  className="px-2 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded hover:bg-indigo-700 shadow-sm"
                >
                  Add to Master
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PrescriptionModal = ({ isOpen, onClose, patient, onSaveSuccess, editData }) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [masterComplaints, setMasterComplaints] = useState([]);

  // --- Form State ---
  const [vitals, setVitals] = useState({
    height: '',
    weight: '',
    pulse: '',
    bp_sys: '',
    bp_dia: '',
    temp: ''
  });

  const [complaints, setComplaints] = useState([{ name: '', frequency: 'daily', severity: 'mild', duration: '', durationUnit: 'days' }]);
  const [diagnosis, setDiagnosis] = useState([{ name: '', duration: '', date: new Date().toISOString().split('T')[0] }]);
  const [medications, setMedications] = useState([{ name: '', composition: '', genericName: '', form: '', strength: '', dose: '', when: 'After Food', frequency: 'Daily', duration: '', instructions: '' }]);
  const [advice, setAdvice] = useState('');
  const [testsRequested, setTestsRequested] = useState([]);

  // --- Advice Extensions State ---
  const [translatedAdvice, setTranslatedAdvice] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState('en-IN');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);
  const recognitionRef = useRef(null);
  const translateMenuRef = useRef(null);

  // Click outside handling for Translate Menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (translateMenuRef.current && !translateMenuRef.current.contains(event.target)) {
        setShowTranslateMenu(false);
      }
    };
    if (showTranslateMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTranslateMenu]);

  // 1. Fetch initial data (Doctors, Master Complaints)
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [docsResponse, masterComplaintsResponse] = await Promise.all([
            centralDoctorApi.getAll(),
            complaintApi.getMaster()
          ]);
          
          const docs = Array.isArray(docsResponse) ? docsResponse : (docsResponse.doctors || []);
          setDoctors(docs);
          setMasterComplaints(masterComplaintsResponse);

          // If editing, match doctor after fetching
          if (editData?.doctorId) {
             const matched = docs.find(d => d._id === editData.doctorId || d.userId === editData.doctorId);
             if (matched) setSelectedDoctor(matched);
          } else if (user?.role === 'doctor') {
             // Pre-select current user if they are a doctor for new prescriptions
             const matched = docs.find(d => d._id === user._id || d.userId === user._id);
             if (matched) setSelectedDoctor(matched);
          }
        } catch (error) {
          console.error("Error fetching modal data:", error);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  // 2. Initialize Form Fields
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        // Edit Mode: Pre-populate from record
        let parsedNotes = {};
        try {
          parsedNotes = typeof editData.notes === 'string' ? JSON.parse(editData.notes) : editData.notes;
        } catch (e) {
          console.error("Error parsing prescription notes for edit:", e);
        }

        setVitals({
          height: parsedNotes.vitals?.height || '',
          weight: parsedNotes.vitals?.weight || '',
          pulse: parsedNotes.vitals?.pulse || '',
          bp_sys: parsedNotes.vitals?.bp_sys || '',
          bp_dia: parsedNotes.vitals?.bp_dia || '',
          temp: parsedNotes.vitals?.temp || ''
        });
        setComplaints(parsedNotes.complaints || [{ name: '', frequency: 'daily', severity: 'mild', duration: '', durationUnit: 'days' }]);
        setDiagnosis(parsedNotes.diagnosis || [{ name: '', duration: '', durationUnit: 'days' }]);
        setMedications(parsedNotes.medications || [{ name: '', dose: '', when: 'After Food', frequency: 'Daily', duration: '', instructions: '' }]);
        setAdvice(parsedNotes.advice || '');
        setTranslatedAdvice(parsedNotes.translatedAdvice || '');
        setTargetLanguage(parsedNotes.adviceLanguage || 'English');
        setTestsRequested(parsedNotes.testsRequested || []);
      } else {
        // Create Mode: Use patient vitals as default
        setVitals({
          height: patient?.vitals?.height || patient?.height || '',
          weight: patient?.vitals?.weight || patient?.weight || '',
          pulse: patient?.vitals?.pulse || '',
          bp_sys: (patient?.vitals?.bloodPressure || patient?.bloodPressure || '').split('/')[0] || '',
          bp_dia: (patient?.vitals?.bloodPressure || patient?.bloodPressure || '').split('/')[1] || '',
          temp: patient?.vitals?.temp || ''
        });
        setComplaints([{ name: '', frequency: 'daily', severity: 'mild', duration: '', durationUnit: 'days' }]);
        setDiagnosis([{ name: '', duration: '', durationUnit: 'days' }]);
        setMedications([{ name: '', dose: '', when: 'After Food', frequency: 'Daily', duration: '', instructions: '' }]);
        setAdvice('');
        setTranslatedAdvice('');
        setTargetLanguage('English');
        setTestsRequested([]);
      }
    }
  }, [isOpen, editData]);

  // --- Voice to Text Logic ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setAdvice(prev => (prev.trim() + ' ' + finalTranscript.trim()).trim());
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please enable permissions.");
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [speechLanguage]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.warning("Voice typing is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.lang = speechLanguage;
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recording:", err);
        toast.error("Could not start recording.");
      }
    }
  };

  // --- AI Advice Actions ---
  const handleTranslate = async () => {
    if (!advice.trim()) {
      toast.warning("Please enter advice to translate.");
      return;
    }
    if (targetLanguage === 'English') {
      setTranslatedAdvice('');
      toast.info("English is already selected.");
      return;
    }
    setIsTranslating(true);
    try {
      const response = await aiApi.translateAdvice({
        originalAdvice: advice,
        targetLanguage,
        patientContext: {
          age: `${patient?.age} ${patient?.ageType}`,
          gender: patient?.gender,
          diagnosis: diagnosis.map(d => d.name).join(', '),
          complaints: complaints.map(c => c.name),
          medicines: medications
        }
      });
      setTranslatedAdvice(response.translatedAdvice);
      toast.success("Advice translated!");
    } catch (error) {
      console.error("Translation Error:", error);
      toast.error("Failed to translate advice.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFullTranslation = async (lang) => {
    setTargetLanguage(lang);
    
    // 1. Translate Advice if exists
    if (advice.trim()) {
      if (lang === 'English') {
        setTranslatedAdvice('');
      } else {
        setIsTranslating(true);
        try {
          const response = await aiApi.translateAdvice({
            originalAdvice: advice,
            targetLanguage: lang,
            patientContext: {
              age: `${patient?.age} ${patient?.ageType}`,
              gender: patient?.gender,
              diagnosis: diagnosis.map(d => d.name).join(', '),
              complaints: complaints.map(c => c.name),
              medicines: medications
            }
          });
          setTranslatedAdvice(response.translatedAdvice);
        } catch (err) {
          console.error("Advice translation failed:", err);
        } finally {
          setIsTranslating(false);
        }
      }
    }

    // 2. Translate Medications & Complaints
    const filteredMeds = medications.filter(m => m.name);
    const filteredComplaints = complaints.filter(c => c.name);
    
    if (filteredMeds.length > 0 || filteredComplaints.length > 0) {
      setIsSaving(true); // Reuse isSaving as a global loading state or add a new one
      try {
        const result = await translationApi.translatePrescription(
          filteredMeds,
          filteredComplaints,
          lang
        );
        
        if (result.success) {
          // Update medications state while preserving non-translated rows if any
          const updatedMeds = medications.map(m => {
            if (!m.name) return m;
            const translated = result.medications.find(tm => tm.name === m.name);
            return translated ? { ...m, ...translated } : m;
          });
          setMedications(updatedMeds);

          // Update complaints state
          const updatedComplaints = complaints.map(c => {
            if (!c.name) return c;
            const translated = result.complaints.find(tc => tc.name === c.name);
            return translated ? { ...c, ...translated } : c;
          });
          setComplaints(updatedComplaints);
          
          toast.success(`Prescription switched to ${lang}`);
        }
      } catch (err) {
        console.error("Prescription translation failed:", err);
        toast.error("Failed to translate clinical fields.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleImprove = async () => {
    if (!advice.trim()) {
      toast.warning("Please enter advice to improve.");
      return;
    }
    setIsImproving(true);
    try {
      const response = await aiApi.improveAdvice({
        originalAdvice: advice,
        patientContext: {
          age: `${patient?.age} ${patient?.ageType}`,
          gender: patient?.gender,
          diagnosis: diagnosis.map(d => d.name).join(', '),
          complaints: complaints.map(c => c.name)
        }
      });
      setAdvice(response.improvedAdvice);
      toast.success("Advice improved!");
    } catch (error) {
      console.error("Improvement Error:", error);
      toast.error("Failed to improve advice.");
    } finally {
      setIsImproving(false);
    }
  };

  // --- Handlers for Dynamic Lists ---
  const addComplaint = () => setComplaints([...complaints, { name: '', frequency: 'daily', severity: 'mild', duration: '', durationUnit: 'days' }]);
  const removeComplaint = (idx) => setComplaints(complaints.filter((_, i) => i !== idx));
  const updateComplaint = (idx, field, val) => {
    const newArr = [...complaints];
    newArr[idx][field] = val;
    setComplaints(newArr);
  };

  const addDiagnosis = () => setDiagnosis([...diagnosis, { name: '', duration: '', durationUnit: 'days' }]);
  const removeDiagnosis = (idx) => setDiagnosis(diagnosis.filter((_, i) => i !== idx));
  const updateDiagnosis = (idx, field, val) => {
    const newArr = [...diagnosis];
    newArr[idx][field] = val;
setDiagnosis(newArr);
  };

  const addMedication = () => setMedications([...medications, { name: '', dose: '', when: 'After Food', frequency: 'Daily', duration: '', instructions: '' }]);
  
  useEffect(() => {
    console.log("Oviaan EMR: Smart Medicine Engine Initialized");
  }, []);
  const removeMedication = (idx) => setMedications(medications.filter((_, i) => i !== idx));
  const updateMedication = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSelectMedication = (index, fullMed) => {
    const updated = [...medications];
    updated[index] = {
      ...updated[index],
      name: fullMed.name,
      composition: fullMed.composition || fullMed.salt || '',
      genericName: fullMed.genericName || '',
      form: fullMed.form || '',
      strength: fullMed.strength || '',
      dose: fullMed.dose || updated[index].dose,
      when: fullMed.when || updated[index].when,
      frequency: fullMed.frequency || updated[index].frequency,
      duration: fullMed.duration || updated[index].duration,
      notes: fullMed.notes || updated[index].notes
    };
    setMedications(updated);
  };

  const handleSave = async () => {
    if (!patient?._id) return;
    
    const docId = patient?.assignedDoctorId || selectedDoctor?._id || user?._id || null;
    const docName = patient?.assignedDoctor || selectedDoctor?.name || selectedDoctor?.fullName || user?.name || user?.fullName || 'Unknown Doctor';

    setIsSaving(true);
    try {
      let finalMedications = medications.filter(m => m.name);
      let finalComplaints = complaints.filter(c => c.name);

      // --- AUTOMATED TRANSLATION TRIGGER ---
      if (targetLanguage && targetLanguage !== 'English') {
        try {
          const translationResult = await translationApi.translatePrescription(
            finalMedications,
            finalComplaints,
            targetLanguage
          );
          
          if (translationResult.success) {
            finalMedications = translationResult.medications;
            finalComplaints = translationResult.complaints;
            toast.info(`Prescription instructions translated to ${targetLanguage}`);
          }
        } catch (transErr) {
          console.error("Prescription Translation Error:", transErr);
          toast.warning("Failed to translate some fields, saving in English.");
        }
      }

      const detailedData = {
        vitals,
        complaints: finalComplaints,
        diagnosis: diagnosis.filter(d => d.name),
        medications: finalMedications,
        advice,
        translatedAdvice,
        adviceLanguage: targetLanguage,
        testsRequested: testsRequested.filter(t => t.trim() !== '')
      };

      const recordData = {
        patientId: patient._id,
        organizationId: user?.organizationId || user?.organization?._id,
        type: 'Prescription',
        title: `Digital Prescription - ${new Date().toLocaleDateString()}`,
        description: JSON.stringify(detailedData),
        doctorId: docId,
        doctorName: docName,
        status: 'Completed',
        date: new Date()
      };

      if (editData && editData.id) {
        if (editData.type === 'Visit Note') {
          await appointmentApi.updateNotes(editData.id, recordData.description);
          toast.success("Visit notes updated successfully!");
        } else {
          await medicalRecordApi.update(editData.id, recordData);
          toast.success("Prescription updated successfully!");
        }
      } else {
        await medicalRecordApi.create(recordData);
        toast.success("Prescription saved successfully!");
      }

      // Sync Vitals Back To Patient Profile
      try {
        const bpStr = (vitals.bp_sys || vitals.bp_dia) ? `${vitals.bp_sys || ''}/${vitals.bp_dia || ''}` : '';
        const updatedVitals = {
          height: vitals.height || patient?.vitals?.height || '',
          weight: vitals.weight || patient?.vitals?.weight || '',
          bloodPressure: bpStr || patient?.vitals?.bloodPressure || '',
          pulse: vitals.pulse || patient?.vitals?.pulse || '',
          temp: vitals.temp || patient?.vitals?.temp || ''
        };
        await patientApi.update(patient._id, { vitals: updatedVitals });
      } catch (err) {
        console.error("Failed to sync vitals to patient profile:", err);
      }
      
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (error) {
      console.error("Save Error:", error);
      toast.error("Failed to save prescription.");
    } finally {
      setIsSaving(false);
    }
  };

  const addMasterComplaint = async (name) => {
    try {
      const newC = await complaintApi.addMaster({ name });
      setMasterComplaints(prev => [...prev, newC]);
      toast.success(`"${name}" added to master list!`);
    } catch (error) {
      console.error("Error adding to master:", error);
      toast.error("Failed to add to master list.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Body */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-slate-900 w-full max-w-7xl h-[95vh] rounded-none shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="p-4 bg-white dark:bg-slate-900 sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 dark:border-slate-800">
            {/* Left side: Patient Info */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white capitalize">{patient?.fullName || patient?.name || (patient?.firstName ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient')}</h2>
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                  ID: {patient?.patientId || patient?.uid || patient?._id?.toString().slice(-6) || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                <span className="flex items-center gap-1"><Calendar size={11}/> {patient?.age || '--'} Year</span>
                <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1"><User size={11}/> {patient?.gender || '--'}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1"><Phone size={11}/> {patient?.phone || patient?.mobileNumber || patient?.mobile || '--'}</span>
              </div>
            </div>

            {/* Right side: Date and Doctor */}
            <div className="flex gap-4 items-start">
              <div className="flex flex-col items-end gap-0.5 mt-1">
                <span className="text-[13px] font-bold text-slate-900 dark:text-white tracking-wide">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                  {(() => {
                    const docName = patient?.assignedDoctor || (selectedDoctor ? (selectedDoctor.name || selectedDoctor.fullName) : 'UNKNOWN DOCTOR');
                    return String(docName).toUpperCase().startsWith('DR') ? docName : 'DR. ' + docName;
                  })()}
                </span>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors self-start text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f8fafc] dark:bg-slate-950/50">
            
            {/* 1. VITALS */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="text-indigo-600" size={16} />
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Patient Vitals</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-white dark:bg-slate-900 p-3 rounded-none border border-slate-300 dark:border-slate-800 shadow-sm">
                <VitalInput label="Height" unit="cm" value={vitals.height} onChange={(v) => setVitals({...vitals, height: v})} />
                <VitalInput label="Weight" unit="kg" value={vitals.weight} onChange={(v) => setVitals({...vitals, weight: v})} />
                <VitalInput label="Pulse" unit="bpm" value={vitals.pulse} onChange={(v) => setVitals({...vitals, pulse: v})} />
                <div className="col-span-1">
                   <label className="text-xs font-semibold text-slate-600 mb-1 block px-1">BP (Sys/Dia)</label>
                   <div className="flex items-center gap-1">
                     <input 
                       type="text" 
                       placeholder="120"
                       value={vitals.bp_sys}
                       onChange={(e) => setVitals({...vitals, bp_sys: e.target.value})}
                       className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-base font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                     />
                     <span className="text-slate-300">/</span>
                     <input 
                       type="text" 
                       placeholder="80"
                       value={vitals.bp_dia}
                       onChange={(e) => setVitals({...vitals, bp_dia: e.target.value})}
                       className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-base font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                     />
                   </div>
                </div>
                <VitalInput label="Temp" unit="°F" value={vitals.temp} onChange={(v) => setVitals({...vitals, temp: v})} />
              </div>
            </section>

            {/* 2. COMPLAINTS */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="text-indigo-600" size={18} />
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Chief Complaints</h4>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-800 shadow-sm overflow-visible">
                <table className="w-full text-left block sm:table">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 hidden sm:table-header-group">
                    <tr>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Complaint</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Frequency</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Severity</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 w-40">Duration</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 block sm:table-row-group">
                    {complaints.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/30 transition-colors flex flex-col sm:table-row p-3 sm:p-0 relative gap-1 sm:gap-0">
                        <td className="px-1 sm:px-4 py-2 overflow-visible relative">
                          <div className="flex items-center gap-2 w-full pr-8 sm:pr-0">
                            <button type="button" onClick={addComplaint} className="flex-shrink-0 p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm shadow-blue-600/30" title="Add Complaint">
                              <Plus size={14} strokeWidth={3} />
                            </button>
                            <div className="flex-1 min-w-[200px]">
                              <ComplaintDropdownInput 
                                index={i} 
                                value={c.name} 
                                onChange={(val) => updateComplaint(i, 'name', val)} 
                                masterComplaints={masterComplaints}
                                onAddMaster={addMasterComplaint}
                                user={user}
                                doctorSpecialty={selectedDoctor?.specialization || selectedDoctor?.speciality}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-1 sm:px-4 py-1 sm:py-2 flex items-center justify-between sm:table-cell">
                          <span className="text-xs font-semibold text-slate-500 sm:hidden">Frequency:</span>
                          <FrequencyDropdownInput 
                            value={c.frequency}
                            onChange={(val) => updateComplaint(i, 'frequency', val)}
                            complaintName={c.name}
                            doctorSpecialty={selectedDoctor?.specialization || selectedDoctor?.speciality}
                            user={user}
                          />
                        </td>
                        <td className="px-1 sm:px-4 py-1 sm:py-2 flex items-center justify-between sm:table-cell">
                          <span className="text-xs font-semibold text-slate-500 sm:hidden">Severity:</span>
                          <SeverityDropdownInput 
                            value={c.severity}
                            onChange={(val) => updateComplaint(i, 'severity', val)}
                            complaintName={c.name}
                            user={user}
                          />
                        </td>
                        <td className="px-1 sm:px-4 py-1 sm:py-2 flex items-center justify-between sm:table-cell">
                          <span className="text-xs font-semibold text-slate-500 sm:hidden">Duration:</span>
                          <DurationDropdownInput 
                            value={c.duration}
                            onChange={(val) => updateComplaint(i, 'duration', val)}
                            user={user}
                          />
                        </td>
                        <td className="px-1 sm:px-4 py-1 sm:py-2 absolute right-2 top-2 sm:relative sm:right-auto sm:top-auto sm:table-cell">
                          {complaints.length > 1 && (
                            <button onClick={() => removeComplaint(i)} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. DIAGNOSIS */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSearch className="text-indigo-600" size={18} />
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Diagnosis</h4>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-800 shadow-sm overflow-visible">
                <table className="w-full text-left block sm:table">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 hidden sm:table-header-group">
                    <tr>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 w-12 text-center">#</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Diagnosis Name</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 w-48">Duration</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 w-48">Date</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 block sm:table-row-group">
                    {diagnosis.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50/30 transition-colors flex flex-col sm:table-row p-3 sm:p-0 relative gap-1 sm:gap-0">
                        <td className="px-4 py-2.5 text-sm font-normal text-slate-500 text-center hidden sm:table-cell">{i + 1}</td>
                        <td className="px-1 sm:px-4 py-2 overflow-visible">
                          <div className="flex items-center gap-2 w-full pr-8 sm:pr-0">
                            <span className="sm:hidden text-xs font-bold text-slate-400">#{i + 1}</span>
                            <button type="button" onClick={addDiagnosis} className="flex-shrink-0 p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm shadow-blue-600/30" title="Add Diagnosis">
                              <Plus size={14} strokeWidth={3} />
                            </button>
                            <div className="flex-1 min-w-[200px]">
                              <SmartDiagnosisInput 
                                value={d.name}
                                onChange={(val) => updateDiagnosis(i, 'name', val)}
                                context={{
                                  complaints,
                                  specialty: selectedDoctor?.specialization,
                                  age: patient?.age,
                                  gender: patient?.gender,
                                  vitals,
                                  history: [] 
                                }}
                                user={user}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-1 sm:px-4 py-1 sm:py-2 flex items-center justify-between sm:table-cell">
                          <span className="text-xs font-semibold text-slate-500 sm:hidden">Duration:</span>
                          <DiagnosisDurationInput 
                            value={d.duration}
                            onChange={(val) => updateDiagnosis(i, 'duration', val)}
                            diagnosisType={d.durationType || 'Acute'}
                            user={user}
                          />
                        </td>
                        <td className="px-1 sm:px-4 py-1 sm:py-2 flex items-center justify-between sm:table-cell">
                          <span className="text-xs font-semibold text-slate-500 sm:hidden">Date:</span>
                          <input 
                            type="date"
                            value={d.date}
                            onChange={(e) => updateDiagnosis(i, 'date', e.target.value)}
                            className="w-full sm:w-auto bg-transparent border-none p-0 text-sm font-normal text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer text-right sm:text-left"
                          />
                        </td>
                        <td className="px-1 sm:px-4 py-1 sm:py-2 absolute right-2 top-2 sm:relative sm:right-auto sm:top-auto sm:table-cell">
                          {diagnosis.length > 1 && (
                            <button onClick={() => removeDiagnosis(i)} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. RX (MEDICATIONS) */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="text-indigo-600" size={18} />
                  <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Medications (Rx)</h4>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-300 dark:border-slate-800 shadow-sm overflow-visible">
                <table className="w-full text-left block sm:table">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 hidden sm:table-header-group">
                    <tr>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Medicine</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Dose</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">When</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Frequency</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Duration</th>
                      <th className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 block sm:table-row-group">
                    {medications.map((m, i) => (
                      <React.Fragment key={i}>
                        <tr className="hover:bg-slate-50/30 transition-colors flex flex-col sm:table-row p-3 sm:p-0 relative gap-1 sm:gap-0 border-b border-slate-100 dark:border-slate-800 sm:border-0">
                          <td className="px-1 sm:px-4 py-2 sm:min-w-[300px] sm:border border-slate-200 dark:border-slate-800 pb-3 sm:pb-2">
                            <div className="flex items-start gap-2 w-full pr-8 sm:pr-0">
                              <button type="button" onClick={addMedication} className="mt-1 flex-shrink-0 p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm shadow-blue-600/30" title="Add Medicine">
                                <Plus size={14} strokeWidth={3} />
                              </button>
                              <div className="flex flex-col gap-0.5 flex-1 w-full relative">
                                <SmartMedicineInput 
                                  value={m.name}
                                  onSelect={(fullMed) => handleSelectMedication(i, fullMed)}
                                  context={{
                                    diagnosis: diagnosis[0]?.name || '',
                                    complaints: complaints.map(c => c.name),
                                    specialty: user?.specialty,
                                    age: patient?.age,
                                    gender: patient?.gender
                                  }}
                                  user={user}
                                />
                                {(m.composition || m.genericName) && (
                                  <div className="text-xs font-normal text-slate-500 italic px-1 line-clamp-1">
                                    —({m.composition || m.genericName})
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-1 sm:px-4 py-1.5 flex items-center justify-between sm:table-cell">
                            <span className="text-xs font-semibold text-slate-500 sm:hidden">Dose:</span>
                            <GenericDropdownInput 
                              value={m.dose} 
                              onChange={(v) => updateMedication(i, 'dose', v)}
                              options={DOSE_OPTIONS}
                              placeholder="Dose"
                              className="w-24 sm:w-20 bg-slate-50 dark:bg-slate-800 rounded sm:rounded-none p-1.5 text-right sm:text-left"
                            />
                          </td>
                          <td className="px-1 sm:px-4 py-1.5 flex items-center justify-between sm:table-cell">
                            <span className="text-xs font-semibold text-slate-500 sm:hidden">When:</span>
                            <GenericDropdownInput 
                              value={m.when} 
                              onChange={(v) => updateMedication(i, 'when', v)}
                              options={WHEN_OPTIONS}
                              placeholder="When"
                              className="text-slate-500 uppercase text-right sm:text-left w-32 sm:w-auto"
                            />
                          </td>
                          <td className="px-1 sm:px-4 py-1.5 flex items-center justify-between sm:table-cell">
                            <span className="text-xs font-semibold text-slate-500 sm:hidden">Frequency:</span>
                            <GenericDropdownInput 
                              value={m.frequency} 
                              onChange={(v) => updateMedication(i, 'frequency', v)}
                              options={FREQ_OPTIONS}
                              placeholder="Freq"
                              className="text-slate-500 uppercase text-right sm:text-left w-32 sm:w-auto"
                            />
                          </td>
                          <td className="px-1 sm:px-4 py-1.5 flex items-center justify-between sm:table-cell">
                            <span className="text-xs font-semibold text-slate-500 sm:hidden">Duration:</span>
                            <GenericDropdownInput 
                              value={m.duration} 
                              onChange={(v) => updateMedication(i, 'duration', v)}
                              options={DURATION_OPTIONS}
                              placeholder="Dur"
                              className="text-slate-400 text-right sm:text-left w-24 sm:w-auto"
                            />
                          </td>
                          <td className="px-1 sm:px-4 py-1.5 absolute right-2 top-2 sm:relative sm:right-auto sm:top-auto sm:table-cell">
                            {medications.length > 1 && (
                              <button onClick={() => removeMedication(i)} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>

                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. ADVICE & TESTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="text-indigo-600" size={18} />
                      <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Advice</h4>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Voice Settings */}
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 px-2 rounded-lg">
                        <select 
                          value={speechLanguage}
                          onChange={(e) => setSpeechLanguage(e.target.value)}
                          className="bg-transparent border-none p-0 text-[10px] font-black text-slate-500 uppercase tracking-widest focus:ring-0 cursor-pointer"
                        >
                          {VOICE_LANGUAGES.map(l => <option key={l.name} value={l.code}>{l.name}</option>)}
                        </select>
                        <button 
                          onClick={toggleRecording}
                          className={`p-1.5 rounded-md transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-slate-700 text-slate-400 hover:text-indigo-600'}`}
                        >
                          {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                        </button>
                      </div>

                      <button 
                        onClick={handleImprove}
                        disabled={isImproving || !advice.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
                      >
                        {isImproving ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                        Improve
                      </button>
                    </div>
                  </div>

                  <div className="relative group">
                    <textarea 
                      value={advice}
                      onChange={(e) => setAdvice(e.target.value)}
                      rows="4"
                      placeholder={isRecording ? "Listening... Speak clearly into your microphone." : "Enter patient advice here or use the microphone..."}
                      className={`w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 text-sm font-normal text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all ${isRecording ? 'ring-2 ring-red-500/20 border-red-200' : ''}`}
                    />
                    {isRecording && (
                      <div className="absolute top-4 right-4 flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1 h-1 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '200ms' }}></div>
                        <div className="w-1 h-1 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '400ms' }}></div>
                      </div>
                    )}
                  </div>

                  {/* Translation Tools */}
                  <div className="pt-2 flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-300 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <Languages size={16} className="text-slate-400" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Translation Target</span>
                          <select 
                            value={targetLanguage}
                            onChange={(e) => {
                              const newLang = e.target.value;
                              setTargetLanguage(newLang);
                              handleFullTranslation(newLang);
                            }}
                            className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer"
                          >
                            {TARGET_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                      <button 
                        onClick={handleTranslate}
                        disabled={isTranslating || !advice.trim()}
                        className="px-5 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isTranslating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                        Translate Advice
                      </button>
                    </div>

                    {translatedAdvice && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between px-1">
                           <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Translated Advice ({targetLanguage})</span>
                           </div>
                           <div className="flex gap-3">
                             <button 
                               onClick={() => { setAdvice(translatedAdvice); setTranslatedAdvice(''); }}
                               className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                             >
                               <RotateCcw size={10} /> Use Original
                             </button>
                             <button 
                               onClick={() => { navigator.clipboard.writeText(translatedAdvice); toast.success("Copied!"); }}
                               className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 flex items-center gap-1"
                             >
                               <Copy size={10} /> Copy
                             </button>
                           </div>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 text-sm font-bold text-emerald-700 dark:text-emerald-400 italic leading-relaxed">
                          "{translatedAdvice}"
                        </div>
                      </motion.div>
                    )}
                  </div>
               </section>

               <section className="space-y-4">
                  <SmartInvestigationInput 
                    selectedTests={testsRequested}
                    onChange={setTestsRequested}
                    user={user}
                    diagnosis={diagnosis[0]?.name}
                    complaints={complaints.map(c => c.name)}
                  />
               </section>
            </div>

          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3 text-slate-400 w-full sm:w-auto justify-center sm:justify-start">
               <History size={16} />
               <span className="text-xs font-medium text-slate-500">Draft automatically saved</span>
            </div>
            <div className="flex gap-2 sm:gap-4 relative w-full sm:w-auto justify-between sm:justify-end">
              <div ref={translateMenuRef} className="relative">
                <button
                  onClick={() => setShowTranslateMenu(!showTranslateMenu)}
                  className="px-4 sm:px-8 py-2.5 sm:py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-black rounded-2xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Languages size={18} />
                  <span className="hidden sm:inline">{targetLanguage}</span>
                </button>

                <AnimatePresence>
                  {showTranslateMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full mb-3 left-0 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[9999] py-3 overflow-hidden"
                    >
                      <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700 mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Language</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {TARGET_LANGUAGES.map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              setTargetLanguage(lang);
                              handleFullTranslation(lang);
                              setShowTranslateMenu(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center justify-between"
                          >
                            {lang}
                            {targetLanguage === lang && <Check size={14} className="text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={onClose}
                className="px-4 sm:px-8 py-2.5 sm:py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 sm:px-10 py-2.5 sm:py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 flex items-center gap-2 disabled:bg-indigo-400"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save Prescription"}</span>
                <span className="sm:hidden">{isSaving ? "Saving..." : "Save"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const VitalInput = ({ label, unit, value, onChange }) => (
  <div className="flex flex-col">
    <label className="text-xs font-semibold text-slate-600 mb-1 block px-1">{label}</label>
    <div className="relative group">
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="--"
        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-2.5 pr-10 text-base font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 group-focus-within:text-indigo-500 transition-colors">{unit}</span>
    </div>
  </div>
);

export default PrescriptionModal;
