import React, { useState } from 'react';
import { ArrowLeft, Phone, MessageCircle, Bell, Edit, Check } from 'lucide-react';
import api from '../../services/api';

const AppointmentReviewPage = ({ userDetails, doctor, selectedDate, selectedSlot, onGoBack, onProceed }) => {
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // If it's already in range format like "10:00-10:30 AM", return as is
    if (timeString.includes('-') && (timeString.includes('AM') || timeString.includes('PM'))) {
      return timeString;
    }
    
    // Otherwise, parse 24-hour format and create a 15-min slot range
    let [hours, minutes] = timeString.split(':');
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);

    // Convert to 12-hour format
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    // Calculate end time (15 minutes later)
    let endMinutes = minutes + 15;
    let endHours = hours;
    if (endMinutes >= 60) {
      endMinutes -= 60;
      endHours += 1;
    }
    const endAmpm = endHours >= 12 ? 'PM' : 'AM';
    const endDisplayHours = endHours % 12 || 12;

    const start = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    const end = `${endDisplayHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')} ${endAmpm}`;

    return `${start}–${end}`;
  };

  const convertTo24Hour = (time12h) => {
    // Handle range format like "10:00-10:30 AM" by extracting the start time
    const timeMatch = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) {
      return time12h; // Return as-is if already in 24h format
    }
    
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const modifier = timeMatch[3].toUpperCase();
    
    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const handleProceed = async () => {
    if (!agreeToTerms) {
      alert('Please agree to the Terms & Conditions');
      return;
    }

    setBookingLoading(true);

    try {
      // Check patientUser first, then userData (for regular login with password)
      let patientUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
      if (!patientUser) {
        patientUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
      }
      if (!patientUser) {
        throw new Error('Please log in to book an appointment.');
      }

      const userData = JSON.parse(patientUser);
      const patientId = userData._id || userData.id;

      if (!patientId) {
        throw new Error('Unable to verify your account. Please log in again.');
      }

      const time24h = convertTo24Hour(selectedSlot);

      const response = await api.post('/appointments/patient-book', {
        patientId,
        organizationId: doctor.orgId,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        date: selectedDate,
        time: time24h,
        reason: 'Appointment booking from Portal',
        symptoms: '',
        amount: doctor.fee || 0,
        paymentStatus: 'pending',
        patientDetails: userDetails
      });

      if (response.status !== 200 && response.status !== 201) {
        const errorData = response.data;
        throw new Error(errorData.message || 'Failed to book appointment');
      }

      const appointment = response.data;
      setBookingSuccess(true);

      // Auto redirect after success
      setTimeout(() => {
        onProceed(userDetails);
      }, 2000);

    } catch (err) {
      alert('Booking failed: ' + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">

        <div className="max-w-md mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Booked!</h2>
            <p className="text-gray-600 mb-4">
              Your appointment with {doctor.name} on {formatDate(selectedDate)} at {formatTime(selectedSlot)} has been confirmed.
            </p>
            <p className="text-sm text-gray-500">
              You will receive a confirmation SMS shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {/* Page Title */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Appointment Booking</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Appointment Details Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Appointment Details</h2>
              <button className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </button>
            </div>

            <h3 className="text-lg font-medium text-gray-700 mb-4">User Details</h3>

            <div className="space-y-3 mb-6">
              <div>
                <p className="font-medium text-gray-900">{userDetails.firstName} {userDetails.lastName}</p>
              </div>
              <div>
                <p className="text-gray-700">{userDetails.phone}</p>
              </div>
              <div>
                <p className="text-gray-700">{userDetails.email}</p>
              </div>
              <div>
                <p className="text-gray-700">{userDetails.zipcode}</p>
              </div>
            </div>

            <hr className="my-6" />

            <h3 className="text-lg font-medium text-gray-700 mb-4">Doctor & Appointment Details</h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Doctor:</span>
                <span className="text-gray-900 font-semibold">Dr. {doctor.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Specialty:</span>
                <span className="text-gray-900">{doctor.specialty}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Date:</span>
                <span className="text-gray-900">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Time Slot:</span>
                <span className="text-gray-900">{formatTime(selectedSlot)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-gray-900 font-bold text-lg">Consultation Fee:</span>
                <span className="text-2xl font-bold text-green-600">₹{doctor.fee || 0}</span>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex space-x-4">
                <button
                  onClick={onGoBack}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  GO BACK
                </button>
                <button
                  onClick={handleProceed}
                  disabled={bookingLoading}
                  className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
                >
                  {bookingLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'PROCEED'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Summary Card */}
          <div className="space-y-6">
            {/* Appointment Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Appointment Date</h3>
                <p className="text-lg font-bold text-gray-900">{formatDate(selectedDate)}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Appointment Time</h3>
                <p className="text-lg font-bold text-gray-900">{formatTime(selectedSlot)}</p>
              </div>
            </div>

            {/* Doctor */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Doctor</h3>
              <p className="text-lg font-bold text-gray-900">{doctor.name}</p>
            </div>

            {/* Location */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Location</h3>
              <div className="text-gray-900">
                <p className="font-medium">{doctor.hospital}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Verified Contact: 1860-500-1066<br />
                  Online Booking Confirmed
                </p>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 mr-3 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">
                  I Agree To The <span className="underline">Terms & Conditions</span>.
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentReviewPage;