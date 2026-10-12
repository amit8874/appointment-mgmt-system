import React, { useState, useEffect, useMemo } from 'react';
import { dentistApi, commonApi } from '../../../services/api';
import { Camera, Trash2, Eye, Image as ImageIcon, FileText, ExternalLink, Download, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

const DentalImagesTab = ({ patientId }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload States
  const [uploading, setUploading] = useState(false);
  const [imageType, setImageType] = useState('Prescription');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Gallery Filter State
  const [selectedFilter, setSelectedFilter] = useState('All');

  // Lightbox State
  const [activeImage, setActiveImage] = useState(null);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await dentistApi.getPatientImages(patientId);
      setImages(res || []);
    } catch (err) {
      console.error('Error fetching dental images:', err);
      toast.error('Failed to load dental image logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [patientId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation (up to 30MB)
    const MAX_SIZE_MB = 30;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`Selected file is ${fileSizeMB}MB. Please ensure the file size is under ${MAX_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  /**
   * Automatically optimizes and compresses large images right in the browser
   * Keeps ultra-high resolution (up to 2400px) so fine handwriting & dental teeth remain sharp,
   * while drastically reducing file size so it never triggers server gateway 413 limits.
   */
  const compressImageIfNeeded = async (file) => {
    // If not an image or already small (< 800KB), return original file directly
    if (!file.type.startsWith('image/') || file.size < 800 * 1024) {
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target.result;
        img.onload = () => {
          const MAX_DIM = 2400; // Ultra high definition
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const cleanName = (file.name || 'image').replace(/\.[^/.]+$/, "") + ".jpg";
                const optimizedFile = new File([blob], cleanName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(optimizedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.88
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select an image file first');
      return;
    }

    setUploading(true);
    try {
      // Optimize image before sending to avoid Nginx 413 payload limits
      const fileToUpload = await compressImageIfNeeded(selectedFile);

      // 1. Upload to S3
      const formData = new FormData();
      formData.append('image', fileToUpload);
      formData.append('folderType', `patients/${patientId}/dental-clinical`);

      const uploadRes = await commonApi.uploadImage(formData);
      const { imageUrl, s3Metadata } = uploadRes;

      if (!imageUrl) {
        throw new Error('Cloud storage returned an invalid response');
      }

      // 2. Save metadata in DB (remains permanent until doctor deletes)
      await dentistApi.uploadDentalImage(patientId, {
        imageType,
        imageUrl,
        s3Key: s3Metadata?.s3Key || '',
        notes: notes.trim()
      });

      toast.success(imageType === 'Prescription' ? 'Prescription image uploaded successfully!' : 'Clinical dental image uploaded successfully!');
      setSelectedFile(null);
      setPreviewUrl(null);
      setNotes('');
      fetchImages();
    } catch (err) {
      console.error('Error uploading dental image:', err);
      let errMsg = 'Upload failed. Please check network connection and file format.';
      if (err.response?.status === 413) {
        errMsg = 'File is too large for the web server gateway (HTTP 413). Please check Nginx client_max_body_size or upload a smaller image.';
      } else if (err.response?.data?.error) {
        errMsg = err.response.data.error;
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err.message) {
        errMsg = err.message;
      }
      toast.error(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this image?')) return;
    try {
      await dentistApi.deleteDentalImage(id);
      toast.success('Image deleted from repository.');
      fetchImages();
    } catch (err) {
      console.error('Error deleting dental image:', err);
      toast.error('Failed to delete image.');
    }
  };

  // Filtered gallery items
  const filteredImages = useMemo(() => {
    if (selectedFilter === 'All') return images;
    if (selectedFilter === 'Prescription') {
      return images.filter(img => img.imageType === 'Prescription' || img.imageType === 'Prescription Image' || img.imageType === 'Manual Prescription');
    }
    if (selectedFilter === 'X-Ray') {
      return images.filter(img => img.imageType === 'X-Ray Image');
    }
    if (selectedFilter === 'Before/After') {
      return images.filter(img => img.imageType === 'Before Image' || img.imageType === 'After Image');
    }
    return images.filter(img => img.imageType === selectedFilter);
  }, [images, selectedFilter]);

  const getCategoryBadgeClass = (cat) => {
    switch (cat) {
      case 'Prescription':
      case 'Prescription Image':
      case 'Manual Prescription':
        return 'bg-emerald-600 text-white shadow-emerald-500/20';
      case 'X-Ray Image':
        return 'bg-sky-600 text-white shadow-sky-500/20';
      case 'Before Image':
        return 'bg-amber-600 text-white shadow-amber-500/20';
      case 'After Image':
        return 'bg-teal-600 text-white shadow-teal-500/20';
      case 'Intraoral Image':
        return 'bg-indigo-600 text-white shadow-indigo-500/20';
      default:
        return 'bg-purple-600 text-white shadow-purple-500/20';
    }
  };

  if (loading && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-slate-100 rounded-b-3xl mt-4 shadow-sm space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wider">
              Clinical Dental Images & Manual Prescriptions
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Upload photos, X-rays, intraoral scans, or handwritten prescriptions (up to 30 MB).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Form Panel */}
        <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-100 h-fit space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">
              Upload New Record
            </h4>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Max 30MB
            </span>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* File Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Select Photo, Scan or Prescription
              </label>
              {previewUrl ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-black/5">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-all"
                    title="Remove selected file"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 animate-pulse" />
                    <p className="text-xs font-bold text-slate-600">Click to choose image</p>
                    <p className="text-[10px] text-indigo-600 font-bold mt-1 uppercase tracking-wider">
                      JPEG, PNG, WEBP (Max 30MB)
                    </p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Record Type / Category
              </label>
              <select
                value={imageType}
                onChange={(e) => setImageType(e.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Prescription">Prescription (Manual / Written)</option>
                <option value="Before Image">Before Image</option>
                <option value="After Image">After Image</option>
                <option value="X-Ray Image">X-Ray Image</option>
                <option value="Intraoral Image">Intraoral Image</option>
                <option value="Progress Image">Progress Image</option>
              </select>
            </div>

            {/* Notes Textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {imageType === 'Prescription' ? 'Prescription Notes' : 'Clinical Notes'}
              </label>
              <textarea
                rows={2}
                placeholder={
                  imageType === 'Prescription'
                    ? 'Write prescription summary, medications listed, date...'
                    : 'Log tooth details, treatment stage, specific notes...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  <span>Uploading to Cloud...</span>
                </>
              ) : (
                <span>Upload Image</span>
              )}
            </button>
          </form>
        </div>

        {/* Gallery Grid Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Image Repository ({images.length} {images.length === 1 ? 'record' : 'records'})
            </h4>

            {/* Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['All', 'Prescription', 'X-Ray', 'Before/After'].map(filterKey => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setSelectedFilter(filterKey)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    selectedFilter === filterKey
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>
          </div>

          {filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <ImageIcon className="w-12 h-12 mb-3 opacity-40 text-slate-300" />
              <p className="font-bold text-sm">
                {selectedFilter === 'All' ? 'No images uploaded yet.' : `No ${selectedFilter} records found.`}
              </p>
              <p className="text-xs text-slate-400 mt-1">Uploaded images stay permanently until deleted by the doctor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[560px] overflow-y-auto pr-1">
              {filteredImages.map((img) => (
                <div 
                  key={img._id} 
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
                    <img 
                      src={img.imageUrl} 
                      alt={img.imageType} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
                      <button
                        onClick={() => setActiveImage(img)}
                        className="p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md rounded-xl transition-all"
                        title="View Fullscreen"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <a
                        href={img.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md rounded-xl transition-all"
                        title="Open Full Resolution"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => handleDeleteImage(img._id)}
                        className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl transition-all"
                        title="Delete Record"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Category tag */}
                    <span className={`absolute top-3 left-3 px-2.5 py-1 backdrop-blur-md text-[9px] font-black rounded-lg uppercase tracking-wider shadow-sm flex items-center gap-1 ${getCategoryBadgeClass(img.imageType)}`}>
                      {img.imageType === 'Prescription' && <FileText className="w-2.5 h-2.5 inline" />}
                      {img.imageType}
                    </span>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400">
                      {new Date(img.date || img.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed line-clamp-2">
                      {img.notes || 'No description notes logged.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Lightbox / Fullscreen Image Viewer */}
      <AnimatePresence>
        {activeImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 cursor-pointer"
            onClick={() => setActiveImage(null)}
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <a
                href={activeImage.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Open original file in new tab"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Full Size</span>
              </a>
              <button 
                onClick={() => setActiveImage(null)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-black transition-all"
              >
                ✕ Close
              </button>
            </div>

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-4xl max-h-[85vh] flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={activeImage.imageUrl} 
                alt={activeImage.imageType} 
                className="max-w-full max-h-[72vh] rounded-2xl object-contain border border-white/10 shadow-2xl"
              />
              <div className="mt-5 text-center max-w-xl">
                <span className={`px-3 py-1 text-xs font-black rounded-xl uppercase tracking-wider inline-flex items-center gap-1.5 ${getCategoryBadgeClass(activeImage.imageType)}`}>
                  {activeImage.imageType === 'Prescription' && <FileText className="w-3 h-3" />}
                  {activeImage.imageType}
                </span>
                <p className="text-sm text-slate-200 font-semibold mt-3">{activeImage.notes || 'No description notes logged.'}</p>
                <p className="text-xs text-slate-400 mt-1 font-bold">
                  Logged on {new Date(activeImage.date || activeImage.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DentalImagesTab;
