import React, { useState, useEffect } from 'react';
import { dentistApi } from '../../../services/api';
import { History, Search, Info, Award, Calendar, Smile } from 'lucide-react';
import { motion } from 'framer-motion';
import { getToothLabel, getToothDisplayName } from './dentalUtils';

const ToothHistoryTab = ({ patientId }) => {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom persistent dental numbering system choice
  const [numberingSystem, setNumberingSystem] = useState(() => {
    return localStorage.getItem('dentalNumberingSystem') || 'FDI';
  });

  // Synchronize numbering system choice across other dental tabs dynamically
  useEffect(() => {
    const syncSystem = () => {
      setNumberingSystem(localStorage.getItem('dentalNumberingSystem') || 'FDI');
    };
    window.addEventListener('dentalNumberingSystemChanged', syncSystem);
    return () => {
      window.removeEventListener('dentalNumberingSystemChanged', syncSystem);
    };
  }, []);

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      const res = await dentistApi.getPatientTreatments(patientId);
      setTreatments(res || []);
    } catch (err) {
      console.error('Error fetching patient treatments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, [patientId]);

  const filteredHistory = treatments.filter(t => {
    const term = searchTerm.toLowerCase();
    const toothLabel = getToothLabel(t.toothNumber, numberingSystem).toLowerCase();
    const toothName = getToothDisplayName(t.toothNumber, numberingSystem).toLowerCase();
    return (
      t.toothNumber.toLowerCase().includes(term) ||
      toothLabel.includes(term) ||
      toothName.includes(term) ||
      t.procedure.toLowerCase().includes(term) ||
      t.status.toLowerCase().includes(term) ||
      (t.notes && t.notes.toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-slate-100 rounded-b-3xl mt-4 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">
            Tooth-wise Clinical History Timeline
          </h3>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Tooth # or Procedure..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Smile className="w-12 h-12 mb-3 opacity-40 text-indigo-400" />
          <p className="font-bold text-sm">
            {searchTerm ? 'No history matches your search filter.' : 'No dental treatment history recorded.'}
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-100 ml-4 pl-8 py-4 space-y-8">
          {filteredHistory.map((item, idx) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative flex flex-col sm:flex-row sm:items-start justify-between p-5 rounded-2xl border border-slate-100 shadow-sm bg-slate-50/20 hover:border-indigo-100 transition-colors gap-4"
            >
              {/* Timeline Indicator bullet */}
              <div className="absolute -left-[41px] top-6 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center bg-indigo-600 text-white shadow-sm shadow-indigo-600/10"></div>

              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span 
                    className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-wider shadow-sm"
                    title={getToothDisplayName(item.toothNumber, numberingSystem)}
                  >
                    {getToothDisplayName(item.toothNumber, numberingSystem)}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    item.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                    item.status === 'In Progress' ? 'bg-amber-50 text-amber-600' :
                    'bg-cyan-50 text-cyan-600'
                  }`}>
                    {item.status}
                  </span>
                  {item.priority === 'High' && (
                    <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      High Priority
                    </span>
                  )}
                </div>

                <h4 className="text-base font-black text-slate-800 tracking-tight">
                  {item.procedure}
                </h4>

                <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-2xl">
                  {item.notes || 'No custom description notes logged.'}
                </p>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-slate-400 text-xs font-bold pt-1">
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> 
                    Planned: {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  {item.nextVisitDate && (
                    <p className="flex items-center gap-1 text-indigo-500">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      Next Visit: {new Date(item.nextVisitDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Pricing ledger Summary Card */}
              <div className="sm:text-right shrink-0 bg-white border border-slate-100 p-4 rounded-xl shadow-sm h-fit">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Financial Summary</p>
                <p className="text-lg font-black text-slate-800 leading-none mb-1">₹{item.netAmount}</p>
                {item.dueAmount > 0 ? (
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                    Due: ₹{item.dueAmount}
                  </p>
                ) : (
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider flex items-center justify-end gap-1">
                    <Award className="w-3.5 h-3.5 shrink-0" /> Full Paid
                  </p>
                )}
              </div>

            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToothHistoryTab;
