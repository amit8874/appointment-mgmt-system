import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Plus, 
  Trash2, 
  Printer, 
  Download, 
  Send, 
  Check, 
  FileText, 
  IndianRupee, 
  Calendar, 
  AlertCircle,
  Eye,
  Edit2,
  Share2,
  UserCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { dentistApi, centralDoctorApi, organizationApi } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { format } from 'date-fns';
import { getToothDisplayName } from './dentalUtils';

const DENTAL_PROCEDURE_PRESETS = [
  { name: 'Root Canal Treatment (RCT)', defaultCost: 3500 },
  { name: 'Composite / Tooth-Colored Restoration', defaultCost: 1200 },
  { name: 'Full Ceramic / Zirconia Crown', defaultCost: 6500 },
  { name: 'PFM Crown (Metal Ceramic)', defaultCost: 3500 },
  { name: 'Tooth Extraction (Routine)', defaultCost: 1000 },
  { name: 'Surgical Extraction / Impaction', defaultCost: 4000 },
  { name: 'Full Mouth Scaling & Polishing', defaultCost: 1500 },
  { name: 'Dental Implant with Abutment & Crown', defaultCost: 28000 },
  { name: 'Orthodontic Braces / Clear Aligners', defaultCost: 35000 },
  { name: 'Teeth Bleaching / Whitening', defaultCost: 5000 },
  { name: 'Fixed Partial Denture (Bridge)', defaultCost: 10000 },
  { name: 'Complete Denture (Per Arch)', defaultCost: 15000 },
];

const formatClinicAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  return [addr.street, addr.city, addr.state, addr.zipCode || addr.postalCode, addr.country]
    .filter(Boolean)
    .join(', ');
};

/**
 * Reusable Printable / Screen Quotation Document Component
 */
