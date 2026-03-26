import React, { useState } from 'react';
import { X, Phone } from 'lucide-react';
import api from '../../services/api';

const LoginModal = ({ isOpen, onClose, onOtpSent }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/send-otp', { phone });

      if (response.status !== 200) {
        throw new Error('Failed to send OTP');
      }

      onOtpSent(phone);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendOtp();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Enter Mobile Number</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              We'll send an OTP to verify your mobile number
            </p>

            {/* Phone Input */}
            <div className="flex">
              <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 rounded-l-lg">
                <span className="text-gray-600 text-sm">+91</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyPress={handleKeyPress}
                placeholder="Enter mobile number"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-indigo-500 focus:border-indigo-500"
                maxLength={10}
              />
            </div>

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending OTP...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Send OTP
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;