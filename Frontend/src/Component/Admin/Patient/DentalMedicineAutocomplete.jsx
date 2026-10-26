import React, { useState, useEffect, useRef } from 'react';
import { Pill, Sparkles, Search, Check, Loader2, Star, Plus } from 'lucide-react';
import { medicineApi } from '../../../services/api';

// The 16 handwritten clinic pad medicines with complete clinical parameters
export const CLINIC_PAD_MEDICINES = [
  {
    name: 'Caremox AG Plus',
    genericName: 'Amoxicillin 500mg & Potassium Clavulanate 125mg',
    composition: 'Amoxicillin 500mg & Potassium Clavulanate 125mg',
    form: 'Tab',
    type: 'Tablet',
    dose: '625mg (1 Tab)',
    frequency: '',
    when: 'After Food',
    duration: '5 days',
    category: 'Antibiotic',
    isClinicPad: true,
    instructions: 'After food with a full glass of water. Complete full 5 days course.'
  },
  {
    name: 'Yenfenac SP',
    genericName: 'Aceclofenac 100mg, Paracetamol 325mg & Serratiopeptidase 15mg',
    composition: 'Aceclofenac 100mg, Paracetamol 325mg & Serratiopeptidase 15mg',
    form: 'Tab',
    type: 'Tablet',
    dose: '1 Tab',
    frequency: '',
    when: 'After Food',
    duration: '3 days',
    category: 'Pain & Swelling',
    isClinicPad: true,
    instructions: 'After food for dental pain & swelling.'
  },
  {
    name: 'Densoform (Gumpaint)',
    genericName: 'Tannic Acid, Iodine, Menthol & Thymol Glycerin',
    composition: 'Tannic Acid, Iodine, Menthol & Thymol Glycerin',
    form: 'Gel',
    type: 'Gel',
    dose: 'Few drops',
    frequency: '',
    when: 'After Food',
    duration: '5 days',
    category: 'Dental Gum Paint',
    isClinicPad: true,
    instructions: 'Apply gently with fingertip over gums after brushing; do not rinse for 15 mins.'
  },
  {
    name: 'Frutta - 9G',
    genericName: 'Ginseng, Ginkgo Biloba, Green Tea, Grape Seed with 9G Antioxidants & Minerals',
    composition: '9G Antioxidants, Multivitamins & Minerals',
    form: 'Cap',
    type: 'Capsule',
    dose: '1 Cap',
    frequency: '',
    when: 'After Food',
    duration: '15 days',
    category: 'Antioxidant & Multivitamin',
    isClinicPad: true,
    instructions: 'Once daily after breakfast for tissue repair and gum healing.'
  },
  {
    name: 'Denseal',
    genericName: 'Potassium Nitrate & Sodium Monofluorophosphate Desensitizing Gel',
    composition: 'Potassium Nitrate & Fluoride Desensitizing Gel',
    form: 'Gel',
    type: 'Gel',
    dose: 'Pea-size',
    frequency: '',
    when: 'After Food',
    duration: '14 days',
    category: 'Desensitizing Gel',
    isClinicPad: true,
    instructions: 'Apply on sensitive teeth 10 mins before brushing.'
  },
  {
    name: 'Lycoyen',
    genericName: 'Lycopene, Multivitamins, Minerals & Zinc',
    composition: 'Lycopene, Multivitamins, Minerals & Zinc',
    form: 'Cap',
    type: 'Capsule',
    dose: '1 Cap',
    frequency: '',
    when: 'After Food',
    duration: '30 days',
    category: 'Antioxidant',
    isClinicPad: true,
    instructions: 'Once daily after breakfast for OSMF / tissue rejuvenation.'
  },
  {
    name: 'Roben DSR',
    genericName: 'Rabeprazole 20mg & Domperidone 30mg SR',
    composition: 'Rabeprazole 20mg & Domperidone 30mg SR',
    form: 'Cap',
    type: 'Capsule',
    dose: '1 Cap',
    frequency: '',
    when: 'Before Food',
    duration: '5 days',
    category: 'Antacid / Anti-reflux',
    isClinicPad: true,
    instructions: 'Empty stomach 30 mins before breakfast.'
  },
  {
    name: 'Pantoyen DSR',
    genericName: 'Pantoprazole 40mg & Domperidone 30mg SR',
    composition: 'Pantoprazole 40mg & Domperidone 30mg SR',
    form: 'Cap',
    type: 'Capsule',
    dose: '1 Cap',
    frequency: '',
    when: 'Before Food',
    duration: '5 days',
    category: 'Antacid / Anti-reflux',
    isClinicPad: true,
    instructions: 'Empty stomach 30 mins before breakfast.'
  },
  {
    name: 'Reol LSR',
    genericName: 'Rabeprazole 20mg & Levosulpiride 75mg SR',
    composition: 'Rabeprazole 20mg & Levosulpiride 75mg SR',
    form: 'Cap',
    type: 'Capsule',
    dose: '1 Cap',
    frequency: '',
    when: 'Before Food',
    duration: '5 days',
    category: 'Antacid / Prokinetic',
    isClinicPad: true,
    instructions: 'Empty stomach 30 mins before morning meal.'
  },
  {
    name: 'Yenfenac P',
    genericName: 'Aceclofenac 100mg & Paracetamol 325mg',
    composition: 'Aceclofenac 100mg & Paracetamol 325mg',
    form: 'Tab',
    type: 'Tablet',
    dose: '1 Tab',
    frequency: '',
    when: 'After Food',
    duration: '3 days',
    category: 'Pain Relief (Analgesic)',
    isClinicPad: true,
    instructions: 'After food for toothache / mild pain.'
  },
  {
    name: 'Dencef (200)',
    genericName: 'Cefixime 200mg',
    composition: 'Cefixime 200mg',
    form: 'Tab',
    type: 'Tablet',
    dose: '1 Tab',
    frequency: '',
    when: 'After Food',
    duration: '5 days',
    category: 'Antibiotic (Cephalosporin)',
    isClinicPad: true,
    instructions: 'Complete full 5 days antibiotic course.'
  },
  {
    name: 'Odclin Plus',
    genericName: 'Clindamycin 300mg',
    composition: 'Clindamycin 300mg',
    form: 'Cap',
    type: 'Capsule',
    dose: '1 Cap',
    frequency: '',
    when: 'After Food',
    duration: '5 days',
    category: 'Antibiotic (Dental/Bone)',
    isClinicPad: true,
    instructions: 'Take with full glass of water; for bone and severe tooth infections.'
  },
  {
    name: 'Oldine - MW',
    genericName: 'Povidone Iodine 2% w/v Gargle / Mouthwash',
    composition: 'Povidone Iodine 2% w/v Gargle / Mouthwash',
    form: 'Mouthwash',
    type: 'Liquid',
    dose: '10 ml',
    frequency: '',
    when: 'After Food',
    duration: '7 days',
    category: 'Antiseptic Gargle',
    isClinicPad: true,
    instructions: 'Dilute with equal amount of warm water, gargle for 30-60 secs.'
  },
  {
    name: 'Olsept - M.W',
    genericName: 'Chlorhexidine Gluconate 0.2% Mouthwash',
    composition: 'Chlorhexidine Gluconate 0.2% Mouthwash',
    form: 'Mouthwash',
    type: 'Liquid',
    dose: '10 ml',
    frequency: '',
    when: 'After Food',
    duration: '7 days',
    category: 'Antibacterial Mouthwash',
    isClinicPad: true,
    instructions: 'Swish undiluted for 1 min morning and night; do not rinse with water.'
  },
  {
    name: 'Warren Sensitive Ortho',
    genericName: 'Ultra Soft Sensitive / Orthodontic Brush',
    composition: 'Ultra Soft Sensitive / Orthodontic Care',
    form: 'Other',
    type: 'Other',
    dose: '1 Unit',
    frequency: '',
    when: 'After Food',
    duration: 'Daily',
    category: 'Dental Hygiene',
    isClinicPad: true,
    instructions: 'Brush gently in circular motions twice daily.'
  },
  {
    name: 'Nemflam Plus',
    genericName: 'Nimesulide 100mg & Paracetamol 325mg',
    composition: 'Nimesulide 100mg & Paracetamol 325mg',
    form: 'Tab',
    type: 'Tablet',
    dose: '1 Tab',
    frequency: '',
    when: 'After Food',
    duration: '3 days',
    category: 'Acute Pain Relief',
    isClinicPad: true,
    instructions: 'Take strictly after food only when severe dental pain occurs.'
  }
];

