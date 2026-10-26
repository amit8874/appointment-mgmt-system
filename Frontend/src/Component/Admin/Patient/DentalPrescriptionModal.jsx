import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  Printer, 
  Calendar, 
  User, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  ClipboardCheck, 
  Smile, 
  Sparkles, 
  AlertCircle,
  FileText,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Activity,
  Star
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format, addDays } from 'date-fns';
import { useAuth } from '../../../context/AuthContext';
import { medicalRecordApi, appointmentApi, patientApi } from '../../../services/api';
import { getUpperArchTeeth, getLowerArchTeeth, getToothDisplayName, getToothLabel } from './dentalUtils';
import DentalMedicineAutocomplete, { CLINIC_PAD_MEDICINES, saveDoctorCustomMedicine } from './DentalMedicineAutocomplete';
import RealisticDentalOdontogram from './RealisticDentalOdontogram';

// Common dental medicines presets
const COMMON_DENTAL_MEDS = [
  { name: 'Amoxicillin 500mg', form: 'Cap', dose: '1 Cap', frequency: '1-0-1', duration: '5 days', instructions: 'After Food' },
  { name: 'Augmentin 625mg', form: 'Tab', dose: '1 Tab', frequency: '1-0-1', duration: '5 days', instructions: 'After Food' },
  { name: 'Metrogyl 400mg', form: 'Tab', dose: '1 Tab', frequency: '1-0-1', duration: '5 days', instructions: 'After Food' },
  { name: 'Zerodol-SP', form: 'Tab', dose: '1 Tab', frequency: '1-0-1', duration: '3 days', instructions: 'After Food' },
  { name: 'Ketorolac DT 10mg', form: 'Tab', dose: '1 Tab', frequency: 'SOS', duration: '3 days', instructions: 'Dissolve in water, after food' },
  { name: 'Pan-D', form: 'Cap', dose: '1 Cap', frequency: '1-0-0', duration: '5 days', instructions: 'Before Food (Empty Stomach)' },
  { name: 'Chlorhexidine 0.2% Mouthwash', form: 'Mouthwash', dose: '10 ml', frequency: '1-0-1', duration: '7 days', instructions: 'Rinse for 1 min, do not eat/drink for 30 mins' },
  { name: 'Choline Salicylate Gel', form: 'Gel', dose: 'Pea-size', frequency: '1-1-1', duration: '5 days', instructions: 'Apply locally over ulcer/painful area' }
];

const DentalPrescriptionModal = ({
  isOpen,
  onClose,
  patient,
  onSaveSuccess,
  editData = null,
  onSwitchToGeneral = null,
  onPrintDirect = null
}) => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // Section 1: Patient Information
  const [patientName, setPatientName] = useState('');
  const [patientIdDisplay, setPatientIdDisplay] = useState('');
  const [ageSex, setAgeSex] = useState('');
  const [examinationDate, setExaminationDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Section 2: Chief Complaint and History
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [duration, setDuration] = useState('');
  const [medicalDentalHistory, setMedicalDentalHistory] = useState('');

  // Section 3: Oral Examination findings (Text Bar + Recommendations)
  const [oralExamText, setOralExamText] = useState('');

  // Section 4: Interactive Tooth Selection (Odontogram with Multi-Teeth & Procedure Prompts)
  const [selectedTeeth, setSelectedTeeth] = useState([]); // array of { toothId, procedure, condition, notes }
  const [activeSelectedTeethIds, setActiveSelectedTeethIds] = useState([]); // tooth IDs currently clicked/selected
  const [toothProcedureText, setToothProcedureText] = useState('Full mouth cleaning');
  const [toothProcedureNotes, setToothProcedureNotes] = useState('');

  // Section 5: Diagnosis and Treatment Plan
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlanned, setTreatmentPlanned] = useState('');
  const [treatmentPerformedToday, setTreatmentPerformedToday] = useState('');

  // Section 6: Prescription and Follow-up
  const [medications, setMedications] = useState([
    { name: '', form: 'Tab', dose: '1 Tab', when: 'After Food', frequency: '', duration: '5 days', instructions: '' }
  ]);
  const [advice, setAdvice] = useState('');
  const [nextAppointmentDate, setNextAppointmentDate] = useState('');
  const [nextAppointmentNotes, setNextAppointmentNotes] = useState('');
  const [customFooterText, setCustomFooterText] = useState('');

  // Prepopulate patient information on load
  useEffect(() => {
    if (patient) {
      setPatientName(patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || '');
      setPatientIdDisplay(patient.patientId || patient._id || 'From Oviaan');
      const age = patient.age ? `${patient.age} Y` : '';
      const gender = patient.gender || patient.sex || '';
      setAgeSex([age, gender].filter(Boolean).join(' / '));
    }
  }, [patient]);

  // Load existing editData if editing
  useEffect(() => {
    if (editData) {
      try {
        let parsed = null;
        if (typeof editData.description === 'string' && editData.description.trim().startsWith('{')) {
          parsed = JSON.parse(editData.description);
        } else if (typeof editData.notes === 'string' && editData.notes.trim().startsWith('{')) {
          parsed = JSON.parse(editData.notes);
        } else if (editData.parsedData) {
          parsed = editData.parsedData;
        }

        if (parsed) {
          if (parsed.chiefComplaint) setChiefComplaint(parsed.chiefComplaint);
          else if (parsed.complaints?.length) {
            setChiefComplaint(parsed.complaints.map(c => typeof c === 'string' ? c : c.name).join(', '));
            if (parsed.complaints[0]?.duration) setDuration(parsed.complaints[0].duration);
          }
          if (parsed.complaintDuration) setDuration(parsed.complaintDuration);
          if (parsed.duration) setDuration(parsed.duration);
          if (parsed.medicalDentalHistory) setMedicalDentalHistory(parsed.medicalDentalHistory);
          if (parsed.oralExamination) {
            if (typeof parsed.oralExamination === 'string') {
              setOralExamText(parsed.oralExamination);
            } else if (typeof parsed.oralExamination === 'object') {
              const items = [];
              Object.entries(parsed.oralExamination).forEach(([k, v]) => {
                if (v && (v.active || typeof v === 'string')) {
                  const label = k === 'stains' ? 'Stains' : k === 'calculus' ? 'Calculus' : k === 'decayedTeeth' ? 'Decayed teeth' : k === 'grosslyDecayedTeeth' ? 'Grossly decayed teeth' : k === 'mobileTeeth' ? 'Mobile teeth' : k === 'top' ? 'Tenderness on percussion (TOP)' : k;
                  const sev = v.severity ? ` (${v.severity})` : '';
                  const notes = v.notes ? `: ${v.notes}` : '';
                  items.push(`${label}${sev}${notes}`);
                }
              });
              setOralExamText(items.join(', '));
            }
          }
          if (parsed.selectedTeeth) setSelectedTeeth(parsed.selectedTeeth);
          if (parsed.diagnosis?.length) {
            setDiagnosis(parsed.diagnosis.map(d => typeof d === 'string' ? d : d.name).join(', '));
          } else if (typeof parsed.diagnosis === 'string') {
            setDiagnosis(parsed.diagnosis);
          }
          if (parsed.treatmentPlanned) setTreatmentPlanned(parsed.treatmentPlanned);
          else if (parsed.treatmentPlans?.length) {
            setTreatmentPlanned(parsed.treatmentPlans.map(t => typeof t === 'string' ? t : (t.procedure || t.name)).join(', '));
          } else if (parsed.dentalTreatments?.length) {
            setTreatmentPlanned(parsed.dentalTreatments.map(t => typeof t === 'string' ? t : (t.procedure || t.name)).join(', '));
          }
          if (parsed.treatmentPerformedToday) setTreatmentPerformedToday(parsed.treatmentPerformedToday);
          if (parsed.medications?.length) setMedications(parsed.medications);
          if (parsed.advice) setAdvice(parsed.advice);
          if (parsed.nextAppointmentDate) setNextAppointmentDate(parsed.nextAppointmentDate);
          if (parsed.nextAppointmentNotes) setNextAppointmentNotes(parsed.nextAppointmentNotes);
          if (parsed.examinationDate) setExaminationDate(parsed.examinationDate);
          if (parsed.customFooterText || parsed.footerText) setCustomFooterText(parsed.customFooterText || parsed.footerText);
        }
      } catch (e) {
        console.warn("Could not parse prescription edit data:", e);
      }
    }
  }, [editData]);

  // Tooth Click in Odontogram (Multi-Tooth Selection & Procedure Prompts)
  const handleToothClick = (toothId) => {
    const sId = String(toothId);
    setActiveSelectedTeethIds(prev => {
      const exists = prev.includes(sId);
      const next = exists ? prev.filter(id => id !== sId) : [...prev, sId];
      if (!exists) {
        const existingRecord = selectedTeeth.find(t => String(t.toothId) === sId);
        if (existingRecord) {
          setToothProcedureText(existingRecord.procedure || existingRecord.condition || 'Full mouth cleaning');
          setToothProcedureNotes(existingRecord.notes || '');
        }
      }
      return next;
    });
  };

  const handleSelectAllTeeth = () => {
    const all32 = [
      '18','17','16','15','14','13','12','11',
      '21','22','23','24','25','26','27','28',
      '48','47','46','45','44','43','42','41',
      '31','32','33','34','35','36','37','38'
    ];
    setActiveSelectedTeethIds(all32);
    setToothProcedureText('Full mouth cleaning');
  };

  const handleSelectUpperArch = () => {
    const upper = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
    setActiveSelectedTeethIds(upper);
  };

  const handleSelectLowerArch = () => {
    const lower = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
    setActiveSelectedTeethIds(lower);
  };

  const handleClearTeethSelection = () => {
    setActiveSelectedTeethIds([]);
  };

  const handleSaveTeethProcedure = () => {
    if (!activeSelectedTeethIds.length) return;
    const procedure = (toothProcedureText || 'Full mouth cleaning').trim();
    const notes = (toothProcedureNotes || '').trim();

    const selectedSet = new Set(activeSelectedTeethIds.map(String));
    const retained = selectedTeeth.filter(t => !selectedSet.has(String(t.toothId)));

    const newlyAdded = activeSelectedTeethIds.map(id => ({
      toothId: String(id),
      procedure,
      condition: procedure,
      notes
    }));

    setSelectedTeeth([...retained, ...newlyAdded]);
    setActiveSelectedTeethIds([]);
  };

  const handleRemoveTeethGroup = (teethIdsToRemove) => {
    const removeSet = new Set((Array.isArray(teethIdsToRemove) ? teethIdsToRemove : [teethIdsToRemove]).map(String));
    setSelectedTeeth(selectedTeeth.filter(t => !removeSet.has(String(t.toothId))));
  };

  // Medicine table handlers
  const handleAddMedicationRow = () => {
    setMedications(prev => [
      ...prev,
      { name: '', form: 'Tab', dose: '1 Tab', when: 'After Food', frequency: '', duration: '5 days', instructions: '' }
    ]);
  };

  const handleMedicationChange = (index, field, value) => {
    setMedications(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSelectMedicationItem = (index, item) => {
    if (!item) return;

    // Map form to valid select options
    let formVal = item.form || item.type || 'Tab';
    const fLower = formVal.toLowerCase();
    if (fLower.includes('cap')) formVal = 'Cap';
    else if (fLower.includes('gel') || fLower.includes('paint') || fLower.includes('cream')) formVal = 'Gel';
    else if (fLower.includes('mouth') || fLower.includes('rinse') || fLower.includes('liquid') || fLower.includes('gargle')) formVal = 'Mouthwash';
    else if (fLower.includes('syr')) formVal = 'Syr';
    else if (fLower.includes('inj')) formVal = 'Inj';
    else if (fLower.includes('other') || fLower.includes('brush') || fLower.includes('paste')) formVal = 'Other';
    else formVal = 'Tab';

    setMedications(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        name: item.name || '',
        form: formVal,
        dose: item.dose || (formVal === 'Cap' ? '1 Cap' : formVal === 'Gel' ? 'Few drops' : formVal === 'Mouthwash' ? '10 ml' : '1 Tab'),
        frequency: '',
        when: item.when || 'After Food',
        duration: item.duration || '5 days',
        instructions: item.instructions || item.composition || item.genericName || ''
      };
      return copy;
    });
  };

  const handleRemoveMedication = (index) => {
    setMedications(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickAddPreset = (med) => {
    setMedications(prev => {
      // If the first row is completely empty, replace it
      if (prev.length === 1 && !prev[0].name.trim()) {
        return [med];
      }
      return [...prev, med];
    });
  };

  // SAVE PRESCRIPTION RECORD
  const handleSaveRecord = async (triggerPrint = false) => {
    if (!patient?._id) {
      toast.error("Invalid patient reference");
      return;
    }

    const docId = patient?.assignedDoctorId || user?._id || user?.id || null;
    const docName = patient?.assignedDoctor || user?.name || user?.fullName || 'Dental Surgeon';

    setIsSaving(true);
    try {
      const activeMeds = medications.filter(m => m.name && m.name.trim() !== '');

      // Auto-save any custom medicine written by doctor so it shows in suggestions next time
      try {
        activeMeds.forEach(m => {
          if (m.name && m.name.trim()) {
            saveDoctorCustomMedicine(m, docId || 'default');
          }
        });
      } catch (e) {
        console.warn("Could not auto-save doctor custom medicine:", e);
      }

      const detailedData = {
        isDental: true,
        patientName,
        patientId: patientIdDisplay,
        ageSex,
        examinationDate,
        chiefComplaint,
        complaintDuration: duration,
        complaints: chiefComplaint ? [{ name: chiefComplaint, duration }] : [],
        medicalDentalHistory,
        oralExamination: oralExamText.trim(),
        selectedTeeth,
        diagnosis: diagnosis ? [{ name: diagnosis }] : [],
        treatmentPlanned,
        treatmentPerformedToday,
        treatmentPlans: treatmentPlanned ? [{ name: treatmentPlanned }] : [],
        dentalTreatments: treatmentPlanned ? [{ name: treatmentPlanned }] : [],
        medications: activeMeds,
        advice,
        nextAppointmentDate,
        nextAppointmentNotes,
        followUpDate: nextAppointmentDate,
        footerText: customFooterText.trim() || undefined,
        customFooterText: customFooterText.trim() || undefined
      };

      const recordData = {
        patientId: patient._id,
        organizationId: user?.organizationId || user?.organization?._id,
        type: 'Prescription',
        title: `Dental Examination & Prescription - ${examinationDate || format(new Date(), 'dd/MM/yyyy')}`,
        description: JSON.stringify(detailedData),
        doctorId: docId,
        doctorName: docName,
        status: 'Completed',
        date: examinationDate ? new Date(examinationDate) : new Date()
      };

      let savedRecord = null;
      if (editData && editData.id) {
        if (editData.type === 'Visit Note') {
          savedRecord = await appointmentApi.updateNotes(editData.id, recordData.description);
          toast.success("Dental visit note updated!");
        } else {
          savedRecord = await medicalRecordApi.update(editData.id, recordData);
          toast.success("Dental prescription updated!");
        }
      } else {
        savedRecord = await medicalRecordApi.create(recordData);
        toast.success("Dental examination record saved successfully!");
      }

      if (onSaveSuccess) onSaveSuccess();

      if (triggerPrint && onPrintDirect) {
        onPrintDirect({
          ...recordData,
          _id: savedRecord?._id || editData?.id,
          notes: recordData.description,
          description: recordData.description
        });
      }

      onClose();
    } catch (err) {
      console.error("Save Dental Record Error:", err);
      toast.error("Failed to save dental record.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        {/* Main Dialog Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-[#0A0D14] border border-slate-800 rounded-3xl w-full max-w-4xl text-slate-100 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
        >
          {/* Top Header Bar */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-[#0E131F] to-slate-950 flex items-center justify-between gap-4 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shadow-inner">
                <ClipboardCheck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Oviaan — Dental Examination
                  </h2>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                    Dental EMR
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-bold mt-0.5">Suggested digital form layout</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onSwitchToGeneral && (
                <button
                  type="button"
                  onClick={onSwitchToGeneral}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900/60 text-slate-300 hover:text-white text-xs font-bold transition-all"
                  title="Switch back to standard multi-specialty prescription modal"
                >
                  <RotateCcw size={13} />
                  <span>General Form</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Form Scrollable Content */}
          <div className="p-5 sm:p-7 space-y-8 overflow-y-auto custom-scrollbar">
            {/* ============================================================== */}
            {/* 1. PATIENT INFORMATION */}
            {/* ============================================================== */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-200 tracking-wide uppercase flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs">1</span>
                Patient information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Patient name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient name"
                    className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Patient ID</label>
                  <input
                    type="text"
                    value={patientIdDisplay}
                    onChange={(e) => setPatientIdDisplay(e.target.value)}
                    placeholder="From Oviaan"
                    className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Age / Sex</label>
                  <input
                    type="text"
                    value={ageSex}
                    onChange={(e) => setAgeSex(e.target.value)}
                    placeholder="Enter details"
                    className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Examination date</label>
                  <input
                    type="date"
                    value={examinationDate}
                    onChange={(e) => setExaminationDate(e.target.value)}
                    className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 2. CHIEF COMPLAINT AND HISTORY */}
            {/* ============================================================== */}
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <h3 className="text-sm font-black text-slate-200 tracking-wide uppercase flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs">2</span>
                Chief complaint and history
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-400">Chief complaint</label>
                    <span className="text-[10px] text-slate-500 font-bold">Quick suggestions:</span>
                  </div>
                  <input
                    type="text"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="e.g. Tooth pain, swelling, bleeding gums"
                    className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors mb-2"
                  />
                  {/* Quick dental complaint chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Pain in upper tooth',
                      'Pain in lower tooth',
                      'Sensitivity to cold/hot',
                      'Swelling & bleeding gums',
                      'Food lodgement',
                      'Broken tooth / filling',
                      'Loose tooth'
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setChiefComplaint(prev => prev ? `${prev}, ${chip}` : chip)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/50 transition-colors"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Duration</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 7 days"
                      className="flex-1 bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-sm font-semibold text-white outline-none transition-colors"
                    />
                    <div className="flex items-center gap-1">
                      {['2 days', '5 days', '1 week', '2 weeks'].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDuration(d)}
                          className={`text-[10px] font-bold px-2.5 py-2 rounded-xl border transition-colors ${
                            duration === d ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Medical / dental history</label>
                  <textarea
                    rows={2}
                    value={medicalDentalHistory}
                    onChange={(e) => setMedicalDentalHistory(e.target.value)}
                    placeholder="Previous treatment, allergies, relevant medical history"
                    className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {['No known allergies', 'Hypertension', 'Diabetic', 'Penicillin Allergy', 'Asthma', 'Previous RCT done'].map((alert) => (
                      <button
                        key={alert}
                        type="button"
                        onClick={() => setMedicalDentalHistory(prev => prev ? `${prev}, ${alert}` : alert)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/50 transition-colors"
                      >
                        + {alert}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 3. ORAL EXAMINATION (Text Bar + Options Below) */}
            {/* ============================================================== */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-200 tracking-wide uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs">3</span>
                    Oral examination
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">Write findings in text bar or click quick recommendation options below.</p>
                </div>
                <span className="text-[10px] text-slate-500 font-bold">Quick suggestions:</span>
              </div>

              {/* Text Bar */}
              <input
                type="text"
                value={oralExamText}
                onChange={(e) => setOralExamText(e.target.value)}
                placeholder="Enter oral examination findings (e.g. Stains (Moderate), Calculus (Subgingival), Deep caries #16)"
                className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors"
              />

              {/* Options shown below the text bar */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Stains (Mild)',
                  'Stains (Moderate)',
                  'Stains (Severe)',
                  'Calculus (Supragingival)',
                  'Calculus (Subgingival)',
                  'Calculus (Generalized)',
                  'Enamel Caries',
                  'Dentin Caries',
                  'Deep Caries',
                  'Grossly Decayed / Root Stumps',
                  'Mobile Teeth (Grade I)',
                  'Mobile Teeth (Grade II)',
                  'Tenderness on Percussion (+)',
                  'Gingival Bleeding / Inflammation',
                  'Halitosis (Bad Breath)',
                  'Plaque Accumulation',
                  'Abrasion / Attrition',
                  'Sensitivity / Hypersensitivity'
                ].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setOralExamText(prev => prev ? `${prev}, ${opt}` : opt)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/50 transition-colors cursor-pointer"
                  >
                    + {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* ============================================================== */}
            {/* 4. TOOTH CHART (ODONTOGRAM & PROCEDURE SELECTOR) */}
            {/* ============================================================== */}
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-200 tracking-wide uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs">4</span>
                    Tooth chart (odontogram)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">Select tooth or multiple teeth to specify the procedure being performed.</p>
                </div>

                {/* Quick Multi-Teeth Batch Selectors */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectAllTeeth}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 transition-colors cursor-pointer"
                  >
                    + Full Mouth (All Teeth)
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectUpperArch}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Upper Arch
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectLowerArch}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Lower Arch
                  </button>
                  {selectedTeeth.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTeeth([])}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Realistic Anatomical Odontogram Chart */}
              <RealisticDentalOdontogram
                selectedTeeth={[
                  ...selectedTeeth,
                  ...activeSelectedTeethIds.map(id => ({ toothId: id, condition: toothProcedureText || 'Selected' }))
                ]}
                onToothClick={handleToothClick}
                onBatchSelect={(newIds) => {
                  setActiveSelectedTeethIds(newIds.map(String));
                }}
                theme="dark"
              />

              {/* Tooth Procedure Action Prompt (Shown when 1 or more teeth are selected) */}
              {activeSelectedTeethIds.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-teal-950/50 via-slate-900 to-indigo-950/50 rounded-2xl border-2 border-teal-500/50 space-y-3.5 shadow-xl animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-teal-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles size={14} className="text-teal-400" />
                        What are you doing on {activeSelectedTeethIds.length === 32 ? 'Full Mouth (All 32 Teeth)' : activeSelectedTeethIds.length === 1 ? `Tooth #${activeSelectedTeethIds[0]}` : `Selected Teeth (${activeSelectedTeethIds.length})`}?
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40">
                        {activeSelectedTeethIds.length === 32 ? 'All Teeth Selected' : `Teeth #${activeSelectedTeethIds.join(', #')}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearTeethSelection}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Free-typing Text Bar */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Procedure / Action being performed:</span>
                      <span className="text-[10px] text-slate-500">Type freely or click recommendation below</span>
                    </label>
                    <input
                      type="text"
                      value={toothProcedureText}
                      onChange={(e) => setToothProcedureText(e.target.value)}
                      placeholder="e.g. Full mouth cleaning, Root Canal Treatment, Composite filling..."
                      className="w-full bg-[#121824] border border-teal-500/60 focus:border-teal-400 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none shadow-inner"
                    />
                  </div>

                  {/* Comprehensive Recommendations / Procedures ("show all type") */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Procedure Recommendations:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-0.5">
                      {[
                        'Full Mouth Cleaning',
                        'Scaling & Polishing',
                        'Root Canal Treatment (RCT)',
                        'Composite Tooth Restoration',
                        'Biomechanical Preparation (BMP)',
                        'Canal Obturation',
                        'Painless Tooth Extraction',
                        'Surgical Extraction / Impaction',
                        'Crown Preparation',
                        'Crown & Bridge Fitting',
                        'Zirconia Crown',
                        'Cavity / Deep Caries Filling',
                        'Bleaching / Teeth Whitening',
                        'GIC Restoration',
                        'Dental Implant Placement',
                        'Post & Core Buildup',
                        'Gingival Curettage / Flap Surgery',
                        'Temporary Dressing',
                        'Topical Fluoride Application',
                        'Tooth Sensitivity Treatment',
                        'Orthodontic Wire Adjustment',
                        'Missing Tooth'
                      ].map(proc => (
                        <button
                          key={proc}
                          type="button"
                          onClick={() => setToothProcedureText(proc)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            toothProcedureText === proc
                              ? 'bg-teal-500 border-teal-500 text-black font-black shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-teal-300 hover:border-teal-500/40'
                          }`}
                        >
                          + {proc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes / Clinical Observations */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      value={toothProcedureNotes}
                      onChange={(e) => setToothProcedureNotes(e.target.value)}
                      placeholder="Optional details / notes (e.g. Supragingival calculus removed, Class II mesio-occlusal)"
                      className="flex-1 bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveTeethProcedure}
                        className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Check size={14} strokeWidth={3} /> Save Procedure
                      </button>
                      <button
                        type="button"
                        onClick={handleClearTeethSelection}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Recorded Teeth List (Grouped Cleanly by Procedure) */}
              {selectedTeeth.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Recorded Procedures in Treatment Plan ({selectedTeeth.length} teeth):
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTeeth([])}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const groups = new Map();
                      selectedTeeth.forEach(t => {
                        const proc = t.procedure || t.condition || 'Procedure';
                        const notes = t.notes ? ` (${t.notes})` : '';
                        const key = `${proc}:::${notes}`;
                        if (!groups.has(key)) groups.set(key, { proc, notes, teeth: [] });
                        groups.get(key).teeth.push(String(t.toothId));
                      });

                      return Array.from(groups.values()).map(({ proc, notes, teeth }, gIdx) => {
                        const isFullMouth = teeth.length >= 28;
                        const label = isFullMouth
                          ? 'Full Mouth (All Teeth)'
                          : teeth.length > 1
                          ? `Teeth #${teeth.join(', #')}`
                          : `Tooth #${teeth[0]}`;

                        return (
                          <div
                            key={gIdx}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-teal-500/40 text-xs font-bold text-teal-300 shadow-sm"
                          >
                            <span>
                              <span className="text-white">{label}:</span>{' '}
                              <span className="text-teal-400">{proc}</span>
                              {notes && <span className="text-slate-400 font-normal"> {notes}</span>}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTeethGroup(teeth)}
                              className="text-slate-500 hover:text-rose-400 ml-1 p-0.5 rounded transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================== */}
            {/* 5. DIAGNOSIS AND TREATMENT PLAN */}
            {/* ============================================================== */}
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <h3 className="text-sm font-black text-slate-200 tracking-wide uppercase flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs">5</span>
                Diagnosis and treatment plan
              </h3>

              <div className="space-y-3">
                {/* Diagnosis */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-400">Diagnosis</label>
                    <span className="text-[10px] text-slate-500 font-bold">Quick suggestions:</span>
                  </div>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Enter or select diagnosis"
                    className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors mb-2"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Acute Irreversible Pulpitis',
                      'Chronic Pulpitis',
                      'Apical Periodontitis',
                      'Dental Caries',
                      'Chronic Generalized Gingivitis',
                      'Periodontitis',
                      'Impacted 3rd Molar',
                      'Periapical Abscess'
                    ].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDiagnosis(prev => prev ? `${prev}, ${d}` : d)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/50 transition-colors"
                      >
                        + {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Treatment planned */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-400">Treatment planned</label>
                    <span className="text-[10px] text-slate-500 font-bold">Quick suggestions:</span>
                  </div>
                  <input
                    type="text"
                    value={treatmentPlanned}
                    onChange={(e) => setTreatmentPlanned(e.target.value)}
                    placeholder="Enter proposed treatment"
                    className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors mb-2"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Root Canal Treatment (RCT)',
                      'Composite Tooth Restoration',
                      'Painless Tooth Extraction',
                      'Scaling & Polishing',
                      'Zirconia / Ceramic Crown',
                      'Crown & Bridge',
                      'Complete Denture',
                      'Orthodontic Treatment'
                    ].map(tp => (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => setTreatmentPlanned(prev => prev ? `${prev}, ${tp}` : tp)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/50 transition-colors"
                      >
                        + {tp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Treatment performed today */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-400">Treatment performed today</label>
                    <span className="text-[10px] text-slate-500 font-bold">Quick suggestions:</span>
                  </div>
                  <input
                    type="text"
                    value={treatmentPerformedToday}
                    onChange={(e) => setTreatmentPerformedToday(e.target.value)}
                    placeholder="Enter completed procedure"
                    className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors mb-2"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Access opening & pulpectomy done under LA',
                      'Biomechanical preparation & cleaning done',
                      'Canal obturation completed',
                      'Temporary dressing placed (Cavit/IRM)',
                      'Permanent composite restoration done',
                      'Extraction completed uneventfully under LA',
                      'Full mouth scaling completed',
                      'Suture removal done'
                    ].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTreatmentPerformedToday(prev => prev ? `${prev}, ${p}` : p)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/50 transition-colors"
                      >
                        + {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 6. PRESCRIPTION AND FOLLOW-UP */}
            {/* ============================================================== */}
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-200 tracking-wide uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs">6</span>
                    Prescription and follow-up
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Medicines and dosage</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddMedicationRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 rounded-xl text-xs font-black transition-colors"
                  >
                    <Plus size={14} /> Add Medicine
                  </button>
                </div>
              </div>

              {/* 1-Click Dental Presets */}
              <div className="p-3 bg-[#121824] rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Star size={11} className="text-teal-400 fill-teal-400" />
                  Quick Presets & Doctor's Clinic Pad:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMedications([
                        { name: 'Caremox AG Plus', form: 'Tab', dose: '625mg', when: 'After Food', frequency: '', duration: '5 days', instructions: 'After food with full glass of water' },
                        { name: 'Yenfenac SP', form: 'Tab', dose: '1 Tab', when: 'After Food', frequency: '', duration: '3 days', instructions: 'For pain and swelling after meals' },
                        { name: 'Roben DSR', form: 'Cap', dose: '1 Cap', when: 'Before Food', frequency: '', duration: '5 days', instructions: 'Morning 30 mins before breakfast' }
                      ]);
                      toast.info("Applied Clinic Kit: Caremox AG Plus + Yenfenac SP + Roben DSR");
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-teal-500/40 text-teal-300 hover:bg-teal-500/20 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    ★ Clinic Kit (Caremox + Yenfenac SP + Roben DSR)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMedications([
                        { name: 'Densoform (Gumpaint)', form: 'Gel', dose: 'Few drops', when: 'After Food', frequency: '', duration: '5 days', instructions: 'Massage over gums after brushing; no water for 15 mins' },
                        { name: 'Olsept - M.W', form: 'Mouthwash', dose: '10 ml', when: 'After Food', frequency: '', duration: '7 days', instructions: 'Swish undiluted for 1 min twice daily' },
                        { name: 'Denseal', form: 'Gel', dose: 'Pea-size', when: 'After Food', frequency: '', duration: '14 days', instructions: 'Apply on sensitive teeth 10 mins before brushing' }
                      ]);
                      toast.info("Applied Clinic Gum & Sensitivity Kit");
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    ★ Gum & Sensitivity (Densoform + Olsept + Denseal)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMedications([
                        { name: 'Augmentin 625mg', form: 'Tab', dose: '1 Tab', when: 'After Food', frequency: '', duration: '5 days', instructions: 'Complete full course' },
                        { name: 'Ketorolac DT 10mg', form: 'Tab', dose: '1 Tab', when: 'After Food', frequency: '', duration: '3 days', instructions: 'Dissolve in half glass water' },
                        { name: 'Pan-D', form: 'Cap', dose: '1 Cap', when: 'Before Food', frequency: '', duration: '5 days', instructions: 'Morning empty stomach' },
                        { name: 'Chlorhexidine 0.2% Mouthwash', form: 'Mouthwash', dose: '10 ml', when: 'After Food', frequency: '', duration: '7 days', instructions: 'Rinse for 1 min' }
                      ]);
                      toast.info("Applied Severe Infection / Surgical set");
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                  >
                    ⚡ Severe Infection (Augmentin + Ketorolac + Pan-D)
                  </button>
                </div>
              </div>

              {/* Medicine Rows */}
              <div className="space-y-2.5">
                {medications.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#121824] rounded-2xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-6 relative z-20">
                        <DentalMedicineAutocomplete
                          value={med.name}
                          doctorId={user?._id || user?.id || patient?.assignedDoctorId || 'default'}
                          onChange={(val) => handleMedicationChange(idx, 'name', val)}
                          onSelect={(selected) => handleSelectMedicationItem(idx, selected)}
                          placeholder="Type 1-2 chars (Caremox, Yenfenac, Densoform...)"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <select
                          value={med.form}
                          onChange={(e) => handleMedicationChange(idx, 'form', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200 outline-none"
                        >
                          <option value="Tab">Tab</option>
                          <option value="Cap">Cap</option>
                          <option value="Gel">Gel</option>
                          <option value="Mouthwash">Mouthwash</option>
                          <option value="Syr">Syrup</option>
                          <option value="Inj">Inj</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="col-span-4 sm:col-span-3">
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => handleMedicationChange(idx, 'duration', e.target.value)}
                          placeholder="Duration (5 days)"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(idx)}
                          className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 flex items-center justify-center transition-colors"
                          title="Remove Medicine"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={med.frequency || ''}
                        onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                        className="w-36 bg-slate-900 border border-slate-800/80 focus:border-teal-500 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-slate-300 outline-none"
                      >
                        <option value="">No Frequency</option>
                        <option value="1-0-1">1-0-1 (Twice daily)</option>
                        <option value="1-0-0">1-0-0 (Morning)</option>
                        <option value="0-0-1">0-0-1 (Night)</option>
                        <option value="0-1-0">0-1-0 (Afternoon)</option>
                        <option value="1-1-1">1-1-1 (Thrice daily)</option>
                        <option value="SOS">SOS (As needed)</option>
                        <option value="1-1-1-1">1-1-1-1 (4 times)</option>
                      </select>
                      <input
                        type="text"
                        value={med.instructions}
                        onChange={(e) => handleMedicationChange(idx, 'instructions', e.target.value)}
                        placeholder="Instructions (e.g. After Food, rinse for 1 min, do not chew...)"
                        className="flex-1 bg-slate-900 border border-slate-800/80 focus:border-teal-500 rounded-xl px-3 py-1 text-[11px] font-semibold text-slate-300 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Advice */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-400">Advice / Instructions</label>
                <textarea
                  rows={2}
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  placeholder="Instructions and advice (e.g. Warm saline rinses, soft diet, avoid hard/sticky food, do not spit vigorously)"
                  className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Warm saline rinses 3-4 times a day',
                    'Soft & liquid diet for 2 days',
                    'Avoid chewing on treated side',
                    'Do not spit / rinse for 24 hours',
                    'Take cold ice cream / cold drinks after extraction',
                    'Maintain oral hygiene gently'
                  ].map(adv => (
                    <button
                      key={adv}
                      type="button"
                      onClick={() => setAdvice(prev => prev ? `${prev}, ${adv}` : adv)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/50 transition-colors"
                    >
                      + {adv}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Appointment Date & Plan (User Request) */}
              <div className="p-4 bg-gradient-to-r from-teal-950/30 via-slate-900 to-indigo-950/30 rounded-2xl border border-teal-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-teal-400" />
                    Next Appointment Date & Follow-Up
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Quick selection:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      value={nextAppointmentDate}
                      onChange={(e) => setNextAppointmentDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none"
                    />
                    <div className="flex items-center gap-1.5 mt-2">
                      {[
                        { label: 'Tomorrow', days: 1 },
                        { label: '3 Days', days: 3 },
                        { label: '1 Week', days: 7 },
                        { label: '2 Weeks', days: 14 }
                      ].map(({ label, days }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setNextAppointmentDate(format(addDays(new Date(), days), 'yyyy-MM-dd'))}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-teal-300 hover:border-teal-500/40 transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={nextAppointmentNotes}
                      onChange={(e) => setNextAppointmentNotes(e.target.value)}
                      placeholder="Planned procedure for next visit (e.g. Canal Obturation / Crown Cementation)"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Custom Footer Notice for this prescription */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-400">
                    Prescription Footer Notice <span className="text-[10px] text-slate-500 font-normal">(Optional - leave blank to use clinic default footer)</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={customFooterText}
                  onChange={(e) => setCustomFooterText(e.target.value)}
                  placeholder="e.g. SCAN FOR APPOINTMENTS • PRESCRIPTION VALID FOR 7 DAYS"
                  className="w-full bg-[#121824] border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-300 outline-none placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Footer Bar */}
          <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-30">
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              Dental Form calibrated for letterhead prescription printing
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSaveRecord(false)}
                disabled={isSaving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow"
              >
                <Save size={16} />
                <span>Save Record</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveRecord(true)}
                disabled={isSaving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-teal-500/25 disabled:opacity-50 cursor-pointer"
              >
                <Printer size={16} />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DentalPrescriptionModal;
