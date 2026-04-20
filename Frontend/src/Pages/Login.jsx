import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Eye, EyeOff, Mail, Phone, Lock, ChevronRight, User as UserIcon, Shield, Headset, Store } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const params = new URLSearchParams(location.search);
  const initialRole = params.get("role") || "patient";
  const [role, setRole] = useState(initialRole); // 'patient', 'staff', 'admin'

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
      // Use the ACTUAL role from the user object in context, not just the tab state
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
    if (!identifier) {
      setErrorMessage("Please enter your mobile number.");
      return;
    }
    
    // Normalize mobile: remove non-digits
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
      setErrorMessage("Please agree to the Terms and Conditions and Privacy Policy to continue.");
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
        
        // Final dashboard mapping based on actual returned role
        const finalRole = userData.role.toLowerCase();
        const dashboardPath = (finalRole === "admin" || finalRole === "orgadmin" || finalRole === "superadmin") ? "/admin-dashboard" :
          (finalRole === "receptionist" || finalRole === "doctor") ? "/receptionist" :
          (finalRole === "pharmacy") ? "/pharmacy/dashboard" :
            "/patient-dashboard";
        
        navigate(dashboardPath, { replace: true });
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    { id: 'patient', label: 'User', icon: <UserIcon size={18} /> },
    { id: 'staff', label: 'Staff', icon: <Headset size={18} /> },
    { id: 'admin', label: 'Admin', icon: <Shield size={18} /> },
    { id: 'pharmacy', label: 'Pharmacy', icon: <Store size={18} /> },
  ];

  const toggleLoginMode = () => {
    setIsOtpMode(!isOtpMode);
    setOtpSent(false);
    setOtp("");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col items-center justify-center p-4">
      {/* Background blobs for premium feel */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative z-10"
      >
        <div className="p-8 md:p-10">
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8 text-center">
             <Link to="/" className="flex items-center gap-2 mb-8 group">
                <img src="/logo.png" alt="Oviaan Logo" className="h-20 w-auto group-hover:scale-105 transition-transform" />
             </Link>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">{isOtpMode ? "Login with OTP" : "Log In"}</h2>
             <p className="text-slate-400 font-medium text-sm mt-1">
               {isOtpMode 
                 ? "We'll send a code to your registered mobile number." 
                 : "Welcome back! Please enter your details."}
             </p>
          </div>

          {/* Role Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRole(r.id);
                  setErrorMessage("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  role === r.id 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                {r.icon}
                {r.label}
              </button>
            ))}
          </div>

          {/* Login Form */}
          <form 
            onSubmit={isOtpMode && !otpSent ? handleSendOtp : handleLogin} 
            className="space-y-5"
          >
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                {isOtpMode ? "Mobile Number" : "Email / Mobile Number"}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  {isOtpMode || !identifier.includes('@') ? <Phone size={18} /> : <Mail size={18} />}
                </div>
                <input
                  type={isOtpMode ? "tel" : "text"}
                  placeholder={isOtpMode ? "10-digit mobile number" : (role === 'admin' ? "Email Address" : "Email or Phone number")}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  required
                  disabled={otpSent}
                />
              </div>
            </div>

            {!isOtpMode ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Password</label>
                  <button 
                    type="button"
                    onClick={toggleLoginMode}
                    className="text-xs font-bold text-blue-600 hover:underline transition-all"
                  >
                    Login with OTP
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ) : otpSent && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">6-Digit OTP</label>
                  <button 
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Change Number
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Shield size={18} />
                  </div>
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium tracking-[0.5em] text-center"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-center font-medium">OTP sent to your WhatsApp. Code expires in 5 minutes.</p>
              </motion.div>
            )}

            {isOtpMode && !otpSent && (
              <div className="text-right">
                <button 
                  type="button"
                  onClick={toggleLoginMode}
                  className="text-xs font-bold text-blue-600 hover:underline transition-all"
                >
                  Back to Password Login
                </button>
              </div>
            )}

            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100"
              >
                {errorMessage}
              </motion.div>
            )}

            <div className="flex items-center gap-3 py-2 px-1">
              <input 
                type="checkbox" 
                id="terms" 
                checked={agreed} 
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded-lg focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs font-bold text-slate-500 leading-tight cursor-pointer select-none">
                I agree to the <Link to="/terms-conditions" target="_blank" className="text-blue-600 hover:underline">Terms & Conditions</Link> and <Link to="/privacy-policy" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isOtpMode && !otpSent ? "Send OTP" : (isOtpMode ? "Verify & Log In" : "Log In")}
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm font-medium">
              Don't have an account?{" "}
              <Link to="/register-organization" className="text-blue-600 font-bold hover:underline transition-all">Sign Up</Link>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer info */}
      <footer className="mt-8 text-center text-slate-400 text-xs font-medium relative z-10 pb-4">
        <p>Copyright @ 2026 Oviaan Professional</p>
        <div className="flex gap-4 justify-center mt-2">
          <Link to="/privacy-policy" className="hover:text-blue-500 transition-colors">Privacy Policy</Link>
          <Link to="/terms-conditions" className="hover:text-blue-500 transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
};

export default Login;