// Additional common dental medications
export const COMMON_DENTAL_EXTRAS = [
  {
    name: 'Amoxicillin 500mg',
    genericName: 'Amoxicillin 500mg',
    composition: 'Amoxicillin 500mg',
    form: 'Cap',
    type: 'Capsule',
    dose: '1 Cap',
    frequency: '',
    when: 'After Food',
    duration: '5 days',
    category: 'Antibiotic',
    instructions: 'Take with full glass of water after meals'
  },
  {
    name: 'Augmentin 625mg',
    genericName: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    form: 'Tab',
    type: 'Tablet',
    dose: '1 Tab',
    frequency: '',
    when: 'After Food',
    duration: '5 days',
    category: 'Antibiotic',
    instructions: 'Take after food. Complete full 5 days course'
  },
  {
    name: 'Metrogyl 400mg',
    genericName: 'Metronidazole 400mg',
    composition: 'Metronidazole 400mg',
    form: 'Tab',
    type: 'Tablet',
    dose: '1 Tab',
    frequency: '',
    when: 'After Food',
    duration: '5 days',
    category: 'Anti-anaerobic Antibiotic',
    instructions: 'Take with meals. Avoid alcohol during treatment'
  },
  {
    name: 'Zerodol-SP',
    genericName: 'Aceclofenac 100mg + Paracetamol 325mg + Serratiopeptidase 15mg',
    composition: 'Aceclofenac 100mg + Paracetamol 325mg + Serratiopeptidase 15mg',
    form: 'Tab',
    type: 'Tablet',
    dose: '1 Tab',
    frequency: '',
    when: 'After Food',
    duration: '3 days',
    category: 'Pain & Swelling',
    instructions: 'Take strictly after food'
  },
  {
    name: 'Ketorolac DT 10mg',
    genericName: 'Ketorolac Tromethamine 10mg (Dispersible)',
    composition: 'Ketorolac Tromethamine 10mg (Dispersible)',
    form: 'Tab',
    type: 'Tablet',
    dose: '1 Tab',
    frequency: '',
    when: 'After Food',
    duration: '3 days',
    category: 'Severe Pain SOS',
    instructions: 'Dissolve in half a glass of water, take after food for severe pain'
  },
  {
    name: 'Pan-D',
    genericName: 'Pantoprazole 40mg + Domperidone 30mg SR',
    composition: 'Pantoprazole 40mg + Domperidone 30mg SR',
    form: 'Cap',
    type: 'Capsule',
    dose: '1 Cap',
    frequency: '',
    when: 'Before Food',
    duration: '5 days',
    category: 'Antacid',
    instructions: 'Take 30 mins before breakfast on empty stomach'
  },
  {
    name: 'Chlorhexidine 0.2% Mouthwash',
    genericName: 'Chlorhexidine Gluconate 0.2% w/v',
    composition: 'Chlorhexidine Gluconate 0.2% w/v',
    form: 'Mouthwash',
    type: 'Liquid',
    dose: '10 ml',
    frequency: '',
    when: 'After Food',
    duration: '7 days',
    category: 'Antiseptic Rinse',
    instructions: 'Rinse vigorously for 1 minute twice daily, do not swallow'
  },
  {
    name: 'Choline Salicylate Gel',
    genericName: 'Choline Salicylate + Lignocaine HCl',
    composition: 'Choline Salicylate + Lignocaine HCl',
    form: 'Gel',
    type: 'Gel',
    dose: 'Pea-size',
    frequency: '',
    when: 'After Food',
    duration: '5 days',
    category: 'Ulcer / Gum Pain Relief',
    instructions: 'Apply gently with fingertip over ulcer or painful gum area'
  }
];

