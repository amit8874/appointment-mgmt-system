import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Store, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ChevronRight, 
  CheckCircle2,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../services/api';
import { toast } from 'react-toastify';
import PublicHeader from '../components/Shared/PublicHeader';
import PublicFooter from '../components/Shared/PublicFooter';

const PharmacyRegistration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("Please agree to the Terms and Conditions to continue.");
      return;
    }
    setLoading(true);
    try {
      await authApi.registerPharmacy(formData);
      setSubmitted(true);
      toast.success('Registration request submitted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <PublicHeader />
        <main className="flex-1 flex flex-col items-center justify-center p-4 pt-32 pb-20">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl w-full bg-white rounded-[3rem] p-16 text-center shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
            
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner">
              <CheckCircle2 size={48} />
            </div>
            
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
              Registration <br />
              <span className="text-emerald-500 text-3xl">Successfully Received</span>
            </h2>
            
            <p className="text-slate-500 font-medium mb-12 leading-relaxed text-lg px-4">
              Thank you for partnering with Slotify. Our team is reviewing your application. You'll receive your official dashboard credentials via email within **24-48 hours**.
            </p>
            
            <div className="flex flex-col gap-4">
              <Link 
                to="/"
                className="inline-flex items-center justify-center w-full py-5 bg-slate-900 text-white font-black text-lg rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 hover:-translate-y-1 active:scale-[0.98]"
              >
                Back to Home Page
              </Link>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">
                Need help? <a href="mailto:support@slotify.com" className="text-emerald-500 underline underline-offset-4">Contact Support</a>
              </p>
            </div>
          </motion.div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PublicHeader />
      
      <main className="flex-1 pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            
            {/* Left Column: Info */}
            <div className="lg:w-5/12 space-y-8 lg:sticky lg:top-32">
              <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors">
                <ArrowLeft size={18} />
                Back to Home
              </Link>
              <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100">
                <Store size={32} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Partner with the <br />
                <span className="text-orange-600 text-5xl">Future of Health</span>
              </h1>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                Join our network of 500+ digital pharmacies and start receiving orders from patients in your area instantly.
              </p>
              
              <div className="space-y-6 pt-4">
                {[
                  { title: "Review", desc: "Our team reviews your basic shop details." },
                  { title: "Onboarding", desc: "We set up your digital store and dashboard." },
                  { title: "Activation", desc: "Receive your credentials and start operations." }
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{step.title}</h3>
                      <p className="text-sm text-slate-500 font-medium">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="lg:w-7/12 w-full">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100"
              >
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">Pharmacy Name</label>
                      <div className="relative group">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" size={20} />
                        <input 
                          required
                          type="text" 
                          placeholder="e.g. LifeCare Pharmacy"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">Contact Person</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" size={20} />
                        <input 
                          required
                          type="text" 
                          placeholder="Full Name"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                          value={formData.ownerName}
                          onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">Official Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" size={20} />
                        <input 
                          required
                          type="email" 
                          placeholder="shop@example.com"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <label className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" size={20} />
                        <input 
                          required
                          type="tel" 
                          placeholder="+91 00000 00000"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2">
                       <label className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">Store Address</label>
                       <div className="relative group">
                        <MapPin className="absolute left-4 top-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" size={20} />
                        <textarea 
                          required
                          rows="3"
                          placeholder="Full Street Address"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900 resize-none"
                          value={formData.address.street}
                          onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <input 
                        required
                        type="text" 
                        placeholder="City"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                        value={formData.address.city}
                        onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <input 
                        required
                        type="text" 
                        placeholder="State"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                        value={formData.address.state}
                        onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <input 
                        required
                        type="text" 
                        placeholder="Zip / PIN Code"
                        maxLength="6"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                        value={formData.address.zip}
                        onChange={(e) => setFormData({...formData, address: {...formData.address, zip: e.target.value.replace(/\D/g, '')}})}
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                    <input 
                      type="checkbox" 
                      id="pharmacy-terms" 
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 w-5 h-5 text-orange-600 border-slate-300 rounded-lg focus:ring-orange-500 cursor-pointer"
                    />
                    <label htmlFor="pharmacy-terms" className="text-xs font-bold text-slate-500 leading-relaxed cursor-pointer select-none">
                      As a pharmacy partner, I agree to Slotify Professional's <Link to="/terms-conditions" target="_blank" className="text-orange-600 hover:underline">Terms & Conditions</Link> and <Link to="/privacy-policy" target="_blank" className="text-orange-600 hover:underline">Privacy Policy</Link> regarding data handling and service standards.
                    </label>
                  </div>

                  <button 
                    disabled={loading}
                    type="submit"
                    className="w-full py-5 bg-orange-600 text-white font-black text-xl rounded-[1.5rem] hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <>
                        Submit Registration Request
                        <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Secure 128-bit SSL encrypted registration
                  </p>
                </form>
              </motion.div>
            </div>

          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default PharmacyRegistration;
