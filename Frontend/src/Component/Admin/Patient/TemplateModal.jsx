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

  // Layout State
  const [layoutStyle, setLayoutStyle] = useState('default'); // 'default' | 'a4'

  const [templates, setTemplates] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [organization, setOrganization] = useState(null);

  const fetchTemplates = async () => {
    // Legacy function, kept for compatibility if needed elsewhere
  };

  const fetchOrgSettings = async () => {
    try {
      // Fetch A4 settings directly
      const settingsData = await organizationApi.getPrescriptionTemplateSettings();
      if (settingsData && settingsData.data) {
        setOrganization(prev => ({
          ...prev,
          prescriptionTemplate: settingsData.data
        }));
      }

      // Still need basic org details for fallback rendering
      if (user) {
        const orgId = user?.organization?._id || user?.organizationId || (typeof user?.organization === 'string' ? user.organization : null) || user?._id;
        if (orgId) {
          const org = await organizationApi.getById(orgId);
          setOrganization(prev => ({
            ...org,
            prescriptionTemplate: prev?.prescriptionTemplate || org.prescriptionTemplate
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch organization settings", error);
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
        setLayoutStyle(t.headerType === 'a4' ? 'a4' : 'default');
      }
    } catch (error) {
      console.error("No existing template found or failed to load", error);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchOrgSettings();
      loadExistingTemplate();
    }
  }, [isOpen]);

  const handleSelectTemplate = (t) => {
    setLayoutStyle(t.headerType === 'a4' ? 'a4' : 'default');
  };

  const handleApply = async () => {
    // Instead of saving to DB, just return the selection
    if (onSaveSuccess) {
       onSaveSuccess(layoutStyle);
    }
    toast.success("Layout selected successfully");
    onClose();
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const serverUrl = baseUrl.replace(/\/api$/, '') || 'http://localhost:5000';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${serverUrl}${cleanPath}`;
  };

  // File upload logic removed since we use settings now

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
      formData.append('headerType', layoutStyle); // Store layout style in headerType for backward compatibility
      formData.append('bodyType', layoutStyle);
      formData.append('footerType', layoutStyle);
      formData.append('isDefault', isDefault);

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

                {/* Templates List Section Removed as requested */}
                
                {/* Template Config */}
                <div className="space-y-6">

                  {/* LAYOUT STYLE SECTION */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">
                      <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">1</div>
                      Layout Configuration
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${layoutStyle === 'default' ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'}">
                        <input type="radio" checked={layoutStyle === 'default'} onChange={() => setLayoutStyle('default')} className="mt-1 text-indigo-600 focus:ring-indigo-500" />
                        <div>
                          <span className="font-bold text-slate-800 block">Oviaan Default</span>
                          <span className="text-xs text-slate-500 font-medium block mt-0.5">Standard text-based clinical header and footer</span>
                        </div>
                      </label>
                      <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${!organization?.prescriptionTemplate?.templateUrl ? 'opacity-50 cursor-not-allowed' : ''} ${layoutStyle === 'a4' ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" disabled={!organization?.prescriptionTemplate?.templateUrl} checked={layoutStyle === 'a4'} onChange={() => setLayoutStyle('a4')} className="mt-1 text-indigo-600 focus:ring-indigo-500" />
                        <div>
                          <span className="font-bold text-slate-800 block">A4 Full Template (Settings)</span>
                          <span className="text-xs text-slate-500 font-medium block mt-0.5">Uses the background image configured in Admin Settings</span>
                          {!organization?.prescriptionTemplate?.templateUrl && (
                            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mt-1 block">Not Configured in Settings</span>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                </div>

              </div>

              {/* Action Buttons */}
              <div className="mt-auto p-6 bg-white border-t border-slate-200 space-y-3">
                <button
                  onClick={handleApply}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Apply Template
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

                  {layoutStyle === 'a4' && organization?.prescriptionTemplate?.templateUrl ? (
                    <img src={getImageUrl(organization.prescriptionTemplate.templateUrl)} alt="A4 Template Background" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: 0 }} />
                  ) : null}
                  
                  <div className="relative z-10 w-full h-full flex flex-col pointer-events-none">
                    {/* Header Fallback (only if not A4) */}
                    {layoutStyle !== 'a4' && (
                      <div className="w-full border-b border-slate-200 min-h-[120px] relative">
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
                  </div>
                    )}

                    {/* PREVIEW PATIENT INFO BAR */}
                <div className="bg-slate-100 px-8 py-3 flex items-center gap-6 text-sm border-b border-slate-200">
                  <span className="font-bold text-slate-800">ID: DEMO7100</span>
                  <span className="font-bold text-slate-800 border-l border-slate-300 pl-6">Mr. Ramesh Chandra (66y, Male)</span>
                  <span className="font-bold text-slate-800 border-l border-slate-300 pl-6">Date: {new Date().toLocaleDateString()}</span>
                </div>

                    {/* PREVIEW BODY */}
                    <div className="flex-1 p-8 relative">
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
                    {layoutStyle !== 'a4' && (
                      <div className="w-full border-t border-slate-200 min-h-[80px] mt-auto relative">
                        <div className="p-4 text-center opacity-50">
                          <p className="text-xs font-bold text-slate-400">Powered by Oviaan - www.oviaan.com</p>
                          <p className="text-[10px] text-slate-400 mt-1">Diabetes | Thyroid Disorders | Hypertension | Lipid Disorders</p>
                        </div>
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