// Combined local presets
const ALL_LOCAL_PRESETS = [...CLINIC_PAD_MEDICINES, ...COMMON_DENTAL_EXTRAS];

/**
 * Storage helpers for doctor custom medicines:
 * Automatically saves custom medicines written by the doctor so they show in suggestions next time.
 */
export const getDoctorCustomMedicines = (doctorId = 'default') => {
  try {
    const key = `custom_medicines_${doctorId || 'default'}`;
    const generalKey = `custom_medicines_all`;
    const specific = JSON.parse(localStorage.getItem(key) || '[]');
    const general = JSON.parse(localStorage.getItem(generalKey) || '[]');
    const map = new Map();
    [...specific, ...general].forEach(m => {
      if (m && m.name) {
        map.set(m.name.trim().toLowerCase(), {
          ...m,
          isDoctorCustom: true
        });
      }
    });
    return Array.from(map.values());
  } catch (e) {
    return [];
  }
};

export const saveDoctorCustomMedicine = (medObj, doctorId = 'default') => {
  if (!medObj || !medObj.name || !medObj.name.trim()) return;
  const trimmedName = medObj.name.trim();
  try {
    const key = `custom_medicines_${doctorId || 'default'}`;
    const generalKey = `custom_medicines_all`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const existingIdx = list.findIndex(m => m.name.toLowerCase() === trimmedName.toLowerCase());
    const newEntry = {
      name: trimmedName,
      genericName: medObj.genericName || medObj.composition || trimmedName,
      composition: medObj.composition || medObj.genericName || '',
      form: medObj.form || 'Tab',
      type: medObj.type || medObj.form || 'Tablet',
      dose: medObj.dose || '1 Tab',
      frequency: medObj.frequency || '',
      when: medObj.when || 'After Food',
      duration: medObj.duration || '5 days',
      category: 'Doctor Custom',
      instructions: medObj.instructions || '',
      isDoctorCustom: true
    };
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...newEntry };
    } else {
      list.unshift(newEntry);
    }
    localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));

    const genList = JSON.parse(localStorage.getItem(generalKey) || '[]');
    const genIdx = genList.findIndex(m => m.name.toLowerCase() === trimmedName.toLowerCase());
    if (genIdx >= 0) {
      genList[genIdx] = { ...genList[genIdx], ...newEntry };
    } else {
      genList.unshift(newEntry);
    }
    localStorage.setItem(generalKey, JSON.stringify(genList.slice(0, 100)));

    // Fire-and-forget background sync to DB
    if (medicineApi?.bulkSave) {
      medicineApi.bulkSave([trimmedName]).catch(() => {});
    }
  } catch (e) {
    console.warn("Could not save doctor custom medicine:", e);
  }
};

