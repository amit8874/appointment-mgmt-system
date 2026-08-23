import React, { useState, useEffect } from 'react';
import {
  Plus, Calendar, AlertTriangle, CheckCircle, Clock,
  Trash2, Edit, Eye, Truck, FileText, X, Shield,
  Smile, User, ArrowRight, Activity, PlusCircle, Paperclip
} from 'lucide-react';
import { dentalLabApi, commonApi } from '../../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { TEETH_DEFS } from './dentalUtils';

const LabWorkTab = ({ patientId, patientData, appointments = [] }) => {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [labs, setLabs] = useState([]);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseDetails, setShowCaseDetails] = useState(false);

  // Form states
  const [savingCase, setSavingCase] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Inline Add Lab State
  const [showAddLabInline, setShowAddLabInline] = useState(false);
  const [newLab, setNewLab] = useState({ name: '', contactPerson: '', phone: '', address: '', notes: '' });
  const [savingLab, setSavingLab] = useState(false);

  const [newCase, setNewCase] = useState({
    patientId: patientId,
    patientName: patientData?.fullName || `${patientData?.firstName || ''} ${patientData?.lastName || ''}`.trim(),
    dentistName: patientData?.assignedDoctor || '',
    toothNumbers: [],
    toothNumbersManual: '',
    toothType: 'PFM',
    toothTypeCustom: '',
    laboratoryId: '',
    laboratoryName: '',
    caseId: '',
    sendingDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    status: 'Draft',
    notes: '',
    instructions: { shade: '', material: '', design: '', occlusion: '' },
    attachments: []
  });

  // Toggles child teeth or adult teeth view in interactive selector
  const [toothChartType, setToothChartType] = useState('adult');

  const fetchPatientCases = async () => {
    try {
      setLoading(true);
      const data = await dentalLabApi.getPatientCases(patientId);
      setCases(data || []);
    } catch (err) {
      console.error('Error fetching patient cases:', err);
      toast.error('Failed to load patient lab work history.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLabs = async () => {
    try {
      const data = await dentalLabApi.getLabs();
      setLabs(data || []);
      if (data.length > 0 && !newCase.laboratoryId) {
        setNewCase(prev => ({
          ...prev,
          laboratoryId: data[0]._id,
          laboratoryName: data[0].name
        }));
      }
    } catch (err) {
      console.error('Error fetching labs:', err);
    }
  };

  useEffect(() => {
    fetchPatientCases();
    fetchLabs();
  }, [patientId]);

  // Set default doctor name on modal open
  useEffect(() => {
    if (patientData) {
      setNewCase(prev => ({
        ...prev,
        patientName: patientData.fullName || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim(),
        dentistName: patientData.assignedDoctor || prev.dentistName
      }));
    }
  }, [patientData]);

  // Handle FDI Tooth Toggle
  const handleToothToggle = (toothId) => {
    setNewCase(prev => {
      const exists = prev.toothNumbers.includes(toothId);
      const updated = exists
        ? prev.toothNumbers.filter(t => t !== toothId)
        : [...prev.toothNumbers, toothId].sort((a, b) => parseInt(a) - parseInt(b));
      return { ...prev, toothNumbers: updated };
    });
  };

  // Handle Quick Status Transition (One-Click actions)
  const handleQuickStatusUpdate = async (caseId, status) => {
    try {
      const updated = await dentalLabApi.updateStatus(caseId, status);
      if (updated) {
        toast.success(`Case status updated to ${status}`);
        fetchPatientCases();
        if (selectedCase && selectedCase._id === caseId) {
          setSelectedCase(updated);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update case status.');
    }
  };

  // Delete Case
  const handleDeleteCase = async (id) => {
    if (window.confirm('Are you sure you want to delete this lab case history? This action is permanent, patient records will not be deleted.')) {
      try {
        await dentalLabApi.deleteCase(id);
        toast.success('Lab case record deleted');
        fetchPatientCases();
        setShowCaseDetails(false);
      } catch (err) {
        console.error('Error deleting case:', err);
        toast.error('Failed to delete case.');
      }
    }
  };

  // Inline Lab Creation
  const handleCreateLabInline = async () => {
    if (!newLab.name.trim()) {
      toast.error('Laboratory name is required');
      return;
    }

    setSavingLab(true);
    try {
      const created = await dentalLabApi.createLab(newLab);
      if (created) {
        toast.success('New Laboratory registered!');
        // Refresh lab list and select the newly created one
        const data = await dentalLabApi.getLabs();
        setLabs(data || []);
        setNewCase(prev => ({
          ...prev,
          laboratoryId: created._id,
          laboratoryName: created.name
        }));
        setShowAddLabInline(false);
        setNewLab({ name: '', contactPerson: '', phone: '', address: '', notes: '' });
      }
    } catch (err) {
      console.error('Error creating inline lab:', err);
      toast.error('Failed to save laboratory.');
    } finally {
      setSavingLab(false);
    }
  };

  // File Upload Attachment handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('folderType', 'lab-cases');

    setUploading(true);
    try {
      const res = await commonApi.uploadImage(formData);
      if (res?.imageUrl) {
        setNewCase(prev => ({
          ...prev,
          attachments: [...prev.attachments, { filename: file.name, url: res.imageUrl }]
        }));
        toast.success('File uploaded successfully!');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  // Remove uploaded attachment
  const handleRemoveAttachment = (idx) => {
    setNewCase(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== idx)
    }));
  };

  // Create Lab Case submit
  const handleCreateCaseSubmit = async (e) => {
    e.preventDefault();

    // Tooth Numbers calculation (from visual selector + manual entry split)
    let finalTeeth = [...newCase.toothNumbers];
    if (newCase.toothNumbersManual.trim()) {
      const manualTeeth = newCase.toothNumbersManual.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
      finalTeeth = [...new Set([...finalTeeth, ...manualTeeth])];
    }

    if (finalTeeth.length === 0) {
      toast.error('Please select at least one tooth or enter manual tooth numbers.');
      return;
    }

    if (!newCase.laboratoryId) {
      toast.error('Please select a Dental Laboratory.');
      return;
    }

    if (!newCase.caseId.trim()) {
      toast.error('Laboratory Case ID / reference is required.');
      return;
    }

    setSavingCase(true);
    try {
      const selectedLabObj = labs.find(l => l._id === newCase.laboratoryId);
      const payload = {
        ...newCase,
        toothNumbers: finalTeeth,
        laboratoryName: selectedLabObj?.name || newCase.laboratoryName
      };

      const res = await dentalLabApi.createCase(payload);
      if (res) {
        toast.success('Dental Lab Case logged successfully!');
        fetchPatientCases();
        setShowNewCaseModal(false);
        // Reset Form
        setNewCase({
          patientId: patientId,
          patientName: patientData?.fullName || `${patientData?.firstName || ''} ${patientData?.lastName || ''}`.trim(),
          dentistName: patientData?.assignedDoctor || '',
          toothNumbers: [],
          toothNumbersManual: '',
          toothType: 'PFM',
          toothTypeCustom: '',
          laboratoryId: labs[0]?._id || '',
          laboratoryName: labs[0]?.name || '',
          caseId: '',
          sendingDate: new Date().toISOString().split('T')[0],
          expectedReturnDate: '',
          status: 'Draft',
          notes: '',
          instructions: { shade: '', material: '', design: '', occlusion: '' },
          attachments: []
        });
      }
    } catch (err) {
      console.error('Error creating case:', err);
      toast.error('Failed to create dental lab case.');
    } finally {
      setSavingCase(false);
    }
  };

  const statusColors = {
    'Draft': 'bg-slate-100 text-slate-700 border-slate-200',
    'Sent to Lab': 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    'Received': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Delivered': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Cancelled': 'bg-rose-50 text-rose-700 border-rose-200'
  };

  // FDI Quadrant Tooth rendering definitions
  const upperRightTeeth = TEETH_DEFS.filter(t => t.quadrant === 'UR' && !t.primary);
  const upperLeftTeeth = TEETH_DEFS.filter(t => t.quadrant === 'UL' && !t.primary);
  const lowerLeftTeeth = TEETH_DEFS.filter(t => t.quadrant === 'LL' && !t.primary);
  const lowerRightTeeth = TEETH_DEFS.filter(t => t.quadrant === 'LR' && !t.primary);

  const primaryUpperRightTeeth = TEETH_DEFS.filter(t => t.quadrant === 'UR' && t.primary);
  const primaryUpperLeftTeeth = TEETH_DEFS.filter(t => t.quadrant === 'UL' && t.primary);
  const primaryLowerLeftTeeth = TEETH_DEFS.filter(t => t.quadrant === 'LL' && t.primary);
  const primaryLowerRightTeeth = TEETH_DEFS.filter(t => t.quadrant === 'LR' && t.primary);

  return (
    <div className="p-6 bg-white border border-slate-100 rounded-b-3xl mt-4 shadow-sm space-y-6">

      {/* Tab Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600 animate-pulse" /> Lab Cases History / Tracking
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Log external laboratory prescriptions and track custom crowns, bridges, and prostheses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewCaseModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl tracking-wider shadow-md shadow-indigo-600/10 flex items-center gap-1.5 transition-all cursor-pointer w-fit"
        >
          <Plus className="w-3.5 h-3.5" /> New Lab Case
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-xs font-bold text-slate-400 animate-pulse">Loading case logs...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
          <Truck className="w-12 h-12 mb-3 text-indigo-500 opacity-30" />
          <p className="text-sm font-black uppercase tracking-wider text-slate-600">No Lab Cases Logged</p>
          <p className="text-xs mt-1">This patient has no active or past laboratory fabrication cases.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cases.map((item) => (
            <div
              key={item._id}
              className="bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-gray-700 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-900 border border-slate-200/40 dark:border-gray-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">
                      Ref: {item.caseId}
                    </span>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mt-1.5">{item.laboratoryName}</h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${statusColors[item.status] || 'bg-slate-50'}`}>
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-4">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block tracking-wider font-bold mb-0.5">Teeth numbers</span>
                    <span className="text-slate-800 dark:text-white font-black">{item.toothNumbers?.join(', ') || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block tracking-wider font-bold mb-0.5">Prosthesis type</span>
                    <span className="text-slate-800 dark:text-white font-black">{item.toothType === 'Other' ? item.toothTypeCustom : item.toothType}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold mb-0.5">Sent Date</span>
                    <span>{format(new Date(item.sendingDate), 'dd MMM yyyy')}</span>
                  </div>
                  {item.expectedReturnDate && (
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold mb-0.5">Expected Return</span>
                      <span className={item.status !== 'Received' && item.status !== 'Delivered' && new Date(item.expectedReturnDate) < new Date() ? 'text-rose-500 font-bold' : ''}>
                        {format(new Date(item.expectedReturnDate), 'dd MMM yyyy')}
                      </span>
                    </div>
                  )}
                  {item.receivedDate && (
                    <div className="col-span-2">
                      <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold mb-0.5 text-emerald-600 dark:text-emerald-500">Received Date</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">{format(new Date(item.receivedDate), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                </div>

                {item.instructions && Object.values(item.instructions).some(v => v) && (
                  <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/30 rounded-xl mb-4 text-[11px] space-y-1">
                    {item.instructions.shade && <p><strong>Shade:</strong> {item.instructions.shade}</p>}
                    {item.instructions.material && <p><strong>Material:</strong> {item.instructions.material}</p>}
                    {item.instructions.design && <p><strong>Design:</strong> {item.instructions.design}</p>}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 border-t border-slate-100 dark:border-gray-700 pt-3 mt-3">
                <button
                  type="button"
                  onClick={() => { setSelectedCase(item); setShowCaseDetails(true); }}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border border-slate-200/50 flex-1 flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> View Case
                </button>

                {item.status !== 'Received' && item.status !== 'Delivered' && (
                  <button
                    type="button"
                    onClick={() => handleQuickStatusUpdate(item._id, 'Received')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border border-emerald-200 flex-1 flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Received
                  </button>
                )}

                {item.status === 'Received' && (
                  <button
                    type="button"
                    onClick={() => handleQuickStatusUpdate(item._id, 'Delivered')}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border border-indigo-200 flex-1 flex items-center justify-center gap-1"
                  >
                    <Truck className="w-3.5 h-3.5" /> Deliver
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ==========================================
      // MODAL: LOG NEW DENTAL LAB CASE
      // ========================================== */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl border border-slate-200/50 dark:border-gray-700 overflow-hidden animate-fade">
            <div className="bg-indigo-600 py-3 px-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">New Dental Lab Work Case</h3>
                <p className="text-xs opacity-80 font-medium">Record patient scans/models sent to laboratory.</p>
              </div>
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCaseSubmit} className="px-6 py-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

                {/* Left Column: Interactive FDI Tooth selector */}
                <div className="space-y-3">

                  {/* Visual Teeth Selector Card - SKY Pastel */}
                  <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/50 p-3 rounded-2xl space-y-3">
                    <span className="text-[10px] font-black text-sky-950 dark:text-sky-300 uppercase tracking-widest block">
                      FDI Teeth Selector (Click to select/deselect):
                    </span>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-sky-900 dark:text-sky-400 uppercase">Teeth Notation</span>
                      <div className="flex bg-sky-200/60 dark:bg-sky-900/40 p-0.5 rounded-lg w-fit">
                        <button
                          type="button"
                          onClick={() => setToothChartType('adult')}
                          className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all select-none ${toothChartType === 'adult' ? 'bg-white dark:bg-gray-800 text-sky-950 shadow-sm' : 'text-sky-850 dark:text-sky-400'
                            }`}
                        >
                          Adult
                        </button>
                        <button
                          type="button"
                          onClick={() => setToothChartType('child')}
                          className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all select-none ${toothChartType === 'child' ? 'bg-white dark:bg-gray-800 text-sky-950 shadow-sm' : 'text-sky-850 dark:text-sky-400'
                            }`}
                        >
                          Child
                        </button>
                      </div>
                    </div>

                    {/* Interactive Teeth Layout Grid */}
                    <div className="bg-white/60 dark:bg-gray-900/40 p-2.5 border border-sky-150 dark:border-sky-800/40 rounded-xl space-y-3.5">
                      {/* Upper Arch */}
                      <div>
                        <p className="text-[9px] font-black text-sky-950 dark:text-sky-300 uppercase text-center mb-2">Upper Arch</p>
                        <div className="flex justify-center gap-1 flex-wrap">
                          {toothChartType === 'adult' ? (
                            <>
                              {upperRightTeeth.map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleToothToggle(t.id)}
                                  className={`w-7 h-8 border rounded text-[10px] font-black flex items-center justify-center transition-all ${newCase.toothNumbers.includes(t.id)
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-800 border-sky-300 text-sky-950 dark:text-sky-300 hover:bg-sky-100/50'
                                    }`}
                                >
                                  {t.fdi}
                                </button>
                              ))}
                              <div className="w-[1px] h-6 bg-sky-300 self-center mx-1 shrink-0" />
                              {upperLeftTeeth.map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleToothToggle(t.id)}
                                  className={`w-7 h-8 border rounded text-[10px] font-black flex items-center justify-center transition-all ${newCase.toothNumbers.includes(t.id)
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-800 border-sky-300 text-sky-950 dark:text-sky-300 hover:bg-sky-100/50'
                                    }`}
                                >
                                  {t.fdi}
                                </button>
                              ))}
                            </>
                          ) : (
                            <>
                              {primaryUpperRightTeeth.map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleToothToggle(t.id)}
                                  className={`w-7 h-8 border rounded text-[10px] font-black flex items-center justify-center transition-all ${newCase.toothNumbers.includes(t.id)
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-800 border-sky-300 text-sky-950 dark:text-sky-300 hover:bg-sky-100/50'
                                    }`}
                                >
                                  {t.fdi}
                                </button>
                              ))}
                              <div className="w-[1px] h-6 bg-sky-300 self-center mx-1 shrink-0" />
                              {primaryUpperLeftTeeth.map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleToothToggle(t.id)}
                                  className={`w-7 h-8 border rounded text-[10px] font-black flex items-center justify-center transition-all ${newCase.toothNumbers.includes(t.id)
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-800 border-sky-300 text-sky-950 dark:text-sky-300 hover:bg-sky-100/50'
                                    }`}
                                >
                                  {t.fdi}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Lower Arch */}
                      <div>
                        <div className="flex justify-center gap-1 flex-wrap mb-2">
                          {toothChartType === 'adult' ? (
                            <>
                              {lowerRightTeeth.map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleToothToggle(t.id)}
                                  className={`w-7 h-8 border rounded text-[10px] font-black flex items-center justify-center transition-all ${newCase.toothNumbers.includes(t.id)
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-800 border-sky-300 text-sky-950 dark:text-sky-300 hover:bg-sky-100/50'
                                    }`}
                                >
                                  {t.fdi}
                                </button>
                              ))}
                              <div className="w-[1px] h-6 bg-sky-300 self-center mx-1 shrink-0" />
                              {lowerLeftTeeth.map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleToothToggle(t.id)}
                                  className={`w-7 h-8 border rounded text-[10px] font-black flex items-center justify-center transition-all ${newCase.toothNumbers.includes(t.id)
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-800 border-sky-300 text-sky-950 dark:text-sky-300 hover:bg-sky-100/50'
                                    }`}
                                >
                                  {t.fdi}
                                </button>
                              ))}
                            </>
                          ) : (
                            <>
                              {primaryLowerRightTeeth.map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleToothToggle(t.id)}
                                  className={`w-7 h-8 border rounded text-[10px] font-black flex items-center justify-center transition-all ${newCase.toothNumbers.includes(t.id)
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-800 border-sky-300 text-sky-950 dark:text-sky-300 hover:bg-sky-100/50'
                                    }`}
                                >
                                  {t.fdi}
                                </button>
                              ))}
                              <div className="w-[1px] h-6 bg-sky-300 self-center mx-1 shrink-0" />
                              {primaryLowerLeftTeeth.map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleToothToggle(t.id)}
                                  className={`w-7 h-8 border rounded text-[10px] font-black flex items-center justify-center transition-all ${newCase.toothNumbers.includes(t.id)
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-800 border-sky-300 text-sky-950 dark:text-sky-300 hover:bg-sky-100/50'
                                    }`}
                                >
                                  {t.fdi}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                        <p className="text-[9px] font-black text-sky-950 dark:text-sky-300 uppercase text-center">Lower Arch</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-sky-950 dark:text-sky-350 uppercase tracking-widest">Selected Teeth</label>
                        <input
                          type="text"
                          readOnly
                          placeholder="Select teeth above"
                          value={newCase.toothNumbers.join(', ')}
                          className="border border-sky-300 rounded-xl px-4 py-2 text-xs font-black text-sky-950 dark:text-sky-100 bg-sky-100/20 cursor-not-allowed outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-sky-950 dark:text-sky-350 uppercase tracking-widest">Manual Entry Fallback</label>
                        <input
                          type="text"
                          placeholder="e.g. 16, 26"
                          value={newCase.toothNumbersManual}
                          onChange={(e) => setNewCase({ ...newCase, toothNumbersManual: e.target.value })}
                          className="border border-sky-300 rounded-xl px-4 py-2 text-xs font-black text-sky-950 dark:text-sky-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clinical Prescription Instructions - VIOLET Pastel */}
                  <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/50 p-3 rounded-2xl space-y-2">
                    <p className="text-[10px] font-black text-violet-950 dark:text-violet-300 uppercase tracking-widest">Clinical Prescription Instructions:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-violet-900 dark:text-violet-400 uppercase tracking-widest">Shade (e.g. A1, B2)</label>
                        <input
                          type="text"
                          placeholder="Shade"
                          value={newCase.instructions.shade}
                          onChange={(e) => setNewCase({
                            ...newCase,
                            instructions: { ...newCase.instructions, shade: e.target.value }
                          })}
                          className="border border-violet-300 rounded-xl px-3 py-1.5 text-xs font-black text-violet-950 dark:text-violet-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-violet-900 dark:text-violet-400 uppercase tracking-widest">Material</label>
                        <input
                          type="text"
                          placeholder="e.g. Porcelain, Zirconia"
                          value={newCase.instructions.material}
                          onChange={(e) => setNewCase({
                            ...newCase,
                            instructions: { ...newCase.instructions, material: e.target.value }
                          })}
                          className="border border-violet-300 rounded-xl px-3 py-1.5 text-xs font-black text-violet-950 dark:text-violet-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-violet-900 dark:text-violet-400 uppercase tracking-widest">Design</label>
                        <input
                          type="text"
                          placeholder="e.g. Full Crown, Inlay"
                          value={newCase.instructions.design}
                          onChange={(e) => setNewCase({
                            ...newCase,
                            instructions: { ...newCase.instructions, design: e.target.value }
                          })}
                          className="border border-violet-300 rounded-xl px-3 py-1.5 text-xs font-black text-violet-950 dark:text-violet-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-violet-900 dark:text-violet-400 uppercase tracking-widest">Occlusion</label>
                        <input
                          type="text"
                          placeholder="e.g. Normal, High"
                          value={newCase.instructions.occlusion}
                          onChange={(e) => setNewCase({
                            ...newCase,
                            instructions: { ...newCase.instructions, occlusion: e.target.value }
                          })}
                          className="border border-violet-300 rounded-xl px-3 py-1.5 text-xs font-black text-violet-950 dark:text-violet-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Lab partners, Case Ref, Dates */}
                <div className="space-y-3">

                  {/* Basic Details - INDIGO Pastel */}
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 p-3.5 rounded-2xl space-y-3">
                    <p className="text-[10px] font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-widest">Patient & Doctor Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest">Patient Name</label>
                        <input
                          type="text"
                          readOnly
                          value={newCase.patientName}
                          className="border border-indigo-200 rounded-xl px-4 py-2 text-xs font-black text-indigo-950 dark:text-indigo-200 bg-indigo-100/30 cursor-not-allowed outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest">Dentist Name</label>
                        <input
                          type="text"
                          placeholder="Dentist In charge"
                          value={newCase.dentistName}
                          onChange={(e) => setNewCase({ ...newCase, dentistName: e.target.value })}
                          className="border border-indigo-300 rounded-xl px-4 py-2 text-xs font-black text-indigo-950 dark:text-indigo-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dental Laboratory & Prosthesis - EMERALD Pastel */}
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-3.5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-widest">Select Dental Lab Partner *</label>
                      <button
                        type="button"
                        onClick={() => setShowAddLabInline(!showAddLabInline)}
                        className="text-[10px] text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-wider flex items-center gap-0.5 hover:underline cursor-pointer"
                      >
                        {showAddLabInline ? '✕ Hide Form' : '+ Add New Lab'}
                      </button>
                    </div>

                    {showAddLabInline ? (
                      /* Inline Add Laboratory Form */
                      <div className="p-3 bg-emerald-100/20 dark:bg-emerald-950/40 border border-emerald-200/80 rounded-xl space-y-3">
                        <p className="text-[9px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">Register Laboratory details on-the-fly:</p>

                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Lab Name *"
                            value={newLab.name}
                            onChange={(e) => setNewLab({ ...newLab, name: e.target.value })}
                            className="border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-black text-emerald-950 dark:text-emerald-100 bg-white dark:bg-gray-900 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Contact Person"
                            value={newLab.contactPerson}
                            onChange={(e) => setNewLab({ ...newLab, contactPerson: e.target.value })}
                            className="border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-black text-emerald-950 dark:text-emerald-100 bg-white dark:bg-gray-900 outline-none"
                          />
                          <input
                            type="tel"
                            placeholder="Phone Number"
                            value={newLab.phone}
                            onChange={(e) => setNewLab({ ...newLab, phone: e.target.value })}
                            className="border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-black text-emerald-950 dark:text-emerald-100 bg-white dark:bg-gray-900 outline-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCreateLabInline}
                            disabled={savingLab}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg tracking-wider disabled:opacity-60 cursor-pointer"
                          >
                            {savingLab ? 'Saving...' : 'Register Lab'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddLabInline(false)}
                            className="px-3 py-1.5 border border-emerald-350 text-emerald-600 text-[10px] font-black uppercase rounded-lg tracking-wider hover:bg-emerald-100/50 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Standard Dropdown */
                      <select
                        value={newCase.laboratoryId}
                        onChange={(e) => {
                          const selectedLab = labs.find(l => l._id === e.target.value);
                          setNewCase(prev => ({
                            ...prev,
                            laboratoryId: e.target.value,
                            laboratoryName: selectedLab?.name || ''
                          }));
                        }}
                        className="border border-emerald-300 rounded-xl px-3 py-2 text-xs font-black text-emerald-950 dark:text-emerald-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                      >
                        {labs.length === 0 ? (
                          <option value="">-- No laboratories registered --</option>
                        ) : (
                          labs.map(l => <option key={l._id} value={l._id}>{l.name}</option>)
                        )}
                      </select>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {/* Tooth Type / Prosthesis type */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-emerald-900 dark:text-emerald-450 uppercase tracking-widest">Prosthesis Type *</label>
                        <select
                          value={newCase.toothType}
                          onChange={(e) => setNewCase({ ...newCase, toothType: e.target.value })}
                          className="border border-emerald-300 rounded-xl px-3 py-2 text-xs font-black text-emerald-950 dark:text-emerald-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                        >
                          {['PFM', 'DMLS', 'Zirconia', 'RPD', 'CD', 'Crown', 'Bridge', 'Other'].map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      {/* Case ID / Lab Ref number */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-emerald-900 dark:text-emerald-455 uppercase tracking-widest">Lab Case ID / Reference *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. SG2, A8874"
                          value={newCase.caseId}
                          onChange={(e) => setNewCase({ ...newCase, caseId: e.target.value })}
                          className="border border-emerald-300 rounded-xl px-4 py-2 text-xs font-black text-emerald-950 dark:text-emerald-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {newCase.toothType === 'Other' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-emerald-900 dark:text-emerald-455 uppercase tracking-widest">Specify Prosthesis Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Implant Abutment"
                          value={newCase.toothTypeCustom}
                          onChange={(e) => setNewCase({ ...newCase, toothTypeCustom: e.target.value })}
                          className="border border-emerald-300 rounded-xl px-4 py-2 text-xs font-black text-emerald-950 dark:text-emerald-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Dates - AMBER Pastel */}
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-850/60 p-3.5 rounded-2xl space-y-3">
                    <p className="text-[10px] font-black text-amber-950 dark:text-amber-300 uppercase tracking-widest">Scheduling Dates</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-amber-900 dark:text-amber-450 uppercase tracking-widest">Sending Date</label>
                        <input
                          type="date"
                          required
                          value={newCase.sendingDate}
                          onChange={(e) => setNewCase({ ...newCase, sendingDate: e.target.value })}
                          className="border border-amber-300 rounded-xl px-4 py-2 text-xs font-black text-amber-950 dark:text-amber-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-amber-900 dark:text-amber-450 uppercase tracking-widest">Expected Return Date</label>
                        <input
                          type="date"
                          value={newCase.expectedReturnDate}
                          onChange={(e) => setNewCase({ ...newCase, expectedReturnDate: e.target.value })}
                          className="border border-amber-300 rounded-xl px-4 py-2 text-xs font-black text-amber-950 dark:text-amber-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes & Attachments - ROSE Pastel */}
                  <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 p-3.5 rounded-2xl space-y-3">
                    <p className="text-[10px] font-black text-rose-950 dark:text-rose-300 uppercase tracking-widest">Special Notes & Documents</p>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-rose-900 dark:text-rose-450 uppercase tracking-widest">Case Fabrication Instructions / Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Occlusion details, margins, dentist message..."
                        value={newCase.notes}
                        onChange={(e) => setNewCase({ ...newCase, notes: e.target.value })}
                        className="border border-rose-350 rounded-xl px-4 py-2 text-xs font-black text-rose-950 dark:text-rose-100 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                      />
                    </div>

                    {/* File Attachment */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-rose-900 dark:text-rose-450 uppercase tracking-widest">Attachments (Optional)</label>
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <label className="px-4 py-2 border border-dashed border-rose-400 hover:bg-rose-100/50 text-rose-850 dark:text-rose-400 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 bg-white dark:bg-slate-800 shadow-sm select-none">
                          <Paperclip className="w-3.5 h-3.5" />
                          {uploading ? 'Uploading...' : 'Upload File'}
                          <input
                            type="file"
                            disabled={uploading}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="image/*,application/pdf"
                          />
                        </label>
                        <span className="text-[10px] text-rose-900/80 dark:text-rose-350 font-bold leading-tight">
                          Upload prescriptions, shade photos, or scans.
                        </span>
                      </div>

                      {/* Render attachments */}
                      {newCase.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 select-none">
                          {newCase.attachments.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-900 border border-rose-200 dark:border-gray-700 rounded-lg text-xs font-black text-rose-950 dark:text-rose-200 uppercase tracking-tight"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="truncate max-w-[120px]">{file.filename}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(idx)}
                                className="text-rose-400 hover:text-rose-700 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-gray-700 mt-3">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCase}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-60 shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  {savingCase ? 'Logging Case...' : 'Submit Lab Case'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==========================================
      // MODAL: DENTAL LAB CASE DETAILS TIMELINE (patient tab view)
      // ========================================== */}
      {showCaseDetails && selectedCase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/50 dark:border-gray-700 animate-fade">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight">Lab Work Details</h3>
                <p className="text-xs opacity-80 font-medium">Lab ID: {selectedCase.caseId} (Partner: {selectedCase.laboratoryName})</p>
              </div>
              <button
                onClick={() => setShowCaseDetails(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

              {/* Status Timeline */}
              <div className="bg-slate-50 dark:bg-gray-900 p-5 rounded-2xl border border-slate-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Case Status Lifecycle (Click to switch status):</p>
                <div className="flex justify-between flex-wrap gap-2">
                  {['Draft', 'Sent to Lab', 'In Progress', 'Received', 'Delivered'].map((step) => {
                    const steps = ['Draft', 'Sent to Lab', 'In Progress', 'Received', 'Delivered'];
                    const currentIdx = steps.indexOf(selectedCase.status);
                    const isActive = steps.indexOf(step) <= currentIdx;
                    const isCurrent = selectedCase.status === step;

                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => handleQuickStatusUpdate(selectedCase._id, step)}
                        className={`flex-1 min-w-[70px] text-center py-2 px-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${isCurrent
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                          : isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-850 text-indigo-600 dark:text-indigo-400'
                            : 'bg-white dark:bg-gray-850 border-slate-200 dark:border-gray-700 text-slate-450 dark:text-slate-500'
                          }`}
                      >
                        {step}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data list */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs font-semibold">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Patient Name</span>
                  <span className="text-slate-800 dark:text-white uppercase font-black">{selectedCase.patientName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Dentist In charge</span>
                  <span>Dr. {selectedCase.dentistName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Tooth Numbers (FDI)</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-gray-900 border border-slate-200/50 dark:border-gray-800 rounded font-black text-slate-850 dark:text-slate-200 w-fit block mt-0.5">
                    {selectedCase.toothNumbers?.join(', ') || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Prosthesis Details</span>
                  <span className="text-slate-800 dark:text-white uppercase font-black">
                    {selectedCase.toothType === 'Other' ? selectedCase.toothTypeCustom : selectedCase.toothType}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Lab Partner</span>
                  <span className="text-slate-805 dark:text-slate-250 uppercase font-black">{selectedCase.laboratoryName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Case ID</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedCase.caseId}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Sending Date</span>
                  <span>{format(new Date(selectedCase.sendingDate), 'dd MMMM yyyy')}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Expected Return Date</span>
                  <span>
                    {selectedCase.expectedReturnDate ? format(new Date(selectedCase.expectedReturnDate), 'dd MMMM yyyy') : 'No Expected Return Date'}
                  </span>
                </div>
                {selectedCase.receivedDate && (
                  <div className="col-span-2">
                    <span className="text-[9px] text-slate-400 block uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Received Date</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{format(new Date(selectedCase.receivedDate), 'dd MMMM yyyy')}</span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {selectedCase.instructions && Object.values(selectedCase.instructions).some(v => v) && (
                <div className="bg-indigo-50/20 dark:bg-indigo-950/10 p-4 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl text-xs font-semibold">
                  <p className="text-[9px] font-black text-indigo-900/60 dark:text-indigo-400 uppercase tracking-widest mb-3">Lab Prescription Instructions:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedCase.instructions.shade && <p><span className="text-slate-400 text-[10px] block">Shade</span> {selectedCase.instructions.shade}</p>}
                    {selectedCase.instructions.material && <p><span className="text-slate-400 text-[10px] block">Material</span> {selectedCase.instructions.material}</p>}
                    {selectedCase.instructions.design && <p><span className="text-slate-400 text-[10px] block">Design</span> {selectedCase.instructions.design}</p>}
                    {selectedCase.instructions.occlusion && <p><span className="text-slate-400 text-[10px] block">Occlusion</span> {selectedCase.instructions.occlusion}</p>}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCase.notes && (
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold mb-1.5">Additional Notes</span>
                  <div className="bg-slate-50 dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-800 text-xs font-medium text-slate-650 dark:text-slate-400 leading-relaxed italic">
                    "{selectedCase.notes}"
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedCase.attachments && selectedCase.attachments.length > 0 && (
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold mb-2">Attachments</span>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedCase.attachments.map((file, i) => (
                      <a
                        key={i}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center justify-center p-3 border border-slate-200 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-900 text-center transition-colors select-none"
                      >
                        <FileText className="w-6 h-6 text-indigo-500 mb-1" />
                        <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 truncate w-full uppercase">{file.filename || `File ${i + 1}`}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="bg-slate-50 dark:bg-gray-900/60 border-t border-slate-100 dark:border-gray-700 px-6 py-4 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDeleteCase(selectedCase._id)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border border-rose-100"
              >
                Delete Log
              </button>

              <button
                type="button"
                onClick={() => setShowCaseDetails(false)}
                className="px-5 py-2.5 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LabWorkTab;
