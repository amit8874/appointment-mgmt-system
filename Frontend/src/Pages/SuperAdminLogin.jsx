import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import loginImage from "../assets/img/doc-pat.png";
import { Eye, EyeOff } from 'lucide-react';

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // If already authenticated as superadmin, redirect to intended page or dashboard
    if (isAuthenticated && user?.role === 'superadmin') {
      const from = location.state?.from;
      const target = from ? (typeof from === 'string' ? from : (from.pathname + (from.search || ''))) : "/superadmin/dashboard";
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage(""); // Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    if (!formData.password.trim()) {
      setErrorMessage("Password is required.");
      return;
    }

    setIsLoading(true);

    try {
      
      const response = await api.post('/auth/superadmin-login', formData);
      const data = response.data;

      if (response.status === 200) {
        // Use AuthContext to login
        const userData = {
          ...data.user,
          token: data.token,
        };
        login(userData);

        setErrorMessage("✅ Login successful! Redirecting...");
        setTimeout(() => {
          navigate("/superadmin/dashboard", { replace: true });
        }, 1500);
      } else {
        if (data.isOldPassword) {
          setErrorMessage(`⚠️ ${data.message}`);
        } else {
          setErrorMessage(data.message || "Login failed.");
        }
      }
    } catch (error) {
      // Handle both JSON and HTML (IIS) error responses
      const responseData = error.response?.data;
      let errorMsg;
      if (responseData && typeof responseData === 'object' && responseData.message) {
        // JSON error from Express
        errorMsg = responseData.message;
      } else if (error.response?.status) {
        // Non-JSON response (e.g., IIS HTML error)
        errorMsg = `Server error (${error.response.status}). Please check credentials or contact support.`;
      } else {
        // No response at all (network error)
        errorMsg = 'Error connecting to server. Please try again.';
      }
      setErrorMessage(errorMsg);
      console.error('Super admin login error:', error.response?.status, error.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat text-white flex flex-col items-center justify-center px-4 py-8"
      style={{ backgroundImage: `url(${loginImage})` }}
    >
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className="inline-block p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Super Admin Portal</h1>
            <p className="text-gray-600">Platform Management Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                placeholder="superadmin@platform.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 pr-10"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 font-semibold"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {errorMessage && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${errorMessage.startsWith('✅')
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
              {errorMessage}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Back to Main Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
