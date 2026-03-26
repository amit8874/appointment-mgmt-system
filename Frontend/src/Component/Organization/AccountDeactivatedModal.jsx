import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AccountDeactivatedModal = ({ isOpen, onLogout }) => {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isOpen && countdown === 0) {
      // Auto logout when countdown reaches 0
      handleLogout();
    }
  }, [isOpen, countdown]);

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('tenantSlug');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('organizationId');
    
    // Call onLogout if provided
    if (onLogout) {
      onLogout();
    }
    
    // Redirect to login
    navigate('/');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 rounded-full p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
          Account Deactivated
        </h2>
        
        {/* Message */}
        <p className="text-center text-gray-600 mb-6">
          Your account has been suspended or deactivated by the administrator.
          <br />
          Please contact support for more details.
        </p>
        
        {/* Countdown */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">
            You will be logged out in
          </p>
          <div className="text-3xl font-bold text-red-600">
            {countdown}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            seconds
          </p>
        </div>
        
        {/* Logout Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountDeactivatedModal;
