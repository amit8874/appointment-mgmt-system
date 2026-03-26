import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, ChevronDown, Phone, Mail, Award, Clock, User, Stethoscope } from 'lucide-react';
import AppointmentSelector from './AppointmentSelector';

const convertTo24Hour = (time12h) => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours, 10);
  if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

const UserDetailsPage = ({ user, doctor, onGoBack, onContinue }) => {
  if (!doctor) return <div>Loading...</div>;

  const doctorName = doctor?.name;
  const hospitalName = doctor?.hospital;
  const hospitalAddress = doctor?.hospitalAddress || 'Location unavailable';
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    zipcode: '',
    dob: '',
    gender: ''
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || user.name?.split(' ')[0] || '',
        lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
        phone: user.phone || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.zipcode.trim()) newErrors.zipcode = 'Zipcode is required';
    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!agreeToTerms) newErrors.terms = 'You must agree to terms & conditions';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedSlot) {
      setErrors({ dateTime: 'Please select appointment date and time' });
      return;
    }
    if (validateForm()) {
      const userDetails = { ...formData, agreeToTerms };
      const aptData = { doctor, date: selectedDate, time: selectedSlot };
      onContinue(userDetails, aptData);
    }
  };

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
    // Assuming time is in 24h format HH:MM
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHours = h % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-[#E9F5F8] pt-1 pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onGoBack}
              className="mr-4 flex items-center text-gray-600 hover:text-gray-800 px-3 py-1 border border-gray-300 rounded-full hover:bg-white transition-colors text-xs"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              BACK
            </button>
            <h1 className="text-lg font-bold text-gray-900">Patient Details</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Section - User Details Form (60%) */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-md p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Appointment</h2>

              <div className="mb-8">
                <AppointmentSelector
                  doctorId={doctor?.id}
                  hospital={hospitalName}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  selectedSlot={selectedSlot}
                  setSelectedSlot={setSelectedSlot}
                />
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>

              <div className="space-y-6">

                {/* Row 1: First Name & Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full p-3 border rounded-lg focus:ring-[#007C9D] focus:border-[#007C9D] ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter first name"
                    />
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full p-3 border rounded-lg focus:ring-[#007C9D] focus:border-[#007C9D] ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter last name"
                    />
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                {/* Row 2: Phone & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Phone No</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full p-3 border rounded-lg focus:ring-[#007C9D] focus:border-[#007C9D] ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Email Id</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full p-3 border rounded-lg focus:ring-[#007C9D] focus:border-[#007C9D] ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter email address"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                </div>

                {/* Row 3: Zipcode & Date of Birth */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Zipcode</label>
                    <input
                      type="text"
                      name="zipcode"
                      value={formData.zipcode}
                      onChange={handleInputChange}
                      className={`w-full p-3 border rounded-lg focus:ring-[#007C9D] focus:border-[#007C9D] ${
                        errors.zipcode ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter zipcode"
                    />
                    {errors.zipcode && <p className="text-red-500 text-sm mt-1">{errors.zipcode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Date of Birth</label>
                    <div className="relative">
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        className={`w-full p-3 border rounded-lg focus:ring-[#007C9D] focus:border-[#007C9D] ${
                          errors.dob ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
                  </div>
                </div>

                {/* Gender Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-3">Gender</label>
                  <div className="flex space-x-6">
                    {['Male', 'Female'].map((gender) => (
                      <label key={gender} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value={gender}
                          checked={formData.gender === gender}
                          onChange={handleInputChange}
                          className="mr-2 text-[#007C9D] focus:ring-[#007C9D]"
                        />
                        <span className="text-gray-700">{gender}</span>
                      </label>
                    ))}
                  </div>
                  {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                </div>

                {/* Buttons */}
                <div className="flex space-x-4 pt-6">
                  <button
                    onClick={onGoBack}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium"
                  >
                    GO BACK
                  </button>
                  <button
                    onClick={handleContinue}
                    className="flex-1 px-6 py-3 bg-[#006778] text-white rounded-full hover:bg-[#005662] transition-colors font-medium"
                  >
                    CONTINUE TO REVIEW
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Doctor Profile & Summary (40%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Doctor Profile Section */}
            <div className="bg-white rounded-2xl shadow-md p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Doctor Profile</h3>

              <div className="space-y-4">
                {/* Doctor Photo and Basic Info */}
                <div className="flex items-center space-x-4">
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/64x64/F0F0F0/555555?text=DR'; }}
                  />
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{doctor.name}</h4>
                    <p className="text-sm text-blue-600 font-medium">{doctor.specialty}</p>
                  </div>
                </div>

                {/* Doctor Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Stethoscope className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{doctor.experience} Years Exp.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{doctor.qualification || 'MBBS, MD'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{doctor.timing}</span>
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Languages:</p>
                  <p className="text-sm font-medium">{doctor.languages ? doctor.languages.join(', ') : 'English, Hindi'}</p>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  {doctor.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{doctor.phone}</span>
                    </div>
                  )}
                  {doctor.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{doctor.email}</span>
                    </div>
                  )}
                </div>

                {/* Hospital Info */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{hospitalName}</p>
                      <p className="text-xs text-gray-600">{hospitalAddress}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Panel */}
            <div className="bg-white rounded-2xl shadow-md p-8">

              <div className="space-y-6">
                {/* Appointment Date */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Appointment Date</p>
                  <p className="text-lg font-bold text-gray-900">{formatDate(selectedDate)}</p>
                </div>

                {/* Appointment Time */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Appointment Time</p>
                  <p className="text-lg font-bold text-gray-900">{formatTime(selectedSlot)}</p>
                </div>

                {/* Doctor Name */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Doctor</p>
                  <p className="text-lg font-bold text-gray-900">{doctorName}</p>
                </div>

                {/* Location */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Location</p>
                  <div className="text-gray-900">
                    <p className="font-medium">{hospitalName}</p>
                    <p className="text-sm text-gray-600 mt-1">{hospitalAddress}</p>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-1 mr-3 text-[#007C9D] focus:ring-[#007C9D]"
                    />
                    <span className="text-sm text-gray-700">
                      I agree to the Terms & Conditions and Privacy Policy
                    </span>
                  </label>
                  {errors.terms && <p className="text-red-500 text-sm mt-2">{errors.terms}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsPage;