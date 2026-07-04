import React, { useState } from 'react';
import { Building2, Image as ImageIcon, Plus, Trash2, Loader2, AlertCircle, Sparkles, X } from 'lucide-react';
import { commonApi } from '../../../services/api';

const ClinicProfileTab = ({ organization, onUpdate, loading }) => {
  const [formData, setFormData] = useState({
    about: organization?.about || '',
    clinicImages: organization?.clinicImages || [],
    facilities: organization?.facilities || []
  });

  const [newFacility, setNewFacility] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddFacility = (e) => {
    e.preventDefault();
    if (!newFacility.trim()) return;
    if (formData.facilities.includes(newFacility.trim())) {
      setNewFacility('');
      return;
    }
    setFormData(prev => ({
      ...prev,
      facilities: [...prev.facilities, newFacility.trim()]
    }));
    setNewFacility('');
  };

  const handleRemoveFacility = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError(null);
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      setUploadError("Image size must be less than 2MB. Please compress and try again.");
      return;
    }

    setUploading(true);
    try {
      const data = new FormData();
      data.append('image', file);
      const result = await commonApi.uploadImage(data);
      if (result?.imageUrl) {
        setFormData(prev => ({
          ...prev,
          clinicImages: [...prev.clinicImages, result.imageUrl]
        }));
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
      setUploadError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      clinicImages: prev.clinicImages.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate({
      about: formData.about,
      clinicImages: formData.clinicImages,
      facilities: formData.facilities
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Tab Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Public Profile Customization</h3>
              <p className="text-xs text-slate-500">Configure details, photos, and features that appear on your public clinic page.</p>
            </div>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-8 space-y-8">
          
          {/* Clinic Biography */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Clinic Biography & Description</label>
            <p className="text-[10px] text-slate-400 font-medium">Write a welcoming description of your clinic's services, team philosophy, and values.</p>
            <textarea
              name="about"
              value={formData.about}
              onChange={handleTextChange}
              rows="5"
              placeholder="Describe your clinic's history, specialist treatments, clinic infrastructure, hygiene standards, or mission..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="h-px bg-slate-100" />

          {/* Clinic Photo Gallery */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Clinic Gallery ({formData.clinicImages.length}/5)</label>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Upload high-quality images of the reception, clinic entrance, and patient cabins.</p>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2 animate-pulse">
                <AlertCircle size={16} />
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {formData.clinicImages.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 shadow-sm">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1.5 bg-white/95 rounded-lg text-rose-600 hover:text-rose-700 transition-all shadow active:scale-95"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {formData.clinicImages.length < 5 && (
                <label className={`border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50 hover:bg-slate-100/50 relative ${uploading ? 'pointer-events-none' : ''}`}>
                  {uploading ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <Loader2 className="animate-spin text-indigo-600" size={20} />
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="text-slate-400" size={24} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleImageUpload}
                    accept="image/*"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Interactive Facilities Tag Manager */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Clinic Facilities & Services</label>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Add features or amenities that make your clinic stand out (e.g. WiFi, Wheelchair Access, Dental X-Ray).</p>
            </div>

            <form onSubmit={handleAddFacility} className="flex gap-3 max-w-md">
              <input
                type="text"
                value={newFacility}
                onChange={(e) => setNewFacility(e.target.value)}
                placeholder="e.g. Painless Root Canal Treatment"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-1 shadow-md shadow-indigo-100"
              >
                <Plus size={16} /> Add
              </button>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {formData.facilities.length === 0 ? (
                <span className="text-xs font-medium text-slate-400 italic">No facilities added yet.</span>
              ) : (
                formData.facilities.map((fac, idx) => (
                  <span 
                    key={idx}
                    className="pl-3.5 pr-2 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 group hover:border-rose-100 hover:text-rose-600 transition-colors"
                  >
                    <span>{fac}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFacility(idx)}
                      className="p-0.5 rounded-full hover:bg-rose-50 text-slate-400 group-hover:text-rose-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ClinicProfileTab;
