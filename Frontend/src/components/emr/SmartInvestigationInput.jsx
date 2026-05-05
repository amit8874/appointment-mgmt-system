import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Plus, Loader2, Sparkles, Activity, FlaskConical, RefreshCcw } from 'lucide-react';
import { investigationApi, chatbotApi } from '../../services/api';
import { toast } from 'react-toastify';

const SmartInvestigationInput = ({ selectedTests, onChange, user, diagnosis, complaints }) => {
  const [query, setQuery] = useState('');
  const [masterList, setMasterList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const organizationId = user?.organizationId?._id || user?.organizationId;

  // Fetch Master List
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        setIsLoading(true);
        const data = await investigationApi.getMaster();
        setMasterList(data);
        setFiltered(data);
      } catch (error) {
        console.error("Error fetching investigation master:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMaster();
  }, []);

  // Filter Master List when typing
  useEffect(() => {
    const lowQuery = query.toLowerCase().trim();
    if (!lowQuery) {
      setFiltered(masterList);
      return;
    }
    const matches = masterList.filter(t => 
      t.name.toLowerCase().includes(lowQuery) || 
      t.keywords?.some(k => k.toLowerCase().includes(lowQuery))
    );
    setFiltered(matches);
  }, [query, masterList]);

  const getAiRecommendations = async (specificQuery = '') => {
    const searchContext = specificQuery ? `Search Query: "${specificQuery}"` : '';
    
    setIsAiLoading(true);
    try {
      const prompt = `Act as a clinical pathologist. Suggest 5-8 relevant diagnostic tests or investigations.
Context:
${searchContext}
Patient Diagnosis: ${diagnosis || 'Not specified'}
Patient Complaints: ${complaints?.join(', ') || 'Not specified'}

Return ONLY a comma-separated list of test names. No other text.`;

      const response = await chatbotApi.chat(prompt, [], organizationId, { name: user?.name, role: 'doctor' }, 'doctor');
      
      if (response?.text) {
        const results = response.text.split(',')
          .map(s => s.trim().replace(/[".|]/g, ''))
          .filter(s => s.length > 0 && !selectedTests.includes(s));
        
        setAiSuggestions(prev => {
          const combined = [...new Set([...results, ...prev])];
          return combined.slice(0, 10);
        });
      }
    } catch (error) {
      console.error("Investigation AI Error:", error);
      toast.error("AI service is busy. Please try again later.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSelect = async (testName) => {
    if (selectedTests.includes(testName)) {
      setQuery('');
      return;
    }

    const isNew = !masterList.some(t => t.name.toLowerCase() === testName.toLowerCase());
    if (isNew) {
       try {
         const newTest = await investigationApi.addMaster({ name: testName });
         setMasterList(prev => [...prev, newTest]);
       } catch (err) {
         console.error("Failed to add test to master:", err);
       }
    }

    onChange([...selectedTests, testName]);
    setQuery('');
    inputRef.current?.focus();
  };

  const removeTest = (testToRemove) => {
    onChange(selectedTests.filter(t => t !== testToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSelect(query.trim());
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-4 relative" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="text-indigo-600" size={18} />
          <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Tests Requested</h4>
        </div>
      </div>

      <div className="relative group">
        <div 
          className={`w-full bg-white dark:bg-slate-900 border rounded-2xl p-3 min-h-[72px] shadow-sm flex flex-wrap gap-3 items-center transition-all cursor-text ${showSuggestions ? 'ring-4 ring-indigo-500/5 border-indigo-400' : 'border-slate-200 dark:border-slate-800'}`}
          onClick={() => { inputRef.current?.focus(); setShowSuggestions(true); }}
        >
          {selectedTests.map((test, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {test}
              <button 
                onClick={(e) => { e.stopPropagation(); removeTest(test); }}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-lg transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          
          <input 
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedTests.length === 0 ? "Search or type test name..." : "Add more tests..."}
            className="flex-1 min-w-[150px] bg-transparent border-none p-2 text-base font-bold text-slate-700 dark:text-slate-200 focus:ring-0 placeholder:text-slate-300"
          />
        </div>
      </div>

      {showSuggestions && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl shadow-indigo-500/5 z-20"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-1">
                <Sparkles size={14} className="text-indigo-600" />
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">AI Diagnostic Assistant</span>
              </div>
              
              {!isAiLoading && (
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); getAiRecommendations(); }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <Sparkles size={12} /> {aiSuggestions.length > 0 ? 'Refresh Suggestions' : 'Get AI Suggestions'}
                </button>
              )}
            </div>

            {(isAiLoading || aiSuggestions.length > 0) && (
              <div className="flex flex-wrap gap-2 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                {isAiLoading ? (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 py-1 px-2">
                    <Loader2 size={12} className="animate-spin" /> AI Agent is analyzing context...
                  </div>
                ) : (
                  aiSuggestions.map((test, idx) => (
                    <button
                      key={`ai-${idx}`}
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(test); }}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-400 hover:bg-indigo-50 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 rounded-lg shadow-sm transition-all flex items-center gap-1.5 group"
                    >
                      <Plus size={12} className="text-indigo-300 group-hover:text-indigo-500" />
                      {test}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Activity size={12} className="text-slate-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Common Investigations</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filtered.filter(t => !selectedTests.includes(t.name)).slice(0, 30).map((test) => (
                <button
                  key={test._id}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(test.name); }}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 hover:bg-white text-[11px] font-bold text-slate-500 dark:text-slate-400 rounded-lg transition-all flex items-center gap-1.5 group"
                >
                  <Plus size={12} className="text-slate-300 group-hover:text-indigo-400" />
                  {test.name}
                </button>
              ))}

              {query && !filtered.some(t => t.name.toLowerCase() === query.toLowerCase()) && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(query); }}
                  className="px-3 py-1.5 bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 text-[11px] font-bold rounded-lg shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5"
                >
                  <Plus size={12} /> Add "{query}"
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SmartInvestigationInput;
