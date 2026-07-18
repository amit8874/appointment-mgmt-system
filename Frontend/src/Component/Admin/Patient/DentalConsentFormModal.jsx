import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Shield, Download } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const DentalConsentFormModal = ({ isOpen, onClose, patientData = {} }) => {
  const { user } = useAuth();
  const clinicInfo = user?.organization || user?.organizationId || {};

  // Form states
  const [formData, setFormData] = useState({
    clinicName: '',
    clinicAddress: '',
    clinicPhone: '',
    patientName: '',
    patientAge: '',
    patientGender: '',
    patientContact: '',
    patientAddress: '',
    consentDate: new Date().toISOString().split('T')[0],
    dentistName: '',

    // Medical History
    diabetes: false,
    hypertension: false,
    heartDisease: false,
    hepatitis: false,
    allergies: false,
    allergiesDetail: '',
    pregnancy: false,
    otherMedical: false,
    otherMedicalDetail: '',
    currentMedications: '',

    // Treatment Details
    toothExtraction: false,
    rct: false,
    filling: false,
    scaling: false,
    crown: false,
    denture: false,
    otherTreatment: false,
    otherTreatmentDetail: '',

    // Consent Checklist
    consentNature: true,
    consentAlternative: true,
    consentRisks: true,
    consentHistory: true,
    consentNoGuarantee: true,

    // Optional
    photoConsent: false,
  });

  // Pre-populate data when modal opens
  useEffect(() => {
    if (isOpen) {
      // Format clinic address
      let addrStr = '';
      if (clinicInfo.address) {
        if (typeof clinicInfo.address === 'string') {
          addrStr = clinicInfo.address;
        } else {
          const { street, city, state, zipCode, country } = clinicInfo.address;
          addrStr = [street, city, state, zipCode, country].filter(Boolean).join(', ');
        }
      }

      setFormData(prev => ({
        ...prev,
        clinicName: clinicInfo.name || clinicInfo.clinicName || 'Dentique Optimal Dental Care',
        clinicAddress: addrStr || 'Naval Kishore Road, Hazratganj',
        clinicPhone: clinicInfo.phone || clinicInfo.mobile || '7355374131, 7991815142',
        patientName: patientData.name || patientData.fullName || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || '',
        patientAge: patientData.age || '',
        patientGender: patientData.gender || '',
        patientContact: patientData.mobile || patientData.phone || patientData.contactNumber || patientData.contact || '',
        patientAddress: patientData.address || '',
        dentistName: patientData.assignedDoctor || user?.name || '',
        consentDate: new Date().toISOString().split('T')[0],
      }));
    }
  }, [isOpen, patientData, clinicInfo, user]);

  if (!isOpen) return null;

  const handleCheckboxChange = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h4 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" /> Dental Treatment Consent Form
            </h4>
            <p className="text-xs opacity-90 font-semibold mt-0.5">
              Fill details for {formData.patientName || 'Patient'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Clinic & Patient General Info */}
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">General Information</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Clinic Name</label>
                <input 
                  type="text" 
                  value={formData.clinicName}
                  onChange={(e) => handleInputChange('clinicName', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Clinic Phone</label>
                <input 
                  type="text" 
                  value={formData.clinicPhone}
                  onChange={(e) => handleInputChange('clinicPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Clinic Address</label>
                <input 
                  type="text" 
                  value={formData.clinicAddress}
                  onChange={(e) => handleInputChange('clinicAddress', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                />
              </div>
            </div>

            <hr className="border-slate-200/60 my-4" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Patient Name</label>
                <input 
                  type="text" 
                  value={formData.patientName}
                  onChange={(e) => handleInputChange('patientName', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Age / Gender</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Age"
                    value={formData.patientAge}
                    onChange={(e) => handleInputChange('patientAge', e.target.value)}
                    className="w-1/2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                  />
                  <input 
                    type="text" 
                    placeholder="Gender"
                    value={formData.patientGender}
                    onChange={(e) => handleInputChange('patientGender', e.target.value)}
                    className="w-1/2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contact Number</label>
                <input 
                  type="text" 
                  value={formData.patientContact}
                  onChange={(e) => handleInputChange('patientContact', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Patient Address</label>
                <input 
                  type="text" 
                  value={formData.patientAddress}
                  onChange={(e) => handleInputChange('patientAddress', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date</label>
                <input 
                  type="date" 
                  value={formData.consentDate}
                  onChange={(e) => handleInputChange('consentDate', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Medical History Form */}
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Medical History</h5>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'diabetes', label: 'Diabetes' },
                  { id: 'hypertension', label: 'Hypertension' },
                  { id: 'heartDisease', label: 'Heart Disease' },
                  { id: 'hepatitis', label: 'Hepatitis' },
                  { id: 'pregnancy', label: 'Pregnancy' },
                ].map(item => (
                  <label key={item.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-150 rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData[item.id]} 
                      onChange={() => handleCheckboxChange(item.id)}
                      className="rounded text-indigo-650"
                    />
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-150 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.allergies} 
                    onChange={() => handleCheckboxChange('allergies')}
                    className="rounded text-indigo-650"
                  />
                  <span className="text-xs font-bold text-slate-700">Allergies (specify)</span>
                </label>
                {formData.allergies && (
                  <input 
                    type="text" 
                    placeholder="Specify allergies..."
                    value={formData.allergiesDetail}
                    onChange={(e) => handleInputChange('allergiesDetail', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                  />
                )}

                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-150 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.otherMedical} 
                    onChange={() => handleCheckboxChange('otherMedical')}
                    className="rounded text-indigo-650"
                  />
                  <span className="text-xs font-bold text-slate-700">Other Medical Conditions</span>
                </label>
                {formData.otherMedical && (
                  <input 
                    type="text" 
                    placeholder="Specify other conditions..."
                    value={formData.otherMedicalDetail}
                    onChange={(e) => handleInputChange('otherMedicalDetail', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                  />
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Current Medications</label>
                  <input 
                    type="text" 
                    placeholder="List current medications..."
                    value={formData.currentMedications}
                    onChange={(e) => handleInputChange('currentMedications', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Treatment Details Form */}
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Treatment Details</h5>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Select dental procedures advised:</p>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'toothExtraction', label: 'Tooth Extraction' },
                  { id: 'rct', label: 'Root Canal Treatment (RCT)' },
                  { id: 'filling', label: 'Filling / Restoration' },
                  { id: 'scaling', label: 'Scaling & Polishing' },
                  { id: 'crown', label: 'Crown / Bridge' },
                  { id: 'denture', label: 'Denture' },
                ].map(item => (
                  <label key={item.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-150 rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData[item.id]} 
                      onChange={() => handleCheckboxChange(item.id)}
                      className="rounded text-indigo-650"
                    />
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-150 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.otherTreatment} 
                    onChange={() => handleCheckboxChange('otherTreatment')}
                    className="rounded text-indigo-650"
                  />
                  <span className="text-xs font-bold text-slate-700">Other Procedure</span>
                </label>
                {formData.otherTreatment && (
                  <input 
                    type="text" 
                    placeholder="Specify procedure..."
                    value={formData.otherTreatmentDetail}
                    onChange={(e) => handleInputChange('otherTreatmentDetail', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Consent Statement and dentist name */}
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Consent and Signatures</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Attending Dentist Name</label>
                <input 
                  type="text" 
                  value={formData.dentistName}
                  onChange={(e) => handleInputChange('dentistName', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-150 rounded-xl cursor-pointer w-full">
                  <input 
                    type="checkbox" 
                    checked={formData.photoConsent} 
                    onChange={() => handleCheckboxChange('photoConsent')}
                    className="rounded text-indigo-650"
                  />
                  <span className="text-xs font-bold text-slate-700">Optional: Consent for clinical photographs</span>
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                import('react-toastify').then(({ toast }) => {
                  toast.info("Tip: Select 'Save as PDF' as the Destination in the print window to download the PDF.", { autoClose: 6000 });
                });
                handlePrint();
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-colors shadow-lg cursor-pointer font-bold"
            >
              <Download className="w-4 h-4" /> Save as PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-colors shadow-lg cursor-pointer font-bold"
            >
              <Printer className="w-4 h-4" /> Print Form
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY CONTAINER (Invisible on screen, styled exactly like paper form) */}
      {/* ========================================================================= */}
      {createPortal(
        <div className="print-only w-[210mm] h-[297mm] text-black bg-white font-sans" style={{ boxSizing: 'border-box' }}>
          <div className="w-full h-full p-8 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
            
            <div>
              {/* Header Black Banner */}
              <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-xl border border-slate-950 mb-3">
                <div className="flex items-center gap-3">
                  {clinicInfo.branding?.logo ? (
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center p-1 overflow-hidden shrink-0 border border-slate-700">
                      <img src={clinicInfo.branding.logo} alt="Clinic Logo" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-900 font-black text-base border border-slate-350 shrink-0">
                      ➕
                    </div>
                  )}
                  <div>
                    <h1 className="text-base font-black tracking-tight uppercase">
                      DENTAL TREATMENT CONSENT FORM
                    </h1>
                  </div>
                </div>
                {/* Tooth logo on the right */}
                <div className="shrink-0 opacity-95">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C10.5 2 9 3 9 4.5c0 1.5-1 2.5-2.5 3.5C5 9 4 10 4 12c0 3 1.5 6 4 8.5V22h8v-1.5c2.5-2.5 4-5.5 4-8.5 0-2-1-3-2.5-4C16 7 15 6 15 4.5c0-1.5-1.5-2.5-3-2.5z" />
                    <path d="M12 9v4M10 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Clinic Details Block */}
              <div className="grid grid-cols-3 gap-4 mb-3 border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-[11px] font-bold">
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Clinic Name</div>
                  <div className="text-slate-800">{formData.clinicName}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Phone Number</div>
                  <div className="text-slate-800">{formData.clinicPhone}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Clinic Address</div>
                  <div className="text-slate-800 leading-tight">{formData.clinicAddress}</div>
                </div>
              </div>

              {/* Section 1 & 2 side by side */}
              <div className="grid grid-cols-12 gap-4 mb-3">
                {/* Section 1: Patient Information */}
                <div className="col-span-6 flex flex-col">
                  <div className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-xs font-black uppercase mb-2 flex items-center gap-1.5">
                    <span className="bg-white text-slate-900 rounded-sm px-1 py-0.2 font-black text-[9px]">1</span>
                    PATIENT INFORMATION
                  </div>
                  <div className="space-y-1.5 flex-1 text-[11px] font-bold text-slate-800">
                    <div className="flex items-baseline">
                      <span className="text-slate-500 w-24 shrink-0 uppercase text-[9px] tracking-wider">Patient Name:</span>
                      <span className="border-b border-slate-200 flex-1 pl-1 pb-0.5 text-slate-900">{formData.patientName || '________________'}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-slate-500 w-24 shrink-0 uppercase text-[9px] tracking-wider">Age / Gender:</span>
                      <span className="border-b border-slate-200 flex-1 pl-1 pb-0.5 text-slate-900">
                        {formData.patientAge ? `${formData.patientAge} Yrs` : '____ Yrs'} • {formData.patientGender || '________'}
                      </span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-slate-500 w-24 shrink-0 uppercase text-[9px] tracking-wider">Contact Number:</span>
                      <span className="border-b border-slate-200 flex-1 pl-1 pb-0.5 text-slate-900">{formData.patientContact || '________________'}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-slate-500 w-24 shrink-0 uppercase text-[9px] tracking-wider">Address:</span>
                      <span className="border-b border-slate-200 flex-1 pl-1 pb-0.5 text-slate-900">{formData.patientAddress || '________________'}</span>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-slate-500 w-24 shrink-0 uppercase text-[9px] tracking-wider">Date:</span>
                      <span className="border-b border-slate-200 flex-1 pl-1 pb-0.5 text-slate-900">
                        {formData.consentDate ? new Date(formData.consentDate).toLocaleDateString('en-GB') : '___________'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Medical History */}
                <div className="col-span-6 flex flex-col">
                  <div className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-xs font-black uppercase mb-2 flex items-center gap-1.5">
                    <span className="bg-white text-slate-900 rounded-sm px-1 py-0.2 font-black text-[9px]">2</span>
                    MEDICAL HISTORY
                  </div>
                  <div className="space-y-1.5 text-[11px] font-bold text-slate-800">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {[
                        { key: 'diabetes', label: 'Diabetes' },
                        { key: 'hypertension', label: 'Hypertension' },
                        { key: 'heartDisease', label: 'Heart Disease' },
                        { key: 'hepatitis', label: 'Hepatitis' },
                        { key: 'pregnancy', label: 'Pregnancy' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-1.5">
                          {formData[item.key] ? (
                            <svg className="w-3.5 h-3.5 text-slate-900 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                            </svg>
                          )}
                          <span className="text-slate-800">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-baseline">
                        <span className="text-slate-500 shrink-0 uppercase text-[9px] tracking-wider mr-1.5">Allergies:</span>
                        <span className="border-b border-slate-200 flex-1 pl-1 pb-0.5 text-slate-900">{formData.allergies ? (formData.allergiesDetail || 'Yes (unspecified)') : 'None'}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-slate-500 shrink-0 uppercase text-[9px] tracking-wider mr-1.5">Other Medical:</span>
                        <span className="border-b border-slate-200 flex-1 pl-1 pb-0.5 text-slate-900">{formData.otherMedical ? (formData.otherMedicalDetail || 'Yes') : 'None'}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-slate-500 shrink-0 uppercase text-[9px] tracking-wider mr-1.5">Medications:</span>
                        <span className="border-b border-slate-200 flex-1 pl-1 pb-0.5 text-slate-900">{formData.currentMedications || 'None'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3 & 4 side by side */}
              <div className="grid grid-cols-12 gap-4 mb-3">
                {/* Section 3: Treatment Details */}
                <div className="col-span-6 flex flex-col">
                  <div className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-xs font-black uppercase mb-2 flex items-center gap-1.5">
                    <span className="bg-white text-slate-900 rounded-sm px-1 py-0.2 font-black text-[9px]">3</span>
                    TREATMENT DETAILS
                  </div>
                  <div className="space-y-1.5 text-[11px] font-bold text-slate-800">
                    <div className="grid grid-cols-1 gap-1">
                      {[
                        { key: 'toothExtraction', label: 'Tooth Extraction' },
                        { key: 'rct', label: 'Root Canal Treatment (RCT)' },
                        { key: 'filling', label: 'Filling / Restoration' },
                        { key: 'scaling', label: 'Scaling & Polishing' },
                        { key: 'crown', label: 'Crown / Bridge' },
                        { key: 'denture', label: 'Denture' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-1.5">
                          {formData[item.key] ? (
                            <svg className="w-3.5 h-3.5 text-slate-900 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                            </svg>
                          )}
                          <span className="text-slate-800">{item.label}</span>
                        </div>
                      ))}
                      <div className="flex items-baseline mt-1">
                        <span className="text-slate-500 shrink-0 uppercase text-[9px] tracking-wider mr-1.5">Other:</span>
                        <span className="border-b border-slate-200 flex-1 pl-1 pb-0.5 text-slate-900">{formData.otherTreatment ? (formData.otherTreatmentDetail || 'Yes') : 'None'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Consent Statement */}
                <div className="col-span-6 flex flex-col">
                  <div className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-xs font-black uppercase mb-2 flex items-center gap-1.5">
                    <span className="bg-white text-slate-900 rounded-sm px-1 py-0.2 font-black text-[9px]">4</span>
                    CONSENT STATEMENT
                  </div>
                  <div className="space-y-1.5 text-[10px] text-slate-800 font-bold leading-tight">
                    <div className="flex gap-1.5 items-start">
                      <svg className="w-3.5 h-3.5 text-slate-900 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Nature and purpose of the treatment explained.</span>
                    </div>

                    <div className="flex gap-1.5 items-start">
                      <svg className="w-3.5 h-3.5 text-slate-900 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Alternative options (if any) have been discussed.</span>
                    </div>

                    <div className="flex gap-1.5 items-start">
                      <svg className="w-3.5 h-3.5 text-slate-900 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>I am aware of risks: pain, swelling, bleeding, failure.</span>
                    </div>

                    <div className="flex gap-1.5 items-start">
                      <svg className="w-3.5 h-3.5 text-slate-900 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>I have shared my complete medical history.</span>
                    </div>

                    <div className="flex gap-1.5 items-start">
                      <svg className="w-3.5 h-3.5 text-slate-900 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>No guarantee has been made regarding the outcome.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Permission */}
              <div className="mb-3">
                <div className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-xs font-black uppercase mb-1.5 flex items-center gap-1.5">
                  <span className="bg-white text-slate-900 rounded-sm px-1 py-0.2 font-black text-[9px]">5</span>
                  PERMISSION
                </div>
                <div className="bg-slate-50 border-l-4 border-slate-900 p-2.5 rounded-r-xl text-xs font-black text-slate-800 italic leading-relaxed">
                  I hereby give my voluntary consent for the dental procedure(s) mentioned above.
                </div>
              </div>

              {/* Section 6: Signatures */}
              <div className="mb-3">
                <div className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-xs font-black uppercase mb-1.5 flex items-center gap-1.5">
                  <span className="bg-white text-slate-900 rounded-sm px-1 py-0.2 font-black text-[9px]">6</span>
                  SIGNATURES
                </div>
                
                <div className="grid grid-cols-2 gap-8 pt-3 pb-2 px-1">
                  <div className="flex flex-col justify-end space-y-4">
                    <div className="flex items-baseline text-[11px] font-bold text-slate-800">
                      <span className="text-slate-500 shrink-0 uppercase text-[9px] tracking-wider mr-1.5">Patient/Guardian Name:</span>
                      <span className="border-b border-slate-300 flex-1 pl-1 pb-0.5 text-slate-900">{formData.patientName || '__________________'}</span>
                    </div>
                    <div className="flex items-baseline text-[11px] font-bold text-slate-800 pt-3">
                      <span className="text-slate-500 shrink-0 uppercase text-[9px] tracking-wider mr-1.5">Signature:</span>
                      <span className="border-b border-slate-300 flex-1 pb-0.5"></span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-end space-y-4 relative pl-6 border-l border-slate-100">
                    <div className="flex items-baseline text-[11px] font-bold text-slate-800">
                      <span className="text-slate-500 shrink-0 uppercase text-[9px] tracking-wider mr-1.5">Attending Dentist:</span>
                      <span className="border-b border-slate-300 flex-1 pl-1 pb-0.5 text-slate-900">{formData.dentistName || '__________________'}</span>
                    </div>
                    <div className="flex items-baseline text-[11px] font-bold text-slate-800 pt-3 relative">
                      <span className="text-slate-500 shrink-0 uppercase text-[9px] tracking-wider mr-1.5">Signature & Stamp:</span>
                      <span className="border-b border-slate-300 flex-1 pb-0.5 h-6"></span>
                      
                      {/* Stamp Circle mockup matching the image */}
                      <div className="absolute right-2 -bottom-2 w-14 h-14 rounded-full border border-indigo-500/25 border-double flex items-center justify-center text-[7px] text-indigo-650/40 font-extrabold uppercase select-none rotate-12">
                        <div className="text-center leading-none scale-90">
                          <span>{formData.clinicName.slice(0, 12)}</span>
                          <br />
                          <span className="text-[5px]">CLINIC STAMP</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 7: Optional */}
              <div className="mb-3">
                <div className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-xs font-black uppercase mb-1.5 flex items-center gap-1.5">
                  <span className="bg-white text-slate-900 rounded-sm px-1 py-0.2 font-black text-[9px]">7</span>
                  OPTIONAL (FOR CLINICS)
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800 px-1 py-0.5">
                  {formData.photoConsent ? (
                    <svg className="w-3.5 h-3.5 text-slate-900 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" />
                    </svg>
                  )}
                  <span className="leading-tight text-slate-800">
                    I consent to the use of my clinical photographs for educational purposes (identity will remain confidential).
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Banner Footer with real address */}
            <div className="bg-slate-900 text-white text-center py-2 px-4 rounded-xl border border-slate-950 mt-auto shrink-0">
              <p className="text-[9px] font-black uppercase tracking-wide">
                Address - {formData.clinicAddress}
              </p>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default DentalConsentFormModal;
