import React, { useState, useEffect } from 'react';
import { dentistApi, commonApi } from '../../../services/api';
import { Camera, Plus, Trash2, ShieldAlert, Eye, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

const DentalImagesTab = ({ patientId }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload States
  const [uploading, setUploading] = useState(false);
  const [imageType, setImageType] = useState('Before Image');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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

    // Basic size validation (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select an image file first');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload to S3
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('folderType', `patients/${patientId}/dental-clinical`);

      const uploadRes = await commonApi.uploadImage(formData);
      const { imageUrl } = uploadRes;

      if (!imageUrl) {
        throw new Error('S3 upload returned invalid response');
      }

      // 2. Save metadata in DB
      await dentistApi.uploadDentalImage(patientId, {
        imageType,
        imageUrl,
        notes: notes.trim()
      });

      toast.success('Clinical dental image logged successfully!');
      setSelectedFile(null);
      setPreviewUrl(null);
      setNotes('');
      fetchImages();
    } catch (err) {
      console.error('Error uploading dental image:', err);
      toast.error('Upload failed. Please check file format and size.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this clinical image?')) return;
    try {
      await dentistApi.deleteDentalImage(id);
      toast.success('Image deleted from logs.');
      fetchImages();
    } catch (err) {
      console.error('Error deleting dental image:', err);
      toast.error('Failed to delete image.');
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
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">
            Clinical Dental Images & X-Ray Repository
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Form Panel */}
        <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 h-fit">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            Upload Clinical Image
          </h4>
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* File Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Select Photo/X-Ray
              </label>
              {previewUrl ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-black/5">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-all"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 animate-pulse" />
                    <p className="text-xs font-bold text-slate-500">Click to choose image</p>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider">JPEG, PNG up to 5MB</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Image Category
              </label>
              <select
                value={imageType}
                onChange={(e) => setImageType(e.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Before Image">Before Image</option>
                <option value="After Image">After Image</option>
                <option value="X-Ray Image">X-Ray Image</option>
                <option value="Intraoral Image">Intraoral Image</option>
                <option value="Progress Image">Progress Image</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Clinical Notes
              </label>
              <textarea
                rows={2}
                placeholder="Log tooth details, treatment stage, specific notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-indigo-600/10"
            >
              {uploading ? 'Uploading to S3...' : 'Upload Image'}
            </button>
          </form>
        </div>

        {/* Gallery Grid Panel */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Clinical Photo Gallery ({images.length} logs)
          </h4>

          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-100 rounded-3xl">
              <ImageIcon className="w-12 h-12 mb-3 opacity-40 text-slate-300" />
              <p className="font-bold text-sm">No clinical images uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto pr-1">
              {images.map((img) => (
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
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => setActiveImage(img)}
                        className="p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md rounded-xl transition-all"
                        title="View Fullscreen"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteImage(img._id)}
                        className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl transition-all"
                        title="Delete Log"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Category tag */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 text-white backdrop-blur-md text-[9px] font-black rounded-lg uppercase tracking-wider">
                      {img.imageType}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="text-xs font-black text-slate-400">
                      {new Date(img.date || img.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed truncate">
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
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 cursor-pointer"
            onClick={() => setActiveImage(null)}
          >
            <button 
              onClick={() => setActiveImage(null)}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-lg font-black transition-all"
            >
              ✕ Close
            </button>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-4xl max-h-[80vh] flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={activeImage.imageUrl} 
                alt={activeImage.imageType} 
                className="max-w-full max-h-[70vh] rounded-3xl object-contain border border-white/10 shadow-2xl"
              />
              <div className="mt-6 text-center max-w-xl">
                <span className="px-3 py-1 bg-indigo-500 text-white text-xs font-black rounded-xl uppercase tracking-wider">
                  {activeImage.imageType}
                </span>
                <p className="text-sm text-slate-300 font-semibold mt-3">{activeImage.notes || 'No description notes logged.'}</p>
                <p className="text-xs text-slate-500 mt-1 font-bold">{new Date(activeImage.date).toLocaleDateString()}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DentalImagesTab;
