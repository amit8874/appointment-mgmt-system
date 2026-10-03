import React, { useState, useEffect } from 'react';
import { dentistApi } from '../../../services/api';
import { Smile, AlertCircle, Plus, Info, Trash2, Award, Pencil, Check, X, IndianRupee, CheckSquare, Square } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getUpperArchTeeth,
  getLowerArchTeeth,
  getToothById,
  getToothLabel,
  getToothDisplayName,
  STANDARD_DENTAL_PROCEDURES,
  RCT_SUB_OPTIONS
} from './dentalUtils';
import { getToothSVG } from './ToothIcons';
import DentalBillingCreatorModal from './DentalBillingCreatorModal';

const DentalChart = ({ patientId, patientData, appointments = [] }) => {
  const [chartData, setChartData] = useState({});
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [isProcedureModalOpen, setIsProcedureModalOpen] = useState(false);
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
  const [totalPackageCost, setTotalPackageCost] = useState('');
  const [initialPaidAmount, setInitialPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [saving, setSaving] = useState(false);

  // RCT sub-options state
  const [showRctOptions, setShowRctOptions] = useState(false);

  // Editing state for queued procedures
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingCost, setEditingCost] = useState('');
  const [editingTotalCost, setEditingTotalCost] = useState('');

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

  // Multi-tooth selection toggle logic
  const handleToothClick = (toothId) => {
    setSelectedTeeth(prev => {
      if (prev.includes(toothId)) {
        return prev.filter(id => id !== toothId);
      } else {
        return [...prev, toothId];
      }
    });
  };

  const handleSelectUpperArch = () => {
    const upperIds = getUpperArchTeeth(chartType).map(t => t.id);
    setSelectedTeeth(prev => {
      const allSelected = upperIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !upperIds.includes(id));
      } else {
        return Array.from(new Set([...prev, ...upperIds]));
      }
    });
  };

  const handleSelectLowerArch = () => {
    const lowerIds = getLowerArchTeeth(chartType).map(t => t.id);
    setSelectedTeeth(prev => {
      const allSelected = lowerIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !lowerIds.includes(id));
      } else {
        return Array.from(new Set([...prev, ...lowerIds]));
      }
    });
  };

  const handleSelectAllTeeth = () => {
    const allIds = [
      ...getUpperArchTeeth(chartType).map(t => t.id),
      ...getLowerArchTeeth(chartType).map(t => t.id)
    ];
    if (selectedTeeth.length === allIds.length) {
      setSelectedTeeth([]);
    } else {
      setSelectedTeeth(allIds);
    }
  };

  const handleOpenPlannerModal = () => {
    if (selectedTeeth.length === 0) {
      toast.error('Please select at least one tooth from the chart first');
      return;
    }
    setProcedure('');
    setEstimatedCost('');
    setTotalPackageCost('');
    setInitialPaidAmount('');
    setNotes('');
    setPriority('Medium');
    setSelectedProceduresList([]);
    setShowRctOptions(false);
    setEditingIndex(null);
    setEditingName('');
    setEditingCost('');
    setEditingTotalCost('');
    setIsProcedureModalOpen(true);
  };

  const handleAddProcedureToList = () => {
    if (!procedure.trim()) {
      toast.error('Please specify a procedure name');
      return;
    }
    
    let perToothNum = Number(estimatedCost);
    let totalNum = Number(totalPackageCost);

    if ((!perToothNum || isNaN(perToothNum)) && totalNum && selectedTeeth.length > 0) {
      perToothNum = Math.round((totalNum / selectedTeeth.length) * 100) / 100;
    } else if ((!totalNum || isNaN(totalNum)) && perToothNum && selectedTeeth.length > 0) {
      totalNum = Math.round((perToothNum * selectedTeeth.length) * 100) / 100;
    }

    if (perToothNum < 0 || totalNum < 0) {
      toast.error('Cost cannot be negative');
      return;
    }

    const nameTrimmed = procedure.trim();
    if (selectedProceduresList.some(p => p.name.toLowerCase() === nameTrimmed.toLowerCase())) {
      toast.error('This procedure is already added to the list');
      return;
    }

    setSelectedProceduresList(prev => [...prev, { name: nameTrimmed, cost: perToothNum || 0, packageCost: totalNum || 0 }]);
    setProcedure('');
    setEstimatedCost('');
    setTotalPackageCost('');
    setShowRctOptions(false);
  };

  const handleRemoveProcedureFromList = (index) => {
    setSelectedProceduresList(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingName('');
      setEditingCost('');
    } else if (editingIndex > index) {
      setEditingIndex(prev => prev - 1);
    }
  };

  const handleStartEdit = (index, item) => {
    setEditingIndex(index);
    setEditingName(item.name);
    setEditingCost(item.cost.toString());
    setEditingTotalCost((item.cost * (selectedTeeth.length || 1)).toString());
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingName('');
    setEditingCost('');
    setEditingTotalCost('');
  };

  const handleSaveEdit = (index) => {
    if (!editingName.trim()) {
      toast.error('Procedure name cannot be empty');
      return;
    }
    let perToothNum = Number(editingCost);
    let totalNum = Number(editingTotalCost);

    if ((!perToothNum || isNaN(perToothNum)) && totalNum && selectedTeeth.length > 0) {
      perToothNum = Math.round((totalNum / selectedTeeth.length) * 100) / 100;
    } else if ((!totalNum || isNaN(totalNum)) && perToothNum && selectedTeeth.length > 0) {
      totalNum = Math.round((perToothNum * selectedTeeth.length) * 100) / 100;
    }

    if (perToothNum < 0 || totalNum < 0) {
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
      prev.map((item, i) => (i === index ? { name: nameTrimmed, cost: perToothNum || 0, packageCost: totalNum || 0 } : item))
    );
    setEditingIndex(null);
    setEditingName('');
    setEditingCost('');
    setEditingTotalCost('');
  };

  const handleQuickProcedureSelect = (proc) => {
    const isRct = proc.name.toLowerCase().includes('rct') || proc.name.toLowerCase().includes('root canal');
    if (isRct) {
      setShowRctOptions(true);
      setProcedure('Root Canal Treatment (RCT)');
      if (!estimatedCost && !totalPackageCost) {
        setEstimatedCost(proc.defaultCost.toString());
        setTotalPackageCost((proc.defaultCost * selectedTeeth.length).toString());
      }
      return;
    }

    const exists = selectedProceduresList.some(p => p.name.toLowerCase() === proc.name.toLowerCase());
    if (exists) {
      toast.error(`${proc.name} is already added to the list`);
      return;
    }
    const perTooth = proc.defaultCost;
    const total = proc.defaultCost * (selectedTeeth.length || 1);
    setSelectedProceduresList(prev => [...prev, { name: proc.name, cost: perTooth, packageCost: total }]);
  };

  const handleSelectRctOption = (opt) => {
    let perToothNum = Number(estimatedCost);
    let totalNum = Number(totalPackageCost);
    if ((!perToothNum || isNaN(perToothNum)) && totalNum && selectedTeeth.length > 0) {
      perToothNum = Math.round((totalNum / selectedTeeth.length) * 100) / 100;
    } else if ((!totalNum || isNaN(totalNum)) && perToothNum && selectedTeeth.length > 0) {
      totalNum = Math.round((perToothNum * selectedTeeth.length) * 100) / 100;
    } else if (!perToothNum && !totalNum) {
      perToothNum = 5000;
      totalNum = 5000 * (selectedTeeth.length || 1);
    }
    const procName = opt.fullName;

    const exists = selectedProceduresList.some(p => p.name.toLowerCase() === procName.toLowerCase());
    if (exists) {
      toast.error(`${procName} is already added to the list`);
      return;
    }

    setSelectedProceduresList(prev => [...prev, { name: procName, cost: perToothNum, packageCost: totalNum }]);
    setProcedure('');
    setEstimatedCost('');
    setTotalPackageCost('');
    setShowRctOptions(false);
  };

  const handleSaveProcedure = async (e) => {
    e.preventDefault();
    
    let listToSave = [...selectedProceduresList];
    if (listToSave.length === 0) {
      if (procedure.trim()) {
        let perToothNum = Number(estimatedCost);
        let totalNum = Number(totalPackageCost);
        if ((!perToothNum || isNaN(perToothNum)) && totalNum && selectedTeeth.length > 0) {
          perToothNum = Math.round((totalNum / selectedTeeth.length) * 100) / 100;
        } else if ((!totalNum || isNaN(totalNum)) && perToothNum && selectedTeeth.length > 0) {
          totalNum = Math.round((perToothNum * selectedTeeth.length) * 100) / 100;
        }
        listToSave.push({ name: procedure.trim(), cost: perToothNum || 0, packageCost: totalNum || 0 });
      } else {
        toast.error('Please add at least one procedure to the list');
        return;
      }
    }

    if (selectedTeeth.length === 0) {
      toast.error('No teeth selected');
      return;
    }

    const totalCostSum = listToSave.reduce((acc, p) => acc + (p.packageCost !== undefined && !isNaN(p.packageCost) ? Number(p.packageCost) : p.cost * selectedTeeth.length), 0);
    const parsedPaidInput = Number(initialPaidAmount) || 0;

    if (parsedPaidInput < 0) {
      toast.error('Paid amount cannot be negative');
      return;
    }

    if (parsedPaidInput > totalCostSum && totalCostSum > 0) {
      toast.error(`Paid amount (₹${parsedPaidInput}) cannot exceed total estimated cost (₹${totalCostSum})`);
      return;
    }

    setSaving(true);
    try {
      const savePromises = [];
      selectedTeeth.forEach((toothId) => {
        listToSave.forEach((item) => {
          const itemCost = item.cost;
          let itemPaid = 0;
          if (totalCostSum > 0) {
            const ratio = (itemCost * selectedTeeth.length) / totalCostSum;
            const allocatedForItem = parsedPaidInput * ratio;
            itemPaid = Math.min(itemCost, Math.round((allocatedForItem / selectedTeeth.length) * 100) / 100);
          }

          savePromises.push(
            dentistApi.createTreatment(patientId, {
              toothNumber: toothId,
              procedure: item.name,
              estimatedCost: item.cost,
              paidAmount: itemPaid,
              notes: notes.trim(),
              priority,
              status: itemPaid >= itemCost && itemCost > 0 ? 'Completed' : 'Planned'
            })
          );

          const isKnown = mergedPresets.some(p => p.name.toLowerCase() === item.name.toLowerCase());
          if (!isKnown) {
            dentistApi.createCustomProcedure({
              name: item.name,
              defaultCost: item.cost
            }).catch(apiErr => console.warn('Could not auto-save custom procedure master:', apiErr.message));
          }
        });
      });

      await Promise.all(savePromises);
      fetchCustomProcedures();

      toast.success(`Planned ${listToSave.length} procedure(s) successfully for ${selectedTeeth.length} selected ${selectedTeeth.length === 1 ? 'tooth' : 'teeth'}!`);
      setIsProcedureModalOpen(false);
      setSelectedTeeth([]);
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
    
    const hasInProgress = treatments.some(t => t.status === 'In Progress');
    if (hasInProgress) return 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300';

    const hasPlanned = treatments.some(t => t.status === 'Planned');
    if (hasPlanned) return 'border-cyan-400 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/20 dark:text-cyan-300';

    const hasCompleted = treatments.some(t => t.status === 'Completed');
    if (hasCompleted) return 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300';

    return 'border-slate-200 bg-white text-slate-700';
  };

  const getToothIconColor = (tooth) => {
    const treatments = chartData[tooth] || [];
    if (treatments.length === 0) return '#4f46e5';
    const hasInProgress = treatments.some(t => t.status === 'In Progress');
    if (hasInProgress) return '#b45309';
    const hasPlanned = treatments.some(t => t.status === 'Planned');
    if (hasPlanned) return '#0e7490';
    const hasCompleted = treatments.some(t => t.status === 'Completed');
    if (hasCompleted) return '#047857';
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
                onClick={() => {
                  setChartType(type.id);
                  setSelectedTeeth([]);
                }}
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

      {/* Guide/Legend & Selection Helpers */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-slate-50/70 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1 select-none">Legend:</span>
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

        {/* Quick Selection Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSelectUpperArch}
            className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 text-[10px] font-black uppercase rounded-lg transition-all shadow-sm cursor-pointer"
          >
            Upper Arch
          </button>
          <button
            type="button"
            onClick={handleSelectLowerArch}
            className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 text-[10px] font-black uppercase rounded-lg transition-all shadow-sm cursor-pointer"
          >
            Lower Arch
          </button>
          <button
            type="button"
            onClick={handleSelectAllTeeth}
            className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 text-[10px] font-black uppercase rounded-lg transition-all shadow-sm cursor-pointer"
          >
            {selectedTeeth.length > 0 && selectedTeeth.length === (getUpperArchTeeth(chartType).length + getLowerArchTeeth(chartType).length) ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* Multi-Tooth Active Selection Action Banner */}
      <AnimatePresence>
        {selectedTeeth.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl border border-indigo-700/50 mb-6"
          >
            <div className="flex items-center gap-3">
              <span className="bg-indigo-600 text-white px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                {selectedTeeth.length} {selectedTeeth.length === 1 ? 'Tooth Selected' : 'Teeth Selected'}
              </span>
              <span className="text-xs font-bold text-slate-200 truncate max-w-xl">
                Teeth: {selectedTeeth.map(id => getToothDisplayName(id, numberingSystem)).join(', ')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenPlannerModal}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Plan Treatment for {selectedTeeth.length} {selectedTeeth.length === 1 ? 'Tooth' : 'Teeth'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTeeth([])}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-12 select-none">
        {/* Upper Jaw Arch */}
        <div>
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 select-none">
            Upper Jaw (Maxillary Arch) — {chartType === 'adult' ? '18-11 | 21-28' : '55-51 | 61-65'}
          </p>
          <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 overflow-x-hidden justify-center w-full select-none">
            {getUpperArchTeeth(chartType).map((tooth, index) => {
              const label = getToothLabel(tooth.id, numberingSystem);
              const iconColor = getToothIconColor(tooth.id);
              const isMidline = index === (chartType === 'adult' ? 7 : 4);
              const isSelected = selectedTeeth.includes(tooth.id);
              return (
                <React.Fragment key={tooth.id}>
                  <button
                    type="button"
                    onClick={() => handleToothClick(tooth.id)}
                    className={`relative flex-1 min-w-0 max-w-[56px] h-14 sm:h-16 md:h-20 rounded-lg sm:rounded-xl border font-black flex flex-col items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer gap-0.5 ${
                      isSelected
                        ? 'ring-4 ring-indigo-500 border-indigo-600 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 font-black scale-105 z-10 shadow-xl'
                        : getToothStatusColor(tooth.id)
                    }`}
                    title={`${tooth.name} (${getToothDisplayName(tooth.id, numberingSystem)}) — ${isSelected ? 'Click to deselect' : 'Click to select'}`}
                  >
                    {/* Selected checkmark badge */}
                    {isSelected && (
                      <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-md z-20">
                        ✓
                      </span>
                    )}
                    {/* Tooth shape SVG icon */}
                    <span className="leading-none flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8">
                      {getToothSVG(tooth.id, isSelected ? '#3730a3' : iconColor, '100%')}
                    </span>
                    <span className="text-[10px] sm:text-xs md:text-sm font-black leading-none">{label}</span>
                    <span className="text-[5px] sm:text-[6px] md:text-[7px] text-slate-400 font-bold uppercase tracking-widest select-none leading-none">
                      {numberingSystem === 'Universal' ? 'UNIV' : numberingSystem}
                    </span>
                    {getToothIndicator(tooth.id)}
                  </button>
                  {isMidline && (
                    <div className="w-[1.5px] h-10 sm:h-12 md:h-14 lg:h-16 bg-slate-200 self-center mx-0.5 sm:mx-1 shrink-0 rounded-full" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Lower Jaw Arch */}
        <div>
          <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 overflow-x-hidden justify-center w-full select-none mb-4">
            {getLowerArchTeeth(chartType).map((tooth, index) => {
              const label = getToothLabel(tooth.id, numberingSystem);
              const iconColor = getToothIconColor(tooth.id);
              const isMidline = index === (chartType === 'adult' ? 7 : 4);
              const isSelected = selectedTeeth.includes(tooth.id);
              return (
                <React.Fragment key={tooth.id}>
                  <button
                    type="button"
                    onClick={() => handleToothClick(tooth.id)}
                    className={`relative flex-1 min-w-0 max-w-[56px] h-14 sm:h-16 md:h-20 rounded-lg sm:rounded-xl border font-black flex flex-col items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer gap-0.5 ${
                      isSelected
                        ? 'ring-4 ring-indigo-500 border-indigo-600 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-100 font-black scale-105 z-10 shadow-xl'
                        : getToothStatusColor(tooth.id)
                    }`}
                    title={`${tooth.name} (${getToothDisplayName(tooth.id, numberingSystem)}) — ${isSelected ? 'Click to deselect' : 'Click to select'}`}
                  >
                    {/* Selected checkmark badge */}
                    {isSelected && (
                      <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-md z-20">
                        ✓
                      </span>
                    )}
                    {getToothIndicator(tooth.id)}
                    <span className="text-[5px] sm:text-[6px] md:text-[7px] text-slate-400 font-bold uppercase tracking-widest select-none leading-none">
                      {numberingSystem === 'Universal' ? 'UNIV' : numberingSystem}
                    </span>
                    <span className="text-[10px] sm:text-xs md:text-sm font-black leading-none">{label}</span>
                    {/* Tooth shape SVG icon — flipped for lower arch */}
                    <span className="leading-none flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8">
                      {getToothSVG(tooth.id, isSelected ? '#3730a3' : iconColor, '100%')}
                    </span>
                  </button>
                  {isMidline && (
                    <div className="w-[1.5px] h-10 sm:h-12 md:h-14 lg:h-16 bg-slate-200 self-center mx-0.5 sm:mx-1 shrink-0 rounded-full" />
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

      {/* Selected Teeth Info & Multi-Treatment Procedure Planner Modal */}
      <AnimatePresence>
        {isProcedureModalOpen && selectedTeeth.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
            >
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 p-5 text-white flex justify-between items-center shrink-0">
                <div>
                  <h4 className="text-base font-black uppercase tracking-tight">
                    {selectedTeeth.length === 1
                      ? getToothDisplayName(selectedTeeth[0], numberingSystem)
                      : `${selectedTeeth.length} Teeth Selected (${selectedTeeth.map(id => getToothDisplayName(id, numberingSystem)).join(', ')})`}
                  </h4>
                  <p className="text-xs opacity-80 font-semibold">
                    Assign clinical procedures to {selectedTeeth.length} selected {selectedTeeth.length === 1 ? 'tooth' : 'teeth'} at once
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsProcedureModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProcedure} className="p-6 flex-1 overflow-y-auto space-y-5 flex flex-col justify-between">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Left Column - Preview & Combined Past Logs */}
                  <div className="space-y-4 flex flex-col h-full">
                    {/* Past Treatment logs for selected teeth */}
                    {selectedTeeth.some(id => chartData[id]?.length > 0) && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 max-h-[150px] overflow-y-auto space-y-3">
                        <p className="text-[10px] font-black text-slate-950 uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
                          <Info className="w-3.5 h-3.5 text-slate-950" /> Past Treatment History & Billing
                        </p>
                        {selectedTeeth.map(toothId => (
                          (chartData[toothId] || []).map((t) => (
                            <div key={t._id} className="text-xs flex justify-between items-start border-b border-dashed border-slate-300 pb-2 last:border-0 last:pb-0">
                              <div>
                                <span className="text-[9px] font-black text-indigo-950 bg-indigo-100 px-1.5 py-0.5 rounded mr-1.5 uppercase border border-indigo-200">
                                  {getToothDisplayName(toothId, numberingSystem)}
                                </span>
                                <span className="font-black text-slate-950">{t.procedure}</span>
                                <p className="text-[10px] font-bold text-slate-900">{t.notes || 'No description notes.'}</p>
                                <p className="text-[10px] font-black text-slate-800 mt-0.5">
                                  Est: ₹{t.estimatedCost || 0} • Paid: <span className="text-emerald-700">₹{t.paidAmount || 0}</span> • Due: <span className="text-rose-700">₹{t.dueAmount || 0}</span>
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                t.status === 'Completed' ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' :
                                t.status === 'In Progress' ? 'bg-amber-100 text-amber-950 border border-amber-300' :
                                'bg-cyan-100 text-cyan-950 border border-cyan-300'
                              }`}>
                                {t.status}
                              </span>
                            </div>
                          ))
                        ))}
                      </div>
                    )}

                    {/* Queued Procedures Preview & Financial Entry */}
                    <div className="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-200 flex-1 flex flex-col justify-between min-h-[260px]">
                      <div>
                        <div className="flex justify-between items-center mb-3 select-none">
                          <p className="text-[10px] font-black text-slate-950 uppercase tracking-wider">
                            Queued Procedures (Applied per tooth)
                          </p>
                          <span className="text-[10px] font-black text-slate-950 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-300">
                            x{selectedTeeth.length} Teeth
                          </span>
                        </div>
                        {selectedProceduresList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-950 text-center">
                            <Smile className="w-8 h-8 mb-2 text-indigo-700" />
                            <p className="text-xs font-black text-slate-950">No procedures selected yet.</p>
                            <p className="text-[10px] font-bold text-slate-900">Click presets on the right or type a custom one to add to queue.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {selectedProceduresList.map((item, idx) => {
                              const isEditing = editingIndex === idx;
                              return (
                                <div key={idx} className="bg-white border border-slate-300 p-3 rounded-xl shadow-sm">
                                  {isEditing ? (
                                    <div className="space-y-2.5">
                                      <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-black text-slate-950 uppercase tracking-widest">
                                          Edit Procedure Name
                                        </label>
                                        <input
                                          type="text"
                                          value={editingName}
                                          onChange={(e) => setEditingName(e.target.value)}
                                          className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-full font-sans"
                                        />
                                      </div>
                                      
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] font-black text-slate-950 uppercase tracking-widest">
                                            Cost Per Tooth (₹)
                                          </label>
                                          <input
                                            type="number"
                                            value={editingCost}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setEditingCost(val);
                                              const num = Number(val) || 0;
                                              setEditingTotalCost(selectedTeeth.length > 0 ? (num * selectedTeeth.length).toString() : val);
                                            }}
                                            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-full font-sans"
                                          />
                                        </div>

                                        {selectedTeeth.length > 1 && (
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black text-indigo-950 uppercase tracking-widest">
                                              Overall Total ({selectedTeeth.length} Teeth)
                                            </label>
                                            <input
                                              type="number"
                                              value={editingTotalCost}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setEditingTotalCost(val);
                                                const num = Number(val) || 0;
                                                const perTooth = selectedTeeth.length > 0 ? Math.round((num / selectedTeeth.length) * 100) / 100 : num;
                                                setEditingCost(perTooth.toString());
                                              }}
                                              className="border border-indigo-300 bg-indigo-50/50 rounded-lg px-2.5 py-1.5 text-xs font-black text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500 w-full font-sans"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex justify-end gap-1.5 pt-1">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveEdit(idx)}
                                          className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 rounded-lg transition-colors cursor-pointer border border-emerald-300 font-black text-xs flex items-center gap-1"
                                        >
                                          <Check className="w-3.5 h-3.5" /> Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleCancelEdit}
                                          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-950 rounded-lg transition-colors cursor-pointer border border-slate-400 font-black text-xs flex items-center gap-1"
                                        >
                                          <X className="w-3.5 h-3.5" /> Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex justify-between items-center gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-black text-slate-950 text-xs truncate" title={item.name}>{item.name}</p>
                                        <p className="text-[11px] text-indigo-950 font-black">
                                          Cost per tooth: ₹{item.cost} {selectedTeeth.length > 1 && `(Total for ${selectedTeeth.length} teeth: ₹${item.packageCost !== undefined && !isNaN(item.packageCost) ? item.packageCost : Math.round(item.cost * selectedTeeth.length * 100) / 100})`}
                                        </p>
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(idx, item)}
                                          className="p-1.5 hover:bg-indigo-100 text-slate-800 hover:text-indigo-950 rounded-lg transition-colors cursor-pointer font-bold"
                                          title="Edit procedure"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveProcedureFromList(idx)}
                                          className="p-1.5 hover:bg-rose-100 text-slate-800 hover:text-rose-700 rounded-lg transition-colors cursor-pointer font-bold"
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

                      {/* Financial Payment & Advance Entry Card */}
                      <div className="border-t border-indigo-200 pt-3 mt-3 space-y-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-950 uppercase tracking-wider">
                              Grand Total ({selectedTeeth.length} {selectedTeeth.length === 1 ? 'Tooth' : 'Teeth'})
                            </span>
                            <span className="text-xl font-black text-slate-950">
                              ₹{selectedProceduresList.reduce((acc, p) => acc + (p.packageCost !== undefined && !isNaN(p.packageCost) ? Number(p.packageCost) : p.cost * selectedTeeth.length), 0) || Number(totalPackageCost) || (Number(estimatedCost) * selectedTeeth.length) || 0}
                            </span>
                          </div>
                          {selectedProceduresList.length === 0 && (Number(totalPackageCost) > 0 || Number(estimatedCost) > 0) && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md border border-indigo-200 self-end">
                              Pending Add: ₹{totalPackageCost || (Number(estimatedCost) * selectedTeeth.length)} (₹{estimatedCost}/tooth)
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-indigo-200">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-slate-950 uppercase tracking-widest">
                              Amount Paid Today (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={initialPaidAmount}
                              onChange={(e) => setInitialPaidAmount(e.target.value)}
                              className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-emerald-950 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-slate-950 uppercase tracking-widest">
                              Remaining Due (₹)
                            </label>
                            <div className={`px-3 py-1.5 rounded-xl border text-xs font-black text-right ${
                              Math.max(0, selectedProceduresList.reduce((acc, p) => acc + (p.packageCost !== undefined && !isNaN(p.packageCost) ? Number(p.packageCost) : p.cost * selectedTeeth.length), 0) - (Number(initialPaidAmount) || 0)) > 0
                                ? 'bg-rose-50 border-rose-300 text-rose-700'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            }`}>
                              ₹{Math.max(0, selectedProceduresList.reduce((acc, p) => acc + (p.packageCost !== undefined && !isNaN(p.packageCost) ? Number(p.packageCost) : p.cost * selectedTeeth.length), 0) - (Number(initialPaidAmount) || 0))}
                            </div>
                          </div>
                        </div>

                        {/* Payment Status Indicator Tag */}
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[9px] font-black text-slate-950 uppercase tracking-wider">Payment Status Tag:</span>
                          {(() => {
                            const grandTotal = selectedProceduresList.reduce((acc, p) => acc + (p.packageCost !== undefined && !isNaN(p.packageCost) ? Number(p.packageCost) : p.cost * selectedTeeth.length), 0);
                            const paid = Number(initialPaidAmount) || 0;
                            const due = Math.max(0, grandTotal - paid);
                            if (paid >= grandTotal && grandTotal > 0) {
                              return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300">✓ Full Paid</span>;
                            } else if (paid > 0 && due > 0) {
                              return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300">⏳ Partially Paid (Due ₹{due})</span>;
                            } else {
                              return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-950 border border-rose-300">⚠️ Unpaid (Overdue ₹{due})</span>;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Selection & Input */}
                  <div className="space-y-4">
                    
                    {/* 1. Add / Plan Procedure Form (Prominent TOP Section) */}
                    <div className="bg-indigo-50/70 border-2 border-indigo-200 p-4 rounded-2xl space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-indigo-600" /> Procedure & Pricing Form
                        </p>
                        <span className="text-[10px] font-black bg-indigo-600 text-white px-2.5 py-0.5 rounded-full">
                          {selectedTeeth.length} {selectedTeeth.length === 1 ? 'Tooth' : 'Teeth'} Selected
                        </span>
                      </div>

                      {/* Procedure Name */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                          Procedure Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Root Canal Treatment (RCT), Extraction..."
                          value={procedure}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProcedure(val);
                            if (val.toLowerCase().includes('rct') || val.toLowerCase().includes('root canal')) {
                              setShowRctOptions(true);
                            } else {
                              setShowRctOptions(false);
                            }
                            if (!estimatedCost && !totalPackageCost) {
                              const match = mergedPresets.find(p => p.name.toLowerCase() === val.toLowerCase());
                              if (match) {
                                setEstimatedCost(match.defaultCost.toString());
                                setTotalPackageCost((match.defaultCost * selectedTeeth.length).toString());
                              }
                            }
                          }}
                          list="dental-procedure-suggestions"
                          className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                        <datalist id="dental-procedure-suggestions">
                          {mergedPresets.map((proc, idx) => (
                            <option key={idx} value={proc.name} />
                          ))}
                        </datalist>
                      </div>

                      {/* Pricing Section: Overall Total vs Per-Tooth Cost */}
                      <div className="space-y-2 pt-1 border-t border-indigo-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* OVERALL TOTAL PACKAGE PRICE */}
                          <div className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border-2 border-indigo-300 shadow-sm">
                            <label className="text-[10px] font-black text-indigo-900 uppercase tracking-wider flex items-center justify-between">
                              <span>Overall Total Price ({selectedTeeth.length} Teeth)</span>
                              <span className="text-indigo-600 font-bold">₹</span>
                            </label>
                            <input
                              type="number"
                              placeholder={selectedTeeth.length > 1 ? "e.g. 12000" : "Amount"}
                              value={totalPackageCost}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTotalPackageCost(val);
                                const num = Number(val);
                                if (!isNaN(num) && val !== '' && selectedTeeth.length > 0) {
                                  const perTooth = Math.round((num / selectedTeeth.length) * 100) / 100;
                                  setEstimatedCost(perTooth.toString());
                                } else if (val === '') {
                                  setEstimatedCost('');
                                }
                              }}
                              className="border border-indigo-200 bg-indigo-50/30 rounded-lg px-3 py-1.5 text-sm font-black text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-[9px] font-bold text-indigo-600">
                              Write total package price for all {selectedTeeth.length} teeth
                            </span>
                          </div>

                          {/* PER-TOOTH COST */}
                          <div className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border border-slate-200">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                              <span>Per-Tooth Cost</span>
                              <span className="text-slate-400 font-bold">₹</span>
                            </label>
                            <input
                              type="number"
                              placeholder="e.g. 3000"
                              value={estimatedCost}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEstimatedCost(val);
                                const num = Number(val);
                                if (!isNaN(num) && val !== '' && selectedTeeth.length > 0) {
                                  const total = Math.round((num * selectedTeeth.length) * 100) / 100;
                                  setTotalPackageCost(total.toString());
                                } else if (val === '') {
                                  setTotalPackageCost('');
                                }
                              }}
                              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-[9px] font-bold text-slate-400">
                              Calculated per tooth cost
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddProcedureToList}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                        >
                          <Plus className="w-4 h-4" /> Add Procedure to Queue
                        </button>
                      </div>
                    </div>

                    {/* Dedicated RCT Stage / Sub-Options Card */}
                    {showRctOptions && (
                      <div className="bg-gradient-to-r from-indigo-100 via-purple-100 to-indigo-100 border-2 border-indigo-400 p-3.5 rounded-2xl space-y-2 shadow-md animate-fade">
                        <div className="flex justify-between items-center select-none">
                          <span className="text-[10px] font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-700 animate-ping" />
                            Select RCT Sub-Option / Stage:
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowRctOptions(false);
                              if (procedure.toLowerCase().includes('rct') || procedure.toLowerCase().includes('root canal')) {
                                setProcedure('');
                              }
                            }}
                            className="text-[10px] text-slate-950 hover:text-black font-black cursor-pointer bg-white/60 px-2 py-0.5 rounded-lg border border-slate-300 hover:bg-white transition-all active:scale-95"
                          >
                            ✕ Dismiss
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {RCT_SUB_OPTIONS.map((opt) => (
                            <button
                              key={opt.name}
                              type="button"
                              onClick={() => handleSelectRctOption(opt)}
                              className="px-2.5 py-1.5 bg-white hover:bg-indigo-700 text-slate-950 hover:text-white border border-slate-300 hover:border-indigo-700 text-[11px] font-black rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-1 active:scale-95 select-none"
                            >
                              + {opt.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick presets */}
                    <div className="flex flex-col gap-2 bg-slate-50 border border-slate-300 p-3.5 rounded-2xl shadow-sm">
                      <span className="text-[10px] font-black text-slate-950 uppercase tracking-wider select-none">Quick Presets (Tap to prefill procedure & cost):</span>
                      <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {mergedPresets.map((proc) => (
                          <button
                            key={proc.name}
                            type="button"
                            onClick={() => handleQuickProcedureSelect(proc)}
                            className="px-2.5 py-1.5 bg-white hover:bg-indigo-100 border border-slate-300 hover:border-indigo-400 text-slate-950 hover:text-indigo-950 text-[10px] font-black rounded-lg transition-colors cursor-pointer select-none"
                          >
                            + {proc.name.replace(/ Treatment| Placement| Surgery/g, '')} (₹{proc.defaultCost})
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* priority and clinical diagnosis notes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-950 uppercase tracking-widest">
                          Priority
                        </label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="Low" className="font-bold text-slate-950">Low</option>
                          <option value="Medium" className="font-bold text-slate-950">Medium</option>
                          <option value="High" className="font-bold text-slate-950">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-slate-950 uppercase tracking-widest">
                        Clinical Diagnosis Notes (Applies to all selected)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Describe diagnosis details, tooth decay type, composite shade, etc..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 placeholder:text-slate-500 placeholder:font-normal outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white pt-4 pb-1 border-t border-slate-200 mt-4 flex justify-end gap-3 shrink-0 z-10">
                  <button
                    type="button"
                    onClick={() => setIsProcedureModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-300 text-slate-950 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-60 shadow-lg shadow-indigo-600/10 animate-fade cursor-pointer"
                  >
                    {saving ? 'Saving...' : `Plan Procedure for ${selectedTeeth.length} ${selectedTeeth.length === 1 ? 'Tooth' : 'Teeth'}`}
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
