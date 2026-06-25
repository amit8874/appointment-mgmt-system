import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Download, Loader2, FileText } from 'lucide-react';
import { billingApi, centralDoctorApi } from '../../services/api';
import { toast } from 'react-toastify';

const DailyCaseRegisterModal = ({ isOpen, onClose }) => {
  const [dateMode, setDateMode] = useState('single'); // 'single' or 'range'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  
  const [doctors, setDoctors] = useState([]);
  const [registerData, setRegisterData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Fetch doctors list on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await centralDoctorApi.getAll();
        setDoctors(res?.doctors || (Array.isArray(res) ? res : []));
      } catch (err) {
        console.error('Failed to fetch doctors:', err);
      }
    };
    if (isOpen) {
      fetchDoctors();
    }
  }, [isOpen]);

  // Fetch case register data when filters change
  const fetchRegisterData = async () => {
    setLoadingData(true);
    try {
      const params = {};
      if (dateMode === 'single') {
        params.date = selectedDate;
      } else {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      if (selectedDoctorId) {
        params.doctorId = selectedDoctorId;
      }
      const response = await billingApi.getDailyCaseRegisterData(params);
      if (response && response.success) {
        setRegisterData(response.data || []);
      } else {
        toast.error('Failed to fetch register data');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load register data');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRegisterData();
    }
  }, [isOpen, dateMode, selectedDate, startDate, endDate, selectedDoctorId]);

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const params = {};
      if (dateMode === 'single') {
        params.date = selectedDate;
      } else {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      if (selectedDoctorId) {
        params.doctorId = selectedDoctorId;
      }
      
      const response = await billingApi.downloadDailyCaseRegisterPDF(params);
      if (response && response.url) {
        // Trigger browser download
        const link = document.createElement('a');
        link.href = response.url;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started!');
      } else {
        toast.warning('Failed to generate PDF download url.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to download Daily Case Register PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-65 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col relative overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-150 dark:border-gray-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Daily Case Register (Form 25)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">View and download daily clinic case sheets</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-150 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
          {/* Date Mode Toggle */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Date Filter Mode</label>
            <div className="flex bg-white dark:bg-gray-750 rounded-xl p-1 border border-gray-250 dark:border-gray-650">
              <button
                onClick={() => setDateMode('single')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  dateMode === 'single'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                }`}
              >
                Single Day
              </button>
              <button
                onClick={() => setDateMode('range')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  dateMode === 'range'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                }`}
              >
                Date Range
              </button>
            </div>
          </div>

          {/* Date Inputs */}
          {dateMode === 'single' ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Select Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-255 dark:border-gray-650 bg-white dark:bg-gray-750 text-xs font-bold rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-gray-700 dark:text-white"
                />
              </div>
            </div>
          ) : (
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-255 dark:border-gray-650 bg-white dark:bg-gray-750 text-xs font-bold rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-255 dark:border-gray-650 bg-white dark:bg-gray-750 text-xs font-bold rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Doctor Selection */}
          <div className={dateMode === 'single' ? 'col-span-2' : ''}>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Filter By Doctor</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs font-bold rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-gray-750 dark:text-white"
              >
                <option value="">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    Dr. {doc.name || `${doc.firstName || ''} ${doc.lastName || ''}`.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/30 custom-scrollbar">
          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-semibold">Compiling Daily Case Register...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-150 dark:border-gray-700 min-w-[700px] overflow-x-auto">
              
              {/* Form Legal Title Block */}
              <div className="text-center mb-6 font-serif">
                <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-wide uppercase">FORM NO. 25</h1>
                <p className="text-xs italic font-bold text-gray-650 dark:text-gray-450 mt-1">[See rule 46(6)(i)]</p>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white mt-1 uppercase border-b border-gray-800 dark:border-gray-300 inline-block pb-0.5">
                  Form of daily case register
                </h2>
                <p className="text-[10px] text-gray-550 dark:text-gray-450 max-w-lg mx-auto mt-2 leading-relaxed font-sans">
                  [To be maintained by practitioners of any system of medicine, i.e., physicians, surgeons, dentists, pathologists, radiologists, vaids, hakims, etc.]
                </p>
              </div>

              {/* Table rendering the Form 25 exactly as requested */}
              <table className="w-full border-collapse border border-gray-800 dark:border-gray-600 text-left font-sans text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-750 text-gray-900 dark:text-white font-bold">
                    <th className="border border-gray-800 dark:border-gray-600 p-2 italic w-[12%]">Date</th>
                    <th className="border border-gray-800 dark:border-gray-600 p-2 italic text-center w-[8%]">Sl. No</th>
                    <th className="border border-gray-800 dark:border-gray-600 p-2 italic w-[22%]">Patient's name</th>
                    <th className="border border-gray-800 dark:border-gray-600 p-2 italic w-[38%]">
                      Nature of professional services rendered, e.g., general consultation, surgery, injection, visit, etc.
                    </th>
                    <th className="border border-gray-800 dark:border-gray-600 p-2 italic text-right w-[10%]">Fees received</th>
                    <th className="border border-gray-800 dark:border-gray-600 p-2 italic w-[10%]">Date of receipt</th>
                  </tr>
                  <tr className="text-center text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-850">
                    <td className="border border-gray-800 dark:border-gray-600 p-1">(1)</td>
                    <td className="border border-gray-800 dark:border-gray-600 p-1">(2)</td>
                    <td className="border border-gray-800 dark:border-gray-600 p-1">(3)</td>
                    <td className="border border-gray-800 dark:border-gray-600 p-1">(4)</td>
                    <td className="border border-gray-800 dark:border-gray-600 p-1">(5)</td>
                    <td className="border border-gray-800 dark:border-gray-600 p-1">(6)</td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 dark:divide-gray-600 text-gray-850 dark:text-gray-250 bg-white dark:bg-gray-800">
                  {registerData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="border border-gray-800 dark:border-gray-600 p-8 text-center italic text-gray-500 dark:text-gray-450 bg-gray-50/20">
                        No records found for the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    registerData.map((bill, idx) => {
                      const services = bill.items && bill.items.length > 0
                        ? bill.items.map(item => item.description || item.procedureName).filter(Boolean).join(', ')
                        : bill.billType || 'Consultation';
                      const fees = Number(bill.amount !== undefined && bill.amount !== null ? bill.amount : (bill.paidAmount || 0)).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      });

                      return (
                        <tr key={bill._id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                          <td className="border border-gray-800 dark:border-gray-600 p-2 font-mono">{formatDate(bill.date)}</td>
                          <td className="border border-gray-800 dark:border-gray-600 p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-gray-800 dark:border-gray-600 p-2 font-bold">{bill.patientName || 'Walk-in Patient'}</td>
                          <td className="border border-gray-800 dark:border-gray-600 p-2 leading-relaxed">{services}</td>
                          <td className="border border-gray-800 dark:border-gray-600 p-2 text-right font-bold font-mono">₹{fees}</td>
                          <td className="border border-gray-800 dark:border-gray-600 p-2 font-mono">{formatDate(bill.date)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-150 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800 shrink-0">
          <div className="text-xs text-gray-505 dark:text-gray-450 font-medium">
            Total Cases Loaded: <span className="font-bold text-gray-800 dark:text-white">{registerData.length}</span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-250 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold text-sm rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf || registerData.length === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-colors"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DailyCaseRegisterModal;
