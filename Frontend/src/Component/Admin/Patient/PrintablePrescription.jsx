import React from 'react';

const PrintablePrescription = ({ template, prescription, patient, clinicName, clinicContact }) => {
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
    if (path.startsWith('data:')) return path; // Already base64
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const serverUrl = baseUrl.replace('/api', '') || 'http://localhost:5000';
    return `${serverUrl}${path}`;
  };

  const headerImageUrl = getImageUrl(headerImage);
  const bodyImageUrl = getImageUrl(bodyImage);
  const footerImageUrl = getImageUrl(footerImage);

  return (
    <div className="bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto flex flex-col relative overflow-hidden shadow-2xl" style={{ backgroundColor: 'white', color: 'black' }}>
      
      {/* PREVIEW HEADER */}
      <div className="w-full border-b border-slate-200 min-h-[120px] relative">
        {headerType === 'custom' && headerImageUrl ? (
          <img src={headerImageUrl} alt="Header" className="w-full h-full object-contain" />
        ) : (
          <div className="p-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black text-indigo-900 leading-tight">
                {prescription.doctorName?.toLowerCase().startsWith('dr') ? '' : 'Dr. '}{prescription.doctorName}
              </h1>
              <p className="text-sm font-bold text-slate-600 mt-1 uppercase tracking-wider">Consultant Physician</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black text-slate-800">{clinicName || "Oviaan Clinic"}</h2>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tight">{clinicContact || "Contact: +91 XXXXX XXXXX"}</p>
            </div>
          </div>
        )}
      </div>

      {/* PREVIEW PATIENT INFO BAR */}
      <div className="bg-slate-100 px-8 py-3 flex items-center gap-6 text-sm border-b border-slate-200 print:bg-slate-100" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <span className="font-bold text-slate-800">ID: {patient?.patientId || 'N/A'}</span>
        <span className="font-bold text-slate-800 border-l border-slate-300 pl-6">
          {patient?.fullName || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim()} ({patient?.age || '--'}y, {patient?.gender || '--'})
        </span>
        <span className="font-bold text-slate-800 border-l border-slate-300 pl-6">Date: {new Date(prescription.date).toLocaleDateString()}</span>
      </div>

      {/* PREVIEW BODY */}
      <div className="flex-1 p-8 relative min-h-[500px]">
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
                    <span className="text-2xl font-serif italic text-slate-800">Rx</span>
                  </div>
                  <table className="w-full text-left text-sm mb-6">
                    <thead>
                      <tr className="bg-slate-100 print:bg-slate-100" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <th className="py-2 px-3 font-bold text-slate-600">#</th>
                        <th className="py-2 px-3 font-bold text-slate-600">Medicine</th>
                        <th className="py-2 px-3 font-bold text-slate-600">Dose</th>
                        <th className="py-2 px-3 font-bold text-slate-600">Timing & Freq</th>
                        <th className="py-2 px-3 font-bold text-slate-600">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedNotes.medications.map((m, i) => (
                        <tr key={i}>
                          <td className="py-3 px-3 text-slate-500">{i + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800">{m.name}</div>
                            {(m.composition || m.genericName) && <div className="text-xs text-slate-500">{m.composition || m.genericName}</div>}
                          </td>
                          <td className="py-3 px-3 font-medium">{m.dose}</td>
                          <td className="py-3 px-3 text-slate-600">{m.when} - {m.frequency}</td>
                          <td className="py-3 px-3 text-slate-600">{m.duration || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {parsedNotes.testsRequested?.length > 0 && (
                <div className="mb-6">
                  <p className="font-bold text-slate-800 mb-2">Investigations Suggested:</p>
                  <ul className="list-disc list-inside text-sm text-slate-700">
                    {parsedNotes.testsRequested.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
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

      {/* PREVIEW FOOTER */}
      <div className="w-full border-t border-slate-200 min-h-[80px] mt-auto relative">
        {footerType === 'custom' && footerImageUrl ? (
          <img src={footerImageUrl} alt="Footer" className="w-full h-full object-contain" />
        ) : (
          <div className="p-4 text-center opacity-70">
            <p className="text-xs font-bold text-slate-400">Powered by Oviaan</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default PrintablePrescription;
