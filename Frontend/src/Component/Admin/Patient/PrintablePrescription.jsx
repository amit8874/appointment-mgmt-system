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
  clinicAddress,
  clinicLogo
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

  // Medical & Dental History
  const medicalHistoryText = parsedNotes?.medicalDentalHistory || parsedNotes?.medicalHistory || '';

  // Oral Examination Findings
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

  // Selected Teeth (Odontogram)
  const selectedTeethList = (() => {
    if (!parsedNotes?.selectedTeeth || !Array.isArray(parsedNotes.selectedTeeth)) return [];
    return parsedNotes.selectedTeeth.map(t => {
      const tooth = t.toothId || t.toothNumber || t.id;
      const cond = t.condition || '';
      const notes = t.notes ? ` - ${t.notes}` : '';
      return `#${tooth} (${cond}${notes})`;
    });
  })();

  // Diagnosis Text
  const diagnosisList = (() => {
    if (Array.isArray(parsedNotes?.diagnosis)) {
      return parsedNotes.diagnosis.map(d => typeof d === 'string' ? d : (d.name || '')).filter(Boolean);
    }
    if (typeof parsedNotes?.diagnosis === 'string' && parsedNotes.diagnosis.trim()) {
      return [parsedNotes.diagnosis.trim()];
    }
    return [];
  })();

  // Treatment Plan
  const treatmentPlanList = (() => {
    const rawList = parsedNotes?.treatmentPlans || parsedNotes?.dentalTreatments || [];
    const fromArray = Array.from(new Set(rawList.map(t => typeof t === 'string' ? t : (t.procedure || t.name || t.treatmentName)).filter(Boolean)));
    if (fromArray.length > 0) return fromArray;
    if (typeof parsedNotes?.treatmentPlanned === 'string' && parsedNotes.treatmentPlanned.trim()) {
      return [parsedNotes.treatmentPlanned.trim()];
    }
    return [];
  })();

  // Procedure Done Today
  const procedureDoneToday = parsedNotes?.treatmentPerformedToday || '';

  const {
    headerType,
    headerImage,
    bodyType,
    bodyImage,
    footerType,
    footerImage,
  } = template || { headerType: 'default', bodyType: 'default', footerType: 'default' };

  // Helper to get full image URL
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http')) return path; 
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const serverUrl = baseUrl.replace(/\/api$/, '') || 'http://localhost:5000';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${serverUrl}${cleanPath}`;
  };

  const headerImageUrl = getImageUrl(headerImage);
  const bodyImageUrl = getImageUrl(bodyImage);
  const footerImageUrl = getImageUrl(footerImage);

  const isDefaultV2 = template?._id === 'default_v2';
  const isExplicitSystem = template?._id === 'default_v2' || template?._id === 'system_default';
  const isExplicitA4 = template?._id === 'global_a4' || template?.headerType === 'a4' || template?.layoutType === 'a4';
  
  // A4 letterhead mode active only if explicitly selected or default without non-A4 override and enabled
  const hasA4Template = isExplicitA4 || (!isExplicitSystem && Boolean(orgTemplateUrl) && isTemplateEnabled !== false);
  const isA4 = hasA4Template;

  const isAiMode = templateMode === 'ai_vision' || template?.templateMode === 'ai_vision';
  const effectiveHeader = isAiMode && (aiHeaderArea || template?.aiHeaderArea)
    ? (aiHeaderArea || template?.aiHeaderArea)
    : (headerArea || template?.headerArea);
  const effectiveBody = isAiMode && (aiBodyArea || template?.aiBodyArea)
    ? (aiBodyArea || template?.aiBodyArea)
    : (bodyArea || template?.bodyArea);

  const headerMargins = effectiveHeader || {
    top: printableArea?.top ? Math.max(10, printableArea.top - 15) : 45,
    left: printableArea?.left !== undefined ? printableArea.left : 10,
    right: printableArea?.right !== undefined ? printableArea.right : 10,
    height: 25
  };

  const bodyMargins = effectiveBody || {
    top: printableArea?.top ? printableArea.top + 15 : 75,
    bottom: printableArea?.bottom !== undefined ? printableArea.bottom : 25,
    left: printableArea?.left !== undefined ? printableArea.left : 12,
    right: printableArea?.right !== undefined ? printableArea.right : 12
  };

  const baseFontSize = fontSize || 12;

  // Format Patient Name
  const formattedPatientName = (() => {
    let name = patient?.fullName || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'Unknown';
    const prefixes = ['MR', 'MS', 'MRS', 'MISS', 'DR', 'SHRI', 'SMT'];
    let parts = name.split(/\s+/);
    while (parts.length > 1) {
      const p0 = parts[0].toUpperCase().replace(/\./g, '');
      const p1 = parts[1].toUpperCase().replace(/\./g, '');
      if (prefixes.includes(p0) && (p0 === p1 || p1.startsWith(p0))) {
        parts.shift();
      } else {
        break;
      }
    }
    return parts.join(' ');
  })();

  // Age / Sex
  const patientAgeSex = (() => {
    const age = patient?.age || '--';
    let sex = patient?.gender || '';
    if (sex.toLowerCase().startsWith('m')) sex = 'M';
    else if (sex.toLowerCase().startsWith('f')) sex = 'F';
    else if (!sex) sex = '--';
    return `${age}/${sex}`;
  })();

  // Chief Complaints Text
  const complaintsText = (() => {
    let text = '';
    if (parsedNotes?.complaints?.length) {
      text = parsedNotes.complaints.map(c => typeof c === 'string' ? c : (c.name || '')).filter(Boolean).join(', ');
    } else if (parsedNotes?.chiefComplaint) {
      text = parsedNotes.chiefComplaint;
    } else if (prescription?.chiefComplaint) {
      text = prescription.chiefComplaint;
    } else if (prescription?.complaints?.length) {
      text = prescription.complaints.map(c => typeof c === 'string' ? c : (c.name || '')).filter(Boolean).join(', ');
    }
    const dur = parsedNotes?.complaintDuration || parsedNotes?.duration;
    if (text && dur) {
      return `${text} (${dur})`;
    }
    return text;
  })();

  const patientMobile = patient?.mobile || patient?.phone || patient?.contactNumber || patient?.patientPhone || prescription?.patientPhone || 'N/A';

  return (
    <div 
      className="bg-white w-[210mm] h-[297mm] max-w-[210mm] max-h-[297mm] mx-auto flex flex-col relative overflow-hidden" 
      style={{ backgroundColor: 'white', color: 'black', boxSizing: 'border-box', fontSize: `${baseFontSize}px` }}
    >
      
      {/* A4 Background Image */}
      {isA4 && orgTemplateUrl && (
        <img 
          src={getImageUrl(orgTemplateUrl)} 
          alt="A4 Background" 
          className="absolute inset-0 w-[210mm] h-[297mm] object-contain pointer-events-none" 
          style={{ zIndex: 0 }} 
        />
      )}

      {/* ========================================================= */}
      {/* 1. A4 MODE: INDEPENDENT HEADER & BODY                      */}
      {/* ========================================================= */}
      {isA4 ? (
        <>
          {/* INDEPENDENT PATIENT HEADER AREA (Exact screenshot layout) */}
          <div
            style={{
              position: 'absolute',
              top: `${headerMargins.top}mm`,
              left: `${headerMargins.left}mm`,
              right: `${headerMargins.right}mm`,
              minHeight: `${headerMargins.height}mm`,
              zIndex: 10,
              fontSize: `${baseFontSize}px`,
              boxSizing: 'border-box'
            }}
          >
            {/* Line 1: Name and Age/Sex */}
            <div className="flex items-center justify-between gap-4 mb-2 w-full">
              <div className="flex items-baseline gap-2 flex-1 min-w-0 pr-4">
                <span className="font-bold text-slate-800 whitespace-nowrap" style={{ fontSize: `${baseFontSize}px` }}>Name :</span>
                <span className="flex-1 font-semibold text-slate-900 border-b-[1.5px] border-dotted border-slate-600 pb-0.5 truncate">
                  {formattedPatientName}
                </span>
              </div>
              <div className="flex items-baseline gap-2 shrink-0 min-w-[140px] justify-end">
                <span className="font-bold text-slate-800 whitespace-nowrap" style={{ fontSize: `${baseFontSize}px` }}>Age / Sex</span>
                <span className="font-semibold text-slate-900 border-b-[1.5px] border-dotted border-slate-600 pb-0.5 min-w-[65px] text-center">
                  {patientAgeSex}
                </span>
              </div>
            </div>

            {/* Line 2: Date and Chief Complain */}
            <div className="flex items-baseline gap-4 w-full">
              <div className="flex items-baseline gap-2 shrink-0 min-w-[160px]">
                <span className="font-bold text-slate-800 whitespace-nowrap" style={{ fontSize: `${baseFontSize}px` }}>Date :</span>
                <span className="font-semibold text-slate-900 border-b-[1.5px] border-dotted border-slate-600 pb-0.5 min-w-[90px]">
                  {new Date(prescription.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-baseline gap-2 flex-1 min-w-0">
                <span className="font-bold text-slate-800 whitespace-nowrap" style={{ fontSize: `${baseFontSize}px` }}>Chief Complain :</span>
                <span className="flex-1 font-semibold text-slate-900 border-b-[1.5px] border-dotted border-slate-600 pb-0.5 truncate">
                  {complaintsText || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* INDEPENDENT PRESCRIPTION BODY AREA (Rx, Medicines, Advice) */}
          <div
            style={{
              position: 'absolute',
              top: `${bodyMargins.top}mm`,
              bottom: `${bodyMargins.bottom}mm`,
              left: `${bodyMargins.left}mm`,
              right: `${bodyMargins.right}mm`,
              zIndex: 10,
              fontSize: `${baseFontSize}px`,
              boxSizing: 'border-box',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Custom Watermark */}
            {bodyType === 'custom' && bodyImageUrl && (
              <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
                <img src={bodyImageUrl} alt="Watermark" className="w-2/3 h-2/3 object-contain" />
              </div>
            )}

            {/* Clinical Content */}
            <div className="relative z-10 w-full flex-1">
              {parsedNotes ? (
                <>
                  {(parsedNotes.vitals || medicalHistoryText || activeOralExamItems.length > 0 || selectedTeethList.length > 0 || diagnosisList.length > 0 || treatmentPlanList.length > 0 || procedureDoneToday) && (
                    <div className="text-xs space-y-1.5 mb-3.5 border-b border-slate-200 pb-2.5">
                      {/* Vitals */}
                      {parsedNotes.vitals && Object.values(parsedNotes.vitals).some(v => v) && (
                        <p><span className="font-bold text-slate-700">Vitals:</span> {Object.entries(parsedNotes.vitals).filter(([_,v]) => v).map(([k,v]) => `${k.replace('_', ' ')}: ${v}`).join(', ')}</p>
                      )}

                      {/* Medical & Dental History */}
                      {medicalHistoryText && (
                        <p className="leading-snug">
                          <span className="font-bold text-slate-800">Medical & Dental History:</span>{' '}
                          <span className="text-slate-700 font-medium">{medicalHistoryText}</span>
                        </p>
                      )}

                      {/* Oral Examination */}
                      {activeOralExamItems.length > 0 && (
                        <p className="leading-snug">
                          <span className="font-bold text-slate-800">Oral Examination:</span>{' '}
                          <span className="text-slate-700 font-medium">{activeOralExamItems.join(' • ')}</span>
                        </p>
                      )}

                      {/* Affected Teeth (Odontogram) */}
                      {selectedTeethList.length > 0 && (
                        <p className="leading-snug">
                          <span className="font-bold text-slate-800">Affected Teeth:</span>{' '}
                          <span className="text-slate-800 font-semibold">{selectedTeethList.join(', ')}</span>
                        </p>
                      )}

                      {/* Diagnosis */}
                      {diagnosisList.length > 0 && (
                        <p className="leading-snug">
                          <span className="font-bold text-slate-800">Diagnosis:</span>{' '}
                          <span className="text-slate-900 font-bold">{diagnosisList.join(', ')}</span>
                        </p>
                      )}

                      {/* Treatment Plan */}
                      {treatmentPlanList.length > 0 && (
                        <p className="leading-snug">
                          <span className="font-bold text-slate-800">Treatment Plan:</span>{' '}
                          <span className="text-slate-700 font-medium">{treatmentPlanList.join(', ')}</span>
                        </p>
                      )}

                      {/* Procedure Done Today */}
                      {procedureDoneToday && (
                        <p className="leading-snug">
                          <span className="font-bold text-slate-800">Procedure Done Today:</span>{' '}
                          <span className="text-slate-900 font-semibold">{procedureDoneToday}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {parsedNotes.medications?.length > 0 && (
                    <>
                      <div className="mb-3">
                        <span className="text-3xl font-serif italic text-slate-800 font-bold">Rx</span>
                      </div>
                      <table className="w-full text-left text-[13px] mb-6 border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b-2 border-slate-200 print:bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            <th className="py-2 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider">#</th>
                            <th className="py-2 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider">Medicine</th>
                            <th className="py-2 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider">Dose</th>
                            <th className="py-2 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider">Timing</th>
                            <th className="py-2 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider">Frequency</th>
                            <th className="py-2 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider text-right">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedNotes.medications.map((m, i) => (
                            <tr key={i}>
                              <td className="py-3 px-3 text-slate-400 font-bold">{String(i + 1).padStart(2, '0')}</td>
                              <td className="py-3 px-3">
                                <div className="font-black text-slate-900 text-sm">{m.name}</div>
                                {(m.composition || m.genericName) && <div className="text-[10px] text-slate-500 font-medium mt-0.5">{m.composition || m.genericName}</div>}
                              </td>
                              <td className="py-3 px-3 font-black text-slate-700">{m.dose}</td>
                              <td className="py-3 px-3 text-slate-600 font-bold">{m.when}</td>
                              <td className="py-3 px-3 text-slate-600 font-bold">{m.frequency && !['1-0-1','1-1-1','1-0-0','0-0-1','0-1-0','SOS'].includes(m.frequency) ? m.frequency : '-'}</td>
                              <td className="py-3 px-3 text-slate-900 font-black text-right">{m.duration || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  {parsedNotes.testsRequested?.length > 0 && (
                    <div className="mb-6">
                      <p className="font-black text-slate-900 text-sm uppercase tracking-wide mb-2 border-l-4 border-indigo-600 pl-3">Tests Required:</p>
                      <div className="text-sm text-slate-700 space-y-1.5">
                        {parsedNotes.testsRequested.map((t, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 min-w-[24px] text-center">{String(i + 1).padStart(2, '0')}</span>
                            <span className="font-bold text-slate-800 tracking-tight">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedNotes.advice && (
                    <div className="mb-4">
                      <p className="font-bold text-slate-800 mb-1">Clinical Advice:</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{parsedNotes.advice}</p>
                    </div>
                  )}

                  {parsedNotes.nextAppointmentDate && (
                    <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="font-bold text-slate-800 text-xs uppercase tracking-wide">Next Appointment:</p>
                      <p className="text-sm text-slate-900 font-bold mt-0.5">
                        {new Date(parsedNotes.nextAppointmentDate).toLocaleDateString('en-GB')}
                        {parsedNotes.nextAppointmentNotes ? ` - ${parsedNotes.nextAppointmentNotes}` : ''}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {prescription.notes}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ========================================================= */
        /* 2. STANDARD / SYSTEM DEFAULT MODE (Non-A4 letterhead)      */
        /* ========================================================= */
        <div className="w-full flex flex-col flex-1 relative z-10">
          <div className="w-full relative p-8 z-10">
            {isDefaultV2 ? (
              <div className="flex flex-col items-center text-center mb-4 w-full">
                {clinicLogo && (
                  <img 
                    src={getImageUrl(clinicLogo)} 
                    alt="Clinic Logo" 
                    className="h-20 w-20 object-contain mb-2" 
                  />
                )}
                <h2 className="text-2xl font-black text-emerald-700 leading-tight">
                  {clinicName || "Clinic Name"}
                </h2>
                <div className="text-[11px] font-bold text-slate-500 mt-1 space-y-0.5">
                  {clinicAddress && <p className="max-w-[600px] leading-tight">{clinicAddress}</p>}
                  {clinicContact && <p>Contact: {clinicContact}</p>}
                </div>
              </div>
            ) : headerType === 'custom' && headerImageUrl ? (
              <div className="min-h-[120px]">
                <img src={headerImageUrl} alt="Header" className="w-full h-auto object-contain" />
              </div>
            ) : (
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4 flex-1">
                  {clinicLogo && (
                    <img 
                      src={getImageUrl(clinicLogo)} 
                      alt="Clinic Logo" 
                      className="h-24 w-24 object-contain" 
                    />
                  )}
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-emerald-700 leading-tight">
                      {clinicName || "Clinic Name"}
                    </h2>
                    <div className="text-[11px] font-bold text-slate-500 mt-1 space-y-0.5">
                      {clinicAddress && <p className="max-w-[400px] leading-tight">{clinicAddress}</p>}
                      {clinicContact && <p>Contact: {clinicContact}</p>}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-1 flex flex-col items-end">
                  <h1 className="text-3xl font-black text-blue-800 leading-tight">
                    {prescription.doctorName?.toLowerCase().startsWith('dr') ? '' : 'Dr. '}{prescription.doctorName}
                  </h1>
                  {(prescription.doctorQualification || prescription.qualification) && (
                    <div className="text-[11px] font-black text-blue-600/80 mt-1 uppercase tracking-wider">
                      {prescription.doctorQualification || prescription.qualification}
                    </div>
                  )}
                  {(prescription.doctorSpecialization || prescription.specialty) && (
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">
                      {prescription.doctorSpecialization || prescription.specialty}
                    </p>
                  )}
                  <div className="text-[10px] text-slate-400 mt-2 space-y-0.5 font-bold uppercase tracking-widest">
                    {prescription.doctorEmail && <p>E-Mail: {prescription.doctorEmail}</p>}
                    {clinicContact && <p>Contact: {clinicContact}</p>}
                  </div>
                </div>
              </div>
            )}
            <div className="h-1 bg-slate-200 w-full rounded-full opacity-50" />
          </div>

          {/* Standard Patient Info Bar */}
          <div className="flex items-center justify-between text-[12px] text-slate-800 font-normal px-8 py-3 border-b">
            <span>Name: {formattedPatientName}</span>
            <span className="border-l border-slate-300 pl-4">Mobile: {patientMobile}</span>
            <span className="border-l border-slate-300 pl-4">Age/Sex: {patientAgeSex}</span>
            <span className="border-l border-slate-300 pl-4 ml-auto">Date: {new Date(prescription.date).toLocaleDateString()}</span>
          </div>

          {/* Body */}
          <div className="flex-1 relative p-8 min-h-[400px]">
            {bodyType === 'custom' && bodyImageUrl && (
              <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
                <img src={bodyImageUrl} alt="Watermark" className="w-2/3 h-2/3 object-contain" />
              </div>
            )}

            <div className="relative z-10">
              {parsedNotes ? (
                <>
                  {(parsedNotes.vitals || medicalHistoryText || activeOralExamItems.length > 0 || selectedTeethList.length > 0 || diagnosisList.length > 0 || treatmentPlanList.length > 0 || procedureDoneToday) && (
                    <div className="text-sm space-y-1.5 mb-6 border-b border-slate-100 pb-4">
                      {parsedNotes.vitals && Object.values(parsedNotes.vitals).some(v => v) && (
                        <p><span className="font-bold text-slate-600">Vitals:</span> {Object.entries(parsedNotes.vitals).filter(([_,v]) => v).map(([k,v]) => `${k.replace('_', ' ')}: ${v}`).join(', ')}</p>
                      )}
                      {medicalHistoryText && (
                        <p><span className="font-bold text-slate-800">Medical & Dental History:</span> {medicalHistoryText}</p>
                      )}
                      {activeOralExamItems.length > 0 && (
                        <p><span className="font-bold text-slate-800">Oral Examination:</span> {activeOralExamItems.join(' • ')}</p>
                      )}
                      {selectedTeethList.length > 0 && (
                        <p><span className="font-bold text-slate-800">Affected Teeth:</span> {selectedTeethList.join(', ')}</p>
                      )}
                      {diagnosisList.length > 0 && (
                        <p><span className="font-bold text-slate-800">Diagnosis:</span> {diagnosisList.join(', ')}</p>
                      )}
                      {treatmentPlanList.length > 0 && (
                        <p><span className="font-bold text-slate-800">Treatment Plan:</span> {treatmentPlanList.join(', ')}</p>
                      )}
                      {procedureDoneToday && (
                        <p><span className="font-bold text-slate-800">Procedure Done Today:</span> {procedureDoneToday}</p>
                      )}
                    </div>
                  )}

                  {parsedNotes.medications?.length > 0 && (
                    <>
                      <div className="mb-4">
                        <span className="text-3xl font-serif italic text-slate-800 font-bold">Rx</span>
                      </div>
                      <table className="w-full text-left text-[13px] mb-8 border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b-2 border-slate-200">
                            <th className="py-2.5 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider">#</th>
                            <th className="py-2.5 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider">Medicine</th>
                            <th className="py-2.5 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider">Dose</th>
                            <th className="py-2.5 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider">Timing</th>
                            <th className="py-2.5 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider">Frequency</th>
                            <th className="py-2.5 px-3 font-black text-slate-500 uppercase text-[10px] tracking-wider text-right">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedNotes.medications.map((m, i) => (
                            <tr key={i}>
                              <td className="py-4 px-3 text-slate-400 font-bold">{String(i + 1).padStart(2, '0')}</td>
                              <td className="py-4 px-3">
                                <div className="font-black text-slate-900 text-sm">{m.name}</div>
                                {(m.composition || m.genericName) && <div className="text-[10px] text-slate-500 font-medium mt-0.5">{m.composition || m.genericName}</div>}
                              </td>
                              <td className="py-4 px-3 font-black text-slate-700">{m.dose}</td>
                              <td className="py-4 px-3 text-slate-600 font-bold">{m.when}</td>
                              <td className="py-4 px-3 text-slate-600 font-bold">{m.frequency && !['1-0-1','1-1-1','1-0-0','0-0-1','0-1-0','SOS'].includes(m.frequency) ? m.frequency : '-'}</td>
                              <td className="py-4 px-3 text-slate-900 font-black text-right">{m.duration || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  {parsedNotes.testsRequested?.length > 0 && (
                    <div className="mb-8">
                      <p className="font-black text-slate-900 text-sm uppercase tracking-wide mb-3 border-l-4 border-indigo-600 pl-3">Tests Required:</p>
                      <div className="text-sm text-slate-700 space-y-2">
                        {parsedNotes.testsRequested.map((t, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 min-w-[24px] text-center">{String(i + 1).padStart(2, '0')}</span>
                            <span className="font-bold text-slate-800 tracking-tight">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedNotes.advice && (
                    <div className="mb-6">
                      <p className="font-bold text-slate-800 mb-2">Clinical Advice:</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{parsedNotes.advice}</p>
                    </div>
                  )}

                  {parsedNotes.nextAppointmentDate && (
                    <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="font-bold text-slate-800 text-xs uppercase tracking-wide">Next Appointment:</p>
                      <p className="text-sm text-slate-900 font-bold mt-0.5">
                        {new Date(parsedNotes.nextAppointmentDate).toLocaleDateString('en-GB')}
                        {parsedNotes.nextAppointmentNotes ? ` - ${parsedNotes.nextAppointmentNotes}` : ''}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {prescription.notes}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="w-full min-h-[80px] mt-auto relative z-10">
            {isDefaultV2 ? (
              <div className="p-4 px-8 border-t border-slate-200 flex justify-between items-center w-full">
                <div className="text-left text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  Dr. {prescription.doctorName}
                </div>
                <div className="text-center opacity-70">
                  <p className="text-[10px] font-bold text-slate-400">Powered by Oviaan</p>
                </div>
                <div style={{ width: '80px' }}></div>
              </div>
            ) : footerType === 'custom' && footerImageUrl ? (
              <img src={footerImageUrl} alt="Footer" className="w-full h-full object-contain" />
            ) : (
              <div className="p-4 text-center opacity-70 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-400">Powered by Oviaan</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default PrintablePrescription;
