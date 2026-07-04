import React, { useState, useEffect } from 'react';
import { Stethoscope, Award, GraduationCap, Briefcase, IndianRupee, FileText, Image as ImageIcon, Trash2, Plus, Loader2, AlertCircle, Info } from 'lucide-react';
import { commonApi } from '../../../services/api';

const DoctorPublicProfileTab = ({ doctor, onUpdate, loading }) => {
  const [formData, setFormData] = useState({
    specialization: doctor?.specialization || '',
    qualification: doctor?.qualification || '',
    experience: doctor?.experience || 0,
    fee: doctor?.fee || doctor?.consultationFee || 0,
    bio: doctor?.bio || doctor?.about || '',
    clinicImages: doctor?.clinicImages || []
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (doctor) {
      setFormData({
        specialization: doctor.specialization || '',
        qualification: doctor.qualification || '',
        experience: doctor.experience || 0,
        fee: doctor.fee || doctor.consultationFee || 0,
        bio: doctor.bio || doctor.about || '',
        clinicImages: doctor.clinicImages || []
      });
    }
  }, [doctor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'experience' || name === 'fee' ? (parseFloat(value) || 0) : value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError('');
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB limit
    if (file.size > MAX_SIZE) {
      setUploadError('Image size must be less than 2MB.');
      return;
    }

    if (formData.clinicImages.length >= 5) {
      setUploadError('Maximum of 5 clinic images are allowed.');
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
      } else {
        setUploadError('Failed to get uploaded image URL.');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setUploadError('Failed to upload image. Please try again.');
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
      ...formData,
      // sync bio and about just in case
      about: formData.bio
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Stethoscope size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Public Profile Details</h3>
              <p className="text-xs text-slate-500">Customize how your profile appears to searching patients.</p>
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

        {/* Form Body */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Specialization</label>
              <div className="relative">
                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="e.g. Cosmetic Dentist, Orthodontist"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Qualifications</label>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  placeholder="e.g. BDS, MDS"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Experience (Years)</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="number" 
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  min="0"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consultation Fee (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="number" 
                  name="fee"
                  value={formData.fee}
                  onChange={handleChange}
                  min="0"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Biography */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Professional Bio / About Me</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 text-slate-400" size={18} />
              <textarea 
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Write a brief description about your expertise, background, or clinical philosophy..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 resize-none"
              />
            </div>
          </div>

          {/* Clinic Images Gallery */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ImageIcon size={18} className="text-indigo-600" />
                Clinic Images ({formData.clinicImages.length}/5)
              </h4>
              <p className="text-xs text-slate-400 mt-1">Upload high-quality pictures of your clinic, treatment rooms, or equipment.</p>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle size={16} />
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {formData.clinicImages.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-100">
                  <img src={img} alt={`Clinic ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-2 bg-white/90 hover:bg-white text-rose-600 rounded-lg shadow transition-all active:scale-95"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {formData.clinicImages.length < 5 && (
                <label className={`border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50 hover:bg-slate-100/50 relative ${uploading ? 'pointer-events-none' : ''}`}>
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-indigo-600" size={20} />
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <Plus className="text-slate-400" size={24} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Add Image</span>
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
        </div>
      </div>

      <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-start gap-4">
        <Info className="text-indigo-600 mt-1 shrink-0" size={24} />
        <div>
          <h4 className="font-bold text-indigo-900">Public Profile Checklist</h4>
          <p className="text-sm text-indigo-700/80 mt-1 leading-relaxed">
            Ensure your profile is complete with qualification details and high-quality clinic photos. 
            A complete profile experiences up to **4x more visitor engagement and bookings** on Oviaan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DoctorPublicProfileTab;
