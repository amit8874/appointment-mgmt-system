import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Activity, BadgeCheck, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { diagnosisApi, chatbotApi } from '../../services/api';

const SmartDiagnosisInput = ({ value, onChange, context, user }) => {
  const [show, setShow] = useState(false);
  const [master, setMaster] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [aiRecs, setAiRecs] = useState({ high: [], medium: [], low: [], reason: '', warning: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [cursor, setCursor] = useState(-1);
  const containerRef = useRef(null);

  const organizationId = user?.organizationId?._id || user?.organizationId;
  const specialty = context?.specialty || '';

  // Initial Fetch
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const response = await diagnosisApi.getMaster({ specialty });
        const data = Array.isArray(response) ? response : (response.data || []);
        setMaster(data);
        setFiltered(data.slice(0, 50)); 
      } catch (err) { console.error(err); }
    };
    fetchMaster();
  }, [specialty]);

  // Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search Logic
  useEffect(() => {
    if (!searchQuery) {
      setFiltered(master.slice(0, 50));
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const results = master.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.keywords?.some(k => k.toLowerCase().includes(q)) ||
      d.icdCode?.toLowerCase().includes(q)
    ).sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
      if (!aName.startsWith(q) && bName.startsWith(q)) return 1;
      return 0;
    });

    setFiltered(results.slice(0, 100)); // Show up to 100
  }, [searchQuery, master]);

  // AI Recommendation Logic
  useEffect(() => {
    if (!show) return;
    // Trigger if we have complaints OR a significant search query
    if ((context?.complaints?.length === 0) && (!searchQuery || searchQuery.length < 3)) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const prompt = `Act as an expert clinical diagnostician. Provide 5-10 possible diagnoses grouped by confidence (High, Medium, Low).
        Search Query: ${searchQuery}
        Complaints: ${JSON.stringify(context.complaints)}
        Specialty: ${specialty}
        Patient: ${context.age}y ${context.gender}
        Vitals: ${JSON.stringify(context.vitals)}
        
        CRITICAL: Return ONLY valid JSON.
        Format: { "high": ["Diagnosis 1", ...], "medium": [], "low": [], "reason": "...", "warning": "..." }`;
        
        const response = await chatbotApi.chat(prompt, [], organizationId, { name: user?.name, role: 'doctor' }, 'doctor');
        if (response?.text) {
          try {
            // Robust extraction of JSON from text
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]);
              setAiRecs({
                high: Array.isArray(data.high) ? data.high : [],
                medium: Array.isArray(data.medium) ? data.medium : [],
                low: Array.isArray(data.low) ? data.low : [],
                reason: data.reason || '',
                warning: data.warning || ''
              });
            }
          } catch (e) { console.error("AI parse error", e); }
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    }, 1200);

    return () => clearTimeout(timer);
  }, [show, context.complaints, searchQuery, specialty]);

  const handleSelect = (name) => {
    onChange(name);
    setSearchQuery(name);
    setShow(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
        <Search size={14} className="text-slate-400" />
        <input 
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShow(true); }}
          onFocus={() => setShow(true)}
          placeholder="Search Diagnosis (ICD-10, Name, Keyword)..."
          className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 placeholder:text-slate-300"
        />
        {isLoading && <Loader2 size={12} className="animate-spin text-indigo-500" />}
      </div>

      {show && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-[500px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl z-[9999] max-h-[500px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {/* MASTER LIST SECTION */}
            <div className="mb-4">
              <div className="px-3 py-2 flex items-center justify-between border-b border-slate-50 dark:border-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Diagnosis ({filtered.length})</span>
                </div>
              </div>
              
              <div className="space-y-0.5">
                {filtered.map(d => (
                  <div 
                    key={d._id || d.name}
                    onMouseDown={() => handleSelect(d.name)}
                    className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{d.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{d.specialty}</span>
                        {d.icdCode && <span className="text-[8px] font-mono text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">{d.icdCode}</span>}
                      </div>
                    </div>
                    {d.isCommon && <span className="text-[7px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase">Common</span>}
                  </div>
                ))}
                
                {filtered.length === 0 && !isLoading && (
                   <div className="px-4 py-8 text-center">
                      <AlertCircle size={24} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching diagnosis found</p>
                      <p className="text-[9px] text-slate-300 mt-1">Try typing a different keyword or ICD code</p>
                   </div>
                )}
              </div>
            </div>

            {/* AI RECOMMENDATIONS SECTION */}
            {(aiRecs.high.length > 0 || isLoading) && (
              <div>
                <div className="px-3 py-2 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Maya AI Recommendations</span>
                   </div>
                </div>

                <div className="space-y-1 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl p-1 border border-indigo-100/50 dark:border-indigo-800/30">
                  {/* HIGH CONFIDENCE */}
                  {aiRecs.high.map(d => (
                    <div key={d} onMouseDown={() => handleSelect(d)} className="px-3 py-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg cursor-pointer flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <BadgeCheck size={14} className="text-emerald-500" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{d}</span>
                      </div>
                      <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-black uppercase opacity-0 group-hover:opacity-100">High Confidence</span>
                    </div>
                  ))}
                  {/* MEDIUM CONFIDENCE */}
                  {aiRecs.medium.map(d => (
                    <div key={d} onMouseDown={() => handleSelect(d)} className="px-3 py-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg cursor-pointer flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-amber-400" />
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{d}</span>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-[8px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-between">
            <span>AI suggestions are assistance only. Confirm diagnosis manually.</span>
            <button onMouseDown={() => setShow(false)} className="text-indigo-600 hover:underline">Close List</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartDiagnosisInput;
