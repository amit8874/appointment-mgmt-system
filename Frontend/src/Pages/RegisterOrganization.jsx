import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Mail, Phone, Lock, User, TrendingUp, Monitor, 
  ChevronRight, Eye, EyeOff, X, Check, Users, ShieldCheck, 
  Zap, Clock, MapPin
} from 'lucide-react';
import { organizationApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import "./Register.css";
import signupHero from "../assets/img/signup-hero.png";

const InputField = ({ icon: Icon, label, name, ...props }) => (
  <div className="signup-input-group">
    <label className="signup-label">{label}</label>
    <div className="signup-input-wrapper">
      <div className="signup-icon">
        <Icon size={16} />
      </div>
      <input
        {...props}
        name={name}
        className="signup-input"
      />
    </div>
  </div>
);

const RegisterOrganization = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState('form');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpInputs = React.useRef([]);

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
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) setError('');
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value !== "" && index < 5) {
      otpInputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputs.current[index - 1].focus();
    }
  };

  const isPasswordMatch = formData.ownerPassword && formData.confirmPassword 
    ? formData.ownerPassword === formData.confirmPassword 
    : null;

  useEffect(() => {
    // If there is an active/stale token, clean it up but preserve pendingRegistration
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    // Check for pending registration on load
    const pendingData = localStorage.getItem('pendingRegistration');
    if (pendingData) {
      try {
        const parsed = JSON.parse(pendingData);
        setFormData(parsed);
        setStep('otp');
      } catch (e) {
        localStorage.removeItem('pendingRegistration');
      }
    }

    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please agree to the Terms and Conditions.');
      return;
    }
    if (formData.ownerPassword !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const registrationData = {
        ...formData,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: 'India',
        },
        ownerEmail: formData.ownerEmail || formData.email,
        subdomain: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      };
      const response = await organizationApi.register(registrationData);
      if (response.verificationRequired) {
        // Remember them so they can resume on refresh
        localStorage.setItem('pendingRegistration', JSON.stringify(formData));
        setStep('otp');
        setResendTimer(20);
      } else {
        localStorage.setItem('tenantSlug', response.organization.slug);
        navigate('/choose-plan', { state: { organization: response.organization } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    const finalOtp = otp.join('');
    if (finalOtp.length !== 6) return;
    setIsVerifying(true);
    try {
      const response = await organizationApi.verifyOTP({
        email: formData.ownerEmail || formData.email,
        otp: finalOtp
      });
      const { token, organization } = response;
      
      // Clear pending registration on success
      localStorage.removeItem('pendingRegistration');
      
      // Use the login function from AuthContext to properly set the state
      login({ ...response.user, token });
      
      localStorage.setItem('tenantSlug', organization.slug);
      navigate('/organization-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackToForm = () => {
    localStorage.removeItem('pendingRegistration');
    setStep('form');
  };

  return (
    <div className="signup-page-container">
      {/* Absolute Brand Header */}
      <Link to="/" className="signup-brand">
        <img src="/logo.png" alt="Oviaan" className="brand-logo" />
        <span className="brand-name">Oviaan</span>
      </Link>

      {/* Left Hero Section */}
      <section className="signup-hero">
        <div className="hero-image-wrapper">
          <img src={signupHero} alt="Join Oviaan" className="hero-image" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="hero-content"
        >
          <div className="hero-badge">
            <Zap size={14} className="text-yellow-400" />
            Join 50+ Medical Leaders Who Signed Up Today
          </div>
          
          <h1 className="hero-title">Start Your Digital Practice in Minutes</h1>
          <p className="hero-subtitle">
            Transform your clinic with Oviaan's AI-driven EMR. Get 14 days of full access, 
            no credit card required. Trusted by thousands of healthcare pioneers.
          </p>

          <div className="hero-stats-grid">
            {[
              { icon: <ShieldCheck className="text-blue-300" />, value: "ISO Certified", desc: "Enterprise Security" },
              { icon: <Clock className="text-emerald-300" />, value: "10 Min Setup", desc: "Instant Deployment" }
            ].map((stat, i) => (
              <div key={i} className="stat-item">
                <div className="mb-2">{stat.icon}</div>
                <span className="stat-num">{stat.value}</span>
                <span className="stat-desc">{stat.desc}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Right Form Section */}
      <section className="signup-form-section">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="signup-card"
        >
          <div className="signup-header">
            <h2 className="signup-title">Create Your Account</h2>
            <p className="signup-subtitle">Join the elite network of digital-first clinics.</p>
          </div>

          {step === 'form' ? (
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="full-width">
                  <InputField
                    icon={Building2}
                    label="Clinic / Lab Name"
                    placeholder="e.g. Apollo Healthcare"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <InputField
                  icon={User}
                  label="Owner Name"
                  placeholder="John Doe"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  required
                />
                
                <InputField
                  icon={Phone}
                  label="Phone Number"
                  placeholder="10-digit number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />

                <div className="full-width">
                  <InputField
                    icon={Mail}
                    label="Business Email"
                    type="email"
                    placeholder="doctor@example.com"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <InputField
                  icon={Lock}
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 chars"
                  name="ownerPassword"
                  value={formData.ownerPassword}
                  onChange={handleChange}
                  required
                />
                
                <InputField
                  icon={Lock}
                  label="Confirm"
                  type="password"
                  placeholder="Repeat password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />

                <div className="signup-input-group">
                  <label className="signup-label">Patient Volume</label>
                  <div className="signup-input-wrapper">
                    <div className="signup-icon"><TrendingUp size={16} /></div>
                    <select 
                      name="patientCount" 
                      value={formData.patientCount} 
                      onChange={handleChange}
                      className="signup-select"
                      required
                    >
                      <option value="">Select range</option>
                      <option value="0-10">0 - 10 / day</option>
                      <option value="11-30">11 - 30 / day</option>
                      <option value="31-50">31 - 50 / day</option>
                      <option value="51+">51+ / day</option>
                    </select>
                  </div>
                </div>

                <div className="signup-input-group">
                  <label className="signup-label">Current Software</label>
                  <div className="signup-input-wrapper">
                    <div className="signup-icon"><Monitor size={16} /></div>
                    <input
                      placeholder="Optional"
                      name="previousSoftware"
                      value={formData.previousSoftware}
                      onChange={handleChange}
                      className="signup-input"
                    />
                  </div>
                </div>

                <div className="full-width mt-2 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-[#004aad]" /> Clinic Location / Address
                </div>

                <div className="full-width">
                  <InputField
                    icon={MapPin}
                    label="Street Address"
                    placeholder="e.g. 123 Main St, Sector 4"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    required
                  />
                </div>

                <InputField
                  icon={Building2}
                  label="City"
                  placeholder="e.g. Lucknow"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />

                <InputField
                  icon={Building2}
                  label="State"
                  placeholder="e.g. Uttar Pradesh"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />

                <div className="full-width">
                  <InputField
                    icon={Building2}
                    label="Pincode / Zip Code"
                    placeholder="e.g. 226010"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {error && <div className="text-red-500 text-xs font-bold mb-3 px-1">{error}</div>}

              <div className="flex items-start gap-2 mb-4 px-1">
                <input 
                  type="checkbox" 
                  checked={agreed} 
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                <label className="text-[10px] text-gray-500 font-bold leading-tight">
                  I agree to the <Link to="/terms-conditions" className="text-blue-600">Terms & Conditions</Link> and <Link to="/privacy-policy" className="text-blue-600">Privacy Policy</Link>
                </label>
              </div>

              <button type="submit" disabled={loading} className="signup-submit-btn">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                  <>Start Your 14-Day Free Trial <ChevronRight size={18} /></>
                )}
              </button>
            </form>
          ) : (
            <div className="otp-wrapper">
              <div className="otp-icon-container">
                 <ShieldCheck size={48} className="otp-shield-icon" />
              </div>
              <h3 className="otp-title">Verify Your Mobile</h3>
              <p className="otp-instruction">We've sent a 6-digit code to your WhatsApp</p>
              
              <form onSubmit={handleOtpVerify}>
                <div className="otp-box-container">
                  {otp.map((data, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength="1"
                      ref={(el) => (otpInputs.current[index] = el)}
                      value={data}
                      onChange={(e) => handleOtpChange(e.target, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="otp-digit-box"
                      required
                    />
                  ))}
                </div>
                
                {error && <div className="text-red-500 text-xs font-bold mb-4">{error}</div>}

                <button type="submit" disabled={isVerifying} className="signup-submit-btn otp-verify-btn">
                  {isVerifying ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : "Verify & Activate Account"}
                </button>
              </form>
              
              <div className="otp-footer">
                <button 
                  onClick={handleBackToForm} 
                  className="otp-back-btn"
                >
                  ← Edit registration details
                </button>
              </div>
            </div>
          )}

          <div className="signup-footer">
            <p className="signup-footer-text">
              Already have a practice?{" "}
              <Link to="/login" className="signup-link">Log In</Link>
            </p>
          </div>
        </motion.div>

        <footer className="mt-4 text-center text-[10px] text-gray-400">
          <p>© 2026 Oviaan Professional. All rights reserved.</p>
        </footer>
      </section>
    </div>
  );
};

export default RegisterOrganization;
