import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import { toast } from 'react-toastify';
import * as xlsx from 'xlsx';

const BulkImportModal = ({ isOpen, onClose, onRefresh }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(fileType)) {
        setFile(selectedFile);
      } else {
        toast.error('Please select an Excel or CSV file');
        e.target.value = null;
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/patients/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setResults(response.data.results);
      toast.success('Import completed successfully!');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.message || 'Error importing patients');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [['firstName', 'lastName', 'mobile', 'gender', 'age', 'bloodGroup', 'email', 'address']];
    const ws = xlsx.utils.aoa_to_sheet(headers);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Template');
    xlsx.writeFile(wb, 'patient_import_template.xlsx');
  };

  const resetModal = () => {
    setFile(null);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={resetModal}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/20">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Bulk Import Patients
          </h3>
          <button onClick={resetModal} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {!results ? (
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <p className="text-amber-800 dark:text-amber-200 text-sm flex gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>
                    Duplicate phone numbers will be skipped. Only the first occurrence will be imported and assigned a 6-digit ID.
                  </span>
                </p>
              </div>

              <div 
                className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all ${
                  file ? 'border-blue-500 bg-blue-50/30' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile) setFile(droppedFile);
                }}
              >
                <div className="bg-blue-100 dark:bg-blue-900/40 p-4 rounded-full mb-4">
                  {file ? <FileText className="w-10 h-10 text-blue-600" /> : <Upload className="w-10 h-10 text-blue-600" />}
                </div>
                
                {file ? (
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    <button 
                      onClick={() => setFile(null)}
                      className="mt-4 text-sm text-red-600 hover:underline font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                      Drag & drop your file here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">Support .xlsx, .xls, .csv</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Sample Template
                </button>
                
                <button
                  onClick={handleUpload}
                  disabled={!file || importing}
                  className="w-full sm:w-auto px-8 py-3 bg-emerald-600 disabled:bg-gray-400 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Start Import
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Import Finished!</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-300 text-sm font-medium">Successfully Added</p>
                  <p className="text-3xl font-black text-green-600">{results.success}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800">
                  <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">Skipped/Duplicates</p>
                  <p className="text-3xl font-black text-amber-600">{results.skipped}</p>
                </div>
              </div>

              {results.errors?.length > 0 && (
                <div className="max-h-40 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-100 dark:border-red-800">
                  <p className="text-red-800 dark:text-red-300 text-sm font-bold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Issues Found:
                  </p>
                  <ul className="text-xs text-red-700 dark:text-red-400 space-y-1">
                    {results.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={resetModal}
                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-all"
              >
                Close and Finish
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BulkImportModal;
