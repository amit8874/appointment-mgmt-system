import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  ArrowLeft, 
  Palette, 
  Layout, 
  Type, 
  Eye, 
  EyeOff, 
  Smartphone, 
  Maximize,
  Check,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import InvoiceTemplateRenderer from '../../../components/Shared/InvoiceTemplateRenderer';
import { INVOICE_LAYOUTS, CLINIC_THEMES } from '../../../constants/invoiceCustomization';

const InvoiceCustomizer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('layout');

  // Dummy data for live preview
  const dummyBillData = {
    invoiceNumber: 'INV-2026-8874',
    date: new Date(),
    patientName: 'Maya Sharma',
    patientId: 'PAT-99210',
    doctorName: 'Dr. Amit Prajapati',
    items: [
      { description: 'General Consultation', qty: 1, unitPrice: 500, subtotal: 500 },
      { description: 'CBC Blood Test', qty: 1, unitPrice: 1200, subtotal: 1200 },
      { description: 'Amoxicillin 500mg', qty: 2, unitPrice: 150, subtotal: 300 },
    ],
    subtotal: 2000,
    taxAmount: 360,
    discount: 100,
    amount: 2260,
    paymentMethod: 'UPI / PhonePe',
    notes: 'Please follow up after 5 days if symptoms persist.'
  };

  const dummyClinicInfo = {
    name: 'Slotify Healthcare Center',
    address: '123, Medical Square, Digital City, IND',
    phone: '+91 98765 43210',
    email: 'contact@slotifyclinic.com',
    branding: {
        logo: 'https://cdn-icons-png.flaticon.com/512/2864/2864239.png'
    }
  };

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await api.get(`/invoice-templates/${id}`);
        setTemplate(response.data);
      } catch (error) {
        toast.error('Failed to load template settings');
        navigate('/admin-dashboard?tab=Invoice Templates');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [id]);

  const updateMetadata = (key, value) => {
    setTemplate(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value
      }
    }));
  };

  const applyTheme = (theme) => {
    setTemplate(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        primaryColor: theme.primary,
        secondaryColor: theme.secondary,
        fontFamily: theme.font
      }
    }));
    toast.success(`Applied ${theme.name} Theme`);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/invoice-templates/${id}`, template);
      toast.success('Template customization saved successfully!');
    } catch (error) {
      toast.error('Error saving template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-white">
    <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
  </div>;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Sidebar Settings */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-xl z-10 transition-all">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
           </button>
           <h2 className="text-lg font-black tracking-tight">Invoice Builder</h2>
           <button 
             onClick={handleSave}
             disabled={saving}
             className="bg-blue-600 text-white p-2 rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
           >
              {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
           </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-2 gap-1 bg-slate-50 border-b border-slate-100">
           {['layout', 'style', 'content'].map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveSettingsTab(tab)}
               className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                 activeSettingsTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {/* Layout Selection */}
          {activeSettingsTab === 'layout' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Base Skeletons</label>
              <div className="grid grid-cols-2 gap-4">
                {INVOICE_LAYOUTS.map(layout => (
                  <button 
                    key={layout.id}
                    onClick={() => updateMetadata('baseLayoutId', layout.id)}
                    className={`aspect-[3/4] rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-3 transition-all ${
                      template.metadata.baseLayoutId === layout.id 
                      ? 'border-blue-500 bg-blue-50/50 text-blue-600' 
                      : 'border-slate-100 hover:border-slate-200 text-slate-400'
                    }`}
                  >
                    <Layout className="w-8 h-8" />
                    <span className="text-[10px] font-bold text-center leading-tight">{layout.name}</span>
                    {template.metadata.baseLayoutId === layout.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Style Customization */}
          {activeSettingsTab === 'style' && (
            <div className="space-y-8">
              
              {/* Presets */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <Sparkles className="w-3 h-3" /> Clinic Themes
                </label>
                <div className="flex flex-wrap gap-2">
                  {CLINIC_THEMES.map(theme => (
                    <button 
                      key={theme.id}
                      onClick={() => applyTheme(theme)}
                      className="w-10 h-10 rounded-full border-4 border-white shadow-md transition-transform hover:scale-110 active:scale-95"
                      style={{ background: theme.primary }}
                      title={theme.name}
                    />
                  ))}
                </div>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase">Primary Color</label>
                   <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={template.metadata.primaryColor}
                        onChange={(e) => updateMetadata('primaryColor', e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border-none p-0 outline-none"
                      />
                      <span className="text-xs font-mono uppercase font-bold text-slate-500">{template.metadata.primaryColor}</span>
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase">Heading Style</label>
                   <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={template.metadata.secondaryColor}
                        onChange={(e) => updateMetadata('secondaryColor', e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border-none p-0 outline-none"
                      />
                      <span className="text-xs font-mono uppercase font-bold text-slate-500">{template.metadata.secondaryColor}</span>
                   </div>
                 </div>
              </div>

              {/* Fonts */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Typography</label>
                <div className="grid grid-cols-1 gap-2">
                  {['Inter', 'Roboto', 'Montserrat', 'Outfit', 'Georgia'].map(font => (
                    <button 
                      key={font}
                      onClick={() => updateMetadata('fontFamily', font)}
                      style={{ fontFamily: font }}
                      className={`w-full p-4 rounded-xl border-2 text-left flex justify-between items-center transition-all ${
                        template.metadata.fontFamily === font ? 'border-blue-500 bg-blue-50/50' : 'border-slate-50 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold">{font}</span>
                      {template.metadata.fontFamily === font && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Visibility Controls */}
          {activeSettingsTab === 'content' && (
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Field Visibility</label>
               {[
                 { key: 'showLogo', label: 'Clinic Brand Logo', icon: Smartphone },
                 { key: 'showGst', label: 'GST / Tax Information', icon: Palette },
                 { key: 'showPatientId', label: 'Patient Unique ID', icon: Type },
                 { key: 'showDoctor', label: 'Doctor / Consultant', icon: Maximize },
                 { key: 'isCompact', label: 'Compact Printing Mode', icon: Maximize },
               ].map(item => (
                 <button 
                   key={item.key}
                   onClick={() => updateMetadata(item.key, !template.metadata[item.key])}
                   className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${
                     template.metadata[item.key] ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100'
                   }`}
                 >
                    <div className="flex items-center gap-3">
                       <span className={`p-2 rounded-lg ${template.metadata[item.key] ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          {template.metadata[item.key] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                       </span>
                       <span className={`text-sm font-bold ${template.metadata[item.key] ? 'text-blue-900' : 'text-slate-500'}`}>{item.label}</span>
                    </div>
                    {template.metadata[item.key] && <Check className="w-4 h-4 text-blue-600" />}
                 </button>
               ))}
            </div>
          )}

        </div>

        {/* Action Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
           <p className="text-[10px] text-slate-400 text-center font-medium">Changes are only permanent after you click Save Changes.</p>
        </div>

      </div>

      {/* Main Preview Area */}
      <div className="flex-1 overflow-y-auto bg-slate-900/5 p-12 flex flex-col items-center">
         <div className="mb-4 flex gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <span className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 border-r border-slate-100">LIVE PREVIEW</span>
            <span className="px-4 py-2 text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" /> Real-time Rendering Active
            </span>
         </div>
         
         <div className="transform origin-top scale-90 xxl:scale-100 transition-transform">
            <InvoiceTemplateRenderer 
              template={template}
              billData={dummyBillData}
              clinicInfo={dummyClinicInfo}
            />
         </div>
      </div>

    </div>
  );
};

export default InvoiceCustomizer;
