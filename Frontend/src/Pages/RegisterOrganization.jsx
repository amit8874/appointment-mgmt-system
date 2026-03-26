import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Mail, 
  Phone, 
  Lock, 
  User, 
  ArrowRight,
  TrendingUp,
  Monitor,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  X,
  Check
} from 'lucide-react';
import { organizationApi } from '../services/api';

const InputField = ({ icon: Icon, placeholder, rightElement, ...props }) => (
  <div className="relative group">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
      <Icon size={18} />
    </div>
    <input
      {...props}
      placeholder={placeholder}
      className={`w-full pl-12 ${rightElement ? 'pr-12' : 'pr-4'} py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium`}
    />
    {rightElement && (
      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
        {rightElement}
      </div>
    )}
  </div>
);

const RegisterOrganization = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
    patientCount: '',
    previousSoftware: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) setError('');
  };

  const isPasswordMatch = formData.ownerPassword && formData.confirmPassword 
    ? formData.ownerPassword === formData.confirmPassword 
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (formData.ownerPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.ownerPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      // Mapping to backend expected fields
      const registrationData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail || formData.email, // Use org email if owner email is blank
        ownerPassword: formData.ownerPassword,
        subdomain: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        // additional info
        patientCount: formData.patientCount,
        previousSoftware: formData.previousSoftware
      };
      
      const response = await organizationApi.register(registrationData);
      localStorage.setItem('tenantSlug', response.organization.slug);
      
      // Navigate to plan selection or success page
      navigate('/choose-plan', { state: { organization: response.organization } });
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col items-center justify-center p-4 py-12">
      {/* Background blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative z-10"
      >
        <div className="p-8 md:p-10">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8 text-center">
             <Link to="/" className="flex items-center gap-2 mb-6 group">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl italic group-hover:scale-110 transition-transform">S</div>
                <span className="text-3xl font-black tracking-tighter text-slate-900 italic">Slotify</span>
             </Link>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sign-Up for 14 days free trial!</h2>
             <p className="text-slate-400 font-medium text-sm mt-1">Start streamlining your practice today.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              icon={Building2}
              placeholder="Lab / Clinic Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <InputField
              icon={User}
              placeholder="Owner Name"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                icon={Mail}
                type="email"
                placeholder="Email Id"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <InputField
                icon={Phone}
                placeholder="Phone number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                icon={Lock}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                name="ownerPassword"
                value={formData.ownerPassword}
                onChange={handleChange}
                required
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <InputField
                icon={Lock}
                type="password"
                placeholder="Confirm Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                rightElement={isPasswordMatch !== null && (
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isPasswordMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isPasswordMatch ? (
                      <><Check size={12} /> Match</>
                    ) : (
                      <><X size={12} /> Mismatch</>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <TrendingUp size={18} />
              </div>
              <select
                name="patientCount"
                value={formData.patientCount}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none"
                required
              >
                <option value="" disabled>Patient count per day</option>
                <option value="0-10">0 - 10</option>
                <option value="11-30">11 - 30</option>
                <option value="31-50">31 - 50</option>
                <option value="51+">51+</option>
              </select>
            </div>

            <InputField
              icon={Monitor}
              placeholder="Previous Software (Optional)"
              name="previousSoftware"
              value={formData.previousSoftware}
              onChange={handleChange}
            />

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Register & Start Trial
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500 leading-relaxed font-medium">
            By signing up, you agree to our{" "}
            <a href="#" className="text-blue-600 font-bold hover:underline">Terms & Conditions</a> and{" "}
            <a href="#" className="text-blue-600 font-bold hover:underline">Privacy Policy</a>.
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm font-medium">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 font-bold hover:underline transition-all">Log In</Link>
            </p>
          </div>
        </div>
      </motion.div>

      <footer className="mt-8 text-center text-slate-400 text-xs font-medium relative z-10">
        <p>copyright @ 2026 Slotify</p>
      </footer>
    </div>
  );
};

export default RegisterOrganization;
