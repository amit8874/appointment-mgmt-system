import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Briefcase, Calendar, Clock, Check, X as XIcon, Upload, Save } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { AnimatePresence, motion } from 'framer-motion';
import formImage from '../../../assets/img/Receptimg.png';

const ReceptionistForm = ({ isOpen, onClose, onSave, receptionist }) => {
  const [formData, setFormData] = useState({
    name: '',
    gender: 'Female',
    dob: null,
    email: '',
    phone: '',
    address: '',
    joinDate: new Date(),
    shift: 'Morning',
    status: 'Active',
    profilePhoto: null,
    emergencyContact: '',
    emergencyPhone: '',
    role: 'Receptionist',
    salary: '',
    workingHours: { start: '09:00', end: '17:00' },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    }
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const shifts = ['Morning', 'Afternoon', 'Night', 'Rotating'];
  const daysOfWeek = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    if (receptionist) {
      setFormData({
        id: receptionist.id || '',
        name: receptionist.name || '',
        gender: receptionist.gender || 'Female',
        dob: receptionist.dob ? new Date(receptionist.dob) : null,
        email: receptionist.email || '',
        phone: receptionist.phone || '',
        address: receptionist.address || '',
        joinDate: receptionist.joinDate ? new Date(receptionist.joinDate) : new Date(),
        shift: receptionist.shift || 'Morning',
        status: receptionist.status || 'Active',
        profilePhoto: receptionist.profilePhoto || null,
        emergencyContact: receptionist.emergencyContact || '',
        emergencyPhone: receptionist.emergencyPhone || '',
        role: receptionist.role || 'Receptionist',
        salary: receptionist.salary || '',
        workingHours: receptionist.workingHours || { start: '09:00', end: '17:00' },
        availability: receptionist.availability || {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        }
      });
    } else {
      // Reset form for adding new receptionist
      setFormData({
        name: '',
        gender: 'Female',
        dob: null,
        email: '',
        phone: '',
        address: '',
        joinDate: new Date(),
        shift: 'Morning',
        status: 'Active',
        profilePhoto: null,
        emergencyContact: '',
        emergencyPhone: '',
        role: 'Receptionist',
        salary: '',
        workingHours: { start: '09:00', end: '17:00' },
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        }
      });
    }
  }, [receptionist]);

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      if (parent === 'availability') {
        setFormData(prev => ({
          ...prev,
          availability: {
            ...prev.availability,
            [child]: checked
          }
        }));
      } else if (parent === 'workingHours') {
        setFormData(prev => ({
          ...prev,
          workingHours: {
            ...prev.workingHours,
            [child]: value
          }
        }));
      }
    } else if (type === 'file') {
      if (files && files[0]) {
        setFormData(prev => ({
          ...prev,
          [name]: files[0]
        }));
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['name', 'email', 'phone', 'address', 'emergencyContact', 'emergencyPhone', 'salary'];

    requiredFields.forEach(field => {
      if (!formData[field]?.toString().trim()) {
        newErrors[field] = 'This field is required';
      }
    });

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^\+?[0-9\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.emergencyPhone && !/^\+?[0-9\s-]{10,}$/.test(formData.emergencyPhone)) {
      newErrors.emergencyPhone = 'Please enter a valid phone number';
    }

    if (formData.salary && isNaN(Number(formData.salary))) {
      newErrors.salary = 'Please enter a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Create FormData object
      const formDataToSend = new FormData();

      // Append all form data to FormData
      Object.keys(formData).forEach(key => {
        if (key === 'profilePhoto' && formData[key] instanceof File) {
          formDataToSend.append(key, formData[key]);
        } else if (key === 'workingHours' || key === 'availability') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Convert dates to ISO string
      if (formData.dob) {
        formDataToSend.set('dob', formData.dob.toISOString());
      }
      if (formData.joinDate) {
        formDataToSend.set('joinDate', formData.joinDate.toISOString());
      }

      await onSave(formDataToSend);
      onClose();
    } catch (error) {
      console.error('Error saving receptionist:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to save receptionist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="receptionist-form"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 bg-[#e6f5e8] dark:bg-gray-900 z-50 flex items-center justify-center p-6 overflow-y-auto"
        >
          <div className="hidden md:flex w-full items-center justify-center">
            <img
              src={formImage}
              alt="Form Illustration"
              className="max-h-[90vh] object-contain"
            />
          </div>
          
          <div className="dark:bg-gray-800 rounded-none shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {receptionist ? 'Edit Receptionist' : 'Add New Receptionist'}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-none">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div className="dark:bg-gray-700 p-4 rounded-none">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Personal Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              className={`pl-10 w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm`}
                              placeholder="John Doe"
                            />
                          </div>
                          {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Gender
                            </label>
                            <select
                              id="gender"
                              name="gender"
                              value={formData.gender}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Date of Birth
                            </label>
                            <DatePicker
                              selected={formData.dob}
                              onChange={(date) => setFormData({ ...formData, dob: date })}
                              dateFormat="yyyy-MM-dd"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                              placeholderText="Select date of birth"
                              showYearDropdown
                              dropdownMode="select"
                              maxDate={new Date()}
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="email"
                              id="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              className={`pl-10 w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm`}
                              placeholder="receptionist@example.com"
                            />
                          </div>
                          {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
                        </div>

                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Phone className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="tel"
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className={`pl-10 w-full px-3 py-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm`}
                              placeholder="+1 (555) 123-4567"
                            />
                          </div>
                          {errors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>}
                        </div>

                        <div>
                          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Address <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 pt-2 flex items-start pointer-events-none">
                              <MapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <textarea
                              id="address"
                              name="address"
                              rows="2"
                              value={formData.address}
                              onChange={handleInputChange}
                              className={`pl-10 w-full px-3 py-2 border ${errors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm`}
                              placeholder="123 Main St, City, State, ZIP"
                            />
                          </div>
                          {errors.address && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="dark:bg-gray-700 p-4 rounded-none">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Emergency Contact
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Emergency Contact Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="emergencyContact"
                              name="emergencyContact"
                              value={formData.emergencyContact}
                              onChange={handleInputChange}
                              className={`pl-10 w-full px-3 py-2 border ${errors.emergencyContact ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm`}
                              placeholder="John Doe"
                            />
                          </div>
                          {errors.emergencyContact && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.emergencyContact}</p>}
                        </div>

                        <div>
                          <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Emergency Phone <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Phone className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="tel"
                              id="emergencyPhone"
                              name="emergencyPhone"
                              value={formData.emergencyPhone}
                              onChange={handleInputChange}
                              className={`pl-10 w-full px-3 py-2 border ${errors.emergencyPhone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm`}
                              placeholder="+1 (555) 987-6543"
                            />
                          </div>
                          {errors.emergencyPhone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.emergencyPhone}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Profile Photo */}
                    <div className="dark:bg-gray-700 p-4 rounded-none">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Profile Photo
                      </h3>
                      <div className="mt-1 flex items-center">
                        <span className="inline-block h-12 w-12 rounded-none overflow-hidden bg-gray-100">
                          {formData.profilePhoto ? (
                            typeof formData.profilePhoto === 'string' ? (
                              <img
                                src={formData.profilePhoto}
                                alt="Profile"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <img
                                src={URL.createObjectURL(formData.profilePhoto)}
                                alt="Profile"
                                className="h-full w-full object-cover"
                              />
                            )
                          ) : (
                            <User className="h-full w-full text-gray-400" />
                          )}
                        </span>
                        <label className="ml-5">
                          <div className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-none shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            {formData.profilePhoto ? 'Change' : 'Upload'}
                          </div>
                          <input
                            type="file"
                            name="profilePhoto"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setFormData(prev => ({
                                  ...prev,
                                  profilePhoto: e.target.files[0]
                                }));
                              }
                            }}
                          />
                        </label>
                        {formData.profilePhoto && (
                          <button
                            type="button"
                            className="ml-2 text-red-600 hover:text-red-800 text-sm font-medium"
                            onClick={() => setFormData(prev => ({ ...prev, profilePhoto: null }))}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        JPG, GIF or PNG. Max size 2MB
                      </p>
                    </div>

                    {/* Employment Details */}
                    <div className="dark:bg-gray-700 p-4 rounded-none">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Employment Details
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Role
                          </label>
                          <input
                            type="text"
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                            placeholder="Receptionist"
                            disabled
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="joinDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Join Date
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar className="h-5 w-5 text-gray-400" />
                              </div>
                              <DatePicker
                                selected={formData.joinDate}
                                onChange={(date) => setFormData({ ...formData, joinDate: date })}
                                dateFormat="yyyy-MM-dd"
                                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                                placeholderText="Select join date"
                                showYearDropdown
                                dropdownMode="select"
                                maxDate={new Date()}
                              />
                            </div>
                          </div>

                          <div>
                            <label htmlFor="shift" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Shift
                            </label>
                            <select
                              id="shift"
                              name="shift"
                              value={formData.shift}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                            >
                              {shifts.map((shift) => (
                                <option key={shift} value={shift}>
                                  {shift}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="salary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Salary <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 dark:text-gray-400">?</span>
                            </div>
                            <input
                              type="text"
                              id="salary"
                              name="salary"
                              value={formData.salary}
                              onChange={handleInputChange}
                              className={`pl-8 w-full px-3 py-2 border ${errors.salary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm`}
                              placeholder="0.00"
                            />
                          </div>
                          {errors.salary && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.salary}</p>}
                        </div>

                        <div>
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Status
                          </label>
                          <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="On Leave">On Leave</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Working Hours */}
                    <div className="dark:bg-gray-700 p-4 rounded-none">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Working Hours
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="workingHours.start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Start Time
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Clock className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="time"
                                id="workingHours.start"
                                name="workingHours.start"
                                value={formData.workingHours.start}
                                onChange={handleInputChange}
                                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label htmlFor="workingHours.end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              End Time
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Clock className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="time"
                                id="workingHours.end"
                                name="workingHours.end"
                                value={formData.workingHours.end}
                                onChange={handleInputChange}
                                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Working Days
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {daysOfWeek.map((day) => (
                              <div key={day.id} className="flex items-center">
                                <input
                                  id={`availability.${day.id}`}
                                  name={`availability.${day.id}`}
                                  type="checkbox"
                                  checked={formData.availability[day.id]}
                                  onChange={handleInputChange}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:checked:bg-blue-600"
                                />
                                <label htmlFor={`availability.${day.id}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                  {day.label.substring(0, 3)}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-none text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-none shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {receptionist ? 'Update Receptionist' : 'Add Receptionist'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReceptionistForm;