/**
 * DentalMedicineAutocomplete
 * 
 * Provides instantaneous recommendations on 1st/2nd character:
 * - 0ms instant local match against Doctor Saved medicines + 16 clinic handwritten medicines + common dental drugs
 * - Debounced API search across 773+ database medicines
 * - Keyboard navigation (Up/Down/Enter/Escape)
 * - Auto-fill of form, dose, frequency, when, duration, instructions
 */
const DentalMedicineAutocomplete = ({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Medicine name (e.g. Caremox, Yenfenac, Densoform...)',
  className = '',
  doctorId = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [recommendations, setRecommendations] = useState([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchTimerRef = useRef(null);

  // Sync external value
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Helper: filter local items instantaneously (merging doctor's custom saved medicines)
  const filterLocal = (q) => {
    const doctorCustomMeds = getDoctorCustomMedicines(doctorId);
    const combinedPresets = [...doctorCustomMeds, ...ALL_LOCAL_PRESETS];
    if (!q || q.trim() === '') {
      return [...doctorCustomMeds, ...CLINIC_PAD_MEDICINES];
    }
    const clean = q.trim().toLowerCase();
    return combinedPresets.filter(item => {
      const name = (item.name || '').toLowerCase();
      const generic = (item.genericName || '').toLowerCase();
      const comp = (item.composition || '').toLowerCase();
      return name.includes(clean) || generic.includes(clean) || comp.includes(clean);
    }).sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aStarts = aName.startsWith(clean);
      const bStarts = bName.startsWith(clean);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      // Highest priority: doctor's custom saved medicines
      if (a.isDoctorCustom && !b.isDoctorCustom) return -1;
      if (!a.isDoctorCustom && b.isDoctorCustom) return 1;
      // Prioritize clinic pad medicines
      if (a.isClinicPad && !b.isClinicPad) return -1;
      if (!a.isClinicPad && b.isClinicPad) return 1;
      return aName.localeCompare(bName);
    });
  };

  // Search effect: instant local + debounced server fetch
  useEffect(() => {
    const localMatches = filterLocal(query);
    setRecommendations(localMatches);
    setHighlightedIndex(0);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    // If query has at least 1 character, also query DB in the background
    if (query && query.trim().length >= 1) {
      searchTimerRef.current = setTimeout(async () => {
        try {
          setIsSearchingApi(true);
          const apiResults = await medicineApi.search(query.trim());
          if (Array.isArray(apiResults) && apiResults.length > 0) {
            setRecommendations(prev => {
              const existingNames = new Set(prev.map(p => (p.name || '').toLowerCase().trim()));
              const formattedApiResults = apiResults
                .filter(item => !existingNames.has((item.name || '').toLowerCase().trim()))
                .map(item => ({
                  name: item.name,
                  genericName: item.genericName || item.salt || item.composition || '',
                  composition: item.composition || item.salt || item.genericName || '',
                  form: item.form || item.type || 'Tab',
                  type: item.type || item.form || 'Tablet',
                  dose: item.dose || (item.type === 'Capsule' ? '1 Cap' : '1 Tab'),
                  frequency: '',
                  when: item.when || 'After Food',
                  duration: item.duration || '5 days',
                  category: item.category || 'General',
                  instructions: item.description || item.genericName || '',
                  isClinicPad: false
                }));
              return [...prev, ...formattedApiResults].slice(0, 40);
            });
          }
        } catch (err) {
          console.error("Autocomplete API search error:", err);
        } finally {
          setIsSearchingApi(false);
        }
      }, 180);
    }

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query]);

  // Handle outside click
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) onChange(val);
    setIsOpen(true);
  };

  const handleSelectMed = (item) => {
    const selection = typeof item === 'string' ? { name: item } : item;
    setQuery(selection.name);
    setIsOpen(false);
    if (selection.name && selection.name.trim()) {
      saveDoctorCustomMedicine(selection, doctorId);
    }
    if (onSelect) {
      onSelect(selection);
    } else if (onChange) {
      onChange(selection.name);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % Math.max(1, recommendations.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + recommendations.length) % Math.max(1, recommendations.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (recommendations[highlightedIndex]) {
        handleSelectMed(recommendations[highlightedIndex]);
      } else if (query.trim()) {
        handleSelectMed({ name: query.trim() });
      }
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Badge color helper for medicine forms
  const getFormBadgeColor = (form) => {
    const f = (form || '').toLowerCase();
    if (f.includes('cap')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (f.includes('gel') || f.includes('paint')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (f.includes('mouth') || f.includes('rinse')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    if (f.includes('syr')) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (f.includes('inj')) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={className || "w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none transition-colors"}
        />
        {isSearchingApi && (
          <div className="absolute right-3 top-2.5 pointer-events-none">
            <Loader2 size={13} className="animate-spin text-teal-400" />
          </div>
        )}
      </div>

      {/* DROPDOWN RECOMMENDATIONS */}
      {isOpen && (
        <div
          className="absolute left-0 mt-1.5 w-full min-w-[340px] max-w-[540px] bg-[#0c121e] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/90 z-[999] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          style={{ maxHeight: '320px' }}
        >
          {/* Header */}
          <div className="px-3.5 py-2 bg-[#121929] border-b border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5 text-teal-300">
              <Sparkles size={12} className="text-teal-400 animate-pulse" />
              {query ? `Suggestions for "${query}"` : 'Clinic Pad & Common Prescriptions'}
            </span>
            <span className="text-[9px] text-slate-500">
              {recommendations.length} found • ↑↓ to navigate
            </span>
          </div>

          {/* List */}
          <div className="overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar p-1">
            {recommendations.length > 0 ? (
              recommendations.map((item, idx) => {
                const isSelected = idx === highlightedIndex;
                const isClinic = !!item.isClinicPad;

                return (
                  <div
                    key={item.name + idx}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={() => handleSelectMed(item)}
                    className={`px-3 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-teal-500/15 border border-teal-500/30'
                        : 'hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-black tracking-wide ${isSelected ? 'text-teal-200' : 'text-white'}`}>
                          {item.name}
                        </span>

                        {/* Form Badge */}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase border ${getFormBadgeColor(item.form || item.type)}`}>
                          {item.form || item.type || 'Tab'}
                        </span>

                        {/* Doctor Custom Tag */}
                        {item.isDoctorCustom && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                            <Star size={9} className="fill-amber-400 text-amber-400" /> My Medicine
                          </span>
                        )}

                        {/* Clinic Pad Tag */}
                        {isClinic && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                            <Star size={9} className="fill-emerald-400 text-emerald-400" /> Clinic Pad
                          </span>
                        )}
                      </div>

                      {/* Generic / Composition */}
                      {(item.genericName || item.composition) && (
                        <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {item.genericName || item.composition}
                        </span>
                      )}

                      {/* Instructions / Dose hint */}
                      {item.instructions && (
                        <span className="text-[9px] text-slate-500 italic truncate mt-0.5">
                          {item.instructions}
                        </span>
                      )}
                    </div>

                    {/* Right side dose/duration pill */}
                    <div className="flex flex-col items-end flex-shrink-0 text-right">
                      <span className="text-[10px] font-black text-teal-400">
                        {item.dose || '1 Unit'}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-500">
                        {item.duration || '5 days'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-400 font-semibold mb-2">No matching medicine found</p>
                {query.trim() && (
                  <button
                    type="button"
                    onMouseDown={() => handleSelectMed({ name: query.trim() })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 rounded-xl text-xs font-black transition-colors"
                  >
                    <Plus size={12} /> Use Custom: "{query.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 bg-[#121929] border-t border-slate-800 text-[9px] text-slate-500 font-bold flex items-center justify-between">
            <span>Press ↵ Enter to select</span>
            <span className="text-teal-400">Clinic Dental Rx Engine</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DentalMedicineAutocomplete;
