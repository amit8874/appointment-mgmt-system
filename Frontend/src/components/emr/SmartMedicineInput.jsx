import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Activity, Pill, BadgeCheck, AlertCircle, Loader2, Plus, FlaskConical } from 'lucide-react';
import { medicineApi, chatbotApi } from '../../services/api';

const SmartMedicineInput = ({ value, onSelect, context, user }) => {
  const [show, setShow] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [aiRecs, setAiRecs] = useState({ suggestions: [], reason: '', source: 'AI' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || '');
  const containerRef = useRef(null);
  const searchTimerRef = useRef(null);

  const organizationId = user?.organizationId?._id || user?.organizationId;

  // Server-side debounced search — runs on every keystroke with 250ms debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!searchQuery || searchQuery.trim().length < 1) {
      // On empty, fetch top common medicines
      searchTimerRef.current = setTimeout(async () => {
        try {
          setIsSearching(true);
          const results = await medicineApi.search('');
          setFiltered(Array.isArray(results) ? results.slice(0, 50) : []);
        } catch (err) {
          console.error('Medicine search error:', err);
        } finally {
          setIsSearching(false);
        }
      }, 100);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await medicineApi.search(searchQuery.trim());
        // Sort: exact name starts-with match first, then includes, then generic/salt
        const q = searchQuery.trim().toLowerCase();
        const sorted = (Array.isArray(results) ? results : []).sort((a, b) => {
          const aName = (a.name || '').toLowerCase();
          const bName = (b.name || '').toLowerCase();
          const aExact = aName.startsWith(q);
          const bExact = bName.startsWith(q);
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          return aName.localeCompare(bName);
        });
        setFiltered(sorted.slice(0, 100));
      } catch (err) {
        console.error('Medicine search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // Initial load of top medicines when dropdown opens
  useEffect(() => {
    if (show && filtered.length === 0 && !searchQuery) {
      medicineApi.search('').then(results => {
        setFiltered(Array.isArray(results) ? results.slice(0, 50) : []);
      }).catch(console.error);
    }
  }, [show]);

  // Click Outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // AI Recommendation Logic (Based on Diagnosis & Complaints)
  useEffect(() => {
    if (!show) return;
    if (!context?.diagnosis && !context?.complaints?.length) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await medicineApi.getRecommendations({
          diagnosis: context.diagnosis,
          complaints: context.complaints,
          specialty: context.specialty,
          age: context.age,
          gender: context.gender
        });
        
        if (response && response.suggestions) {
          setAiRecs({
            suggestions: response.suggestions,
            reason: response.reason || '',
            source: response.source || 'AI'
          });
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    }, 1500);

    return () => clearTimeout(timer);
  }, [show, context.diagnosis, context.complaints]);

  const handleSelect = (med) => {
    // med can be from master (object) or AI (object) or custom (string)
    const selection = typeof med === 'string' ? { name: med } : med;
    
    onSelect({
      name: selection.name,
      genericName: selection.genericName || selection.generic || selection.salt || '',
      composition: selection.composition || selection.salt || selection.generic || '',
      form: selection.form || 'Tablet',
      strength: selection.strength || '',
      // Auto-fill logic
      dose: selection.defaultDose || selection.dose || '',
      when: selection.defaultWhen || selection.when || 'After Food',
      frequency: selection.defaultFrequency || selection.freq || 'Daily',
      duration: selection.defaultDuration || selection.dur || ''
    });
    setSearchQuery(selection.name);
    setShow(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <input 
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        placeholder="Search Medicine (Brand, Salt, Generic)..."
        className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 placeholder:text-slate-300"
      />

      {show && (
        <div className="absolute top-[calc(100%+12px)] left-0 w-[600px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-none shadow-2xl z-[9999] max-h-[550px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            
            {/* AI SUGGESTED Rx */}
            {(aiRecs.suggestions.length > 0 || isLoading) && (
              <div className="mb-4">
                <div className="px-3 py-2 flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/30 mb-1">
                  <Sparkles size={14} className="text-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    {aiRecs.source === 'Database' ? 'Protocol Suggested Rx (Standard)' : 'AI Suggested Rx (Based on Context)'}
                  </span>
                  {isLoading && <Loader2 size={10} className="animate-spin text-indigo-400 ml-auto" />}
                </div>

                <div className="space-y-1 bg-indigo-50/20 dark:bg-indigo-900/5 rounded-none p-1">
                  {aiRecs.suggestions.map((s, i) => (
                    <div 
                      key={i} 
                      onMouseDown={() => handleSelect(s)}
                      className="px-4 py-3 hover:bg-white dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between group border-b border-indigo-50/50 last:border-0"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <BadgeCheck size={14} className="text-emerald-500" />
                          <span className="text-sm font-black text-slate-700 dark:text-slate-100">{s.name} {s.strength}</span>
                          <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-black uppercase">{s.form}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold mt-0.5">{s.generic}</span>
                      </div>
                      <div className="flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] font-black text-indigo-500 uppercase">{s.dose} | {s.when}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{s.freq}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MASTER MEDICINE LIST */}
            <div>
              <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-50 dark:border-slate-700 mb-2">
                <Pill size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medicine Master ({filtered.length})</span>
                {isSearching && <Loader2 size={10} className="animate-spin text-indigo-400 ml-auto" />}
              </div>
              
              <div className="space-y-0.5">
                {filtered.map(m => (
                  <div 
                    key={m._id || m.name}
                    onMouseDown={() => handleSelect(m)}
                    className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between border-b border-slate-50/50 dark:border-slate-800/30 last:border-0"
                  >
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{m.name}</span>
                        <span className="text-[8px] border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded uppercase font-black">{m.form}</span>
                        {m.strength && <span className="text-[8px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded uppercase font-black">{m.strength}</span>}
                      </div>
                      {(m.salt || m.genericName || m.composition) && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <span className="text-[10px] font-bold text-slate-400">—({m.composition || m.salt || m.genericName})</span>
                        </div>
                      )}
                    </div>
                    {m.category && <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">{m.category}</span>}
                  </div>
                ))}
                
                {filtered.length === 0 && (
                   <div className="px-4 py-10 text-center">
                      <Plus size={32} className="mx-auto text-slate-100 mb-3" />
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No matching medicine found</p>
                      <button 
                        onMouseDown={() => handleSelect(searchQuery)}
                        className="mt-4 px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-none hover:bg-indigo-700 transition-all"
                      >
                        Add Custom: "{searchQuery}"
                      </button>
                   </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center justify-between">
            <span>Keyboard ↑↓ Select ↵ Enter</span>
            <span className="text-indigo-600">Oviaan Pharma Engine v2.0</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartMedicineInput;
