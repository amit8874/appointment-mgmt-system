import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image as ImageIcon, FileText, Check, LayoutTemplate, Save, Trash2, Phone, Mail } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import { prescriptionTemplateApi, organizationApi } from '../../../services/api';

const TemplateModal = ({ isOpen, onClose, onSaveSuccess }) => {
  const [templateName, setTemplateName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const { user } = useAuth();

  // Header State
  const [headerType, setHeaderType] = useState('default'); // 'default' | 'custom'
  const [headerImagePreview, setHeaderImagePreview] = useState(null);
  const [headerImageFile, setHeaderImageFile] = useState(null);

  // Body State
  const [bodyType, setBodyType] = useState('default'); // 'default' | 'custom'
  const [bodyImagePreview, setBodyImagePreview] = useState(null);
  const [bodyImageFile, setBodyImageFile] = useState(null);

  // Footer State
  const [footerType, setFooterType] = useState('default'); // 'default' | 'custom'
  const [footerImagePreview, setFooterImagePreview] = useState(null);
  const [footerImageFile, setFooterImageFile] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [organization, setOrganization] = useState(null);

  const fetchTemplates = async () => {
    try {
      const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null) || user?._id;
      const response = await prescriptionTemplateApi.list(orgId);
      if (response && response.templates) {
        setTemplates(response.templates);
      }
    } catch (error) {
      console.error("Failed to fetch templates", error);
    }
  };

  const fetchOrgDetails = async () => {
    if (user) {
      try {
        const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null) || user?._id;
        if (orgId) {
          const org = await organizationApi.getById(orgId);
          setOrganization(org);
        }
      } catch (error) {
        console.error("Failed to fetch organization details", error);
      }
    }
  };

  const loadExistingTemplate = async () => {
    try {
      const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null) || user?._id;
      const response = await prescriptionTemplateApi.getDefault(orgId);
      if (response && response.template) {
        const t = response.template;
        setTemplateName(t.name || '');
        setIsDefault(t.isDefault || false);

        setHeaderType(t.headerType || 'default');
        if (t.headerImage) setHeaderImagePreview(getImageUrl(t.headerImage));

        setBodyType(t.bodyType || 'default');
        if (t.bodyImage) setBodyImagePreview(getImageUrl(t.bodyImage));

        setFooterType(t.footerType || 'default');
        if (t.footerImage) setFooterImagePreview(getImageUrl(t.footerImage));
      }
    } catch (error) {
      console.error("No existing template found or failed to load", error);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchOrgDetails();
      loadExistingTemplate();
      fetchTemplates();
    }
  }, [isOpen]);

  const handleDeleteTemplate = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    try {
      setIsDeleting(id);
      await prescriptionTemplateApi.delete(id);
      toast.success("Template deleted successfully");
      fetchTemplates();
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete template");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSelectTemplate = (t) => {
    setTemplateName(t.templateName || t.name || '');
    setIsDefault(t.isDefault || false);

    setHeaderType(t.headerType || 'default');
    setHeaderImagePreview(t.headerImage ? getImageUrl(t.headerImage) : null);
    setHeaderImageFile(null);

    setBodyType(t.bodyType || 'default');
    setBodyImagePreview(t.bodyImage ? getImageUrl(t.bodyImage) : null);
    setBodyImageFile(null);

    setFooterType(t.footerType || 'default');
    setFooterImagePreview(t.footerImage ? getImageUrl(t.footerImage) : null);
    setFooterImageFile(null);
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const serverUrl = baseUrl.replace(/\/api$/, '') || 'http://localhost:5000';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${serverUrl}${cleanPath}`;
  };

  const handleImageUpload = (e, setPreview, setFile) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    try {
      setIsSaving(true);
      const formData = new FormData();
      const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null) || user?._id;
      formData.append('organizationId', orgId);
      formData.append('templateName', templateName);
      formData.append('headerType', headerType);
      formData.append('bodyType', bodyType);
      formData.append('footerType', footerType);
      formData.append('isDefault', isDefault);

      if (headerType === 'custom' && headerImageFile) {
        formData.append('headerImage', headerImageFile);
      }
      if (bodyType === 'custom' && bodyImageFile) {
        formData.append('bodyImage', bodyImageFile);
      }
      if (footerType === 'custom' && footerImageFile) {
        formData.append('footerImage', footerImageFile);
      }

      await prescriptionTemplateApi.save(formData);
      toast.success("Template saved successfully!");
      if (onSaveSuccess) onSaveSuccess();
      onClose(); // Optional: close modal on success
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        />

        {/* Modal Body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          className="relative bg-white w-full max-w-7xl h-[95vh] rounded-none shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <LayoutTemplate size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Prescription Template Manager</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Customize your clinic's prescription layout and branding</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Main Content Split */}
          <div className="flex flex-1 overflow-hidden">

            {/* LEFT PANEL - CONTROLS */}
            <div className="w-[400px] flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-y-auto">
              <div className="p-6 space-y-8">

                {/* Templates List Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <LayoutTemplate size={14} /> Saved Templates
                    </h3>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">{templates.length}</span>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {templates.length > 0 ? templates.map(t => (
                      <div
                        key={t._id}
                        onClick={() => handleSelectTemplate(t)}
                        className={`group p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${templateName === t.templateName ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                      >
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${templateName === t.templateName ? 'text-indigo-700' : 'text-slate-700'}`}>
                            {t.templateName || t.name}
                          </span>
                          {t.isDefault && <span className="text-[9px] font-black text-emerald-600 uppercase mt-0.5">Default</span>}
                        </div>
                        <button
                          onClick={(e) => handleDeleteTemplate(e, t._id)}
                          disabled={isDeleting === t._id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        >
                          {isDeleting === t._id ? <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    )) : (
                      <div className="text-center py-6 bg-white border-2 border-dashed border-slate-200 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">No templates saved yet</p>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-slate-200" />



                {/* Template Config */}
                <div className="space-y-6">

                  {/* HEADER SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                      <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">1</div>
                      Header Configuration
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={headerType === 'default'} onChange={() => setHeaderType('default')} className="text-indigo-600 focus:ring-indigo-500" />
                        <span className="font-medium text-slate-700">Oviaan Default</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={headerType === 'custom'} onChange={() => setHeaderType('custom')} className="text-indigo-600 focus:ring-indigo-500" />
                        <span className="font-medium text-slate-700">Upload Custom</span>
                      </label>
                    </div>
                    {headerType === 'custom' && (
                      <div className="mt-3">
                        {!headerImagePreview ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-all group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                <Upload size={20} />
                              </div>
                              <p className="text-xs text-slate-500 font-medium">
                                <span className="font-bold text-indigo-600">Click to upload</span> header image
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">Recommended: 800x150px (PNG/JPG)</p>
                            </div>
                            <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleImageUpload(e, setHeaderImagePreview, setHeaderImageFile)} />
                          </label>
                        ) : (
                          <div className="relative rounded-xl overflow-hidden border-2 border-indigo-200 bg-white group shadow-md ring-4 ring-indigo-50">
                            <img src={headerImagePreview} alt="Header Preview" className="w-full h-24 object-contain p-2" />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                              <button
                                onClick={() => {
                                  setHeaderImagePreview(null);
                                  setHeaderImageFile(null);
                                  setHeaderType('default');
                                }}
                                className="px-4 py-2 bg-white text-red-600 rounded-xl hover:bg-red-50 transition-all shadow-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider transform hover:scale-105 active:scale-95"
                              >
                                <Trash2 size={16} /> Delete & Revert to Default
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* BODY SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                      <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</div>
                      Body Configuration
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={bodyType === 'default'} onChange={() => setBodyType('default')} className="text-indigo-600 focus:ring-indigo-500" />
                        <span className="font-medium text-slate-700">Oviaan Default</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={bodyType === 'custom'} onChange={() => setBodyType('custom')} className="text-indigo-600 focus:ring-indigo-500" />
                        <span className="font-medium text-slate-700">Upload Watermark</span>
                      </label>
                    </div>
                    {bodyType === 'custom' && (
                      <div className="mt-3">
                        {!bodyImagePreview ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-all group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                <ImageIcon size={20} />
                              </div>
                              <p className="text-xs text-slate-500 font-medium">
                                <span className="font-bold text-indigo-600">Click to upload</span> body watermark
                              </p>
                            </div>
                            <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleImageUpload(e, setBodyImagePreview, setBodyImageFile)} />
                          </label>
                        ) : (
                          <div className="relative rounded-xl overflow-hidden border-2 border-indigo-200 bg-white group shadow-md ring-4 ring-indigo-50">
                            <img src={bodyImagePreview} alt="Body Preview" className="w-full h-32 object-contain p-4 opacity-40" />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                              <button
                                onClick={() => {
                                  setBodyImagePreview(null);
                                  setBodyImageFile(null);
                                  setBodyType('default');
                                }}
                                className="px-4 py-2 bg-white text-red-600 rounded-xl hover:bg-red-50 transition-all shadow-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider transform hover:scale-105 active:scale-95"
                              >
                                <Trash2 size={16} /> Delete & Revert to Default
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* FOOTER SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                      <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">3</div>
                      Footer Configuration
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={footerType === 'default'} onChange={() => setFooterType('default')} className="text-indigo-600 focus:ring-indigo-500" />
                        <span className="font-medium text-slate-700">Oviaan Default</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" checked={footerType === 'custom'} onChange={() => setFooterType('custom')} className="text-indigo-600 focus:ring-indigo-500" />
                        <span className="font-medium text-slate-700">Upload Custom</span>
                      </label>
                    </div>
                    {footerType === 'custom' && (
                      <div className="mt-3">
                        {!footerImagePreview ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-all group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                <Upload size={20} />
                              </div>
                              <p className="text-xs text-slate-500 font-medium">
                                <span className="font-bold text-indigo-600">Click to upload</span> footer image
                              </p>
                            </div>
                            <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleImageUpload(e, setFooterImagePreview, setFooterImageFile)} />
                          </label>
                        ) : (
                          <div className="relative rounded-xl overflow-hidden border-2 border-indigo-200 bg-white group shadow-md ring-4 ring-indigo-50">
                            <img src={footerImagePreview} alt="Footer Preview" className="w-full h-16 object-contain p-2" />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                              <button
                                onClick={() => {
                                  setFooterImagePreview(null);
                                  setFooterImageFile(null);
                                  setFooterType('default');
                                }}
                                className="px-4 py-2 bg-white text-red-600 rounded-xl hover:bg-red-50 transition-all shadow-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider transform hover:scale-105 active:scale-95"
                              >
                                <Trash2 size={16} /> Delete & Revert to Default
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                <hr className="border-slate-200" />

                {/* Save Section */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">Template Name</label>
                    <input
                      type="text"
                      placeholder="e.g. My Clinic OPD Template"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isDefault ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                      {isDefault && <Check size={14} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                    <span className="text-sm font-medium text-slate-700 select-none">Set as default template for clinic</span>
                  </label>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="mt-auto p-6 bg-white border-t border-slate-200 space-y-3">
                <button
                  onClick={handleSaveTemplate}
                  disabled={isSaving}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Save size={16} /> {isSaving ? "Saving..." : "Save Template"}
                </button>
                <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL - LIVE PREVIEW */}
            <div className="flex-1 bg-slate-200/50 flex flex-col p-8 overflow-y-auto items-center">

              <div className="w-full max-w-3xl flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={16} /> Live A4 Preview
                </h3>
              </div>

              {/* A4 Paper Container (Aspect Ratio ~ 1:1.414) */}
              <div className="bg-white w-full max-w-3xl min-h-[900px] shadow-xl border border-slate-300 flex flex-col relative overflow-hidden" style={{ aspectRatio: '1 / 1.414' }}>

                {/* PREVIEW HEADER */}
                <div className="w-full border-b border-slate-200 min-h-[120px] relative">
                  {headerType === 'custom' && headerImagePreview ? (
                    <img src={headerImagePreview} alt="Header" className="w-full h-full object-contain" />
                  ) : (
                    <div className="p-8 flex justify-between items-start">
                      {/* LEFT: Clinic Info */}
                      <div className="flex items-start gap-4 flex-1">
                        {(organization?.branding?.logo || user?.organization?.branding?.logo) && (
                          <div className="w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            <img
                              src={getImageUrl(organization?.branding?.logo || user?.organization?.branding?.logo)}
                              alt="Clinic Logo"
                              className="max-h-full max-w-full object-contain p-1"
                            />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <h2 className="text-2xl font-black text-slate-800 leading-tight tracking-tight uppercase">
                            {organization?.name || user?.organization?.name || "Clinic Name"}
                          </h2>
                          <div className="text-[10px] font-bold text-slate-500 mt-2 space-y-1">
                            <p className="max-w-[300px] leading-relaxed uppercase">
                              {[
                                organization?.address?.street,
                                organization?.address?.city,
                                organization?.address?.state,
                                (organization?.address?.zipCode || organization?.address?.zip)
                              ].filter(p => p && String(p).trim() !== '').join(', ') || "Clinic Address Not Set"}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1"><Phone size={10} className="text-slate-400" /> {organization?.phone || user?.phone || "N/A"}</span>
                              {organization?.email && <span className="flex items-center gap-1"><Mail size={10} className="text-slate-400" /> {organization?.email}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Doctor Info */}
                      <div className="text-right flex-1 flex flex-col items-end">
                        <h1 className="text-2xl font-black text-indigo-700 leading-tight tracking-tighter uppercase">
                          {user?.name || "Doctor Name"}
                        </h1>
                        <div className="text-[11px] font-black text-indigo-500/90 mt-1.5 uppercase tracking-widest border-b-2 border-indigo-100 pb-0.5 mb-1.5">
                          {user?.qualification || "Qualifications"}
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {user?.specialization || user?.specialty || "Specialization"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* PREVIEW PATIENT INFO BAR */}
                <div className="bg-slate-100 px-8 py-3 flex items-center gap-6 text-sm border-b border-slate-200">
                  <span className="font-bold text-slate-800">ID: DEMO7100</span>
                  <span className="font-bold text-slate-800 border-l border-slate-300 pl-6">Mr. Ramesh Chandra (66y, Male)</span>
                  <span className="font-bold text-slate-800 border-l border-slate-300 pl-6">Date: {new Date().toLocaleDateString()}</span>
                </div>

                {/* PREVIEW BODY */}
                <div className="flex-1 p-8 relative">
                  {/* Custom Watermark / Body Background */}
                  {bodyType === 'custom' && bodyImagePreview && (
                    <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
                      <img src={bodyImagePreview} alt="Watermark" className="w-2/3 h-2/3 object-contain" />
                    </div>
                  )}

                  {/* Mock Clinical Data */}
                  <div className="relative z-10">
                    <div className="text-sm space-y-1 mb-6 border-b border-slate-100 pb-4">
                      <p><span className="font-bold text-slate-600">Vitals:</span> Height: 166cm, Weight: 72kg, BP: 140/80</p>
                      <p><span className="font-bold text-slate-600">Complaints:</span> Mild Cold, Alternate Day</p>
                      <p><span className="font-bold text-slate-600">Diagnosis:</span> Hypertension, Type 2 Diabetes</p>
                    </div>

                    <div className="mb-4">
                      <span className="text-2xl font-serif italic text-slate-800">Rx</span>
                    </div>

                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="py-2 px-3 font-bold text-slate-600">#</th>
                          <th className="py-2 px-3 font-bold text-slate-600">Medicine</th>
                          <th className="py-2 px-3 font-bold text-slate-600">Dose</th>
                          <th className="py-2 px-3 font-bold text-slate-600">Timing & Freq</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-3 px-3 text-slate-500">1</td>
                          <td className="py-3 px-3 font-bold text-slate-800">NOVOMIX 30 IU</td>
                          <td className="py-3 px-3 font-medium">12 - 0 - 12</td>
                          <td className="py-3 px-3 text-slate-600">Before Food - Daily</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3 text-slate-500">2</td>
                          <td className="py-3 px-3 font-bold text-slate-800">UDAPA 10MG</td>
                          <td className="py-3 px-3 font-medium">1/2 - 0 - 0</td>
                          <td className="py-3 px-3 text-slate-600">After Food - Daily</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-3 text-slate-500">3</td>
                          <td className="py-3 px-3 font-bold text-slate-800">ISTAMET 50/1000</td>
                          <td className="py-3 px-3 font-medium">1 - 0 - 1</td>
                          <td className="py-3 px-3 text-slate-600">After Food - Daily</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PREVIEW FOOTER */}
                <div className="w-full border-t border-slate-200 min-h-[80px] mt-auto relative">
                  {footerType === 'custom' && footerImagePreview ? (
                    <img src={footerImagePreview} alt="Footer" className="w-full h-full object-contain" />
                  ) : (
                    <div className="p-4 text-center opacity-50">
                      <p className="text-xs font-bold text-slate-400">Powered by Oviaan - www.oviaan.com</p>
                      <p className="text-[10px] text-slate-400 mt-1">Diabetes | Thyroid Disorders | Hypertension | Lipid Disorders</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TemplateModal;
