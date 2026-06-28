import React, { useState, useEffect } from 'react';
import { dentistApi } from '../../../services/api';
import { Smile, AlertCircle, Plus, Info, Trash2, Award, Pencil, Check, X, IndianRupee } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getUpperArchTeeth,
  getLowerArchTeeth,
  getToothById,
  getToothLabel,
  getToothDisplayName,
  STANDARD_DENTAL_PROCEDURES
} from './dentalUtils';
import { getToothSVG } from './ToothIcons';
import DentalBillingCreatorModal from './DentalBillingCreatorModal';

const DentalChart = ({ patientId, patientData, appointments = [] }) => {
  const [chartData, setChartData] = useState({});
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customProcedures, setCustomProcedures] = useState([]);
  const [selectedProceduresList, setSelectedProceduresList] = useState([]);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  
  // Custom persistent dental numbering system selection
  const [numberingSystem, setNumberingSystem] = useState(() => {
    return localStorage.getItem('dentalNumberingSystem') || 'FDI';
  });

  // Selected chart type: 'adult' or 'child'
  const [chartType, setChartType] = useState('adult');

  // Modal/Popup inputs
  const [procedure, setProcedure] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [saving, setSaving] = useState(false);

  // Editing state for queued procedures
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingCost, setEditingCost] = useState('');

  // Compute merged presets dynamically
  const mergedPresets = STANDARD_DENTAL_PROCEDURES.map(p => ({ ...p }));
  customProcedures.forEach(cp => {
    const existingIndex = mergedPresets.findIndex(sp => sp.name.toLowerCase() === cp.name.toLowerCase());
    if (existingIndex !== -1) {
      mergedPresets[existingIndex].defaultCost = cp.defaultCost;
    } else {
      mergedPresets.push({ name: cp.name, defaultCost: cp.defaultCost });
    }
  });

  const fetchChart = async () => {
    try {
      setLoading(true);
      const res = await dentistApi.getToothChart(patientId);
      setChartData(res || {});
    } catch (err) {
      console.error('Error fetching tooth chart:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomProcedures = async () => {
    try {
      const res = await dentistApi.getCustomProcedures(patientData?.assignedDoctorId);
      setCustomProcedures(res || []);
    } catch (err) {
      console.error('Error fetching custom procedures:', err);
    }
  };

  useEffect(() => {
    fetchChart();
    fetchCustomProcedures();
  }, [patientId, patientData?.assignedDoctorId]);

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

  const handleToothClick = (tooth) => {
    setSelectedTooth(tooth);
    setProcedure('');
    setEstimatedCost('');
    setNotes('');
    setPriority('Medium');
    setSelectedProceduresList([]);
    setEditingIndex(null);
    setEditingName('');
    setEditingCost('');
  };

  const handleAddProcedureToList = () => {
    if (!procedure.trim()) {
      toast.error('Please specify a procedure name');
      return;
    }
    const costNum = Number(estimatedCost) || 0;
    if (costNum < 0) {
      toast.error('Cost cannot be negative');
      return;
    }

    // Check if duplicate name is already added in the queue
    const nameTrimmed = procedure.trim();
    if (selectedProceduresList.some(p => p.name.toLowerCase() === nameTrimmed.toLowerCase())) {
      toast.error('This procedure is already added to the list');
      return;
    }

    setSelectedProceduresList(prev => [...prev, { name: nameTrimmed, cost: costNum }]);
    
    // Clear the active inputs so the user can type/select another
    setProcedure('');
    setEstimatedCost('');
  };

  const handleRemoveProcedureFromList = (index) => {
    setSelectedProceduresList(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingName('');
      setEditingCost('');
    } else if (editingIndex > index) {
      // Adjust editingIndex if it shifted
      setEditingIndex(prev => prev - 1);
    }
  };

  const handleStartEdit = (index, item) => {
    setEditingIndex(index);
    setEditingName(item.name);
    setEditingCost(item.cost.toString());
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingName('');
    setEditingCost('');
  };

  const handleSaveEdit = (index) => {
    if (!editingName.trim()) {
      toast.error('Procedure name cannot be empty');
      return;
    }
    const costNum = Number(editingCost) || 0;
    if (costNum < 0) {
      toast.error('Cost cannot be negative');
      return;
    }

    const nameTrimmed = editingName.trim();
    const isDuplicate = selectedProceduresList.some(
      (p, i) => i !== index && p.name.toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (isDuplicate) {
      toast.error('Another procedure with this name is already in the list');
      return;
    }

    setSelectedProceduresList(prev =>
      prev.map((item, i) => (i === index ? { name: nameTrimmed, cost: costNum } : item))
    );
    setEditingIndex(null);
    setEditingName('');
    setEditingCost('');
  };

  const handleQuickProcedureSelect = (proc) => {
    const exists = selectedProceduresList.some(p => p.name.toLowerCase() === proc.name.toLowerCase());
    if (exists) {
      toast.error(`${proc.name} is already added to the list`);
      return;
    }
    setSelectedProceduresList(prev => [...prev, { name: proc.name, cost: proc.defaultCost }]);
  };

  const handleSaveProcedure = async (e) => {
    e.preventDefault();
    
    // Fallback: if they typed something in the input fields but didn't click "Add",
    // we can auto-add it if the list is currently empty, or just prompt them to add it.
    let listToSave = [...selectedProceduresList];
    if (listToSave.length === 0) {
      if (procedure.trim()) {
        const costNum = Number(estimatedCost) || 0;
        listToSave.push({ name: procedure.trim(), cost: costNum });
      } else {
        toast.error('Please add at least one procedure to the list');
        return;
      }
    }

    setSaving(true);
    try {
      // Loop through the list and create treatments in the database
      const savePromises = listToSave.map(async (item) => {
        await dentistApi.createTreatment(patientId, {
          toothNumber: selectedTooth,
          procedure: item.name,
          estimatedCost: item.cost,
          paidAmount: item.cost,
          notes: notes.trim(),
          priority,
          status: 'Planned'
        });

        // Auto-save procedure to custom masters list if it's not known
        const isKnown = mergedPresets.some(p => p.name.toLowerCase() === item.name.toLowerCase());
        if (!isKnown) {
          try {
            await dentistApi.createCustomProcedure({
              name: item.name,
              defaultCost: item.cost
            });
          } catch (apiErr) {
            console.warn('Could not auto-save custom procedure master:', apiErr.message);
          }
        }
      });

      await Promise.all(savePromises);
      
      // Refresh custom procedures list
      fetchCustomProcedures();

      toast.success(`Procedures planned successfully for ${getToothDisplayName(selectedTooth, numberingSystem)}`);
      setSelectedTooth(null);
      fetchChart();
    } catch (err) {
      console.error('Error planning tooth procedures:', err);
      toast.error('Failed to log procedures. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getToothStatusColor = (tooth) => {
    const treatments = chartData[tooth] || [];
    if (treatments.length === 0) return 'border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50';
    
    // Check if there is an in-progress treatment
    const hasInProgress = treatments.some(t => t.status === 'In Progress');
    if (hasInProgress) return 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300';

    // Check if there is planned
    const hasPlanned = treatments.some(t => t.status === 'Planned');
    if (hasPlanned) return 'border-cyan-400 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/20 dark:text-cyan-300';

    // Check if completed
    const hasCompleted = treatments.some(t => t.status === 'Completed');
    if (hasCompleted) return 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300';

    return 'border-slate-200 bg-white text-slate-700';
  };

  // Returns the SVG icon tint color matching the tooth's current status
  const getToothIconColor = (tooth) => {
    const treatments = chartData[tooth] || [];
    if (treatments.length === 0) return '#4f46e5'; // indigo-600 — rich dark for healthy
    const hasInProgress = treatments.some(t => t.status === 'In Progress');
    if (hasInProgress) return '#b45309'; // amber-700 — dark warm
    const hasPlanned = treatments.some(t => t.status === 'Planned');
    if (hasPlanned) return '#0e7490'; // cyan-700 — deep teal
    const hasCompleted = treatments.some(t => t.status === 'Completed');
    if (hasCompleted) return '#047857'; // emerald-700 — deep green
    return '#4f46e5';
  };

  const getToothIndicator = (tooth) => {
    const treatments = chartData[tooth] || [];
    if (treatments.length === 0) return null;

    const hasInProgress = treatments.some(t => t.status === 'In Progress');
    if (hasInProgress) return <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>;

    const hasPlanned = treatments.some(t => t.status === 'Planned');
    if (hasPlanned) return <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-500"></span>;

    const hasCompleted = treatments.some(t => t.status === 'Completed');
    if (hasCompleted) return <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500"></span>;

    return null;
  };

  if (loading && Object.keys(chartData).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500 animate-pulse">Fetching Patient Dental Chart...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-white border border-slate-100 rounded-b-3xl mt-4 shadow-sm">
      {/* Header and Numbering System Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Smile className="w-5 h-5 text-indigo-600 animate-pulse" />
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">
            Interactive {chartType === 'adult' ? '32-Tooth' : '20-Tooth'} Dental Chart
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Create Bill Button */}
          <button
            type="button"
            onClick={() => setBillingModalOpen(true)}
            className="w-full sm:w-auto justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl tracking-wider shadow-md shadow-emerald-600/10 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <IndianRupee className="w-3.5 h-3.5" /> Create Bill
          </button>

          {/* Chart Type Toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-50 border border-slate-200/80 p-1 rounded-xl shadow-sm w-full sm:w-auto">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 pr-1 select-none">Type:</span>
            {[
              { id: 'adult', label: 'Adults' },
              { id: 'child', label: 'Children' }
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setChartType(type.id)}
                className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer ${
                  chartType === type.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200/50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Standard Numbering Selector */}
          <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-50 border border-slate-200/80 p-1 rounded-xl shadow-sm w-full sm:w-auto">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 pr-1 select-none">Numbering:</span>
            {['FDI', 'Universal', 'Palmer'].map((sys) => (
              <button
                key={sys}
                type="button"
                onClick={() => {
                  setNumberingSystem(sys);
                  localStorage.setItem('dentalNumberingSystem', sys);
                  window.dispatchEvent(new Event('dentalNumberingSystemChanged'));
                }}
                className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer ${
                  numberingSystem === sys
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200/50'
                }`}
              >
                {sys}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Guide/Legend */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-8 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2 select-none">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-white border border-slate-200"></div>
          <span className="text-xs font-black text-slate-600">Healthy / Untreated</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-cyan-50 border border-cyan-400"></div>
          <span className="text-xs font-black text-cyan-800">Planned / Diagnosed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-amber-50 border border-amber-400 animate-pulse"></div>
          <span className="text-xs font-black text-amber-800">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-lg bg-emerald-50 border border-emerald-400"></div>
          <span className="text-xs font-black text-emerald-800">Completed</span>
        </div>
      </div>

      <div className="space-y-12 select-none">
        {/* Upper Jaw Arch */}
        <div>
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 select-none">
            Upper Jaw (Maxillary Arch) — {chartType === 'adult' ? '18-11 | 21-28' : '55-51 | 61-65'}
          </p>
          <div className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-4 px-2 justify-start sm:justify-center w-full scroll-smooth select-none custom-scrollbar">
            {getUpperArchTeeth(chartType).map((tooth, index) => {
              const label = getToothLabel(tooth.id, numberingSystem);
              const iconColor = getToothIconColor(tooth.id);
              const isMidline = index === (chartType === 'adult' ? 7 : 4);
              return (
                <React.Fragment key={tooth.id}>
                  <button
                    onClick={() => handleToothClick(tooth.id)}
                    className={`relative w-14 h-20 rounded-2xl border-2 font-black text-base flex flex-col items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer gap-0.5 shrink-0 ${getToothStatusColor(tooth.id)}`}
                    title={`${tooth.name} (${getToothDisplayName(tooth.id, numberingSystem)})`}
                  >
                    {/* Tooth shape SVG icon */}
                    <span className="leading-none flex items-center justify-center" style={{ height: 32 }}>
                      {getToothSVG(tooth.id, iconColor, 28)}
                    </span>
                    <span className="text-sm font-black leading-none">{label}</span>
                    <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest select-none leading-none">
                      {numberingSystem === 'Universal' ? 'UNIV' : numberingSystem}
                    </span>
                    {getToothIndicator(tooth.id)}
                  </button>
                  {isMidline && (
                    <div className="w-[2px] h-16 bg-slate-200 self-center mx-2 shrink-0 rounded-full" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Lower Jaw Arch */}
        <div>
          <div className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-4 px-2 justify-start sm:justify-center w-full scroll-smooth select-none custom-scrollbar mb-4">
            {getLowerArchTeeth(chartType).map((tooth, index) => {
              const label = getToothLabel(tooth.id, numberingSystem);
              const iconColor = getToothIconColor(tooth.id);
              const isMidline = index === (chartType === 'adult' ? 7 : 4);
              return (
                <React.Fragment key={tooth.id}>
                  <button
                    onClick={() => handleToothClick(tooth.id)}
                    className={`relative w-14 h-20 rounded-2xl border-2 font-black text-base flex flex-col items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer gap-0.5 shrink-0 ${getToothStatusColor(tooth.id)}`}
                    title={`${tooth.name} (${getToothDisplayName(tooth.id, numberingSystem)})`}
                  >
                    {getToothIndicator(tooth.id)}
                    <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest select-none leading-none">
                      {numberingSystem === 'Universal' ? 'UNIV' : numberingSystem}
                    </span>
                    <span className="text-sm font-black leading-none">{label}</span>
                    {/* Tooth shape SVG icon — flipped for lower arch */}
                    <span className="leading-none flex items-center justify-center" style={{ height: 32 }}>
                      {getToothSVG(tooth.id, iconColor, 28)}
                    </span>
                  </button>
                  {isMidline && (
                    <div className="w-[2px] h-16 bg-slate-200 self-center mx-2 shrink-0 rounded-full" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
            Lower Jaw (Mandibular Arch) — {chartType === 'adult' ? '48-41 | 31-38' : '85-81 | 71-75'}
          </p>
        </div>
      </div>

      {/* Selected Tooth Info & Procedure planner */}
      <AnimatePresence>
        {selectedTooth && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <div>
                  <h4 className="text-base font-black uppercase tracking-tight">
                    {getToothDisplayName(selectedTooth, numberingSystem)}
                  </h4>
                  <p className="text-xs opacity-80 font-semibold">Assign new clinical procedures or view history</p>
                </div>
                <button 
                  onClick={() => setSelectedTooth(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProcedure} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Left Column - Preview & Past Logs */}
                  <div className="space-y-4 flex flex-col h-full">
                    {/* Past Treatment logs on this tooth */}
                    {chartData[selectedTooth]?.length > 0 && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 max-h-[140px] overflow-y-auto space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
                          <Info className="w-3.5 h-3.5 text-slate-400" /> Past Treatment History
                        </p>
                        {chartData[selectedTooth].map((t) => (
                          <div key={t._id} className="text-xs flex justify-between items-start border-b border-dashed border-slate-200 pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="font-black text-slate-700">{t.procedure}</p>
                              <p className="text-[10px] text-slate-400">{t.notes || 'No description notes.'}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                              t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                              t.status === 'In Progress' ? 'bg-amber-50 text-amber-600' :
                              'bg-cyan-50 text-cyan-600'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Queued Procedures Preview */}
                    <div className="bg-indigo-50/20 rounded-2xl p-5 border border-indigo-100/50 flex-1 flex flex-col justify-between min-h-[260px]">
                      <div>
                        <p className="text-[10px] font-bold text-indigo-900/60 uppercase tracking-wider mb-3 select-none">
                          Queued Procedures for Tooth
                        </p>
                        {selectedProceduresList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                            <Smile className="w-8 h-8 mb-2 opacity-30 text-indigo-500" />
                            <p className="text-xs font-semibold">No procedures selected yet.</p>
                            <p className="text-[10px] opacity-70">Click presets on the right or type a custom one to add to queue.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {selectedProceduresList.map((item, idx) => {
                              const isEditing = editingIndex === idx;
                              return (
                                <div key={idx} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                                  {isEditing ? (
                                    <div className="space-y-2.5">
                                      <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-indigo-900/60 uppercase tracking-widest">
                                          Edit Procedure Name
                                        </label>
                                        <input
                                          type="text"
                                          value={editingName}
                                          onChange={(e) => setEditingName(e.target.value)}
                                          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 w-full font-sans"
                                        />
                                      </div>
                                      <div className="flex items-end gap-2.5">
                                        <div className="flex flex-col gap-1 flex-1">
                                          <label className="text-[9px] font-bold text-indigo-900/60 uppercase tracking-widest">
                                            Edit Cost (₹)
                                          </label>
                                          <input
                                            type="number"
                                            value={editingCost}
                                            onChange={(e) => setEditingCost(e.target.value)}
                                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 w-full font-sans"
                                          />
                                        </div>
                                        <div className="flex gap-1.5 pb-0.5">
                                          <button
                                            type="button"
                                            onClick={() => handleSaveEdit(idx)}
                                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer border border-emerald-100 flex items-center justify-center"
                                            title="Save changes"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer border border-slate-200 flex items-center justify-center"
                                            title="Cancel edit"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex justify-between items-center gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-black text-slate-800 text-xs truncate" title={item.name}>{item.name}</p>
                                        <p className="text-[10px] text-indigo-600 font-bold">Estimated Cost: ₹{item.cost}</p>
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(idx, item)}
                                          className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                          title="Edit procedure"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveProcedureFromList(idx)}
                                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                          title="Remove procedure"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-indigo-100 pt-4 mt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">Total Cost</span>
                          <span className="text-xl font-black text-indigo-900">
                            ₹{selectedProceduresList.reduce((acc, p) => acc + p.cost, 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Selection & Input */}
                  <div className="space-y-4">
                    {/* Quick presets */}
                    <div className="flex flex-col gap-2 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl shadow-sm">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none">Quick Presets (Tap to add to queue):</span>
                      <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                        {mergedPresets.map((proc) => (
                          <button
                            key={proc.name}
                            type="button"
                            onClick={() => handleQuickProcedureSelect(proc)}
                            className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 text-[10px] font-black rounded-lg transition-colors cursor-pointer select-none"
                          >
                            + {proc.name.replace(/ Treatment| Placement| Surgery/g, '')} (₹{proc.defaultCost})
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Manual Custom Add Form */}
                    <div className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-2xl space-y-3 shadow-sm">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none">Or Add Custom Procedure:</p>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Procedure Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Root Canal (RCT), Extraction..."
                          value={procedure}
                          onChange={(e) => {
                            setProcedure(e.target.value);
                            const match = mergedPresets.find(p => p.name.toLowerCase() === e.target.value.toLowerCase());
                            if (match) {
                              setEstimatedCost(match.defaultCost.toString());
                            }
                          }}
                          list="dental-procedure-suggestions"
                          className="border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <datalist id="dental-procedure-suggestions">
                          {mergedPresets.map((proc, idx) => (
                            <option key={idx} value={proc.name} />
                          ))}
                        </datalist>
                      </div>

                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Cost (₹)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 4500"
                            value={estimatedCost}
                            onChange={(e) => setEstimatedCost(e.target.value)}
                            className="border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddProcedureToList}
                          className="px-4 py-2 border-2 border-indigo-600 hover:bg-indigo-50 text-indigo-600 text-xs font-black rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 h-[34px]"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    </div>

                    {/* priority and clinical diagnosis notes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Priority
                        </label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Clinical Diagnosis Notes (Applies to all selected)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Describe diagnosis details, tooth decay type, composite shade, etc..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedTooth(null)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-60 shadow-lg shadow-indigo-600/10 animate-fade cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Plan Procedure'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Dental Billing Creator Modal */}
      {billingModalOpen && (
        <DentalBillingCreatorModal
          patientId={patientId}
          patientData={patientData}
          appointments={appointments}
          onClose={() => setBillingModalOpen(false)}
          onComplete={(newBill) => {
            setBillingModalOpen(false);
            fetchChart();
          }}
        />
      )}

    </div>
  );
};

export default DentalChart;
