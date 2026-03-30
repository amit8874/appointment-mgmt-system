import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Calendar, Phone, Mail, Clock, MapPin, Camera, Upload, Save, X, Trash2, User, Shield, ArrowLeft, Eye, EyeOff, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';


// Theme configuration (same as main app)
const THEMES = {
  light: {
    BRAND_COLOR: '#00ADB5',
    NAVY_BLUE: '#222831',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    hover: '#f1f5f9',
    card: '#ffffff',
    input: '#ffffff',
  },
  dark: {
    BRAND_COLOR: '#00ADB5',
    NAVY_BLUE: '#0f172a',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    hover: '#1e293b',
    card: '#1e293b',
    input: '#334155',
  }
};

// Blood groups options
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Indian states
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
];

// Countries
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other'];

const PatientEditProfile = () => {
  const [theme, setTheme] = useState('light');
  const [formData, setFormData] = useState({
    // Basic Information
    fullName: '',
    gender: '',
    dateOfBirth: '',
    age: '',
    bloodGroup: '',

    // Contact Details
    mobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',

    // Medical Information
    patientId: '',

    // Account Settings
    username: '',
    profilePicture: null,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [patientMongoId, setPatientMongoId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  // Load theme from sessionStorage and user data
  useEffect(() => {
    const fetchPatientData = async () => {
      // Check patientUser first, then userData (for regular login with password)
      let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
      if (!storedUser) {
        storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
      }
      if (!storedUser) {
        console.error('No patient user data in sessionStorage');
        return;
      }

      let userData;
      try {
        userData = JSON.parse(storedUser);
      } catch (error) {
        console.error('Error parsing patient user data:', error);
        return;
      }

      const mobile = userData.mobile;
      if (!mobile) {
        console.error('No mobile found in patient user data');
        return;
      }

      try {
        // We can fetch by ID instead since the Login might just give us an ID
        const patientIdToFetch = userData.patientId || userData.id || userData._id;
        let res;
        try {
           res = await api.get(`/patients/${patientIdToFetch}`);
        } catch(err) {
           // Fallback to mobile if ID fetch fails
           if (mobile) {
              res = await api.get(`/patients/by-mobile/${mobile}`);
           } else {
              throw err;
           }
        }
        
        const data = res.data;
        
        // Format dateOfBirth for the <input type="date"> which requires YYYY-MM-DD
        let formattedDOB = '';
        if (data.dateOfBirth) {
            const d = new Date(data.dateOfBirth);
            if (!isNaN(d.getTime())) {
                formattedDOB = d.toISOString().split('T')[0];
            }
        } else if (data.age) {
            // Optional: calculate approximate DOB from age if missing
            const today = new Date();
            formattedDOB = `${today.getFullYear() - data.age}-01-01`;
        }

        setFormData(prev => ({ 
          ...prev, 
          ...data,
          dateOfBirth: formattedDOB || prev.dateOfBirth,
          fullName: data.fullName || data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || prev.fullName,
          email: data.email || userData.email || prev.email,
          mobile: data.mobile || userData.mobile || prev.mobile,
          username: data.username || userData.username || prev.username,
        }));
        setPatientMongoId(data._id);
        
      } catch (error) {
        console.error('Error fetching patient data:', error);
        // Fallback to userData if API call fails
        setFormData(prev => ({
           ...prev,
           ...userData,
           fullName: userData.name || userData.fullName || prev.fullName,
           patientId: userData.patientId || prev.patientId
        }));
      }
    }
    fetchPatientData();
  }, []);

  // Apply theme to document body
  useEffect(() => {
    document.body.style.backgroundColor = THEMES[theme].background;
  }, [theme]);

  const currentTheme = THEMES[theme];

  // Calculate age from date of birth
  useEffect(() => {
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      setFormData(prev => ({ ...prev, age }));
    }
  }, [formData.dateOfBirth]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Safe values (handles undefined/null)
    const fullName = (formData.fullName || "").trim();
    const mobile = (formData.mobile || "").trim();
    const email = (formData.email || "").trim();
    const address = (formData.address || "").trim();
    const city = (formData.city || "").trim();

    // Validation
    if (!fullName) newErrors.fullName = "Full name is required";
    if (!mobile) newErrors.mobile = "Mobile number is required";

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!email.includes("@")) {
      newErrors.email = "Valid email is required";
    }

    if (!address) newErrors.address = "Address is required";
    if (!city) newErrors.city = "City is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSave = async () => {
    if (!validateForm()) return;

    let currentPatientId = patientMongoId;

    if (!currentPatientId) {
      // Fallback: try to get from sessionStorage
      let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
      if (!storedUser) {
        storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
      }
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          currentPatientId = userData.id || userData._id;
        } catch (error) {
          console.error('Error parsing patient user data in handleSave:', error);
        }
      }

      if (!currentPatientId) {
        console.error('Patient MongoDB ID not found. Cannot update profile.');
        alert('Error: Patient ID not available. Please refresh the page.');
        return;
      }
    }

    setIsLoading(true);
    try {
      // Make API call to update profile using patient's MongoDB _id
      const response = await api.put(`/patients/${currentPatientId}`, formData);

      if (response.status !== 200) {
        throw new Error('Failed to update profile');
      }

      const updatedPatient = response.data;

      // Update sessionStorage with new data
      sessionStorage.setItem('patientUser', JSON.stringify(updatedPatient));

      // Show success message
      alert('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (field, file) => {
    if (!file || file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size should be less than 5MB');
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      const response = await api.post('/upload', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = response.data;
      if (response.status === 200 || response.status === 201) {
        setFormData(prev => ({ ...prev, [field]: data.imageUrl }));
        alert('File uploaded successfully!');
      } else {
        alert('Failed to upload file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('New passwords do not match');
      return;
    }
    if (passwordData.new.length < 6) {
      alert('Password should be at least 6 characters long');
      return;
    }

    try {
      // Get user ID from sessionStorage
      let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
      if (!storedUser) {
        storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
      }
      if (!storedUser) {
        alert('User not logged in. Please login again.');
        return;
      }
      const userData = JSON.parse(storedUser);
      const userId = userData.id || userData._id;

      // Make API call to change password
      const response = await api.put(`/users/${userId}/password`, {
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      });

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.message || 'Failed to change password');
      }

      alert('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error.message || 'Error changing password. Please try again.');
    }
  };

  const isPasswordMatch = passwordData.new && passwordData.confirm 
    ? passwordData.new === passwordData.confirm 
    : null;

  const handleCancel = () => {
    // Navigate back to patient dashboard
    navigate('/patient-dashboard');
  };

  return (
    <div>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {/* Profile Header */}
        <div className="mb-2">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={formData.profilePicture || `https://placehold.co/120x120/${currentTheme.BRAND_COLOR.replace('#', '')}/ffffff?text=U`}
                alt="Profile"
                className="w-16 h-16 rounded-full border-2 border-gray-200"
                style={{ borderColor: currentTheme.border }}
              />
              {isEditing && (
                <button className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 transition">
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: currentTheme.text }}>
                Patient Profile
              </h1>
              <p className="text-sm" style={{ color: currentTheme.textSecondary }}>
                Manage your personal and medical information
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Personal Information */}
          <fieldset disabled={!isEditing} className="lg:col-span-2 space-y-3 m-0 p-0 border-0 flex flex-col">
            {/* Basic Information */}
            <div className="rounded-xl shadow-lg p-4" style={{ backgroundColor: currentTheme.card }}>
              <div className="flex items-center mb-3">
                <User className="h-6 w-6 mr-3" style={{ color: currentTheme.BRAND_COLOR }} />
                <h2 className="text-lg font-bold" style={{ color: currentTheme.text }}>Basic Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                    style={{
                      backgroundColor: currentTheme.hover,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                    }}
                  />
                  {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    Gender
                  </label>
                  <div className="flex space-x-4">
                    {['Male', 'Female', 'Other'].map((gender) => (
                      <label key={gender} className="flex items-center">
                        <input
                          type="radio"
                          name="gender"
                          value={gender}
                          checked={formData.gender === gender}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="mr-2"
                          style={{ accentColor: currentTheme.BRAND_COLOR }}
                        />
                        <span style={{ color: currentTheme.text }}>{gender}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    style={{
                      backgroundColor: currentTheme.input,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    Age
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                    style={{
                      backgroundColor: currentTheme.hover,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                    }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    Blood Group 🩸
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    style={{
                      backgroundColor: currentTheme.input,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                    }}
                  >
                    {BLOOD_GROUPS.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="rounded-xl shadow-lg p-4" style={{ backgroundColor: currentTheme.card }}>
              <div className="flex items-center mb-3">
                <Phone className="h-6 w-6 mr-3" style={{ color: currentTheme.BRAND_COLOR }} />
                <h2 className="text-lg font-bold" style={{ color: currentTheme.text }}>Contact Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    Mobile Number * 📞
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    readOnly
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                    style={{
                      backgroundColor: currentTheme.hover,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                    }}
                  />
                  {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    Email * ✉️
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg transition duration-200 ${errors.email ? 'border-red-500' : ''
                      }`}
                    style={{
                      backgroundColor: currentTheme.input,
                      color: currentTheme.text,
                      borderColor: errors.email ? '#ef4444' : currentTheme.border,
                    }}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    Address 🏠
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows="3"
                    className={`w-full px-3 py-2 border rounded-lg transition duration-200 ${errors.address ? 'border-red-500' : ''
                      }`}
                    style={{
                      backgroundColor: currentTheme.input,
                      color: currentTheme.text,
                      borderColor: errors.address ? '#ef4444' : currentTheme.border,
                    }}
                    placeholder="Enter your full address"
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg transition duration-200 ${errors.city ? 'border-red-500' : ''
                      }`}
                    style={{
                      backgroundColor: currentTheme.input,
                      color: currentTheme.text,
                      borderColor: errors.city ? '#ef4444' : currentTheme.border,
                    }}
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    style={{
                      backgroundColor: currentTheme.input,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                    }}
                  >
                    {INDIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: currentTheme.text }}>
                    Country
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    style={{
                      backgroundColor: currentTheme.input,
                      color: currentTheme.text,
                      borderColor: currentTheme.border,
                    }}
                  >
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          </fieldset>

          {/* Right Column - Account Settings & File Uploads */}
          <div className="space-y-3">
            <fieldset disabled={!isEditing} className="space-y-3 m-0 p-0 border-0 flex flex-col">


          </fieldset>

            {/* Action Buttons */}
            <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: currentTheme.card }}>
              <div className="space-y-4">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-3 px-6 rounded-lg font-bold transition duration-300 hover:scale-105"
                    style={{
                      backgroundColor: currentTheme.BRAND_COLOR,
                      color: 'white',
                    }}
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className={`w-full py-3 px-6 rounded-lg font-bold transition duration-300 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                      }`}
                    style={{
                      backgroundColor: currentTheme.BRAND_COLOR,
                      color: 'white',
                    }}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Save className="h-5 w-5 mr-2" />
                        Save Changes
                      </div>
                    )}
                  </button>
                )}

                <button
                  onClick={() => navigate(-1)}
                  className="w-full py-3 px-6 rounded-lg font-semibold border-2 transition hover:bg-gray-50"
                  style={{
                    color: currentTheme.text,
                    borderColor: currentTheme.border,
                  }}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.current}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.new}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg pr-12"
                  />
                  {isPasswordMatch !== null && (
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] font-bold ${isPasswordMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPasswordMatch ? (
                        <><Check size={12} /> Match</>
                      ) : (
                        <><X size={12} /> Mismatch</>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handlePasswordChange}
                className="w-full py-3 px-6 rounded-lg font-semibold transition"
                style={{
                  backgroundColor: currentTheme.BRAND_COLOR,
                  color: 'white',
                }}
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientEditProfile;
