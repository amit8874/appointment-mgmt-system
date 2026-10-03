import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Shield, Download, FileText } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const DentalConsentFormModal = ({ isOpen, onClose, patientData = {}, initialFormType = 'general' }) => {
  const { user } = useAuth();
  const clinicInfo = user?.organization || user?.organizationId || {};

  // Form type state: 'general' | 'endodontic' | 'extraction'
  const [selectedForm, setSelectedForm] = useState(initialFormType);

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

    // Extraction specific
    teethToRemove: '',

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
      if (initialFormType) {
        setSelectedForm(initialFormType);
      }

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
        teethToRemove: '',
      }));
    }
  }, [isOpen, patientData, clinicInfo, user, initialFormType]);

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

  const formTypes = [
    { id: 'general', title: 'General Dental Consent Form' },
    { id: 'endodontic', title: 'Endodontic Therapy (Root Canal) Consent' },
    { id: 'extraction', title: 'Removal of Teeth (Extraction) Consent' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h4 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" /> Dental Treatment Consent Form
            </h4>
            <p className="text-xs opacity-90 font-semibold mt-0.5">
              Fill details for {formData.patientName || 'Patient'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Form Selector Dropdown */}
            <div className="relative flex items-center">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 mr-2 hidden md:inline">Form Type:</span>
              <select
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
                className="bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                {formTypes.map(ft => (
                  <option key={ft.id} value={ft.id}>
                    {ft.title}
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-all font-bold cursor-pointer text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quick Tab Switcher Pills */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar">
          {formTypes.map(ft => (
            <button
              key={ft.id}
              onClick={() => setSelectedForm(ft.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedForm === ft.id 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {ft.title}
            </button>
          ))}
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ========================================================================= */}
          {/* ORIGINAL GENERAL DENTAL CONSENT FORM (EXACT RESTORATION) */}
          {/* ========================================================================= */}
          {selectedForm === 'general' && (
            <>
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
            </>
          )}

          {/* ========================================================================= */}
          {/* FORM TYPE 2: ENDODONTIC THERAPY (ROOT CANAL) CONSENT FORM (Image 1) */}
          {/* ========================================================================= */}
          {selectedForm === 'endodontic' && (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-5 text-slate-800 shadow-sm">
              <div className="text-center border-b pb-4">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{formData.clinicName}</h3>
                <p className="text-xs font-bold text-indigo-600 tracking-wide mt-0.5">Where Care Meets Excellence</p>
                <h4 className="text-lg font-black uppercase text-slate-800 mt-3 underline decoration-indigo-500 decoration-2">CONSENT FORM</h4>
              </div>

              <div className="space-y-4 text-xs font-medium leading-relaxed text-slate-700">
                <p>
                  We would like our patients to be informed about the various procedures involved in endodontics therapy and have their consent before starting treatment. Conservative root canal therapy or endodontic surgery might be required for complete treatment of the tooth. The following discusses possible risks that may occur from endodontic treatment and other treatment choices.
                </p>

                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h5 className="font-extrabold text-slate-900 text-xs">Risks Specific to Endodontic Therapy</h5>
                  <p className="font-semibold text-slate-700 text-[11px]">The risks include:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px] font-medium">
                    <li>The possibility of instruments breakage within the root canals; extra openings of the crown or root of the tooth.</li>
                    <li>Damaged bridges, existing fillings, crowns or porcelain veneers.</li>
                    <li>Loss of tooth structure in gaining access to canals.</li>
                    <li>Cracked teeth.</li>
                    <li>During treatment, complications may occur which make treatment impossible or which may require dental surgery.</li>
                  </ul>
                </div>

                <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h5 className="font-extrabold text-slate-900 text-xs">Other Treatment Choices</h5>
                  <p className="text-slate-600 text-[11px]">
                    These include no treatment, waiting for more definite development of symptoms or tooth extraction. Risks involved in these choices might include pain, infection, swelling, loss of teeth and infection to other areas.
                  </p>
                </div>

                <div className="space-y-1 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <h5 className="font-extrabold text-indigo-900 text-xs">Consent</h5>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    I, the undersigned, being the patient (parents or guardian of minor patient) consent to the performing of procedures decided upon to be necessary or advisable in the opinion of the doctor. I understand that root canal treatment is an attempt to save a tooth that might otherwise require extraction. Although root canal therapy has a very high degree of success, it cannot be guaranteed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORM TYPE 3: REMOVAL OF TEETH (EXTRACTION) CONSENT FORM (Image 2) */}
          {/* ========================================================================= */}
          {selectedForm === 'extraction' && (
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-5 text-slate-800 shadow-sm">
              <div className="text-center border-b pb-4">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{formData.clinicName}</h3>
                <h4 className="text-base font-extrabold uppercase text-slate-800 mt-1">CONSENT FORM</h4>
                <h5 className="text-sm font-black uppercase text-indigo-700 tracking-wider mt-0.5">REMOVAL OF TEETH (EXTRACTION)</h5>
              </div>

              {/* Teeth specified field */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Teeth to be removed / Tooth Numbers (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tooth #18, Upper Right Molar"
                  value={formData.teethToRemove}
                  onChange={(e) => handleInputChange('teethToRemove', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-4 text-xs font-medium leading-relaxed text-slate-700">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-normal leading-relaxed text-[11px] space-y-3">
                  <p>
                    Alternative to removal has been explained to me (Root Canal Therapy, Crowns, Periodontal Surgery, etc.) and I authorize the Dentist to remove the following teeth. I understand removing teeth does not always remove all infection if present and it may be necessary to have further treatment.
                  </p>
                  <p>
                    I understand the risk involved is having teeth removed, some of which are pain, swelling, and spread of infection, dry socket, loss of feeling in my teeth, lips, tongue, and surrounding tissue (paraesthesia) that can last for an indefinite period of time or fracture jaw. I understand I may need further treatment by a specialist or even hospitalization if complications arise during or following treatment, the cost of which is my responsibility.
                  </p>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[10px] font-extrabold text-amber-900 uppercase tracking-wide">
                  NOTE: We Will use the Mobile Number you have given us for calling you in Future for Feedback Calls, Birthday Wishes & Offers etc.
                </div>
              </div>
            </div>
          )}

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
      {/* PRINT-ONLY CONTAINER (Invisible on screen, styled paper layouts) */}
      {/* ========================================================================= */}
      {createPortal(
        <div className="print-only w-full max-w-full text-black bg-white font-sans p-2 sm:p-4" style={{ boxSizing: 'border-box' }}>
          
          {/* PRINT VIEW: GENERAL DENTAL CONSENT FORM (EXACT ORIGINAL FORM & STAMP) */}
          {selectedForm === 'general' && (
            <div className="w-full h-full p-6 flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
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
          )}

          {/* PRINT VIEW: ENDODONTIC THERAPY CONSENT FORM (Image 1 Format) */}
          {selectedForm === 'endodontic' && (
            <div className="w-full max-w-full flex flex-col justify-between text-slate-900 font-sans leading-relaxed px-2" style={{ boxSizing: 'border-box' }}>
              <div>
                {/* Header */}
                <div className="text-center mb-5">
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-0.5">{formData.clinicName}</h1>
                  <p className="text-xs font-bold text-slate-700 mb-3">Where Care Meets Excellence</p>
                  <h2 className="text-base font-black uppercase tracking-widest text-slate-900 inline-block border-b-2 border-slate-900 pb-0.5">CONSENT FORM</h2>
                </div>

                {/* Introductory paragraph */}
                <p className="text-[11px] font-medium text-justify mb-4 leading-relaxed">
                  We would like our patients to be informed about the various procedures involved in endodontics therapy and have their consent before starting treatment. Conservative root canal therapy or endodontic surgery might be required for complete treatment of the tooth. The following discusses possible risks that may occur from endodontic treatment and other treatment choices.
                </p>

                {/* Risks Section */}
                <div className="mb-4">
                  <h3 className="text-xs font-black text-slate-900 mb-1">Risks Specific to Endodontic Therapy</h3>
                  <p className="text-[11px] font-bold text-slate-800 mb-1">The risks include:</p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] font-medium text-slate-800">
                    <li>The possibility of instruments breakage within the root canals; extra openings of the crown or root of the tooth.</li>
                    <li>Damaged bridges, existing fillings, crowns or porcelain veneers.</li>
                    <li>Loss of tooth structure in gaining access to canals.</li>
                    <li>Cracked teeth.</li>
                    <li>During treatment, complications may occur which make treatment impossible or which may require dental surgery.</li>
                  </ul>
                </div>

                {/* Other Treatment Choices */}
                <div className="mb-4">
                  <h3 className="text-xs font-black text-slate-900 mb-1">Other Treatment Choices</h3>
                  <p className="text-[11px] font-medium text-justify leading-relaxed">
                    These include no treatment, waiting for more definite development of symptoms or tooth extraction. Risks involved in these choices might include pain, infection, swelling, loss of teeth and infection to other areas.
                  </p>
                </div>

                {/* Consent Section */}
                <div className="mb-6">
                  <h3 className="text-xs font-black text-slate-900 mb-1">Consent</h3>
                  <p className="text-[11px] font-medium text-justify leading-relaxed">
                    I, the undersigned, being the patient (parents or guardian of minor patient) consent to the performing of procedures decided upon to be necessary or advisable in the opinion of the doctor. I understand that root canal treatment is an attempt to save a tooth that might otherwise require extraction. Although root canal therapy has a very high degree of success, it cannot be guaranteed.
                  </p>
                </div>

                {/* Footer Signature Fields */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[11px] font-bold pt-4 border-t border-slate-300 mt-8">
                  <div className="flex items-baseline">
                    <span className="w-20 shrink-0">DATE:</span>
                    <span className="border-b border-slate-900 flex-1 pl-1">{formData.consentDate}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 shrink-0">NAME:</span>
                    <span className="border-b border-slate-900 flex-1 pl-1">{formData.patientName || '________________________'}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 shrink-0">MOBILE NO.:</span>
                    <span className="border-b border-slate-900 flex-1 pl-1">{formData.patientContact || '________________________'}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 shrink-0">SIGN:</span>
                    <span className="border-b border-slate-900 flex-1 pl-1">________________________</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* PRINT VIEW: REMOVAL OF TEETH (EXTRACTION) CONSENT FORM (Image 2 Format - Single Copy) */}
          {selectedForm === 'extraction' && (
            <div className="w-full max-w-full flex flex-col justify-between text-slate-900 font-sans leading-relaxed px-2" style={{ boxSizing: 'border-box' }}>
              <div>
                {/* Header */}
                <div className="text-center mb-6">
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-0.5">{formData.clinicName}</h1>
                  <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-900">CONSENT FORM</h2>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mt-0.5">REMOVAL OF TEETH (EXTRACTION)</h3>
                </div>

                {/* Main Body Paragraph */}
                <div className="space-y-4 text-[11px] font-medium text-justify mb-6 leading-relaxed">
                  {formData.teethToRemove && (
                    <div className="p-2.5 bg-slate-100 rounded-lg font-bold text-slate-900 border border-slate-300">
                      Tooth / Teeth to be removed: <span className="underline">{formData.teethToRemove}</span>
                    </div>
                  )}

                  <p>
                    Alternative to removal has been explained to me (Root Canal Therapy, Crowns, Periodontal Surgery, etc.) and I authorize the Dentist to remove the following teeth. I understand removing teeth does not always remove all infection if present and it may be necessary to have further treatment. I understand the risk involved is having teeth removed, some of which are pain, swelling, and spread of infection, dry socket, loss of feeling in my teeth, lips, tongue, and surrounding tissue (paraesthesia) that can last for an indefinite period of time or fracture jaw. I understand I may need further treatment by a specialist or even hospitalization if complications arise during or following treatment, the cost of which is my responsibility.
                  </p>

                  <p className="font-bold text-slate-900 uppercase pt-2">
                    NOTE: We Will use the Mobile Number you have given us for calling you in Future for Feedback Calls, Birthday Wishes & Offers etc.
                  </p>
                </div>

                {/* Single Copy Footer Signatures */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[11px] font-bold pt-6 border-t border-slate-300 mt-12">
                  <div className="flex items-baseline">
                    <span className="w-20 shrink-0">DATE:</span>
                    <span className="border-b border-slate-900 flex-1 pl-1">{formData.consentDate}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 shrink-0">NAME:</span>
                    <span className="border-b border-slate-900 flex-1 pl-1">{formData.patientName || '________________________'}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 shrink-0">MOBILE NO.:</span>
                    <span className="border-b border-slate-900 flex-1 pl-1">{formData.patientContact || '________________________'}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 shrink-0">SIGN:</span>
                    <span className="border-b border-slate-900 flex-1 pl-1">________________________</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>,
        document.body
      )}

    </div>
  );
};

export default DentalConsentFormModal;
