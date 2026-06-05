import React from 'react';

const PrintablePrescription = ({ 
  template, 
  orgTemplateUrl,
  printableArea,
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
    if (prescription.notes && typeof prescription.notes === 'string' && prescription.notes.trim().startsWith('{')) {
      parsedNotes = JSON.parse(prescription.notes);
    }
  } catch (e) {
    parsedNotes = null;
  }

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
  const isA4 = template?._id === 'global_a4' || template?.headerType === 'a4' || template?.layoutType === 'a4';

  const margins = printableArea || { top: 55, left: 12, right: 12, bottom: 30 };

  console.log("PrintablePrescription rendering:", { isA4, orgTemplateUrl, margins });

  const contentStyle = isA4 ? {
    paddingTop: `${margins.top}mm`,
    paddingBottom: `${margins.bottom}mm`,
    paddingLeft: `${margins.left}mm`,
    paddingRight: `${margins.right}mm`,
    width: '100%',
    minHeight: '297mm',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 10,
    boxSizing: 'border-box'
  } : {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    position: 'relative',
    zIndex: 10
  };

  return (
    <div className="bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto flex flex-col relative overflow-hidden shadow-2xl" style={{ backgroundColor: 'white', color: 'black' }}>
      
      {/* A4 Background Image */}
      {isA4 && orgTemplateUrl && (
        <img 
          src={getImageUrl(orgTemplateUrl)} 
          alt="A4 Background" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
          style={{ zIndex: 0 }} 
        />
      )}

      {/* CONTENT WRAPPER WITH LETTERHEAD MARGINS */}
      <div style={contentStyle}>
        {/* PROFESSIONAL HEADER (Only if NOT A4) */}
        {!isA4 && (
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
                {/* LEFT SIDE: Clinic Info */}
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

                {/* RIGHT SIDE: Doctor Info */}
                <div className="text-right flex-1 flex flex-col items-end">
                  <h1 className="text-3xl font-black text-blue-800 leading-tight">
                    {prescription.doctorName?.toLowerCase().startsWith('dr') ? '' : 'Dr. '}{prescription.doctorName}
                  </h1>
                  <div className="text-[11px] font-black text-blue-600/80 mt-1 uppercase tracking-wider">
                    {prescription.doctorQualification || prescription.qualification || "MBBS, MD"}
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">
                    {prescription.doctorSpecialization || prescription.specialty || "Specialist"}
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 space-y-0.5 font-bold uppercase tracking-widest">
                    {prescription.doctorEmail && <p>E-Mail: {prescription.doctorEmail}</p>}
                    {clinicContact && <p>Contact: {clinicContact}</p>}
                  </div>
                </div>
              </div>
            )}
            <div className="h-1 bg-slate-200 w-full rounded-full opacity-50" />
          </div>
        )}

        {/* PREVIEW PATIENT INFO BAR */}
        <div 
          className={`bg-slate-100 flex items-center gap-6 text-[11px] border border-slate-200 print:bg-slate-100 ${isA4 ? 'p-3 rounded-lg mb-6 shadow-sm' : 'px-8 py-3 border-b'}`} 
          style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          {isDefaultV2 ? (
            <>
              <span className="font-black text-slate-900 uppercase">
                Name: {(() => {
                  let name = patient?.fullName || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim();
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
                })()}
              </span>
              <span className="font-black text-slate-900 border-l-2 border-slate-300 pl-6 uppercase">Age: {patient?.age || '--'} Years</span>
              <span className="font-black text-slate-900 border-l-2 border-slate-300 pl-6 uppercase ml-auto">Date: {new Date(prescription.date).toLocaleDateString()}</span>
            </>
          ) : (
            <>
              <span className="font-black text-slate-900 uppercase">Patient ID: {patient?.patientId || 'N/A'}</span>
              <span className="font-black text-slate-900 border-l-2 border-slate-300 pl-6 uppercase">
                Name: {(() => {
                  let name = patient?.fullName || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim();
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
                })()}
              </span>
              <span className="font-black text-slate-900 border-l-2 border-slate-300 pl-6 uppercase">Age/Sex: {patient?.age || '--'}Y / {patient?.gender || '--'}</span>
              <span className="font-black text-slate-900 border-l-2 border-slate-300 pl-6 uppercase ml-auto">Date: {new Date(prescription.date).toLocaleDateString()} {prescription.time && `| ${prescription.time}`}</span>
            </>
          )}
        </div>

        {/* PREVIEW BODY */}
        <div className={`flex-1 relative ${isA4 ? 'py-2' : 'p-8'} min-h-[400px]`}>
          {/* Custom Watermark / Body Background */}
          {bodyType === 'custom' && bodyImageUrl && (
            <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
              <img src={bodyImageUrl} alt="Watermark" className="w-2/3 h-2/3 object-contain" />
            </div>
          )}

          {/* Clinical Data */}
          <div className="relative z-10">
            {parsedNotes ? (
              <>
                {(parsedNotes.vitals || parsedNotes.complaints || parsedNotes.diagnosis) && (
                  <div className="text-sm space-y-1 mb-6 border-b border-slate-100 pb-4">
                    {parsedNotes.vitals && Object.values(parsedNotes.vitals).some(v => v) && (
                      <p><span className="font-bold text-slate-600">Vitals:</span> {Object.entries(parsedNotes.vitals).filter(([_,v]) => v).map(([k,v]) => `${k.replace('_', ' ')}: ${v}`).join(', ')}</p>
                    )}
                    {parsedNotes.complaints?.length > 0 && (
                      <p><span className="font-bold text-slate-600">Complaints:</span> {parsedNotes.complaints.map(c => c.name).join(', ')}</p>
                    )}
                    {parsedNotes.diagnosis?.length > 0 && (
                      <p><span className="font-bold text-slate-600">Diagnosis:</span> {parsedNotes.diagnosis.map(d => d.name).join(', ')}</p>
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
                        <tr className="bg-slate-50 border-b-2 border-slate-200 print:bg-slate-50" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
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
                            <td className="py-4 px-3 text-slate-600 font-bold">{m.frequency}</td>
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
              </>
            ) : (
              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {prescription.notes}
              </div>
            )}
          </div>
        </div>

        {/* PREVIEW FOOTER (Only if NOT A4) */}
        {!isA4 && (
          <div className="w-full min-h-[80px] mt-auto relative z-10">
            {isDefaultV2 ? (
              <div className="p-4 px-8 border-t border-slate-200 flex justify-between items-center w-full">
                <div className="text-left text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  Dr. {prescription.doctorName}
                </div>
                <div className="text-center opacity-70">
                  <p className="text-[10px] font-bold text-slate-400">Powered by Oviaan</p>
                </div>
                <div style={{ width: '80px' }}></div> {/* Spacer to keep powered by centered */}
              </div>
            ) : footerType === 'custom' && footerImageUrl ? (
              <img src={footerImageUrl} alt="Footer" className="w-full h-full object-contain" />
            ) : (
              <div className="p-4 text-center opacity-70 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-400">Powered by Oviaan</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default PrintablePrescription;
