import React from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BookingConfirmationPage = ({ userDetails }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/patient-dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#3FB43F' }}
            >
              <Check className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Success Message */}
          <h1
            className="text-2xl font-bold mb-6"
            style={{ color: '#032D3C' }}
          >
            Your Appointment Has Been Confirmed
          </h1>

          {/* User Details */}
          <div className="text-center space-y-2 mb-8">
            <p className="text-gray-700">
              <span className="font-medium">User Name:</span> {userDetails.firstName} {userDetails.lastName}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Phone:</span> {userDetails.phone}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Email:</span> {userDetails.email}
            </p>
          </div>

          {/* Go Back Button */}
          <button
            onClick={handleGoHome}
            className="w-full py-3 px-6 text-white font-medium rounded-full transition-colors"
            style={{ backgroundColor: '#007A91' }}
          >
            GO BACK TO HOME PAGE
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;