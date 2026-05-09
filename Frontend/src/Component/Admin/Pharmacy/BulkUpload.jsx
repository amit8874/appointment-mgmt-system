import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, X, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../services/api';
import * as XLSX from 'xlsx';

const BulkUpload = () => {
  const [file, setFile] = useState(null);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        setAllData(data);
        setCurrentPage(1); // Reset to first page
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/internal-pharmacy/inventory/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(response.data);
      if (response.data.errors?.length > 0) {
        toast.warning(`Imported with ${response.data.errors.length} errors.`);
      } else {
        toast.success("All medicines imported successfully!");
      }
      setFile(null);
      setAllData([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
      toast.error("Import failed. Please check the file format.");
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = () => {
    const headers = [[
      'Medicine Name', 'Generic Name', 'Manufacturer', 'Category', 'Type', 
      'Dose', 'Pack Size', 'Unit', 'HSN Code', 'GST %', 'MRP', 
      'Purchase Price', 'Selling Price', 'Opening Stock', 'Batch No', 
      'Expiry Date', 'Minimum Stock Alert'
    ]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, "pharmacy_medicine_sample.xlsx");
  };

  // Pagination Logic
  const headers = allData[0] || [];
  const rows = allData.slice(1);
  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = rows.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Bulk Medicine Upload</h1>
          <p className="text-sm text-slate-500 font-medium">Import multiple medicines and opening stock via Excel</p>
        </div>
        <button 
          onClick={downloadSample}
          className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all"
        >
          <Download className="w-3.5 h-3.5 mr-2" /> Sample Excel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upload Zone */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-slate-200 dark:border-gray-700 flex flex-col items-center justify-center text-center space-y-4 hover:border-slate-400 transition-all group relative overflow-hidden h-[600px]">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-gray-900 transition-transform">
            <FileSpreadsheet className="w-10 h-10 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Select Excel/CSV File</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Drag and drop or click to browse</p>
          </div>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {file && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-900 px-3 py-1.5 rounded-lg animate-fadeIn border border-slate-100 dark:border-gray-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{file.name}</span>
              <button onClick={() => { setFile(null); setAllData([]); }} className="p-1 hover:bg-white rounded-full transition-colors"><X className="w-3 h-3 text-slate-400" /></button>
            </div>
          )}
          <button 
            disabled={!file || loading}
            onClick={handleUpload}
            className={`relative z-20 px-6 py-2.5 rounded-lg font-bold text-white shadow-sm flex items-center justify-center transition-all active:scale-95 uppercase tracking-wider text-xs
              ${(!file || loading) ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900'}`}
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading ? 'Importing...' : 'Start Import'}
          </button>
        </div>

        {/* Validation & Preview */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4 flex flex-col h-[600px]">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center uppercase tracking-wider">
              <Eye className="w-4 h-4 mr-2 text-slate-500" />
              Preview
            </h3>
            {allData.length > 0 && <span className="text-[10px] font-bold text-slate-400">{allData.length - 1} total rows</span>}
          </div>

          <div className="flex-1 overflow-auto rounded-lg border border-slate-100 dark:border-gray-700 min-h-0">
            <table className="w-full text-[10px] text-left border-collapse font-bold uppercase">
              <thead className="bg-slate-50 dark:bg-gray-900 sticky top-0 z-10">
                <tr>
                  {headers.map((h, i) => <th key={i} className="px-2 py-2.5 border-b border-slate-200 dark:border-gray-700 whitespace-nowrap text-slate-500 bg-slate-50 dark:bg-gray-900">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {currentRows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    {row.map((cell, j) => <td key={j} className="px-2 py-2 text-slate-500 whitespace-nowrap">{cell}</td>)}
                  </tr>
                ))}
                {allData.length === 0 && (
                  <tr>
                    <td className="px-6 py-10 text-center text-slate-400 font-medium normal-case" colSpan="10">No file preview available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {allData.length > itemsPerPage && (
            <div className="flex items-center justify-between px-2 py-2 border-t border-slate-100 dark:border-gray-700 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, rows.length)} of {rows.length}
              </span>
              <div className="flex gap-1">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className={`p-1.5 rounded-lg border transition-all ${currentPage === 1 ? 'text-slate-300 border-slate-100 cursor-not-allowed' : 'text-slate-600 border-slate-200 hover:bg-slate-50 active:scale-90'}`}
                >
                  <ChevronLeft size={14} />
                </button>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className={`p-1.5 rounded-lg border transition-all ${currentPage === totalPages ? 'text-slate-300 border-slate-100 cursor-not-allowed' : 'text-slate-600 border-slate-200 hover:bg-slate-50 active:scale-90'}`}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {results && (
            <div className="p-4 bg-slate-50 dark:bg-gray-900/50 border border-slate-100 dark:border-gray-700 rounded-lg animate-fadeIn shrink-0 overflow-y-auto max-h-[150px]">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-2">Import Results</h4>
              <div className="grid grid-cols-3 gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-3">
                <div className="bg-emerald-50 text-emerald-700 p-2 rounded-md">Added: {results.added}</div>
                <div className="bg-blue-50 text-blue-700 p-2 rounded-md">Updated: {results.updated}</div>
                <div className="bg-rose-50 text-rose-700 p-2 rounded-md">Errors: {results.errors?.length || 0}</div>
              </div>
              
              {results.errors?.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <p className="text-[9px] text-rose-600 font-bold uppercase tracking-widest">Error Details:</p>
                  {results.errors.map((err, i) => (
                    <div key={i} className="text-[9px] p-1.5 bg-rose-50 border border-rose-100 rounded text-rose-600">
                      <span className="font-black mr-2">[{err.name}]</span> {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-lg animate-fadeIn flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <p className="text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;
