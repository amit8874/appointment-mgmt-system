import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import BillingModal from '../../Shared/BillingModal';
import api from '../../../services/api';
import { centralDoctorApi } from '../../../services/api';

const PatientAppointmentForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    bloodGroup: '',
    contactNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    emergencyContact: '',
    emergencyPhone: '',
    pastMedicalHistory: '',
    allergies: '',
    assignedDoctor: '',
    assignedDoctorId: '',
    patientId: '' // Added to store existing patient ID for re-booking
  });

  const [doctors, setDoctors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const location = useLocation();
  const rebookData = location.state?.rebookData;

  // Patient suggestions state
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameSearchRef = useRef(null);

  // billing modal related state
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingInitData, setBillingInitData] = useState({});
  const billingAppointmentIdRef = useRef(null);

  // Fetch doctors from backend
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await centralDoctorApi.getAll();
        const doctorsList = Array.isArray(data) ? data : (data?.doctors || []);
        setDoctors(doctorsList.map(d => ({
          id: d._id,
          name: d.name,
          specialty: d.specialization || d.specialty || 'General Physician'
        })));
      } catch (err) {
        console.error('Error fetching doctors:', err);
      }
    };
    fetchDoctors();
  }, []);

  // Auto-select doctor if there is only a single doctor in the clinic
  useEffect(() => {
    if (doctors && doctors.length === 1) {
      const singleDoc = doctors[0];
      setFormData(prev => ({
        ...prev,
        assignedDoctorId: singleDoc.id,
        assignedDoctor: singleDoc.name
      }));
    }
  }, [doctors]);

  // Handle re-book data pre-fill
  useEffect(() => {
    if (rebookData) {
      if (rebookData.patient) {
        const p = rebookData.patient;
        setFormData(prev => ({
          ...prev,
          firstName: p.firstName || p.fullName?.split(' ')[0] || '',
          lastName: p.lastName || p.fullName?.split(' ').slice(1).join(' ') || '',
          age: p.age || '',
          gender: p.gender || '',
          bloodGroup: p.bloodGroup || '',
          contactNumber: p.contactNumber || p.phone || '',
          email: p.email || '',
          address: p.address || '',
          city: p.city || '',
          state: p.state || '',
          zip: p.zip || '',
          emergencyContact: p.emergencyContact || '',
          emergencyPhone: p.emergencyPhone || '',
          pastMedicalHistory: p.pastMedicalHistory || '',
          allergies: p.allergies || '',
          patientId: p.patientId || p._id || '', // Capture existing ID
        }));
      }

      // Always pre-fill doctor if provided in rebookData
      if (rebookData.doctorId || rebookData.doctorName) {
        setFormData(prev => ({
          ...prev,
          assignedDoctorId: rebookData.doctorId || prev.assignedDoctorId,
          assignedDoctor: rebookData.doctorName || prev.assignedDoctor
        }));
      }
    }
  }, [rebookData]);


  // Handle click outside to close name suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (nameSearchRef.current && !nameSearchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search existing patients when typing names
  useEffect(() => {
    const fullNameInput = `${formData.firstName} ${formData.lastName}`.trim();
    if (formData.patientId) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      if (fullNameInput.length >= 2) {
        try {
          const response = await api.get('/patients', { params: { search: fullNameInput, limit: 8 } });
          const foundPatients = response.data?.patients || (Array.isArray(response.data) ? response.data : []);
          setSearchResults(foundPatients);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Search patients failed:', error);
        }
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.firstName, formData.lastName, formData.patientId]);

  const handleSelectPatient = (p) => {
    const rawName = p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim();
    setFormData(prev => ({
      ...prev,
      firstName: p.firstName || rawName.split(' ')[0] || '',
      lastName: p.lastName || rawName.split(' ').slice(1).join(' ') || '',
      age: p.age || '',
      gender: p.gender || '',
      bloodGroup: p.bloodGroup || '',
      contactNumber: p.mobile || p.contactNumber || p.phone || '',
      email: p.email || '',
      address: p.address || '',
      city: p.city || '',
      state: p.state || '',
      zip: p.zip || '',
      emergencyContact: p.emergencyContact || '',
      emergencyPhone: p.emergencyPhone || '',
      pastMedicalHistory: p.pastMedicalHistory || '',
      allergies: p.allergies || '',
      patientId: p.patientId || p._id || '',
    }));
    setSearchResults([]);
    setShowSuggestions(false);
  };

  const handleClearPatientSelection = () => {
    setFormData(prev => ({
      ...prev,
      firstName: '',
      lastName: '',
      age: '',
      gender: '',
      bloodGroup: '',
      contactNumber: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      emergencyContact: '',
      emergencyPhone: '',
      pastMedicalHistory: '',
      allergies: '',
      patientId: ''
    }));
    setSearchResults([]);
    setShowSuggestions(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // For phone numbers, only allow digits and limit to 10 digits
    if (name === 'contactNumber' || name === 'emergencyPhone') {
      const digitsOnly = value.replace(/\D/g, '');
      const limitedValue = name === 'contactNumber' ? digitsOnly.slice(0, 10) : digitsOnly.slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: limitedValue
      }));
      return;
    }

    if (name === 'assignedDoctor') {
      const selectedDoc = doctors.find(d => d.id === value);
      setFormData(prev => ({
        ...prev,
        assignedDoctorId: value,
        assignedDoctor: selectedDoc ? selectedDoc.name : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // Clear patientId if they change first/last name manually
        ...((name === 'firstName' || name === 'lastName') ? { patientId: '' } : {})
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      let patientIdString = formData.patientId;
      let patientId = null;

      // 1. Create Patient ONLY if not re-booking an existing one
      if (!patientIdString) {
        const patientResponse = await api.post('/patients', {
          ...formData,
          gender: formData.gender === 'Prefer not to say' ? 'Other' : formData.gender
        });
        patientId = patientResponse.data._id;
        patientIdString = patientResponse.data.patientId;
      }

      // Store appointment ID for later status update after billing
      let appointmentId = null;

      // Get current date and time for billing
      const today = new Date();
      const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      const time = today.getHours().toString().padStart(2, '0') + ':' + today.getMinutes().toString().padStart(2, '0');

      // 2. If doctor assigned, create appointment
      if (formData.assignedDoctorId) {
        const appointmentResponse = await api.post('/appointments', {
          patientId: patientIdString,
          doctorId: formData.assignedDoctorId,
          doctorName: formData.assignedDoctor,
          specialty: doctors.find(d => d.id === formData.assignedDoctorId)?.specialty || 'General',
          date: localDate,
          time: time,
          reason: 'Initial Consultation',
          status: 'pending',
          patientDetails: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.contactNumber,
            email: formData.email
          }
        });

        console.log('Appointment created:', appointmentResponse.data);
        appointmentId = appointmentResponse.data._id;
        console.log('Appointment ID:', appointmentId);
      }

      // instead of immediate reset we open billing modal
      setSuccessMessage('Patient registered. Complete billing to finish.');
      setBillingInitData({
        patientId: patientIdString,
        patientName: `${formData.firstName} ${formData.lastName}`.trim(),
        age: formData.age,
        gender: formData.gender,
        contactNumber: formData.contactNumber,
        email: formData.email,
        bloodGroup: formData.bloodGroup,
        doctorId: formData.assignedDoctorId,
        doctorName: formData.assignedDoctor,
        appointmentId: appointmentId,
        appointmentDate: localDate,
        appointmentTime: time
      });
      setBillingOpen(true);

      // Store appointment ID in a ref for billing complete handler
      billingAppointmentIdRef.current = appointmentId;

      // we keep the form data until billing completes; parent component may reset later
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register patient. Please try again.');
      console.error('Error saving patient:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBillingComplete = async (bill) => {
    console.log('Billing complete:', bill);
    console.log('Appointment ID from ref:', billingAppointmentIdRef.current);

    if (bill.status === 'Paid') {
      setSuccessMessage('Patient registered and payment received. Invoice generated.');

      // Update appointment status to confirmed when payment is paid
      if (billingAppointmentIdRef.current) {
        console.log('Updating appointment status for ID:', billingAppointmentIdRef.current);
        try {
          const response = await api.put(`/appointments/${billingAppointmentIdRef.current}`, {
            status: 'confirmed'
          });
          console.log('Appointment status updated:', response.data);
        } catch (err) {
          console.error('Error updating appointment status:', err);
        }
      } else {
        console.log('No appointment ID found');
      }
    } else {
      setSuccessMessage('Patient registered but payment is pending.');
    }

    // Call onSuccess callback if provided
    if (onSuccess) {
      onSuccess();
    }

    // clear form after a short delay
    setTimeout(() => {
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        age: '',
        gender: '',
        bloodGroup: '',
        contactNumber: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        emergencyContact: '',
        emergencyPhone: '',
        pastMedicalHistory: '',
        allergies: '',
        assignedDoctor: '',
        assignedDoctorId: ''
      });
      setSuccessMessage('');
    }, 2000);
  };

  return (
    <div className="h-full w-full p-2">
      {/* Ultra Compact Single Page Form */}
      <form onSubmit={handleSubmit} className="h-full">
        {/* Main Container - All fields in one row with scrolling if needed */}
        <div className="flex flex-wrap gap-2 h-full content-start">

          {/* Personal Info Row */}
          <div className="w-full flex justify-between items-center border-b pb-2 mb-1">
            <span className="text-xs font-bold text-blue-600 self-center">PERSONAL</span>
            {formData.patientId && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-fade select-none">
                Linked Patient: {formData.patientId}
                <button
                  type="button"
                  onClick={handleClearPatientSelection}
                  className="text-emerald-900 hover:text-red-600 font-bold ml-1 cursor-pointer transition-colors"
                  title="Clear patient selection"
                >
                  ✕
                </button>
              </span>
            )}
          </div>

          {/* Name Fields Container with Suggestions Dropdown */}
          <div className="relative w-full flex flex-wrap gap-2" ref={nameSearchRef}>
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-700">First *</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" required autoComplete="off" />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-700">Last *</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" required autoComplete="off" />
            </div>

            {showSuggestions && searchResults.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-80 max-h-48 overflow-y-auto">
                <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase border-b select-none">Database Match</div>
                {searchResults.map(p => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 flex justify-between items-center border-b last:border-0 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{p.name || p.fullName}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">Phone: {p.mobile || p.contactNumber || 'N/A'} • Age: {p.age || 'N/A'}</p>
                    </div>
                    <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase shrink-0 ml-2">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-700">Age *</label>
                <input type="number" name="age" value={formData.age} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" required />
              </div>
          <div className="w-20">
            <label className="block text-xs font-medium text-gray-700">Gender *</label>
            <select name="gender" value={formData.gender} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" required>
              <option value="">-</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="w-20">
            <label className="block text-xs font-medium text-gray-700">Blood</label>
            <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500">
              <option value="">-</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          {/* Contact Row */}
          <div className="w-full flex gap-2 items-end border-b pb-2 mb-1 mt-2">
            <span className="text-xs font-bold text-blue-600 self-center">CONTACT</span>
          </div>

          <div className="w-28">
            <label className="block text-xs font-medium text-gray-700">Phone *</label>
            <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
              placeholder="10 digits" maxLength="10" required />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-700">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="w-48">
            <label className="block text-xs font-medium text-gray-700">Address</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-gray-700">City</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-gray-700">State</label>
            <input type="text" name="state" value={formData.state} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="w-20">
            <label className="block text-xs font-medium text-gray-700">ZIP</label>
            <input type="text" name="zip" value={formData.zip} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" />
          </div>

          {/* Emergency Row */}
          <div className="w-full flex gap-2 items-end border-b pb-2 mb-1 mt-2">
            <span className="text-xs font-bold text-red-600 self-center">EMERGENCY</span>
          </div>

          <div className="w-36">
            <label className="block text-xs font-medium text-gray-700">Emergency Name</label>
            <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-700">Emergency Phone</label>
            <input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" maxLength="10" />
          </div>

          {/* Medical Row */}
          <div className="w-full flex gap-2 items-end border-b pb-2 mb-1 mt-2">
            <span className="text-xs font-bold text-red-600 self-center">MEDICAL</span>
          </div>

          <div className="w-64">
            <label className="block text-xs font-medium text-gray-700">Past Medical History</label>
            <input type="text" name="pastMedicalHistory" value={formData.pastMedicalHistory} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" placeholder="Any conditions..." />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-700">Allergies</label>
            <input type="text" name="allergies" value={formData.allergies} onChange={handleChange}
              className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500" placeholder="List allergies..." />
          </div>

          {/* Doctor Row */}
          <div className="w-full flex gap-2 items-end border-b pb-2 mb-1 mt-2">
            <span className="text-xs font-bold text-blue-600 self-center">DOCTOR</span>
          </div>

          <div className="w-64">
            <label className="block text-xs font-medium text-gray-700">Assign Doctor (Optional)</label>
            {doctors && doctors.length === 1 ? (
              <div className="w-full px-2 py-1 text-xs border rounded bg-gray-50 text-gray-800 font-medium">
                Dr. {doctors[0].name} - {doctors[0].specialty}
              </div>
            ) : (
              <select name="assignedDoctor" value={formData.assignedDoctorId} onChange={handleChange}
                className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500">
                <option value="">Select doctor</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>{doctor.name} - {doctor.specialty}</option>
                ))}
              </select>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="w-full mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="w-full mt-2 p-2 bg-blue-100 border border-blue-400 text-blue-700 text-xs rounded">
              {successMessage}
            </div>
          )}

          {/* Buttons */}
          <div className="w-full flex justify-end gap-2 mt-3 pt-2 border-t">
            <button type="button" onClick={() => {
              setFormData({
                firstName: '', lastName: '', dateOfBirth: '', age: '', gender: '', bloodGroup: '',
                contactNumber: '', email: '', address: '', city: '', state: '', zip: '',
                emergencyContact: '', emergencyPhone: '', pastMedicalHistory: '', allergies: '',
                assignedDoctor: '', assignedDoctorId: ''
              });
              setError('');
            }} className="px-4 py-2 text-sm border rounded hover:bg-gray-100 font-medium">
              Reset
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
              {isSubmitting ? 'Saving...' : 'Save Patient'}
            </button>
          </div>

          {/* billing modal overlay */}
          {billingOpen && (
            <BillingModal
              initialData={billingInitData}
              onClose={() => setBillingOpen(false)}
              onComplete={handleBillingComplete}
            />
          )}
        </div>
      </form>
    </div>
  );
};

export default PatientAppointmentForm;
