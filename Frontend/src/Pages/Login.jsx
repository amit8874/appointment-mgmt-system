import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { 
  Eye, EyeOff, Mail, Phone, Lock, ChevronRight, 
  User as UserIcon, Shield, Headset, Store, 
  CheckCircle, Users, Activity, MessageSquare 
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import "./Login.css";
import heroImage from "../assets/img/login-hero.png";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const params = new URLSearchParams(location.search);
  const initialRole = params.get("role") || "patient";
  const [role, setRole] = useState(initialRole);

  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const effectiveRole = user.role?.toLowerCase();
      const dashboardPath = (effectiveRole === "admin" || effectiveRole === "orgadmin" || effectiveRole === "superadmin") ? "/admin-dashboard" :
        (effectiveRole === "receptionist" || effectiveRole === "doctor") ? "/receptionist" :
        (effectiveRole === "pharmacy") ? "/pharmacy/dashboard" :
          "/patient-dashboard";
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setErrorMessage("Please agree to the Terms & Conditions.");
      return;
    }
    if (!identifier) {
      setErrorMessage("Please enter your mobile number.");
      return;
    }
    
    const normalizedMobile = identifier.replace(/\D/g, '');
    if (normalizedMobile.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await api.post('/auth/send-otp', {
        phone: normalizedMobile,
        role: role
      });
      if (response.data.success) {
        setOtpSent(true);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setErrorMessage("Please agree to the Terms & Conditions.");
      return;
    }
    setErrorMessage("");
    setIsLoading(true);

    try {
      let response;
      if (isOtpMode) {
        response = await api.post('/auth/verify-otp', {
          phone: identifier.replace(/\D/g, ''),
          otp,
          role: role
        });
      } else {
        response = await api.post('/auth/login', {
          identifier: identifier.trim(),
          password,
          role: role
        });
      }

      if (response.status === 200 || response.data.success) {
        const { user: userData, token } = response.data;
        login({ ...userData, token });
        
        const finalRole = userData.role.toLowerCase();
        const dashboardPath = (finalRole === "admin" || finalRole === "orgadmin" || finalRole === "superadmin") ? "/admin-dashboard" :
          (finalRole === "receptionist" || finalRole === "doctor") ? "/receptionist" :
          (finalRole === "pharmacy") ? "/pharmacy/dashboard" :
            "/patient-dashboard";
        
        // Use window.location.href for an "instant" and "guaranteed" redirect
        // to avoid any SPA state sync issues during the login transition
        window.location.href = dashboardPath;
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    { id: 'patient', label: 'Patient', icon: <UserIcon size={14} /> },
    { id: 'staff', label: 'Doctor/Staff', icon: <Headset size={14} /> },
    { id: 'admin', label: 'Admin', icon: <Shield size={14} /> },
    { id: 'pharmacy', label: 'Pharmacy', icon: <Store size={14} /> },
  ];

  const toggleLoginMode = () => {
    setIsOtpMode(!isOtpMode);
    setOtpSent(false);
    setOtp("");
    setErrorMessage("");
  };

  return (
    <div className="login-page-container">
      {/* Absolute Brand Header */}
      <Link to="/" className="signup-brand">
        <img src="/logo.png" alt="Oviaan" className="brand-logo" />
        <span className="brand-name">Oviaan</span>
      </Link>

      {/* Left Hero Section */}
      <section className="login-hero">
        <div className="hero-image-wrapper">
          <img src={heroImage} alt="Modern Healthcare" className="hero-image" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hero-content"
        >
          <h1 className="hero-title">Elevate Your Practice with Oviaan</h1>
          <p className="hero-subtitle">
            Experience the future of healthcare management. Our all-in-one EMR platform 
            empowers 15,000+ doctors to deliver superior patient care across 20+ specialties.
          </p>

          <div className="hero-stats">
            {[
              { icon: <Users className="text-blue-300" />, value: "15k+", label: "Trusted Doctors" },
              { icon: <Activity className="text-emerald-300" />, value: "2M+", label: "Digital Records" },
              { icon: <CheckCircle className="text-blue-300" />, value: "99.9%", label: "System Uptime" },
              { icon: <MessageSquare className="text-emerald-300" />, value: "24/7", label: "Expert Support" }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="stat-card"
              >
                <div className="mb-2">{stat.icon}</div>
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-20 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />
      </section>

      {/* Right Form Section */}
      <section className="login-form-section">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="login-card"
        >

          <div className="form-header">
            <h2 className="form-title">{isOtpMode ? "Welcome Back" : "Sign In"}</h2>
            <p className="form-subtitle">
              {isOtpMode 
                ? "Enter your mobile to receive an OTP." 
                : "Enter your credentials to access your dashboard."}
            </p>
          </div>

          {/* Role Selection */}
          <div className="role-selector">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRole(r.id);
                  setErrorMessage("");
                }}
                className={`role-btn ${role === r.id ? "active" : ""}`}
              >
                {r.icon}
                <span className="hidden md:inline">{r.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={isOtpMode && !otpSent ? handleSendOtp : handleLogin}>
            {/* Identifier Input */}
            <div className="input-group">
              <label className="input-label">{isOtpMode ? "Phone Number" : "Email or Phone"}</label>
              <div className="input-wrapper">
                <div className="input-icon">
                  {isOtpMode || !identifier.includes('@') ? <Phone size={20} /> : <Mail size={20} />}
                </div>
                <input
                  type={isOtpMode ? "tel" : "text"}
                  placeholder={isOtpMode ? "10-digit number" : "Your email or phone"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="login-input"
                  required
                  disabled={otpSent}
                />
              </div>
            </div>

            {/* Password or OTP Input */}
            {!isOtpMode ? (
              <div className="input-group">
                <div className="flex justify-between items-center mb-2">
                  <label className="input-label m-0">Password</label>
                  <button 
                    type="button" 
                    onClick={toggleLoginMode}
                    className="forgot-password text-xs"
                  >
                    Login with OTP?
                  </button>
                </div>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <Lock size={20} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ) : otpSent && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="input-group"
              >
                <div className="flex justify-between items-center mb-2">
                  <label className="input-label m-0">6-Digit OTP</label>
                  <button 
                    type="button" 
                    onClick={() => setOtpSent(false)}
                    className="forgot-password text-xs"
                  >
                    Change Number
                  </button>
                </div>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <Shield size={20} />
                  </div>
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="login-input text-center tracking-[0.5em] font-bold"
                    required
                  />
                </div>
              </motion.div>
            )}

            {isOtpMode && !otpSent && (
              <div className="mb-6 text-right">
                <button 
                  type="button" 
                  onClick={toggleLoginMode}
                  className="forgot-password text-xs"
                >
                  Back to Password Login
                </button>
              </div>
            )}

            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="error-message"
              >
                {errorMessage}
              </motion.div>
            )}

            <div className="form-footer">
              <label className="remember-me">
                <input 
                  type="checkbox" 
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                />
                <span>I agree to <Link to="/terms-conditions" className="text-blue-600">Terms</Link></span>
              </label>
              {!isOtpMode && (
                <Link to="/forgot-password" title="Coming soon" className="forgot-password cursor-not-allowed opacity-50">Forgot Password?</Link>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-submit-btn group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isOtpMode && !otpSent ? "Send OTP" : "Continue"}
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              New to Oviaan?{" "}
              <Link to="/register-organization" className="text-blue-600 font-bold hover:underline">Get Started</Link>
            </p>
          </div>
        </motion.div>

        <footer className="mt-2 text-center text-xs text-gray-400">
          <p>© 2026 Oviaan Professional. All rights reserved.</p>
          <div className="mt-1 flex gap-4 justify-center">
            <Link to="/privacy-policy" className="hover:text-blue-600">Privacy Policy</Link>
            <Link to="/terms-conditions" className="hover:text-blue-600">Terms of Service</Link>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default Login;
