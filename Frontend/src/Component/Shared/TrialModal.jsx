import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, ArrowRight, Building2, User, Phone, Mail, 
  Lock, ArrowLeft, ShieldCheck, Zap, Star, Globe, Layout, Users, Eye, EyeOff 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const STEPS = {
  CONTACT: 1,
  SECURITY: 2,
};

const TrialModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(STEPS.CONTACT);
  const [showPlans, setShowPlans] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    clinicName: '',
    password: '',
    confirmPassword: '',
    patientCount: '',
    currentSoftware: '',
    plan: 'free'
  });

  const [showPassword, setShowPassword] = useState(false);

  const isPasswordMatch = formData.password && formData.confirmPassword 
    ? formData.password === formData.confirmPassword 
    : null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const handleSubmitContact = (e) => {
    e.preventDefault();
    nextStep();
  };

  const handleSubmitSecurity = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setShowPlans(true);
  };

  const handleSelectPlan = async (planId) => {
    setFormData(prev => ({ ...prev, plan: planId }));
    await registerAndLogin(planId);
  };

  const registerAndLogin = async (selectedPlan) => {
    setLoading(true);
    try {
      const registrationData = {
        name: formData.clinicName,
        email: formData.email,
        phone: formData.phone,
        ownerName: formData.name,
        ownerEmail: formData.email,
        ownerPassword: formData.password,
        patientCount: formData.patientCount,
        currentSoftware: formData.currentSoftware,
        plan: selectedPlan,
        subdomain: formData.clinicName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      };

      const response = await api.post('/organizations', registrationData);
      
      if (response.data.token) {
        login({
          ...response.data.owner,
          token: response.data.token,
          organizationId: response.data.organization.id,
          organization: response.data.organization
        });
        
        toast.success("Account created successfully!");
        onClose();
        // Correct dashboard route
        navigate('/admin-dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderStepIndicator = () => {
    if (showPlans) return null;
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2].map((step) => (
          <React.Fragment key={step}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              currentStep === step ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 
              currentStep > step ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {currentStep > step ? <Check size={14} /> : step}
            </div>
            {step < 2 && <div className={`w-12 h-0.5 ${currentStep > step ? 'bg-emerald-500' : 'bg-slate-100'}`} />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col md:flex-row z-10"
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors z-20">
            <X size={24} />
          </button>

          {/* Left Side: Branded Content */}
          <div className="md:w-5/12 bg-gradient-to-br from-[#00386a] to-[#005bb5] p-10 text-white relative flex flex-col justify-between hidden md:flex">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-12">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl">
                  <Layout className="text-white w-7 h-7" />
                </div>
                <span className="text-2xl font-black tracking-tight italic">clicnic.</span>
              </div>
              
              <h2 className="text-4xl font-black mb-6 leading-tight">
                Modern software for <span className="text-blue-300">modern healthcare</span>
              </h2>
              
              <p className="text-blue-100 text-lg mb-10 font-medium leading-relaxed">
                Join 500+ top clinics revolutionizing healthcare delivery with our smart management system.
              </p>

              <div className="space-y-5">
                {[
                  "Digitize your entire patient records",
                  "Smart appointment scheduling",
                  "Automated clinic billing & accounts",
                  "Advanced health analytics"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 bg-blue-400/20 rounded-full flex items-center justify-center border border-blue-400/30">
                      <Check size={14} className="text-blue-200" />
                    </div>
                    <span className="text-sm font-bold text-blue-50 tracking-wide">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8 opacity-10 pointer-events-none">
                <div className="bg-white/10 rounded-t-3xl h-40 w-full border-t border-x border-white/20 shadow-inner"></div>
            </div>
          </div>

          {/* Right Side: Form Content */}
          <div className="md:w-7/12 p-8 md:p-14 bg-white overflow-y-auto max-h-[90vh]">
            <div className="max-w-md mx-auto h-full flex flex-col">
              {renderStepIndicator()}

              <AnimatePresence mode="wait">
                {!showPlans ? (
                  currentStep === STEPS.CONTACT ? (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex-1"
                    >
                      <div className="mb-10 text-center md:text-left">
                        <h3 className="text-3xl font-black text-slate-900 mb-3">Tell us about your clinic</h3>
                        <p className="text-slate-500 font-medium">Start your 14-day free trial in seconds.</p>
                      </div>

                      <form onSubmit={handleSubmitContact} className="space-y-4">
                        <div className="relative group">
                          <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all" />
                          <input
                            type="text"
                            name="clinicName"
                            required
                            value={formData.clinicName}
                            onChange={handleChange}
                            placeholder="Clinic/Hospital Name"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-400"
                          />
                        </div>
                        <div className="relative group">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all" />
                          <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Owner Full Name"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-400"
                          />
                        </div>
                        <div className="relative group">
                          <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all" />
                          <input
                            type="tel"
                            name="phone"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Mobile Number"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-400"
                          />
                        </div>
                        <div className="relative group">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all" size={18} />
                          <select
                            name="patientCount"
                            required
                            value={formData.patientCount}
                            onChange={handleChange}
                            className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none text-slate-600 font-medium"
                          >
                            <option value="" disabled>Daily Patient Count</option>
                            <option value="0-10">0-10 Patients</option>
                            <option value="10-50">10-50 Patients</option>
                            <option value="50-100">50-100 Patients</option>
                            <option value="100+">100+ Patients</option>
                          </select>
                        </div>
                        <div className="relative group">
                          <Layout size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all" />
                          <input
                            type="text"
                            name="currentSoftware"
                            value={formData.currentSoftware}
                            onChange={handleChange}
                            placeholder="Current Clinic Software (if any)"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-400"
                          />
                        </div>
                        <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group mt-4">
                          Continue to Account Details
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex-1"
                    >
                      <button onClick={prevStep} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-sm mb-6 transition-colors">
                        <ArrowLeft size={16} /> Back
                      </button>
                      <div className="mb-10">
                        <h3 className="text-3xl font-black text-slate-900 mb-3">Secure your account</h3>
                        <p className="text-slate-500 font-medium">Use these details to access your dashboard.</p>
                      </div>

                      <form onSubmit={handleSubmitSecurity} className="space-y-4">
                        <div className="relative group">
                          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all" />
                          <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Official Email Address"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-400"
                          />
                        </div>
                        <div className="relative group">
                          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all" />
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Create Password"
                            className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <div className="relative group">
                          <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all" />
                          <input
                            type="password"
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm Password"
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium placeholder:text-slate-400"
                          />
                          {isPasswordMatch !== null && (
                            <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] font-bold ${isPasswordMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {isPasswordMatch ? (
                                <><Check size={12} /> Match</>
                              ) : (
                                <><X size={12} /> Mismatch</>
                              )}
                            </div>
                          )}
                        </div>
                        <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group mt-6">
                          Start Free Trail
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </form>
                    </motion.div>
                  )
                ) : (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1"
                  >
                    <button onClick={() => setShowPlans(false)} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-sm mb-6 transition-colors">
                      <ArrowLeft size={16} /> Back
                    </button>
                    <div className="mb-8 text-center">
                      <h3 className="text-3xl font-black text-slate-900 mb-2">Choose your plan</h3>
                      <p className="text-slate-500 font-medium text-sm">No credit card required for 14-day trial.</p>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide mb-6">
                      <PlanCard 
                        id="basic"
                        title="Basic"
                        price="FREE"
                        desc="Perfect for small practices"
                        features={["Up to 10 Doctors", "500 Appointments/mo", "Digital Records"]}
                        onSelect={handleSelectPlan}
                        loading={loading}
                        icon={<Zap className="text-blue-400" size={24} />}
                      />
                      <PlanCard 
                        id="pro"
                        title="Professional"
                        price="POPULAR"
                        desc="Advanced features for growing clinics"
                        features={["Up to 50 Doctors", "Unlimited Appointments", "Advanced Analytics", "Video Consultations"]}
                        onSelect={handleSelectPlan}
                        loading={loading}
                        highlight
                        icon={<Star className="text-amber-400" size={24} />}
                      />
                      <PlanCard 
                        id="enterprise"
                        title="Enterprise"
                        price="CUSTOM"
                        desc="For multi-specialty hospitals"
                        features={["Unlimited Everything", "Custom Branding", "Personalized Support", "On-premise deployment"]}
                        onSelect={handleSelectPlan}
                        loading={loading}
                        icon={<Globe className="text-emerald-400" size={24} />}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const PlanCard = ({ id, title, price, desc, features, onSelect, loading, highlight = false, icon }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    disabled={loading}
    onClick={() => onSelect(id)}
    className={`w-full p-6 rounded-3xl text-left transition-all flex items-center justify-between group ${
      highlight ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 ring-2 ring-blue-600' : 'bg-slate-50 hover:bg-white hover:shadow-lg border border-slate-100'
    }`}
  >
    <div className="flex-1">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-xl ${highlight ? 'bg-white/20' : 'bg-white'}`}>
          {icon}
        </div>
        <div>
          <h4 className={`font-black text-lg ${highlight ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
            highlight ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
          }`}>
            {price}
          </span>
        </div>
      </div>
      <p className={`text-xs font-medium mb-3 ${highlight ? 'text-blue-100' : 'text-slate-500'}`}>{desc}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Check size={10} className={highlight ? 'text-blue-200' : 'text-blue-500'} />
            <span className={`text-[10px] font-bold ${highlight ? 'text-blue-100' : 'text-slate-600'}`}>{f}</span>
          </div>
        ))}
      </div>
    </div>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
      highlight ? 'bg-white text-blue-600 group-hover:rotate-45' : 'bg-white text-slate-400 group-hover:bg-blue-600 group-hover:text-white'
    }`}>
      {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ArrowRight size={20} />}
    </div>
  </motion.button>
);

export default TrialModal;

