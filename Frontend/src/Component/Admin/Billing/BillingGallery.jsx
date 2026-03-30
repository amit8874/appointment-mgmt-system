import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Layout,
  Palette,
  ExternalLink,
  Printer,
  ChevronRight,
  Sparkles,
  Grid,
  Settings,
  ArrowRight
} from 'lucide-react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const BillingGallery = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();
  const { user } = useAuth();

  const basePath = user?.role === 'admin' || user?.role === 'orgadmin' || user?.role === 'superadmin'
    ? '/admin'
    : '/receptionist';

  const categories = ['All', 'Professional', 'Modern', 'Minimal', 'Thermal', 'Creative'];

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/invoice-templates');
      setTemplates(response.data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSetDefault = async (id) => {
    try {
      await api.put(`/invoice-templates/${id}/default`);
      toast.success('Default template updated');
      fetchTemplates(); // Refresh lists
    } catch (error) {
      toast.error('Failed to set default template');
    }
  };

  const handleSeed = async () => {
    try {
      setLoading(true);
      await api.post('/invoice-templates/seed?force=true');
      toast.success('Successfully seeded dynamic layouts!');
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Seeding failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = selectedCategory === 'All'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white p-8 text-slate-900 font-sans">

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-blue-600 font-bold tracking-widest uppercase text-xs">
            <Sparkles className="w-4 h-4" />
            Invoice Customization
          </div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900">Template Library</h1>
          <p className="text-slate-500 text-lg">Choose from 100+ premium billing skins for your clinic.</p>
          <button
            onClick={handleSeed}
            className="mt-4 flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" /> Seed 100 Templates
          </button>
        </div>

        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 gap-1 overflow-x-auto shadow-sm">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-[3/4] bg-slate-50 animate-pulse rounded-3xl border border-slate-100 shadow-sm" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {filteredTemplates.map((template) => (
            <div
              key={template._id}
              className={`group relative aspect-[3/4] bg-white rounded-3xl border-2 transition-all duration-500 overflow-hidden flex flex-col shadow-sm ${template.isDefault
                  ? 'border-blue-500 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.2)]'
                  : 'border-slate-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1'
                }`}
            >
              {/* Preview Overlay */}
              <div className="flex-1 p-6 relative bg-slate-50/50">
                <div className="h-full bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-300 group-hover:text-blue-500 transition-colors">
                  {template.layoutType === 'thermal' ? <Printer className="w-12 h-12" /> : <Layout className="w-12 h-12" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">{template.layoutType} LAYOUT</span>
                </div>

                {template.isDefault && (
                  <div className="absolute top-8 right-8 bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-2 shadow-xl border border-blue-400">
                    <CheckCircle className="w-3.5 h-3.5" /> ACTIVE
                  </div>
                )}
              </div>

              {/* Info & Footer */}
              <div className="p-6 bg-white border-t border-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-xl leading-tight mb-1 text-slate-800">{template.name}</h3>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{template.category}</span>
                  </div>
                  <Grid className="w-5 h-5 text-slate-200" />
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  {!template.isDefault ? (
                    <button
                      onClick={() => handleSetDefault(template._id)}
                      className="w-full bg-blue-600 text-white font-black py-3 rounded-2xl text-[10px] uppercase hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Set as Default
                    </button>
                  ) : (
                    <div className="w-full bg-slate-100 text-blue-600 font-black py-3 rounded-2xl text-[10px] uppercase border border-blue-200 flex items-center justify-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5" /> Currently Active
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      to={`${basePath}/customize-invoice/${template._id}`}
                      className="flex-1 bg-white text-slate-700 font-bold py-3 rounded-2xl text-[10px] uppercase border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Palette className="w-3.5 h-3.5 text-blue-500" /> Customize
                    </Link>
                    <button className="flex-1 bg-slate-50 text-slate-400 font-bold py-3 rounded-2xl text-[10px] uppercase border border-slate-200 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5" /> Preview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTemplates.length === 0 && (
        <div className="py-24 text-center">
          <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-50 transform hover:rotate-12 transition-transform">
            <Sparkles className="w-10 h-10 text-slate-200" />
          </div>
          <h2 className="text-3xl font-black mb-2 text-slate-900 tracking-tight">No templates discovered</h2>
          <p className="text-slate-400 font-medium">Try switching filters or run the seeding script to populate the gallery.</p>
        </div>
      )}
    </div>
  );
};

export default BillingGallery;
