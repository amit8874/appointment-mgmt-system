import React, { useState, useEffect, useRef } from 'react';
import BillingModal from '../../../components/Shared/BillingModal';
import { centralDoctorApi } from '../../../services/api';
import api from '../../../services/api';

const PatientForm = ({ isOpen, onClose, onSuccess, patient, onBillingComplete }) => {
  const [formData, setFormData] = useState({
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

  const [doctors, setDoctors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // billing modal related state
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingInitData, setBillingInitData] = useState({});
  const billingAppointmentIdRef = useRef(null);

  useEffect(() => {
    if (patient) {
      setFormData({
        firstName: patient.firstName || patient.name?.split(' ')[0] || '',
        lastName: patient.lastName || patient.name?.split(' ').slice(1).join(' ') || '',
        dateOfBirth: patient.dateOfBirth || '',
        age: patient.age || '',
        gender: patient.gender || '',
        bloodGroup: patient.bloodGroup || '',
        contactNumber: patient.contact || patient.contactNumber || '',
        email: patient.email || '',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        zip: patient.zip || '',
        emergencyContact: patient.emergencyContact || '',
        emergencyPhone: patient.emergencyPhone || '',
        pastMedicalHistory: patient.pastMedicalHistory || '',
        allergies: patient.allergies || '',
        assignedDoctor: patient.assignedDoctor || '',
        assignedDoctorId: patient.assignedDoctorId || ''
      });
    } else {
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
    }
  }, [patient]);

  // Fetch doctors from backend
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await centralDoctorApi.getAll();
        setDoctors(data.map(d => ({
          id: d._id,
          name: d.name,
          specialty: d.specialization || d.specialty || 'General Physician'
        })));
      } catch (err) {
        console.error('Error fetching doctors:', err);
      }
    };
    if (isOpen) {
      fetchDoctors();
    }
  }, [isOpen]);

  // Calculate age when date of birth changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      setFormData(prev => ({
        ...prev,
        age: age.toString()
      }));
    }
  }, [formData.dateOfBirth]);

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
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validate required fields
    if (!formData.firstName || !formData.firstName.trim()) {
      setError('First name is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.lastName || !formData.lastName.trim()) {
      setError('Last name is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.contactNumber || formData.contactNumber.length !== 10) {
      setError('Valid 10-digit contact number is required');
      setIsSubmitting(false);
      return;
    }

    try {
      const isEdit = !!patient?._id;
      const url = isEdit
        ? `/api/patients/${patient._id}`
        : '/api/patients';
      const method = isEdit ? 'PUT' : 'POST';

      const requestData = isEdit
        ? { ...formData, currentPatientId: patient._id }
        : formData;

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');

      const response = await (isEdit ? api.put(url, requestData) : api.post(url, requestData));

      const data = response.data;

      if (response.status === 200 || response.status === 201) {
        // If not editing and doctor is assigned, create appointment
        let appointmentId = null;
        if (!isEdit && formData.assignedDoctorId) {
          try {
            const today = new Date();
            const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            const time = today.getHours().toString().padStart(2, '0') + ':' + today.getMinutes().toString().padStart(2, '0');

            const appointmentResponse = await api.post('/appointments', {
                patientId: data.patientId || data._id,
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

            if (appointmentResponse.status === 201 || appointmentResponse.status === 200) {
              const appointmentData = appointmentResponse.data;
              appointmentId = appointmentData._id;
            }
          } catch (err) {
            console.error('Error creating appointment:', err);
          }
        }

        onSuccess(data);

        if (!isEdit) {
          setSuccessMessage('Patient registered. Complete billing to finish.');
          setBillingInitData({
            patientId: data.patientId || data._id,
            patientName: `${formData.firstName} ${formData.lastName}`.trim(),
            age: formData.age,
            gender: formData.gender,
            contactNumber: formData.contactNumber,
            email: formData.email,
            bloodGroup: formData.bloodGroup,
            doctorId: formData.assignedDoctorId,
            doctorName: formData.assignedDoctor,
            appointmentId: appointmentId,
            appointmentDate: new Date().toISOString().split('T')[0],
            appointmentTime: new Date().toTimeString().slice(0, 5)
          });
          setBillingOpen(true);
          billingAppointmentIdRef.current = appointmentId;
        } else {
          onClose();
        }
      } else {
        throw new Error(data.message || `Failed to ${isEdit ? 'update' : 'create'} patient`);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to register patient. Please try again.`);
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

      if (billingAppointmentIdRef.current) {
        try {
          const token = sessionStorage.getItem('token') || localStorage.getItem('token');
          await api.put(`/appointments/${billingAppointmentIdRef.current}`, { status: 'confirmed' });
        } catch (err) {
          console.error('Error updating appointment status:', err);
        }
      }
    } else {
      setSuccessMessage('Patient registered but payment is pending.');
    }

    if (onSuccess) {
      onSuccess();
    }

    setBillingOpen(false);

    if (onBillingComplete) {
      onBillingComplete(bill);
    }

    setTimeout(() => {
      onClose();
      setSuccessMessage('');
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-none shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {patient ? 'Edit Patient' : 'Add New Patient'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 rounded-none p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-2">

              {/* Personal Info Row */}
              <div className="w-full flex gap-2 items-end border-b pb-2 mb-1">
                <span className="text-xs font-bold text-blue-600 self-center">PERSONAL</span>
              </div>

              <div className="w-32">
                <label className="block text-xs font-medium text-gray-700">First *</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" required />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-700">Last *</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" required />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-700">DOB *</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" required />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-700">Gender *</label>
                <select name="gender" value={formData.gender} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" required>
                  <option value="">-</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-700">Blood</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500">
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
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500"
                  placeholder="10 digits" maxLength="10" required />
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="w-48">
                <label className="block text-xs font-medium text-gray-700">Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-700">City</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-700">State</label>
                <input type="text" name="state" value={formData.state} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-700">ZIP</label>
                <input type="text" name="zip" value={formData.zip} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" />
              </div>

              {/* Emergency Row */}
              <div className="w-full flex gap-2 items-end border-b pb-2 mb-1 mt-2">
                <span className="text-xs font-bold text-red-600 self-center">EMERGENCY</span>
              </div>

              <div className="w-36">
                <label className="block text-xs font-medium text-gray-700">Emergency Name</label>
                <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-700">Emergency Phone</label>
                <input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" maxLength="10" />
              </div>

              {/* Medical Row */}
              <div className="w-full flex gap-2 items-end border-b pb-2 mb-1 mt-2">
                <span className="text-xs font-bold text-red-600 self-center">MEDICAL</span>
              </div>

              <div className="w-64">
                <label className="block text-xs font-medium text-gray-700">Past Medical History</label>
                <input type="text" name="pastMedicalHistory" value={formData.pastMedicalHistory} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" placeholder="Any conditions..." />
              </div>
              <div className="w-40">
                <label className="block text-xs font-medium text-gray-700">Allergies</label>
                <input type="text" name="allergies" value={formData.allergies} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500" placeholder="List allergies..." />
              </div>

              {/* Doctor Row */}
              <div className="w-full flex gap-2 items-end border-b pb-2 mb-1 mt-2">
                <span className="text-xs font-bold text-blue-600 self-center">DOCTOR</span>
              </div>

              <div className="w-64">
                <label className="block text-xs font-medium text-gray-700">Assign Doctor (Optional)</label>
                <select name="assignedDoctor" value={formData.assignedDoctorId} onChange={handleChange}
                  className="w-full px-2 py-1 text-xs border rounded-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select doctor</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name} - {doctor.specialty}</option>
                  ))}
                </select>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="w-full mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded-none">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="w-full mt-2 p-2 bg-blue-100 border border-blue-400 text-blue-700 text-xs rounded-none">
                  {successMessage}
                </div>
              )}

              {/* Buttons */}
              <div className="w-full flex justify-end gap-2 mt-3 pt-2 border-t">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-sm border rounded-none hover:bg-gray-100 font-medium">
                  Cancel
                </button>
                <button type="button" onClick={() => {
                  setFormData({
                    firstName: '', lastName: '', dateOfBirth: '', age: '', gender: '', bloodGroup: '',
                    contactNumber: '', email: '', address: '', city: '', state: '', zip: '',
                    emergencyContact: '', emergencyPhone: '', pastMedicalHistory: '', allergies: '',
                    assignedDoctor: '', assignedDoctorId: ''
                  });
                  setError('');
                }} className="px-4 py-2 text-sm border rounded-none hover:bg-gray-100 font-medium">
                  Reset
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-5 py-2 text-sm bg-blue-600 text-white rounded-none hover:bg-blue-700 disabled:opacity-50 font-medium">
                  {isSubmitting ? 'Saving...' : (patient ? 'Update Patient' : 'Save Patient')}
                </button>
              </div>
            </div>
          </form>

          {/* billing modal overlay */}
          {billingOpen && (
            <BillingModal
              initialData={billingInitData}
              onClose={() => setBillingOpen(false)}
              onComplete={handleBillingComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientForm;
