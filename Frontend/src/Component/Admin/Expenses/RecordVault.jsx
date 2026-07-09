import React, { useState, useEffect } from 'react';
import {
  Upload, Search, FileText, Download, Trash2, Eye, X, CheckCircle2,
  FolderOpen, AlertCircle, Info, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { expenseApi, commonApi } from '../../../services/api';

const RecordVault = ({ expenseType }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload states
  const [customName, setCustomName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileMeta, setFileMeta] = useState({ url: '', key: '' });

  // Lightbox view state
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [lightboxName, setLightboxName] = useState('');

  useEffect(() => {
    fetchRecords();
  }, [expenseType]);

  const fetchRecords = async (searchVal = searchTerm) => {
    setLoading(true);
    try {
      const res = await expenseApi.getRecords({ expenseType, search: searchVal });
      setRecords(res || []);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to load records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecords(searchTerm);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Auto-populate name if empty
      if (!customName) {
        const cleanName = file.name.split('.').slice(0, -1).join('.');
        setCustomName(cleanName);
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.warning('Please select a file to upload.');
      return;
    }
    if (!customName.trim()) {
      toast.warning('Please provide a name for this record.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('type', 'expenses-vault');

    try {
      // 1. Upload to S3
      const uploadRes = await commonApi.uploadImage(formData);
      
      // 2. Register record in Database
      const payload = {
        recordName: customName,
        expenseType,
        fileUrl: uploadRes.imageUrl,
        fileKey: uploadRes.s3Metadata?.s3Key || ''
      };
      
      await expenseApi.uploadRecord(payload);
      
      toast.success('Record uploaded and saved successfully!');
      
      // Reset form
      setCustomName('');
      setSelectedFile(null);
      
      // Refresh list
      fetchRecords();
    } catch (error) {
      console.error('Error uploading record:', error);
      toast.error('Failed to save record.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this record? This cannot be undone.')) return;

    try {
      await expenseApi.deleteRecord(id);
      toast.success('Record deleted successfully.');
      fetchRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record.');
    }
  };

  const handleDownload = (url, name) => {
    toast.info('Starting file download...');
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', name);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to check if file is an image
  const isImageFile = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase().split('?')[0];
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.webp');
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-8 mt-8">
      {/* Title */}
      <div className="border-b border-slate-100 dark:border-gray-700 pb-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
          <FolderOpen className="text-indigo-600 w-5 h-5" />
          <span>Upload & View Documents Vault</span>
        </h3>
        <p className="text-xs text-slate-400 dark:text-gray-400 mt-1 font-semibold uppercase tracking-wider">
          Persistent repository for invoices, warranty cards, lab receipts and bills
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Uploader Column */}
        <div className="lg:col-span-1 border-r border-slate-100 dark:border-gray-700 lg:pr-8 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Upload your Record
          </h4>
          
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Record Name / Description
              </label>
              <input
                type="text"
                placeholder="e.g. Autoclave Warranty Card"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Choose Document / Image
              </label>
              <div className="border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:bg-slate-50/50 dark:hover:bg-gray-700/20 transition-all cursor-pointer relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Upload className="mx-auto text-slate-400 w-8 h-8 mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {selectedFile ? selectedFile.name : 'Select or drag file here'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  Supports Images, PDF documents up to 10MB
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>{uploading ? 'Uploading Record...' : 'Upload Record'}</span>
            </button>
          </form>
        </div>

        {/* List/Gallery Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              See Records
            </h4>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search records by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold outline-none bg-slate-50/50 dark:bg-gray-900/50 text-slate-800 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Search
              </button>
            </form>
          </div>

          {/* Records Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="bg-slate-50 dark:bg-gray-700/30 h-28 rounded-2xl" />
              ))}
            </div>
          ) : records.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
              {records.map((rec) => {
                const isImg = isImageFile(rec.fileUrl);
                return (
                  <div
                    key={rec._id}
                    className="flex border border-slate-150 dark:border-gray-700 rounded-2xl p-3 items-center gap-3 bg-slate-50/30 dark:bg-gray-900/10 hover:shadow-md transition-shadow relative group"
                  >
                    {/* Thumbnail preview */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-gray-700">
                      {isImg ? (
                        <img src={rec.fileUrl} alt={rec.recordName} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="text-slate-400 w-8 h-8" />
                      )}
                    </div>

                    {/* Metadata details */}
                    <div className="flex-1 min-w-0 pr-12">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate" title={rec.recordName}>
                        {rec.recordName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('en-GB') : '-'}
                      </p>
                    </div>

                    {/* Quick Hover Overlays */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isImg ? (
                        <button
                          onClick={() => {
                            setLightboxUrl(rec.fileUrl);
                            setLightboxName(rec.recordName);
                          }}
                          className="p-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-500 hover:text-indigo-600 rounded-lg shadow-sm"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                      ) : (
                        <a
                          href={rec.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-500 hover:text-indigo-600 rounded-lg shadow-sm"
                          title="Open PDF"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => handleDownload(rec.fileUrl, rec.recordName)}
                        className="p-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-500 hover:text-green-600 rounded-lg shadow-sm"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(rec._id)}
                        className="p-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-500 hover:text-rose-600 rounded-lg shadow-sm"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-100 dark:border-gray-700 rounded-2xl p-8 text-center text-slate-400">
              <Info className="mx-auto w-6 h-6 mb-2 text-slate-350" />
              <p className="text-xs font-bold">No records found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / View Modal */}
      <AnimatePresence>
        {lightboxUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxUrl(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-4 max-w-3xl max-h-[85vh] z-10 flex flex-col items-center relative overflow-hidden"
            >
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute right-4 top-4 p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-800 dark:text-white rounded-full z-20"
              >
                <X size={18} />
              </button>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white mb-4 pr-10">
                {lightboxName}
              </h3>
              <div className="w-full overflow-auto max-h-[70vh]">
                <img src={lightboxUrl} alt={lightboxName} className="max-w-full max-h-[65vh] object-contain rounded-2xl mx-auto" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecordVault;
