import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, Check, LayoutTemplate, Save, Trash2, Phone, Mail, Printer, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import { invoiceTemplateApi, organizationApi } from '../../../services/api';
import OviaanDefaultPharmacyInvoiceTemplate from '../../../components/billing/templates/OviaanDefaultPharmacyInvoiceTemplate';

const InvoiceTemplateModal = ({ isOpen, onClose, onSaveSuccess, onApply }) => {
  const [templateName, setTemplateName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const { user } = useAuth();
  
  // Header State
  const [headerType, setHeaderType] = useState('default'); // 'default' | 'custom'
  const [headerImagePreview, setHeaderImagePreview] = useState(null);
  const [headerImageFile, setHeaderImageFile] = useState(null);

  // Footer State
  const [footerType, setFooterType] = useState('default'); // 'default' | 'custom'
  const [footerImagePreview, setFooterImagePreview] = useState(null);
  const [footerImageFile, setFooterImageFile] = useState(null);

  const [layoutType, setLayoutType] = useState('pharmacy'); // 'standard' | 'modern' | 'pharmacy'

  const [templates, setTemplates] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [customGstNumber, setCustomGstNumber] = useState('');
  const [showGst, setShowGst] = useState(true);

  const fetchTemplates = async () => {
    try {
      const response = await invoiceTemplateApi.getAll();
      if (response && response.templates) {
        setTemplates(response.templates);
      } else if (Array.isArray(response)) {
        setTemplates(response);
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

  useEffect(() => {
    if (isOpen) {
      setEditingTemplateId(null);
      setTemplateName('');
      setIsDefault(false);
      setHeaderType('default');
      setHeaderImagePreview(null);
      setFooterType('default');
      setFooterImagePreview(null);
      setCustomGstNumber(organization?.gstNumber || '');
      setShowGst(true);
      fetchOrgDetails();
      fetchTemplates();
    }
  }, [isOpen]);

  const handleDeleteTemplate = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    
    try {
      setIsDeleting(id);
      await invoiceTemplateApi.delete(id);
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
    setEditingTemplateId(t._id);
    setTemplateName(t.name || t.templateName || '');
    setIsDefault(t.isDefault || false);
    setLayoutType(t.layoutType || 'standard');
    setCustomGstNumber(t.metadata?.gstNumber || organization?.gstNumber || '');
    setShowGst(t.metadata?.showGst !== undefined ? t.metadata.showGst : true);
    
    setHeaderType(t.headerType || 'default');
    setHeaderImagePreview(t.headerImage ? getImageUrl(t.headerImage) : null);
    setHeaderImageFile(null);
    
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

  const handleCreateNew = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setIsDefault(false);
    setLayoutType('pharmacy');
    setHeaderType('default');
    setHeaderImagePreview(null);
    setHeaderImageFile(null);
    setFooterType('default');
    setFooterImagePreview(null);
    setFooterImageFile(null);
    setCustomGstNumber(organization?.gstNumber || '');
    setShowGst(true);
    setCustomTerms('1. Medicine can be returned only within 7 days with valid bill.\n2. Storage items (Fridge) and Loose Tablets cannot be returned.');
    setShowTerms(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    try {
      setIsSaving(true);
      
      // SMART LOGIC: If the name is different from the original selected template, 
      // we treat it as a "Save As" and create a NEW template.
      const originalTemplate = templates.find(t => t._id === editingTemplateId);
      const isNewName = originalTemplate && (originalTemplate.name || originalTemplate.templateName) !== templateName;
      
      const effectiveEditingId = isNewName ? null : editingTemplateId;

      const formData = new FormData();
      formData.append('name', templateName);
      formData.append('headerType', headerType);
      formData.append('footerType', footerType);
      formData.append('layoutType', layoutType);
      formData.append('isDefault', isDefault);
      formData.append('htmlLayout', 'CORE_LAYOUT_REFERENCE');
      
      const metadata = {
        baseLayoutId: layoutType === 'modern' ? 'layout-modern' : (layoutType === 'pharmacy' ? 'layout-pharmacy' : 'layout-standard'),
        primaryColor: layoutType === 'modern' ? '#10b981' : '#3b82f6',
        secondaryColor: '#1e293b',
        fontFamily: 'Inter',
        showLogo: true,
        showGst: showGst,
        gstNumber: customGstNumber,
        showPatientId: true,
        showDoctor: true,
        isCompact: false
      };
      formData.append('metadata', JSON.stringify(metadata));
      
      if (headerType === 'custom' && headerImageFile) {
        formData.append('headerImage', headerImageFile);
      }
      if (footerType === 'custom' && footerImageFile) {
        formData.append('footerImage', footerImageFile);
      }

      if (effectiveEditingId) {
        await invoiceTemplateApi.update(effectiveEditingId, formData);
      } else {
        await invoiceTemplateApi.create(formData);
      }
      toast.success(effectiveEditingId ? "Template updated successfully!" : "New template created successfully!");
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyTemplate = () => {
    if (onApply) {
      const virtualTemplate = {
        _id: editingTemplateId || 'temporary-apply',
        name: templateName || 'Applied Template',
        headerType,
        headerImage: headerImagePreview,
        footerType,
        footerImage: footerImagePreview,
        layoutType,
        isDefault
      };
      onApply(virtualTemplate);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-full max-w-6xl h-[98vh] rounded-none shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-none">
                <LayoutTemplate size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Billing Template Manager</h2>
                <p className="text-xs text-slate-500 font-medium">Customize your pharmacy invoice layout</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-none transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Column: Controls */}
            <div className="w-[400px] border-r border-slate-100 bg-slate-50/30 flex flex-col overflow-y-auto">
              <div className="p-4 space-y-3">
                
                {/* Saved Templates */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      Saved Templates
                    </h3>
                  </div>
                  {templates.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {templates.map(t => (
                        <div 
                          key={t._id}
                          onClick={() => handleSelectTemplate(t)}
                          className={`group p-3 rounded-none border transition-all cursor-pointer flex items-center justify-between ${templateName === (t.name || t.templateName) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-700">{t.name || t.templateName}</span>
                            {t.isDefault && <span className="text-[9px] font-semibold text-indigo-600 uppercase mt-0.5">Default</span>}
                          </div>
                          <button 
                            onClick={(e) => handleDeleteTemplate(e, t._id)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-none transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-slate-200 text-center">
                      <p className="text-[10px] font-medium text-slate-400">No saved templates yet.</p>
                    </div>
                  )}
                </div>

                {/* Header Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-none bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-md shadow-indigo-100">1</span>
                    <h3 className="text-base font-semibold text-slate-800">Header Configuration</h3>
                  </div>
                  
                  <div className="flex gap-4 p-1 bg-slate-100 rounded-none w-fit">
                    {[
                      { id: 'default', label: 'Oviaan Default' },
                      { id: 'custom', label: 'Upload Custom' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setHeaderType(opt.id)}
                        className={`px-4 py-1.5 rounded-none text-xs font-semibold transition-all ${headerType === opt.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {headerType === 'custom' && (
                    <div className="mt-3">
                      {!headerImagePreview ? (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-none cursor-pointer bg-white hover:bg-slate-50 hover:border-indigo-200 transition-all group">
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-none mb-2 group-hover:scale-105 transition-transform">
                            <Upload size={20} />
                          </div>
                          <p className="text-xs text-slate-500 font-medium">Click to upload header image</p>
                          <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">PNG or JPG (Max 5MB)</p>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setHeaderImagePreview, setHeaderImageFile)} />
                        </label>
                      ) : (
                        <div className="relative rounded-none overflow-hidden border border-indigo-100 group shadow-lg">
                          <img src={headerImagePreview} alt="Header" className="w-full h-24 object-contain bg-white" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                            <button onClick={() => { setHeaderImagePreview(null); setHeaderImageFile(null); }} className="px-4 py-2 bg-white text-rose-600 rounded-none font-semibold text-sm flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
                              <Trash2 size={16} /> Change Image
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Layout Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-none bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-md shadow-indigo-100">2</span>
                    <h3 className="text-base font-semibold text-slate-800">Layout Selection</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'standard', label: 'Standard' },
                      { id: 'modern', label: 'Modern' },
                      { id: 'pharmacy', label: 'Oviaan Pharmacy' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setLayoutType(opt.id)}
                        className={`px-4 py-1.5 rounded-none text-xs font-semibold transition-all border ${layoutType === opt.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-none bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-md shadow-indigo-100">3</span>
                    <h3 className="text-base font-semibold text-slate-800">Upload Signature</h3>
                  </div>

                  <div className="flex gap-4 p-1 bg-slate-100 rounded-none w-fit">
                    {[
                      { id: 'default', label: 'Oviaan Default' },
                      { id: 'custom', label: 'Upload Custom' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setFooterType(opt.id)}
                        className={`px-4 py-1.5 rounded-none text-xs font-semibold transition-all ${footerType === opt.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {footerType === 'custom' && (
                    <div className="mt-3">
                      {!footerImagePreview ? (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-none cursor-pointer bg-white hover:bg-slate-50 hover:border-indigo-200 transition-all group">
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-none mb-2 group-hover:scale-105 transition-transform">
                            <Upload size={20} />
                          </div>
                          <p className="text-xs text-slate-500 font-medium">Click to upload signature image</p>
                          <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">PNG or JPG (Max 5MB)</p>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setFooterImagePreview, setFooterImageFile)} />
                        </label>
                      ) : (
                        <div className="relative rounded-none overflow-hidden border border-indigo-100 group shadow-lg">
                          <img src={footerImagePreview} alt="Footer" className="w-full h-20 object-contain bg-white" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                            <button onClick={() => { setFooterImagePreview(null); setFooterImageFile(null); }} className="px-4 py-2 bg-white text-rose-600 rounded-none font-semibold text-sm flex items-center gap-2 hover:scale-105 transition-transform shadow-xl">
                              <Trash2 size={16} /> Change Image
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* GST Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-none bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-md shadow-indigo-100">4</span>
                    <h3 className="text-base font-semibold text-slate-800">Tax Configuration</h3>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Clinic GST Number</label>
                    <input 
                      type="text" 
                      placeholder="Enter GST Number"
                      value={customGstNumber}
                      onChange={(e) => setCustomGstNumber(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-none text-sm font-semibold focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group py-1">
                    <div className={`w-5 h-5 rounded-none border flex items-center justify-center transition-all ${showGst ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white border-slate-200 group-hover:border-indigo-400'}`}>
                      {showGst && <Check size={12} className="text-white" strokeWidth={4} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={showGst} onChange={(e) => setShowGst(e.target.checked)} />
                    <span className="text-xs font-semibold text-slate-600">Show GST Number on Invoice</span>
                  </label>
                </div>

                {/* Template Name & Defaults */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Template Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. My Clinic Pharmacy Template"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-none text-sm font-semibold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                  
                  <label className="flex items-center gap-3 cursor-pointer group py-1">
                    <div className={`w-5 h-5 rounded-none border flex items-center justify-center transition-all ${isDefault ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white border-slate-200 group-hover:border-indigo-400'}`}>
                      {isDefault && <Check size={12} className="text-white" strokeWidth={4} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                    <span className="text-xs font-semibold text-slate-600">Set as default template for clinic</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto p-4 bg-white border-t border-slate-100 space-y-3">
                <button 
                  onClick={handleSaveTemplate}
                  disabled={isSaving}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-none text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 border-b border-slate-700"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Save size={16} /> Save Changes</>
                  )}
                </button>
                <button 
                  onClick={handleApplyTemplate}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-none text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-100"
                >
                  <Check size={16} /> Apply Template
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-3 bg-slate-100 text-slate-500 rounded-none text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Right Column: Preview */}
            <div className="flex-1 bg-slate-100/50 p-4 overflow-y-auto flex flex-col items-center">
              <div className="w-full max-w-4xl flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText size={16} /> Live Invoice Preview
                </h3>
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Live Rendering</span>
                </div>
              </div>

              {/* A4 Paper */}
              <div className="bg-white w-full max-w-2xl min-h-[842px] shadow-none border border-slate-300 flex flex-col relative overflow-hidden" style={{ aspectRatio: '1 / 1.414' }}>
                {layoutType === 'pharmacy' ? (
                  <div className="p-4 flex flex-col items-center justify-start h-full overflow-y-auto custom-scrollbar">
                    <OviaanDefaultPharmacyInvoiceTemplate 
                      clinicData={{
                        headerType: headerType,
                        headerImage: (headerType === 'custom' && headerImagePreview) ? headerImagePreview : null,
                        logo: (headerType === 'custom' && headerImagePreview) ? headerImagePreview : getImageUrl(organization?.branding?.logo || organization?.logo),
                        name: organization?.name || "Clinic Name",
                        address: organization?.address ? `${organization.address.street || ''} ${organization.address.city || ''} ${organization.address.state || ''} ${organization.address.zipCode || ''}`.trim() : "Clinic Address",
                        email: organization?.email || "clinic@example.com",
                        phone: organization?.phone || "0000000000",
                        gstNumber: customGstNumber || organization?.gstNumber || "",
                        showGst: showGst,
                        doctorSignature: (footerType === 'custom' && footerImagePreview) ? footerImagePreview : getImageUrl(organization?.doctorSignature)
                      }}
                      billData={{
                        patientName: "Mr. Ramesh Chandra",
                        age: "66",
                        gender: "Male",
                        doctorName: "DR. SHALABH ARORA",
                        patientAddress: "HALDWANI",
                        billDate: new Date().toLocaleDateString('en-GB'),
                        billNo: "PH-2024-001",
                        paymentMode: "cash",
                        cardNo: "",
                        totalAmount: 209.00,
                        discountAmount: 11.00,
                        netAmount: 209.00,
                        paidAmount: 209.00,
                        balanceAmount: 0.00,
                        amountInWords: "Two Hundred and Nine rupees only",
                        medicines: [
                          { name: 'AMOXICILLIN 500MG', qty: 10, batchNo: 'B123', expiry: '12/25', mrp: 15, total: 150 },
                          { name: 'PARACETAMOL 650MG', qty: 15, batchNo: 'B456', expiry: '10/25', mrp: 2, total: 30 },
                          { name: 'CETIRIZINE 10MG', qty: 5, batchNo: 'B789', expiry: '08/25', mrp: 8, total: 40 }
                        ]
                      }}
                    />
                  </div>
                ) : (
                  <>
                    {/* Invoice Header */}
                    <div className="w-full border-b border-slate-100 min-h-[100px] relative">
                      {headerType === 'custom' && headerImagePreview ? (
                        <img src={headerImagePreview} alt="Header" className="w-full h-full object-contain" />
                      ) : (
                        <div className="p-6 flex justify-between items-start">
                          <div className="flex gap-4">
                            <div className="w-16 h-16 bg-indigo-600 rounded-none flex items-center justify-center text-white text-2xl font-bold">
                              {organization?.name?.[0] || 'C'}
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{organization?.name || "Clinic Name"}</h2>
                              <div className="mt-1 space-y-0.5 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                <p className="max-w-[200px] leading-relaxed">{organization?.address?.street || "Clinic Address Line"}</p>
                                <p>{organization?.address?.city || "City"}, {organization?.address?.state || "State"}</p>
                                <div className="flex gap-2 pt-0.5">
                                  <span className="flex items-center gap-1"><Phone size={8} /> {organization?.phone || "0000000000"}</span>
                                  <span className="flex items-center gap-1"><Mail size={8} /> {organization?.email || "clinic@example.com"}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-none text-[10px] font-bold uppercase tracking-widest mb-2">
                              Pharmacy Bill
                            </div>
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Invoice #</p>
                            <p className="text-base font-bold text-slate-800 tracking-tighter">PH-2024-001</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* GST Section for Standard/Modern */}
                    {showGst && (
                      <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">GST Number</p>
                        <p className="text-xs font-bold text-slate-700">{customGstNumber || organization?.gstNumber || ''}</p>
                      </div>
                    )}

                    {/* Patient Info Bar */}
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Bill To</p>
                        <p className="text-xs font-bold text-slate-800">Mr. Ramesh Chandra (66y, M)</p>
                        <p className="text-[10px] font-semibold text-indigo-600">ID: PAT-10293</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Date</p>
                        <p className="text-xs font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase">Paid Status: Full</p>
                      </div>
                    </div>

                    {/* Invoice Body */}
                    <div className="flex-1 p-6">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Description</th>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Qty</th>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Unit Price</th>
                            <th className="py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {[
                            { name: 'AMOXICILLIN 500MG', qty: 10, price: 15, total: 150 },
                            { name: 'PARACETAMOL 650MG', qty: 15, price: 2, total: 30 },
                            { name: 'CETIRIZINE 10MG', qty: 5, price: 8, total: 40 }
                          ].map((item, i) => (
                            <tr key={i}>
                              <td className="py-3">
                                <p className="text-xs font-bold text-slate-700">{item.name}</p>
                                <p className="text-[9px] font-medium text-slate-400 uppercase">HNS: 300490</p>
                              </td>
                              <td className="py-3 text-center text-xs font-medium text-slate-600">{item.qty}</td>
                              <td className="py-3 text-right text-xs font-medium text-slate-600">₹{item.price.toFixed(2)}</td>
                              <td className="py-3 text-right text-xs font-bold text-slate-800">₹{item.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Summary */}
                      <div className="mt-4 flex justify-end">
                        <div className="w-48 space-y-2">
                          <div className="flex justify-between text-xs font-medium text-slate-400">
                            <span>Subtotal</span>
                            <span>₹220.00</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium text-rose-500">
                            <span>Discount (5%)</span>
                            <span>-₹11.00</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Total Amount</span>
                            <span className="text-lg font-bold text-indigo-600 tracking-tighter">₹209.00</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Footer */}
                    <div className="w-full border-t border-slate-100 min-h-[60px] mt-auto relative">
                      {footerType === 'custom' && footerImagePreview ? (
                        <img src={footerImagePreview} alt="Footer" className="w-full h-full object-contain" />
                      ) : (
                        <div className="p-6 flex justify-between items-center opacity-40">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Digital Invoice</p>
                            <p className="text-[9px] font-medium text-slate-300">Generated by Oviaan CMS</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Authorized Signatory</p>
                            <div className="w-20 h-px bg-slate-200 mt-2 ml-auto" />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InvoiceTemplateModal;
