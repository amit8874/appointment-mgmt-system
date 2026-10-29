import React from 'react';

const PrintablePrescription = ({ 
  template, 
  orgTemplateUrl,
  printableArea,
  headerArea,
  bodyArea,
  templateMode,
  aiHeaderArea,
  aiBodyArea,
  fontSize,
  isTemplateEnabled,
  prescription, 
  patient, 
  clinicName, 
  clinicContact,
  clinicEmail,
  clinicWebsite,
  clinicAddress,
  clinicLogo,
  footerBarcode,
  footerText,
  footerSubText,
  barcodeText,
  doctor
}) => {
  if (!prescription) return null;

  let parsedNotes = null;
  try {
    const raw = prescription?.notes || prescription?.description || prescription?.content || (prescription?.medications ? prescription : null);
    if (typeof raw === 'string' && raw.trim().startsWith('{')) {
      parsedNotes = JSON.parse(raw);
    } else if (typeof raw === 'object' && raw !== null) {
      parsedNotes = raw;
    }
  } catch (e) {
    parsedNotes = null;
  }

  // 1. Context / Title
  const contextTitle = prescription?.title || (parsedNotes?.isDental ? 'Dental Examination & Prescription' : '');

  // 2. Medical & Dental History
  const finalMedicalHistoryText = parsedNotes?.medicalHistory || '';
  const kcoMedicationText = parsedNotes?.kcoMedication || parsedNotes?.kco || '';
  // If user entered dentalHistory explicitly, use it; otherwise fallback to medicalDentalHistory
  const finalDentalHistoryText = parsedNotes?.dentalHistory || parsedNotes?.medicalDentalHistory || '';

  // 3. Oral Examination Findings
  const activeOralExamItems = (() => {
    if (!parsedNotes?.oralExamination) return [];
    if (typeof parsedNotes.oralExamination === 'string') {
      return [parsedNotes.oralExamination];
    }
    const labelMap = {
      stains: 'Stains',
      calculus: 'Calculus',
      decayedTeeth: 'Decayed Teeth',
      grosslyDecayedTeeth: 'Grossly Decayed Teeth',
      mobileTeeth: 'Mobile Teeth',
      top: 'Tenderness on Percussion (TOP)',
      otherFindings: 'Other Findings'
    };
    const items = [];
    Object.entries(parsedNotes.oralExamination).forEach(([key, val]) => {
      if (val && (val.active || (typeof val === 'string' && val.trim() !== ''))) {
        const label = labelMap[key] || key;
        const severity = val.severity ? ` (${val.severity})` : '';
        const notes = val.notes ? `: ${val.notes}` : '';
        items.push(`${label}${severity}${notes}`);
      }
    });
    return items;
  })();

  // 4. Affected Teeth / Odontogram Findings & Procedures (Grouped cleanly)
  const teethChartItems = (() => {
    if (Array.isArray(parsedNotes?.selectedTeeth) && parsedNotes.selectedTeeth.length > 0) {
      const groups = new Map();
      parsedNotes.selectedTeeth.forEach(t => {
        const proc = t.procedure || t.condition || 'Procedure';
        const notes = t.notes ? ` (${t.notes})` : '';
        const key = `${proc}:::${notes}`;
        if (!groups.has(key)) groups.set(key, { proc, notes, teeth: [] });
        groups.get(key).teeth.push(String(t.toothId || t.toothNumber));
      });

      return Array.from(groups.values()).map(({ proc, notes, teeth }) => {
        if (teeth.length >= 28) {
          return `Full Mouth (All Teeth): ${proc}${notes}`;
        }
        if (teeth.length > 1) {
          return `Teeth #${teeth.join(', #')}: ${proc}${notes}`;
        }
        return `Tooth #${teeth[0]}: ${proc}${notes}`;
      });
    }
    return [];
  })();

  // 5. Done Today / Treatment Performed Today
  const treatmentPerformedToday = parsedNotes?.treatmentPerformedToday || parsedNotes?.procedureDone || '';

  // 6. Treatment Planned / Treatment
  const treatmentPlannedText = (() => {
    if (parsedNotes?.treatmentPlanned) return parsedNotes.treatmentPlanned;
    if (Array.isArray(parsedNotes?.treatmentPlans) && parsedNotes.treatmentPlans.length > 0) {
      return parsedNotes.treatmentPlans.map(t => typeof t === 'string' ? t : (t.procedure || t.name || t.treatmentName)).filter(Boolean).join(', ');
    }
    if (Array.isArray(parsedNotes?.dentalTreatments) && parsedNotes.dentalTreatments.length > 0) {
      return parsedNotes.dentalTreatments.map(t => typeof t === 'string' ? t : (t.procedure || t.name || t.treatmentName)).filter(Boolean).join(', ');
    }
    return '';
  })();

  // 7. Diagnosis Text
  const diagnosisList = (() => {
    if (Array.isArray(parsedNotes?.diagnosis) && parsedNotes.diagnosis.length > 0) {
      return parsedNotes.diagnosis.map(d => typeof d === 'string' ? d : (d.name || '')).filter(Boolean);
    }
    if (typeof parsedNotes?.diagnosis === 'string' && parsedNotes.diagnosis.trim()) {
      return [parsedNotes.diagnosis.trim()];
    }
    if (prescription?.diagnosis) {
      return Array.isArray(prescription.diagnosis) ? prescription.diagnosis : [prescription.diagnosis];
    }
    return [];
  })();

  // 8. Complaints List
  const complaintsList = (() => {
    if (Array.isArray(parsedNotes?.complaints) && parsedNotes.complaints.length > 0) {
      return parsedNotes.complaints.map(c => {
        if (typeof c === 'string') return c;
        const dur = c.duration ? ` (${c.duration})` : (parsedNotes?.complaintDuration ? ` (${parsedNotes.complaintDuration})` : '');
        return `${c.name || ''}${dur}`.trim();
      }).filter(Boolean);
    }
    if (typeof parsedNotes?.complaints === 'string' && parsedNotes.complaints.trim()) {
      const dur = parsedNotes?.complaintDuration ? ` (${parsedNotes.complaintDuration})` : '';
      return [`${parsedNotes.complaints.trim()}${dur}`];
    }
    if (prescription?.complaints?.length) {
      return prescription.complaints.map(c => typeof c === 'string' ? c : (c.name || '')).filter(Boolean);
    }
    if (parsedNotes?.chiefComplaint) {
      const dur = parsedNotes?.complaintDuration ? ` (${parsedNotes.complaintDuration})` : '';
      return [`${parsedNotes.chiefComplaint}${dur}`];
    }
    if (prescription?.chiefComplaint) return [prescription.chiefComplaint];
    if (prescription?.symptoms) return [prescription.symptoms];
    return [];
  })();

  // 9. Examination List (General / Physical / Vitals)
  const examinationList = (() => {
    if (Array.isArray(parsedNotes?.examination) && parsedNotes.examination.length > 0) {
      return parsedNotes.examination.map(e => typeof e === 'string' ? e : (e.name || '')).filter(Boolean);
    }
    if (typeof parsedNotes?.examination === 'string' && parsedNotes.examination.trim()) {
      return [parsedNotes.examination.trim()];
    }
    if (parsedNotes?.physicalExamination) {
      return [parsedNotes.physicalExamination];
    }
    if (parsedNotes?.vitals && Object.values(parsedNotes.vitals).some(v => v)) {
      const vStr = Object.entries(parsedNotes.vitals)
        .filter(([_,v]) => v)
        .map(([k,v]) => `${k.replace('_', ' ')}: ${v}`)
        .join(', ');
      return [`Vitals: ${vStr}`];
    }
    return [];
  })();

  // 10. Advice
  const adviceText = parsedNotes?.advice || prescription?.advice || '';

  // 11. Next Visit / Follow Up
  const nextVisitDateStr = (() => {
    const nv = parsedNotes?.nextAppointmentDate || parsedNotes?.followUpDate || prescription?.followUpDate;
    if (!nv) return '';
    try {
      const d = new Date(nv);
      if (isNaN(d.getTime())) return String(nv);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      return String(nv);
    }
  })();

  const nextVisitNotesText = parsedNotes?.nextAppointmentNotes || parsedNotes?.doctorNotes || parsedNotes?.visitNotes || prescription?.doctorNotes || '';
  const nextVisitText = nextVisitDateStr ? (nextVisitNotesText ? `${nextVisitDateStr} (${nextVisitNotesText})` : nextVisitDateStr) : '';

  // 12. Investigation List
  const investigationList = (() => {
    if (Array.isArray(parsedNotes?.testsRequested) && parsedNotes.testsRequested.length > 0) {
      return parsedNotes.testsRequested.map(t => typeof t === 'string' ? t : (t.name || t));
    }
    if (Array.isArray(parsedNotes?.investigation) && parsedNotes.investigation.length > 0) {
      return parsedNotes.investigation.map(i => typeof i === 'string' ? i : (i.name || i));
    }
    if (typeof parsedNotes?.investigation === 'string' && parsedNotes.investigation.trim()) {
      return [parsedNotes.investigation.trim()];
    }
    return [];
  })();

  // 13. Medications List
  const medicationsList = parsedNotes?.medications || prescription?.medications || [];

  // Helper to format medication frequency
  const formatFrequencyDashes = (freq) => {
    if (!freq) return '-';
    const clean = String(freq).trim();
    if (clean === '1-0-1') return '1 - 0 - 1';
    if (clean === '1-0-0') return '1 - 0 - 0';
    if (clean === '0-0-1') return '0 - 0 - 1';
    if (clean === '0-1-0') return '0 - 1 - 0';
    if (clean === '1-1-1') return '1 - 1 - 1';
    if (clean === '1-1-1-1') return '1 - 1 - 1 - 1';
    return clean;
  };

  const formatDuration = (dur) => {
    if (!dur) return '-';
    const clean = String(dur).trim();
    if (/^\d+$/.test(clean)) return `${clean} Day(S)`;
    if (/^\d+\s*d(ays?)?$/i.test(clean)) {
      const num = clean.match(/\d+/)[0];
      return `${num} Day(S)`;
    }
    return clean;
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http')) return path; 
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const serverUrl = baseUrl.replace(/\/api$/, '') || 'http://localhost:5000';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${serverUrl}${cleanPath}`;
  };

  // A4 letterhead is ONLY used when explicitly selected by the doctor (global_a4).
  // Oviaan Default Template (default) NEVER uses the admin's uploaded background template.
  const isA4 = Boolean(orgTemplateUrl) && isTemplateEnabled !== false && (template?._id === 'global_a4' || template?.headerType === 'a4' || template?.layoutType === 'a4');

  const baseFontSize = fontSize || 12;

  // Format Patient Name & Designation cleanly without double titles
  const { formattedPatientName, patientDisplayFullName } = (() => {
    const rawFullName = patient?.fullName || '';
    const rawFirst = patient?.firstName || '';
    const rawLast = patient?.lastName || '';
    const rawPatientName = parsedNotes?.patientName || '';
    
    let name = rawFullName.trim() || `${rawFirst} ${rawLast}`.trim() || rawPatientName.trim() || 'Patient';
    
    const prefixRegex = /^(MR|MRS|MS|MISS|DR|PROF|SHRI|SMT|BABY|MASTER)\.?$/i;
    let parts = name.split(/\s+/).filter(Boolean);
    
    let embeddedPrefix = '';
    while (parts.length > 0 && prefixRegex.test(parts[0])) {
      if (!embeddedPrefix) {
        embeddedPrefix = parts[0].replace(/\./g, '').toUpperCase();
      }
      parts.shift();
    }
    
    const cleanName = parts.length > 0 ? parts.join(' ') : name;
    
    let des = (patient?.designation || '').trim().replace(/\./g, '').toUpperCase();
    const gender = (patient?.gender || '').toLowerCase();
    
    if (!des) {
      des = embeddedPrefix;
    } else if (gender === 'female' && (des === 'MR' || des === 'SHRI')) {
      if (['MISS', 'MRS', 'MS', 'SMT'].includes(embeddedPrefix)) {
        des = embeddedPrefix;
      } else {
        des = 'MS';
      }
    }
    
    const titleMap = {
      'MR': 'Mr.',
      'MRS': 'Mrs.',
      'MS': 'Ms.',
      'MISS': 'Miss',
      'DR': 'Dr.',
      'PROF': 'Prof.',
      'SHRI': 'Shri',
      'SMT': 'Smt.',
      'BABY': 'Baby',
      'MASTER': 'Master'
    };
    
    const formattedPrefix = des ? (titleMap[des] || des) : '';
    const fullDisplayName = formattedPrefix ? `${formattedPrefix} ${cleanName}` : cleanName;
    
    return {
      formattedPatientName: cleanName,
      patientDisplayFullName: fullDisplayName
    };
  })();
  const patientDisplayAgeGender = `${patient?.age || '--'} ${patient?.ageType || 'Year'}(s)/${patient?.gender || '--'}`;
  
  // Real Patient ID without artificial OPD prefix or mock fallbacks
  const displayPatientId = patient?.customPatientId || patient?.patientId || prescription?.patientId || parsedNotes?.patientId || '';
  
  // Real patient phone
  const patientMobile = patient?.mobile || patient?.phone || patient?.contactNumber || patient?.patientPhone || prescription?.patientPhone || '';
  
  const rawDate = prescription?.date || parsedNotes?.examinationDate || parsedNotes?.date;
  const consultationDateStr = (() => {
    if (!rawDate) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    }
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return String(rawDate);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      return String(rawDate);
    }
  })();

  // Doctor details - REAL DATA ONLY, NO MOCK FALLBACKS
  const doctorObj = doctor || prescription?.doctor || null;
  const doctorRawName = doctorObj?.name || prescription?.doctorName || '';
  const doctorFormattedName = doctorRawName 
    ? (doctorRawName.toLowerCase().startsWith('dr') ? doctorRawName : `Dr. ${doctorRawName}`) 
    : '';
  const doctorQual = doctorObj?.qualification || prescription?.doctorQualification || prescription?.qualification || '';
  const rawDocSpec = doctorObj?.specialization || doctorObj?.specialty || prescription?.doctorSpecialization || prescription?.specialty || '';
  const specLower = rawDocSpec.trim().toLowerCase();
  const doctorSpecialization = (specLower === 'dental' || specLower === 'dentist' || specLower === 'dental surgeon') ? '' : rawDocSpec;
  const doctorRegNo = doctorObj?.registrationNumber || doctorObj?.licenseNumber || prescription?.registrationNumber || '';
  const doctorSignatureUrl = getImageUrl(doctorObj?.doctorSignature || prescription?.doctorSignature);
  const doctorStampUrl = getImageUrl(doctorObj?.doctorStamp || prescription?.doctorStamp);
  const footerBarcodeUrl = getImageUrl(footerBarcode || prescription?.footerBarcode);

  // Sub-qualifications / credentials lines - only real doctor education
  const doctorSubCreds = (() => {
    const edu = doctorObj?.education || prescription?.education;
    if (edu && Array.isArray(edu) && edu.length > 0) {
      return edu.map(e => `${e.degree || ''}${e.university ? `: ${e.university}` : ''}`).filter(Boolean);
    }
    const bio = doctorObj?.bio || prescription?.bio;
    if (bio) {
      const lines = bio.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) return lines.slice(0, 4);
    }
    return [];
  })();

  const doctorRegionalTitle = doctorObj?.specializationHindi || doctorObj?.secondaryTitle || prescription?.specializationHindi || '';
  const visitingConsultantText = doctorObj?.visitingConsultant || doctorObj?.affiliations || prescription?.visitingConsultant || '';
  
  // Dental specialization detection
  const isDental = Boolean(
    parsedNotes?.isDental || 
    (prescription?.title && prescription.title.toLowerCase().includes('dental')) ||
    (doctorSpecialization && doctorSpecialization.toLowerCase().includes('dent')) ||
    (rawDocSpec && rawDocSpec.toLowerCase().includes('dent')) ||
    (doctorQual && (doctorQual.toLowerCase().includes('bds') || doctorQual.toLowerCase().includes('mds')))
  );

  // Red strip banner: replace with "DENTAL EXAMINATION & PRESCRIPTION" for dental
  const bannerText = isDental ? 'DENTAL EXAMINATION & PRESCRIPTION' : (prescription?.title || 'PRESCRIPTION').toUpperCase();

  // Center clinic footer notice (in red strip) and additional footer sub-text (plain black text without strip)
  const resolvedFooterText = footerText || prescription?.footerText || parsedNotes?.footerText || '';
  let resolvedFooterSubText = 
    footerSubText || 
    prescription?.footerSubText || 
    parsedNotes?.footerSubText || 
    prescription?.additionalFooterNote || 
    parsedNotes?.additionalFooterNote || 
    '';
  if (!resolvedFooterSubText && (prescription?.customFooterText || parsedNotes?.customFooterText)) {
    const custom = prescription?.customFooterText || parsedNotes?.customFooterText;
    if (custom !== resolvedFooterText) {
      resolvedFooterSubText = custom;
    }
  }
  if (resolvedFooterSubText === resolvedFooterText) {
    resolvedFooterSubText = '';
  }

  // Doctor last name for digital signature fallback
  const doctorLastName = (() => {
    if (!doctorRawName) return '';
    const parts = doctorRawName.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/);
    return parts[parts.length - 1] || parts[0] || '';
  })();

  return (
    <div 
      className="bg-white w-[210mm] h-[297mm] max-w-[210mm] max-h-[297mm] mx-auto flex flex-col relative overflow-hidden" 
      style={{ backgroundColor: 'white', color: '#1e293b', boxSizing: 'border-box', fontSize: `${baseFontSize}px`, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      
      {/* A4 Background Image (Only if custom A4 template is actively chosen) */}
      {isA4 && orgTemplateUrl && (
        <img 
          src={getImageUrl(orgTemplateUrl)} 
          alt="A4 Background" 
          className="absolute inset-0 w-[210mm] h-[297mm] object-contain pointer-events-none" 
          style={{ zIndex: 0 }} 
        />
      )}

      {/* ========================================================= */}
      {/* 1. A4 MODE: LETTERHEAD PRE-PRINTED PAD OVERLAY             */}
      {/* ========================================================= */}
      {isA4 ? (
        <>
          {/* Header Margins Area */}
          <div
            style={{
              position: 'absolute',
              top: `${(headerArea?.top ?? 45)}mm`,
              left: `${(headerArea?.left ?? 10)}mm`,
              right: `${(headerArea?.right ?? 10)}mm`,
              minHeight: `${(headerArea?.height ?? 25)}mm`,
              zIndex: 10,
              fontSize: `${baseFontSize}px`,
              boxSizing: 'border-box'
            }}
          >
            <div className="flex items-center justify-between gap-4 mb-2 w-full">
              <div className="flex items-baseline gap-2 flex-1 min-w-0 pr-4">
                <span className="font-bold text-slate-800 whitespace-nowrap">Name :</span>
                <span className="flex-1 font-semibold text-slate-900 border-b-[1.5px] border-dotted border-slate-600 pb-0.5 truncate">
                  {patientDisplayFullName}
                </span>
              </div>
              <div className="flex items-baseline gap-2 shrink-0 min-w-[140px] justify-end">
                <span className="font-bold text-slate-800 whitespace-nowrap">Age / Sex</span>
                <span className="font-semibold text-slate-900 border-b-[1.5px] border-dotted border-slate-600 pb-0.5 min-w-[65px] text-center">
                  {patientDisplayAgeGender}
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-4 w-full">
              <div className="flex items-baseline gap-2 shrink-0 min-w-[160px]">
                <span className="font-bold text-slate-800 whitespace-nowrap">Date :</span>
                <span className="font-semibold text-slate-900 border-b-[1.5px] border-dotted border-slate-600 pb-0.5 min-w-[90px]">
                  {consultationDateStr}
                </span>
              </div>
              <div className="flex items-baseline gap-2 flex-1 min-w-0">
                <span className="font-bold text-slate-800 whitespace-nowrap">Chief Complain :</span>
                <span className="flex-1 font-semibold text-slate-900 border-b-[1.5px] border-dotted border-slate-600 pb-0.5 truncate">
                  {complaintsList.join(', ') || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Body Area */}
          <div
            style={{
              position: 'absolute',
              top: `${(bodyArea?.top ?? 75)}mm`,
              bottom: `${(bodyArea?.bottom ?? 25)}mm`,
              left: `${(bodyArea?.left ?? 12)}mm`,
              right: `${(bodyArea?.right ?? 12)}mm`,
              zIndex: 10,
              fontSize: `${baseFontSize}px`,
              boxSizing: 'border-box',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="relative z-10 w-full flex-1">
              {medicationsList.length > 0 && (
                <table className="w-full text-left text-xs mb-4 border-collapse border border-slate-700">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-700 text-slate-900 font-bold text-[11px]">
                      <th className="py-1.5 px-2.5 border-r border-slate-700 text-center w-[5%]">#</th>
                      <th className="py-1.5 px-3 border-r border-slate-700 w-[35%]">Medicine</th>
                      <th className="py-1.5 px-2 border-r border-slate-700 text-center w-[12%]">Dose</th>
                      <th className="py-1.5 px-2.5 border-r border-slate-700 w-[16%]">Timing</th>
                      <th className="py-1.5 px-2.5 border-r border-slate-700 text-center w-[16%]">Frequency</th>
                      <th className="py-1.5 px-2.5 text-center w-[16%]">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {medicationsList.map((m, idx) => (
                      <tr key={idx} className="border-b border-slate-700">
                        <td className="py-2 px-2 border-r border-slate-700 text-center font-bold text-slate-700 align-top">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-700 align-top">
                          <div className="font-bold text-slate-900 text-xs">{m.name}</div>
                          {(m.composition || m.genericName) && (
                            <div className="text-[10px] text-slate-600 font-medium italic mt-0.5">
                              {m.composition || m.genericName}
                            </div>
                          )}
                          {m.instructions && (
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                              {m.instructions}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-700 text-center text-slate-900 font-semibold align-top whitespace-nowrap">
                          {m.dose || m.form || '-'}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-700 text-slate-800 font-medium align-top">
                          {m.when || '-'}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-700 text-center font-bold text-slate-900 align-top whitespace-nowrap">
                          {m.frequency ? formatFrequencyDashes(m.frequency) : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-center font-bold text-slate-900 align-top whitespace-nowrap">
                          {m.duration ? formatDuration(m.duration) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {adviceText && (
                <div className="text-xs mb-3">
                  <span className="font-bold text-slate-900 underline">Advice:</span>{' '}
                  <span className="font-medium text-slate-800 whitespace-pre-line italic">"{adviceText}"</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ========================================================= */
        /* 2. OVIAAN DEFAULT TEMPLATE (REAL DATA ONLY)               */
        /* ========================================================= */
        <div className="w-full flex flex-col flex-1 relative z-10 px-8 py-6 text-slate-800 h-full justify-between" style={{ boxSizing: 'border-box' }}>
          
          <div>
            {/* 1. TOP HEADER (Clinic on Left, Doctor on Right) */}
            <div className="flex justify-between items-start gap-4 pb-2 border-b border-slate-200">
              {/* Left Column: Clinic Details */}
              <div className="flex items-start gap-3.5 flex-1 max-w-[55%]">
                {clinicLogo ? (
                  <img 
                    src={getImageUrl(clinicLogo)} 
                    alt="Clinic Logo" 
                    className="w-24 h-24 max-w-[100px] max-h-[100px] object-contain rounded-full flex-shrink-0 mt-0.5 border border-slate-200 p-1 bg-white shadow-xs" 
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full flex-shrink-0 mt-0.5 border-4 border-indigo-500/40 flex items-center justify-center p-1 bg-gradient-to-br from-indigo-50 to-blue-100 shadow-xs">
                    <span className="font-black text-indigo-800 text-2xl">{clinicName ? clinicName.charAt(0) : 'C'}</span>
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <h2 className="text-xl font-black text-indigo-950 leading-tight">
                    {clinicName || "Clinic"}
                  </h2>
                  <div className="text-[11px] text-slate-600 mt-1 space-y-0.5 leading-snug font-medium">
                    {clinicAddress && <p>{clinicAddress}</p>}
                    {clinicWebsite && <p>Website: <span className="font-bold text-slate-800">{clinicWebsite}</span></p>}
                    {clinicEmail && <p>{clinicEmail}</p>}
                    {clinicContact && <p className="font-bold text-red-600">Contact NO.: {clinicContact}</p>}
                  </div>
                </div>
              </div>

              {/* Right Column: Doctor Details */}
              <div className="flex flex-col text-right flex-1 max-w-[45%] items-end">
                {doctorFormattedName && (
                  <h1 className="text-xl font-black text-indigo-950 leading-tight">
                    {doctorFormattedName}
                  </h1>
                )}
                {doctorQual && (
                  <div className="text-xs font-bold text-red-600 mt-0.5">
                    {doctorQual}
                  </div>
                )}
                {doctorSpecialization && (!doctorQual || !doctorQual.toLowerCase().includes(doctorSpecialization.toLowerCase())) && (
                  <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                    {doctorSpecialization}
                  </div>
                )}
                {doctorSubCreds.length > 0 && (
                  <div className="text-[10px] text-slate-600 mt-1 space-y-0.5 font-medium leading-tight">
                    {doctorSubCreds.map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                )}
                {doctorRegionalTitle && (
                  <p className="font-bold text-red-600 text-[11px] mt-0.5">{doctorRegionalTitle}</p>
                )}
              </div>
            </div>

            {/* Visiting Consultant Line (ONLY if present) */}
            {visitingConsultantText && (
              <div className="py-1 text-center text-[10px] font-bold text-slate-600 tracking-tight">
                {visitingConsultantText}
              </div>
            )}

            {/* Specialty Banner Bar (ONLY if present) */}
            {bannerText && (
              <div className="bg-[#a83244] text-white py-1 px-4 rounded-md text-center text-[11px] font-bold uppercase tracking-wider shadow-xs mb-3">
                {bannerText}
              </div>
            )}

            {/* Patient Information Box */}
            <div className="border border-slate-300 rounded-lg p-2.5 mb-3 text-xs bg-white text-slate-800">
              <div className="grid grid-cols-3 gap-2 pb-1.5 border-b border-slate-100">
                <div>
                  <span className="font-bold text-slate-700">Patient ID: </span>
                  <span className="font-semibold text-slate-900">{displayPatientId || '--'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Name: </span>
                  <span className="font-semibold text-slate-900">{patientDisplayFullName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Age/Gender: </span>
                  <span className="font-semibold text-slate-900">{patientDisplayAgeGender}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1.5">
                <div>
                  <span className="font-bold text-slate-700">Mobile No.: </span>
                  <span className="font-semibold text-slate-900">{patientMobile || '--'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Consultation Dt: </span>
                  <span className="font-semibold text-slate-900">{consultationDateStr}</span>
                </div>
                <div></div>
              </div>
            </div>

            {/* Clinical Findings & Order (Strictly 1 to 9 as requested) */}
            <div className="space-y-1.5 mb-3 text-xs leading-snug">
              {/* 1. Chief Complaints */}
              {complaintsList.length > 0 && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Chief Complaints:</span>{' '}
                  <span className="font-medium text-slate-800">{complaintsList.join(', ')}</span>
                </div>
              )}

              {/* 2. Medical History */}
              {finalMedicalHistoryText && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Medical History:</span>{' '}
                  <span className="font-medium text-slate-800">{finalMedicalHistoryText}</span>
                </div>
              )}
              {kcoMedicationText && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">K/C/O - Medication:</span>{' '}
                  <span className="font-semibold text-slate-800">{kcoMedicationText}</span>
                </div>
              )}

              {/* 3. Dental History */}
              {finalDentalHistoryText && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Dental History:</span>{' '}
                  <span className="font-medium text-slate-800">{finalDentalHistoryText}</span>
                </div>
              )}

              {/* 4. Oral Examination */}
              {activeOralExamItems.length > 0 && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Oral Examination:</span>{' '}
                  <span className="font-medium text-slate-800">{activeOralExamItems.join(', ')}</span>
                </div>
              )}
              {examinationList.length > 0 && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">General Examination:</span>{' '}
                  <span className="font-medium text-slate-800">{examinationList.join(', ')}</span>
                </div>
              )}

              {/* 5. Diagnosis */}
              {diagnosisList.length > 0 && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Diagnosis:</span>{' '}
                  <span className="font-semibold text-slate-800">{diagnosisList.join(', ')}</span>
                </div>
              )}

              {/* 6. Teeth Chart */}
              {teethChartItems.length > 0 && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Teeth Chart:</span>{' '}
                  <span className="font-bold text-slate-900">{teethChartItems.join(', ')}</span>
                </div>
              )}

              {/* 7. Treatment Plan */}
              {treatmentPlannedText && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Treatment Plan:</span>{' '}
                  <span className="font-semibold text-slate-800">{treatmentPlannedText}</span>
                </div>
              )}

              {/* 8. Treatment Done Today */}
              {treatmentPerformedToday && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Treatment Done Today:</span>{' '}
                  <span className="font-semibold text-emerald-900">{treatmentPerformedToday}</span>
                </div>
              )}
            </div>

            {/* 9. Prescribed Medicine */}
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="font-bold text-base text-slate-900">Rx:</span>
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Prescribed Medicine</span>
            </div>

            {/* Medications Table */}
            {medicationsList.length > 0 ? (
              <table className="w-full text-left text-xs mb-3 border-collapse border border-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-700 text-slate-900 font-bold text-[11px]">
                    <th className="py-1.5 px-2.5 border-r border-slate-700 text-center w-[5%]">#</th>
                    <th className="py-1.5 px-3 border-r border-slate-700 w-[35%]">Medicine</th>
                    <th className="py-1.5 px-2 border-r border-slate-700 text-center w-[12%]">Dose</th>
                    <th className="py-1.5 px-2.5 border-r border-slate-700 w-[16%]">Timing</th>
                    <th className="py-1.5 px-2.5 border-r border-slate-700 text-center w-[16%]">Frequency</th>
                    <th className="py-1.5 px-2.5 text-center w-[16%]">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {medicationsList.map((m, idx) => (
                    <tr key={idx} className="border-b border-slate-700">
                      <td className="py-2 px-2 border-r border-slate-700 text-center font-bold text-slate-700 align-top">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-700 align-top">
                        <div className="font-bold text-slate-900 text-xs">{m.name}</div>
                        {(m.composition || m.genericName) && (
                          <div className="text-[10px] text-slate-600 font-medium mt-0.5 italic">
                            {m.composition || m.genericName}
                          </div>
                        )}
                        {m.instructions && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                            {m.instructions}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 border-r border-slate-700 text-center text-slate-900 font-semibold align-top whitespace-nowrap">
                        {m.dose || m.form || '-'}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-700 text-slate-800 font-medium align-top">
                        {m.when || '-'}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-700 text-center font-bold text-slate-900 align-top whitespace-nowrap">
                        {m.frequency ? formatFrequencyDashes(m.frequency) : '-'}
                      </td>
                      <td className="py-2 px-2.5 text-center font-bold text-slate-900 align-top whitespace-nowrap">
                        {m.duration ? formatDuration(m.duration) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 border border-slate-300 rounded-lg text-center text-xs text-slate-500 mb-3 italic">
                {prescription.notes || 'No medications listed.'}
              </div>
            )}

            {/* Advice, Next Visit & Investigation */}
            <div className="space-y-1.5 mb-3 text-xs leading-snug">
              {adviceText && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Advice:</span>{' '}
                  <span className="font-medium text-slate-800 whitespace-pre-line italic">"{adviceText}"</span>
                </div>
              )}

              {nextVisitDateStr && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Next Visit:</span>{' '}
                  <span className="font-bold text-indigo-950">{nextVisitDateStr}</span>
                </div>
              )}

              {nextVisitNotesText && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Notes:</span>{' '}
                  <span className="font-medium text-slate-800 whitespace-pre-line">{nextVisitNotesText}</span>
                </div>
              )}

              {investigationList.length > 0 && (
                <div>
                  <span className="font-bold text-slate-900 underline underline-offset-2">Investigation:</span>{' '}
                  <span className="font-medium text-slate-800">{investigationList.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            {/* Doctor Signature & Stamp Area (Bottom Right) */}
            <div className="flex justify-end mb-2">
              <div className="flex flex-col items-center text-center min-w-[200px]">
                {/* Doctor Signature (ONLY if uploaded) */}
                {doctorSignatureUrl && (
                  <img src={doctorSignatureUrl} alt="Signature" className="h-12 object-contain mb-1" />
                )}
                
                {doctorFormattedName && (
                  <div className="text-xs font-bold text-slate-900">
                    {doctorFormattedName}
                  </div>
                )}
                {doctorRegNo && (
                  <div className="text-[10px] text-slate-600 font-medium">
                    {isDental ? 'Dental Registration Number' : 'Medical Registration Number'} : {doctorRegNo}
                  </div>
                )}

                {/* Doctor Stamp (ONLY if uploaded) */}
                {doctorStampUrl && (
                  <img src={doctorStampUrl} alt="Doctor Stamp" className="h-16 object-contain mt-1" />
                )}
              </div>
            </div>

            {/* Footer Bar (Barcode on Left ONLY if uploaded + Custom Footer Text) */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between w-full">
              {/* Barcode on Left: ONLY if uploaded by admin */}
              <div className="flex flex-col items-center justify-start shrink-0 min-w-[96px] max-w-[120px] text-center">
                {footerBarcodeUrl ? (
                  <img 
                    src={footerBarcodeUrl} 
                    alt="Prescription QR Code" 
                    className="w-20 h-20 object-contain border border-slate-200 p-1 rounded bg-white shadow-xs" 
                    onError={(e) => {
                      console.warn("Failed to load footer barcode image:", footerBarcodeUrl);
                    }}
                  />
                ) : null}
              </div>

              {/* Clinic Custom Footer Notice (Red strip) + Additional Footer Sub-Text (Plain black text directly below) */}
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                {resolvedFooterText ? (
                  <div className="border border-red-200 bg-red-50/70 rounded-md py-1 px-4 max-w-lg shadow-2xs">
                    <p className="font-bold text-red-600 text-[10px] tracking-wide uppercase leading-tight whitespace-pre-line">
                      {resolvedFooterText}
                    </p>
                  </div>
                ) : null}
                {resolvedFooterSubText ? (
                  <p 
                    style={{ color: '#000000', fontSize: '10px', fontWeight: 500, lineHeight: 1.35, textAlign: 'center', marginTop: '4px', whiteSpace: 'pre-line', maxWidth: '440px' }}
                    className="font-medium text-black text-[10px] leading-tight text-center mt-1 whitespace-pre-line max-w-lg"
                  >
                    {resolvedFooterSubText}
                  </p>
                ) : null}
              </div>

              {/* Right Spacer for balance */}
              <div className="w-24 shrink-0"></div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default PrintablePrescription;