const QuotationDocument = ({
  clinicInfo,
  doctorName,
  selectedDoctor,
  patientData,
  existingQuotation,
  validityDays,
  items,
  notes,
  subtotal,
  discount,
  taxAmount,
  totalAmount,
}) => {
  const clinicName = clinicInfo?.branding?.clinicName || clinicInfo?.clinicName || clinicInfo?.name || 'Dental Care Clinic';
  const clinicSubtitle = clinicInfo?.branding?.clinicSubtitle || clinicInfo?.tagline || clinicInfo?.specialty || 'Dental Surgeon & Laser Specialist';
  const clinicPhone = clinicInfo?.phone || clinicInfo?.branding?.phone || clinicInfo?.mobile || patientData?.clinicPhone || '';
  const clinicWebsite = clinicInfo?.website || clinicInfo?.branding?.website || '';
  const clinicLogo = clinicInfo?.branding?.logo || clinicInfo?.logo || '';
  const clinicAddressStr = formatClinicAddress(clinicInfo?.address || clinicInfo?.branding?.address);

  const cleanDocName = doctorName || selectedDoctor?.name || `${selectedDoctor?.firstName || ''} ${selectedDoctor?.lastName || ''}`.trim() || 'Attending Doctor';
  const docPrefix = cleanDocName.toLowerCase().startsWith('dr') ? '' : 'Dr. ';
  const docTitle = `${docPrefix}${cleanDocName}`;
  const docSpec = selectedDoctor?.specialization || 'Dental Surgeon';
  const docQual = selectedDoctor?.qualification || selectedDoctor?.qualifications || '';
  const docReg = selectedDoctor?.registrationNumber ? `Reg. No. ${selectedDoctor.registrationNumber}` : '';

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 w-full max-w-[210mm] text-slate-900 font-sans mx-auto print:p-0 print:border-none print:shadow-none">
      {/* Header */}
      <div className="flex justify-between items-start pb-4 border-b-2 border-slate-800 gap-4">
        <div className="flex items-center gap-3.5 max-w-[65%]">
          {clinicLogo && (
            <img src={clinicLogo} alt={clinicName} className="w-14 h-14 object-contain rounded-lg shrink-0 border border-slate-200 p-0.5" />
          )}
          <div>
            <h1 className="text-xl font-black uppercase text-slate-950 tracking-tight leading-tight">{clinicName}</h1>
            {clinicSubtitle && <p className="text-xs font-bold text-slate-700 mt-0.5">{clinicSubtitle}</p>}
            {clinicAddressStr && <p className="text-[11px] text-slate-600 mt-0.5">{clinicAddressStr}</p>}
            <p className="text-[11px] text-slate-600 mt-0.5">
              {clinicPhone && <span>Phone: {clinicPhone}</span>}
              {clinicPhone && clinicWebsite && <span> | </span>}
              {clinicWebsite && <span>Website: {clinicWebsite}</span>}
            </p>
          </div>
        </div>
        <div className="text-right max-w-[35%]">
          <h2 className="text-sm font-black text-slate-950">{docTitle}</h2>
          {docSpec && <p className="text-[11px] font-bold text-slate-700 mt-0.5">({docSpec})</p>}
          {docQual && <p className="text-[11px] text-slate-600">{docQual}</p>}
          {docReg && <p className="text-[11px] text-slate-600">{docReg}</p>}
        </div>
      </div>

      {/* Patient & Estimate Details */}
      <div className="grid grid-cols-2 gap-4 py-3.5 border-b border-slate-200 text-xs">
        <div>
          <p><span className="font-bold text-slate-500">Patient Name:</span> <b className="text-slate-900">{patientData?.fullName || patientData?.name || 'Valued Patient'}</b></p>
          <p><span className="font-bold text-slate-500">Patient ID:</span> <b>{patientData?.patientId || 'N/A'}</b></p>
          <p><span className="font-bold text-slate-500">Mobile No:</span> <b>{patientData?.mobile || patientData?.phone || 'N/A'}</b></p>
          {patientData?.address && (
            <p className="text-[11px] text-slate-600 truncate">
              <span className="font-bold text-slate-500">Address:</span> {typeof patientData.address === 'string' ? patientData.address : [patientData.address.street, patientData.address.city].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <div className="text-right">
          <p><span className="font-bold text-slate-500">Estimate No:</span> <b>{existingQuotation?.quotationNumber || 'EST-DRAFT'}</b></p>
          <p><span className="font-bold text-slate-500">Issue Date:</span> <b>{format(new Date(), 'dd MMM, yyyy')}</b></p>
          <p><span className="font-bold text-slate-500">Validity:</span> <b className="text-amber-700">{validityDays} Days</b></p>
        </div>
      </div>

      {/* Document Title Banner */}
      <div className="py-3 text-center bg-amber-50/60 rounded-xl my-3 border border-amber-200/80">
        <h3 className="text-base font-black text-amber-900 uppercase tracking-widest">
          TREATMENT COST ESTIMATE / QUOTATION
        </h3>
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
          (Official Treatment Quotation & Mock Bill)
        </p>
      </div>

      {/* Consolidated Items Table */}
      <table className="w-full text-left border-collapse border-y border-slate-300 mb-4 text-xs">
        <thead>
          <tr className="bg-slate-100 text-slate-800 font-black uppercase text-[10px]">
            <th className="py-2.5 px-3 w-12 text-center">#</th>
            <th className="py-2.5 px-3">Proposed Treatment & Details</th>
            <th className="py-2.5 px-3 text-right">Estimated Cost (INR)</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="3" className="py-6 text-center text-slate-400 italic">No procedures added yet.</td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={idx} className="border-b border-dotted border-slate-200">
                <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}.</td>
                <td className="py-2.5 px-3">
                  <p className="font-bold text-slate-900 text-xs">{item.procedure}</p>
                  <p className="text-[11px] text-slate-600 font-semibold">Teeth Reference: {item.toothDisplay}</p>
                  {item.notes && <p className="text-[10px] text-slate-500 italic">{item.notes}</p>}
                </td>
                <td className="py-2.5 px-3 text-right font-black text-slate-900">
                  ₹{Number(item.totalCost).toLocaleString('en-IN')}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Summary & Notes */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600">
          <p className="font-bold uppercase tracking-wider text-slate-800 text-[10px] mb-1">Notes & Validity:</p>
          <p className="leading-relaxed">{notes}</p>
          <p className="mt-2 text-[10px] font-bold text-slate-400">* This is an estimate of costs and not a final tax invoice or payment receipt.</p>
        </div>
        <div className="space-y-1.5 text-xs text-right">
          <div className="flex justify-between text-slate-600 font-bold">
            <span>Total Estimate:</span>
            <span>₹{subtotal.toLocaleString('en-IN')}</span>
          </div>
          {Number(discount) > 0 && (
            <div className="flex justify-between text-rose-600 font-bold">
              <span>Discount:</span>
              <span>-₹{Number(discount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {Number(taxAmount) > 0 && (
            <div className="flex justify-between text-slate-600 font-bold">
              <span>Taxes:</span>
              <span>+₹{Number(taxAmount).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm font-black text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2">
            <span className="uppercase">Net Estimate:</span>
            <span className="text-base font-black">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
        <span>Generated On: {format(new Date(), 'dd MMM, yyyy')}</span>
        <span>Computer Generated Treatment Quotation</span>
        <span>Powered by Oviaan</span>
      </div>
    </div>
  );
};

const DentalQuotationModal = ({
  patientId,
  patientData = {},
  initialSelectedTeeth = [],
  numberingSystem = 'FDI',
  existingQuotation = null,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  // Doctors & Clinic Info states
  const [doctorsList, setDoctorsList] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [clinicInfo, setClinicInfo] = useState(null);

  // Form states
  const [selectedTeeth, setSelectedTeeth] = useState(initialSelectedTeeth || []);
  const [procedureName, setProcedureName] = useState('');
  const [packageCost, setPackageCost] = useState('');
  const [procedureNotes, setProcedureNotes] = useState('');
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState(
    'This quotation is an estimate of costs for the proposed dental treatments and is valid for 30 days. Final treatment plan may adjust following diagnostic radiographs and clinical examination.'
  );
  const [doctorName, setDoctorName] = useState('');

  // 1. Fetch organization doctors and clinic profile dynamically
  useEffect(() => {
    const fetchData = async () => {
      setLoadingDoctors(true);
      try {
        const response = await centralDoctorApi.getAll({ limit: 100 });
        const docs = response?.doctors || (Array.isArray(response) ? response : []);
        setDoctorsList(docs);

        // Auto-select doctor logic
        let docToSelect = null;
        if (existingQuotation?.doctorId) {
          docToSelect = docs.find(d => (d._id === existingQuotation.doctorId || d.id === existingQuotation.doctorId));
        } else if (existingQuotation?.doctorName) {
          const cleanTarget = existingQuotation.doctorName.toLowerCase().replace(/^(dr|dr\.)\s+/i, '').trim();
          docToSelect = docs.find(d => {
            const fullName = (d.name || `${d.firstName || ''} ${d.lastName || ''}`).toLowerCase().trim();
            return fullName.includes(cleanTarget) || cleanTarget.includes(fullName);
          });
        }

        if (!docToSelect && patientData?.assignedDoctorId) {
          docToSelect = docs.find(d => (d._id === patientData.assignedDoctorId || d.id === patientData.assignedDoctorId));
        }

        if (!docToSelect && patientData?.assignedDoctor) {
          const cleanAssigned = patientData.assignedDoctor.toLowerCase().replace(/^(dr|dr\.)\s+/i, '').trim();
          docToSelect = docs.find(d => {
            const fullName = (d.name || `${d.firstName || ''} ${d.lastName || ''}`).toLowerCase().trim();
            return fullName.includes(cleanAssigned) || cleanAssigned.includes(fullName);
          });
        }

        if (!docToSelect && user?.role === 'doctor') {
          docToSelect = docs.find(d => (d._id === user._id || d.id === user.id || d.email === user.email));
        }

        if (!docToSelect && docs.length > 0) {
          docToSelect = docs[0];
        }

        if (docToSelect) {
          setSelectedDoctorId(docToSelect._id || docToSelect.id);
          setSelectedDoctor(docToSelect);
          const docDisplayName = docToSelect.name || `${docToSelect.firstName || ''} ${docToSelect.lastName || ''}`.trim();
          setDoctorName(docDisplayName);
        } else if (existingQuotation?.doctorName) {
          setDoctorName(existingQuotation.doctorName);
        } else if (user?.name) {
          setDoctorName(user.name);
        }
      } catch (err) {
        console.warn('Failed to load clinic doctors:', err);
      } finally {
        setLoadingDoctors(false);
      }

      // Fetch organization details
      try {
        const orgId = user?.organization?._id || user?.organizationId?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null) || user?._id;
        if (orgId) {
          const orgData = await organizationApi.getById(orgId);
          if (orgData) {
            setClinicInfo(orgData);
          }
        } else if (user?.organization) {
          setClinicInfo(user.organization);
        }
      } catch (err) {
        console.warn('Failed to load organization info:', err);
        if (user?.organization) {
          setClinicInfo(user.organization);
        }
      }
    };

    fetchData();
  }, [existingQuotation, patientData, user]);

  // 2. Populate existing quotation fields if editing
  useEffect(() => {
    if (existingQuotation) {
      setItems(existingQuotation.items || []);
      setDiscount(existingQuotation.discount || 0);
      setTaxAmount(existingQuotation.taxAmount || 0);
      setNotes(existingQuotation.notes || '');
      if (existingQuotation.doctorName) {
        setDoctorName(existingQuotation.doctorName);
      }
      if (existingQuotation.items && existingQuotation.items.length > 0) {
        const allTeeth = existingQuotation.items.flatMap(it => it.teeth || []);
        setSelectedTeeth(Array.from(new Set(allTeeth)));
      }
    }
  }, [existingQuotation]);

  // Doctor select change
  const handleDoctorChange = (e) => {
    const docId = e.target.value;
    setSelectedDoctorId(docId);
    const doc = doctorsList.find(d => (d._id === docId || d.id === docId));
    if (doc) {
      setSelectedDoctor(doc);
      const docDisplayName = doc.name || `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
      setDoctorName(docDisplayName);
    } else {
      setSelectedDoctor(null);
    }
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
  const totalAmount = Math.max(0, subtotal - (Number(discount) || 0) + (Number(taxAmount) || 0));

  const handleAddProcedure = () => {
    if (!procedureName.trim()) {
      toast.error('Please enter or select a procedure name');
      return;
    }
    const cost = Number(packageCost);
    if (!cost || isNaN(cost) || cost <= 0) {
      toast.error('Please enter a valid estimated cost');
      return;
    }

    const teethArr = [...selectedTeeth];
    const toothDisplay = teethArr.length > 0 
      ? teethArr.map(id => getToothDisplayName(id, numberingSystem)).join(', ') 
      : 'General / Consultation';

    const newItem = {
      procedure: procedureName.trim(),
      teeth: teethArr,
      toothDisplay,
      totalCost: cost,
      unitCost: teethArr.length > 0 ? Math.round((cost / teethArr.length) * 100) / 100 : cost,
      quantity: teethArr.length > 0 ? teethArr.length : 1,
      notes: procedureNotes.trim(),
    };

    setItems(prev => [...prev, newItem]);
    setProcedureName('');
    setPackageCost('');
    setProcedureNotes('');
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePresetClick = (preset) => {
    setProcedureName(preset.name);
    const count = selectedTeeth.length > 0 ? selectedTeeth.length : 1;
    setPackageCost((preset.defaultCost * count).toString());
  };

  const handleSaveQuotation = async () => {
    let listToSave = [...items];
    if (listToSave.length === 0) {
      if (procedureName.trim() && Number(packageCost) > 0) {
        const teethArr = [...selectedTeeth];
        listToSave.push({
          procedure: procedureName.trim(),
          teeth: teethArr,
          toothDisplay: teethArr.length > 0 ? teethArr.map(id => getToothDisplayName(id, numberingSystem)).join(', ') : 'General',
          totalCost: Number(packageCost),
          unitCost: teethArr.length > 0 ? Math.round((Number(packageCost) / teethArr.length) * 100) / 100 : Number(packageCost),
          quantity: teethArr.length > 0 ? teethArr.length : 1,
          notes: procedureNotes.trim(),
        });
      } else {
        toast.error('Please add at least one treatment procedure to the quotation');
        return;
      }
    }

    setLoading(true);
    try {
      const validUntilDate = new Date(Date.now() + Number(validityDays) * 24 * 60 * 60 * 1000);
      const cleanDoctorName = (doctorName || selectedDoctor?.name || 'Attending Doctor').trim();

      const payload = {
        patientId,
        doctorId: selectedDoctorId || undefined,
        doctorName: cleanDoctorName,
        items: listToSave,
        discount: Number(discount) || 0,
        taxAmount: Number(taxAmount) || 0,
        validUntil: validUntilDate,
        notes: notes.trim(),
        patientName: patientData?.fullName || patientData?.name,
        patientPhone: patientData?.mobile || patientData?.phone,
        patientAge: patientData?.age,
        patientGender: patientData?.gender,
        patientAddress: patientData?.address,
      };

      let res = null;
      if (existingQuotation?._id) {
        res = await dentistApi.updateQuotation(existingQuotation._id, payload);
        toast.success('Treatment Quotation updated successfully!');
      } else {
        res = await dentistApi.createQuotation(patientId, payload);
        toast.success('Treatment Quotation created successfully!');
      }

      if (onSuccess) onSuccess(res?.quotation || res);
      onClose();
    } catch (err) {
      console.error('Error saving quotation:', err);
      toast.error('Failed to save quotation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!existingQuotation?._id) {
      toast.info('Please save the quotation first to download official PDF.');
      return;
    }
    setDownloading(true);
    try {
      const blob = await dentistApi.downloadQuotationPDF(existingQuotation._id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quotation-${existingQuotation.quotationNumber || 'Estimate'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      console.error('Error downloading quotation PDF:', err);
      toast.error('Could not download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    const phone = patientData?.mobile || patientData?.phone;
    if (!phone) {
      toast.error('Patient phone number is not available for WhatsApp');
      return;
    }

    const cleanClinicName = clinicInfo?.branding?.clinicName || clinicInfo?.clinicName || clinicInfo?.name || 'Dental Clinic';
    const cleanDoc = doctorName || selectedDoctor?.name || 'Attending Doctor';

    if (!existingQuotation?._id) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const summaryText = `Hello ${patientData?.fullName || patientData?.name || 'Patient'},\n\n` +
        `Here is your Treatment Cost Estimate from ${cleanClinicName} (Dr. ${cleanDoc}):\n\n` +
        items.map(it => `• ${it.procedure} (${it.toothDisplay}): ₹${it.totalCost}`).join('\n') +
        `\n\nTotal Estimated Amount: ₹${totalAmount}\n` +
        `Validity: ${validityDays} Days\n\n` +
        `${notes}\n\nThank you!`;

      const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(summaryText)}`;
      window.open(waUrl, '_blank');
      return;
    }

    setSendingWhatsApp(true);
    try {
      await dentistApi.sendQuotationWhatsApp(existingQuotation._id, { phone });
      toast.success('Quotation sent to patient via WhatsApp!');
    } catch (err) {
      console.warn('API WhatsApp send failed, opening direct WhatsApp link:', err);
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const summaryText = `Hello ${existingQuotation.patientName || 'Patient'},\n\n` +
        `Here is your Treatment Cost Estimate (${existingQuotation.quotationNumber}) from ${cleanClinicName} (Dr. ${cleanDoc}):\n\n` +
        existingQuotation.items.map(it => `• ${it.procedure} (${it.toothDisplay}): ₹${it.totalCost}`).join('\n') +
        `\n\nTotal Estimated Amount: ₹${existingQuotation.totalAmount}\n` +
        `Validity: ${validityDays} Days\n\nThank you!`;
      const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(summaryText)}`;
      window.open(waUrl, '_blank');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <>
      {/* 
        ========================================================================
        ISOLATED PRINT STYLESHEET
        Ensures #quotation-print-area prints cleanly with zero blank pages,
        and hides the entire modal overlay during printing.
        ========================================================================
      */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            visibility: hidden !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          #quotation-print-area,
          #quotation-print-area * {
            visibility: visible !important;
          }
          #quotation-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            padding: 10mm 15mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            z-index: 99999999 !important;
            display: block !important;
          }
        }
      `}} />

      {/* 
        ========================================================================
        MODAL DIALOG (Screen UI)
        Has .no-print to ensure it is completely omitted when printing.
        ========================================================================
      */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm overflow-y-auto no-print">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-50 to-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                    {existingQuotation ? `Edit Quotation (${existingQuotation.quotationNumber})` : 'Create Treatment Quotation / Estimate'}
                  </h3>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">
                    Mock Bill / Estimate
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-bold">
                  Patient: <span className="text-slate-900 font-black">{patientData?.fullName || patientData?.name || 'Patient'}</span> 
                  {patientData?.patientId && ` (ID: ${patientData.patientId})`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab switch */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'editor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5 inline mr-1" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 inline mr-1" /> Preview
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'editor' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Column: Input Form (7 cols) */}
                <div className="md:col-span-7 space-y-4">
                  
                  {/* Active Teeth Selection Indicator */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700">Teeth for this Quotation:</span>
                      <span className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                        {selectedTeeth.length > 0 ? `${selectedTeeth.length} Teeth Selected` : 'General / Consultation'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-600 truncate max-w-[220px]">
                      {selectedTeeth.length > 0 ? selectedTeeth.map(id => getToothDisplayName(id, numberingSystem)).join(', ') : 'None specific'}
                    </span>
                  </div>

                  {/* Procedure Selection & Cost Box */}
                  <div className="bg-amber-50/60 border-2 border-amber-200/80 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-amber-600" /> Add Proposed Treatment
                      </span>
                      <span className="text-[10px] font-bold text-amber-800">
                        Consolidated Package Amount
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                        Procedure Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Root Canal Treatment (RCT), Full Ceramic Crown..."
                        value={procedureName}
                        onChange={(e) => setProcedureName(e.target.value)}
                        className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 bg-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex justify-between">
                          <span>Total Estimated Cost</span>
                          <span className="text-amber-600 font-bold">₹</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 9000"
                          value={packageCost}
                          onChange={(e) => setPackageCost(e.target.value)}
                          className="border border-amber-300 bg-white rounded-xl px-3 py-2 text-sm font-black text-amber-950 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                          Item Remark / Shade (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Includes pre-op X-ray"
                          value={procedureNotes}
                          onChange={(e) => setProcedureNotes(e.target.value)}
                          className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 bg-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddProcedure}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-all shadow-md shadow-amber-600/20 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add to Quotation Queue
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Quick Dental Presets (Click to Auto-fill):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-[130px] overflow-y-auto pr-1">
                      {DENTAL_PROCEDURE_PRESETS.map((proc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePresetClick(proc)}
                          className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-slate-800 hover:text-amber-950 border border-slate-200 hover:border-amber-400 text-[10px] font-black rounded-lg transition-colors cursor-pointer select-none"
                        >
                          + {proc.name.replace(/ Treatment| Placement| Surgery/g, '')} (₹{proc.defaultCost})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Doctor Selector & Validity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center justify-between">
                        <span>Attending Doctor (Clinic)</span>
                        {loadingDoctors && <span className="text-[9px] text-amber-600 animate-pulse font-normal">Loading...</span>}
                      </label>
                      <select
                        value={selectedDoctorId}
                        onChange={handleDoctorChange}
                        className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 bg-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="">-- Select Organization Doctor --</option>
                        {doctorsList.map((doc) => {
                          const dId = doc._id || doc.id;
                          const dName = doc.name || `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
                          const dSpec = doc.specialization || 'Dental Surgeon';
                          return (
                            <option key={dId} value={dId}>
                              Dr. {dName} ({dSpec})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                        Doctor Display Name
                      </label>
                      <input
                        type="text"
                        placeholder="Dr. Full Name"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 bg-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                        Quotation Validity (Days)
                      </label>
                      <select
                        value={validityDays}
                        onChange={(e) => setValidityDays(e.target.value)}
                        className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 bg-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="15">15 Days</option>
                        <option value="30">30 Days (Standard)</option>
                        <option value="60">60 Days</option>
                        <option value="90">90 Days</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                        Clinic Name (Read-Only)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={clinicInfo?.branding?.clinicName || clinicInfo?.clinicName || clinicInfo?.name || 'Clinic Profile'}
                        className="border border-slate-200 bg-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* General Terms & Notes */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      Notes & Clinical Terms on Quotation
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 bg-white outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>

                </div>

                {/* Right Column: Quotation Queue & Financial Summary (5 cols) */}
                <div className="md:col-span-5 flex flex-col justify-between space-y-4 bg-slate-50/80 border border-slate-200/80 p-4 rounded-2xl">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Quotation Items ({items.length})
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Consolidated Table View
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2 mt-3 max-h-[220px] overflow-y-auto pr-1">
                      {items.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs italic font-medium">
                          No treatments added to quotation yet. Use the form on left to add.
                        </div>
                      ) : (
                        items.map((item, idx) => (
                          <div key={idx} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-xs text-slate-900 truncate">{item.procedure}</p>
                              <p className="text-[11px] font-bold text-indigo-700">
                                {item.toothDisplay}
                              </p>
                              {item.notes && (
                                <p className="text-[10px] text-slate-500 italic truncate">{item.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-black text-slate-900">
                                ₹{item.totalCost}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="border-t border-slate-200 pt-3 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Subtotal:</span>
                      <span>₹{subtotal}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">Discount (₹):</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-24 text-right border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold text-rose-600 outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">GST / Tax (₹):</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={taxAmount}
                        onChange={(e) => setTaxAmount(e.target.value)}
                        className="w-24 text-right border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                      />
                    </div>

                    <div className="flex justify-between items-center text-sm font-black text-amber-950 pt-2 border-t border-dashed border-slate-300">
                      <span className="uppercase tracking-wider">Total Estimate:</span>
                      <span className="text-xl font-black text-amber-700">₹{totalAmount}</span>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* Tab 2: Clean On-Screen Live Preview */
              <div className="bg-slate-100 p-4 rounded-2xl flex justify-center overflow-x-auto">
                <QuotationDocument
                  clinicInfo={clinicInfo}
                  doctorName={doctorName}
                  selectedDoctor={selectedDoctor}
                  patientData={patientData}
                  existingQuotation={existingQuotation}
                  validityDays={validityDays}
                  items={items}
                  notes={notes}
                  subtotal={subtotal}
                  discount={discount}
                  taxAmount={taxAmount}
                  totalAmount={totalAmount}
                />
              </div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> {downloading ? 'Downloading...' : 'PDF'}
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={sendingWhatsApp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {sendingWhatsApp ? 'Sending...' : 'WhatsApp'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuotation}
                disabled={loading}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-amber-600/20 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Quotation'}
              </button>
            </div>
          </div>

        </motion.div>
      </div>

      {/* 
        ========================================================================
        PORTAL PRINT CONTAINER
        Mounted directly into document.body with id="quotation-print-area"
        and class "print-only". It is invisible on screen and rendered 
        exclusively when printing, regardless of which tab is active!
        ========================================================================
      */}
      {createPortal(
        <div id="quotation-print-area" className="print-only">
          <QuotationDocument
            clinicInfo={clinicInfo}
            doctorName={doctorName}
            selectedDoctor={selectedDoctor}
            patientData={patientData}
            existingQuotation={existingQuotation}
            validityDays={validityDays}
            items={items}
            notes={notes}
            subtotal={subtotal}
            discount={discount}
            taxAmount={taxAmount}
            totalAmount={totalAmount}
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default DentalQuotationModal;
