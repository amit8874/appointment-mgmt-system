import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

export default function HorizontalAppointmentForm({ doctors = [], onSuccess, openDoctorForm, initialData = null }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');
  
  const [formData, setFormData] = useState({
    patientId: 'Loading...',
    designation: 'MR.',
    firstName: '',
    lastName: '',
    age: '',
    ageType: 'Year',
    gender: 'Male',
    phone: '',
    department: '',
    doctor: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '',
  });

  // Handle initialData for re-appointments or pre-filled forms
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        patientId: initialData.patientId || prev.patientId,
        designation: initialData.designation || 'MR.',
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        age: initialData.age || '',
        ageType: initialData.ageType || 'Year',
        gender: initialData.gender || 'Male',
        phone: initialData.patientPhone || initialData.phone || '',
        department: initialData.department || '',
        doctor: initialData.doctor || '',
      }));
    }
  }, [initialData]);

  useEffect(() => {
    const fetchPatientId = async () => {
      // If we already have a patient ID from initialData (re-appointment), don't fetch a new one
      if (initialData && initialData.patientId) return;
      
      try {
        const orgId = user?.organizationId?._id || user?.organizationId || user?.organization?._id;
        if (!orgId) return;
        const response = await api.get(`/patients/generate-id?organizationId=${orgId}`);
        if (response.data && response.data.patientId) {
          setFormData(prev => ({ ...prev, patientId: response.data.patientId }));
        }
      } catch (error) {
        console.error('Error fetching patient ID:', error);
      }
    };
    fetchPatientId();
  }, [user, initialData]);

  // Gender auto-selection based on Designation
  useEffect(() => {
    const des = formData.designation.toUpperCase().replace('.', '');
    if (['MR', 'SHRI'].includes(des)) {
      setFormData(prev => ({ ...prev, gender: 'Male' }));
    } else if (['MS', 'MRS', 'MISS', 'SMT'].includes(des)) {
      setFormData(prev => ({ ...prev, gender: 'Female' }));
    }
  }, [formData.designation]);

  // Fetch Slots
  const fetchAvailableSlots = async () => {
    if (!formData.doctor || !formData.appointmentDate) return;
    setIsFetchingSlots(true);
    setAvailableSlots([]);
    setSlotError('');
    try {
      const response = await api.get(`/doctors/${formData.doctor}/slots?date=${formData.appointmentDate}`);
      const data = response.data;
      if (response.status === 200 && data.available && data.slots && data.slots.length > 0) {
        setAvailableSlots(data.slots);
      } else if (data.message) {
        setSlotError(data.message);
      } else {
        setSlotError('No slots available');
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setSlotError('Failed to load slots');
    } finally {
      setIsFetchingSlots(false);
    }
  };

  useEffect(() => {
    if (formData.doctor && formData.appointmentDate) {
      fetchAvailableSlots();
    }
  }, [formData.doctor, formData.appointmentDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'doctor' || name === 'appointmentDate') {
      setFormData(prev => ({ ...prev, appointmentTime: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.appointmentTime) {
      toast.error('Please select an available time slot');
      return;
    }
    setIsLoading(true);
    try {
      const orgId = user?.organizationId?._id || user?.organizationId || user?.organization?._id;
      if (!orgId) {
        toast.error('Organization information not found. Please log in again.');
        return;
      }
      
      const selectedDoc = doctors.find(d => d._id === formData.doctor);
      const appointmentData = {
        organizationId: orgId,
        patientId: formData.patientId,
        doctorId: formData.doctor,
        doctorName: selectedDoc ? selectedDoc.name : '',
        specialty: selectedDoc ? selectedDoc.specialization : 'General',
        date: formData.appointmentDate,
        time: formData.appointmentTime,
        patientDetails: {
          designation: formData.designation,
          firstName: formData.firstName,
          lastName: formData.lastName,
          age: formData.age,
          ageType: formData.ageType,
          gender: formData.gender,
          phone: formData.phone,
        }
      };

      const response = await api.post('/appointments/book-patient', appointmentData);
      if (response.status === 200 || response.status === 201) {
        toast.success('Appointment booked successfully!');
        setFormData(prev => ({
          ...prev,
          firstName: '',
          lastName: '',
          age: '',
          phone: '',
          appointmentTime: '',
        }));
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error(error.response?.data?.message || 'Failed to create appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const departments = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 w-full mb-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Patient ID, Designation, Name, Age, Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1">Patient ID</label>
            <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{formData.patientId}</span>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Designation
            </label>
            <div className="relative">
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full border border-blue-400 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                required
              >
                <option value="MR.">MR.</option>
                <option value="MS.">MS.</option>
                <option value="MRS.">MRS.</option>
                <option value="MISS">MISS</option>
                <option value="SHRI">SHRI</option>
                <option value="SMT.">SMT.</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col md:col-span-1">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter first name"
              className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter last name"
              className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="Enter age"
              className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Type
            </label>
            <div className="relative">
              <select
                name="ageType"
                value={formData.ageType}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                required
              >
                <option value="Year">Year</option>
                <option value="Month">Month</option>
                <option value="Days">Days</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Mobile Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData(prev => ({ ...prev, phone: value }));
              }}
              placeholder="10 digit mobile"
              className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              required
            />
          </div>
        </div>

        {/* Row 2: Gender, Dept, Doctor, Date */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div>
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-2 flex items-center font-semibold italic">
              <span className="text-red-500 mr-1">*</span> Gender
            </label>
            <div className="flex items-center space-x-4">
              {['Male', 'Female', 'Other'].map(option => (
                <label key={option} className="flex items-center cursor-not-allowed">
                  <div className="relative flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      checked={formData.gender === option}
                      readOnly
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border ${formData.gender === option ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} flex items-center justify-center transition-all`}>
                      {formData.gender === option && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    </div>
                  </div>
                  <span className={`ml-2 text-sm ${formData.gender === option ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}`}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 font-semibold">Department</label>
            <div className="relative">
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700"
              >
                <option value="">All Departments</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Doctor
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <select
                  name="doctor"
                  value={formData.doctor}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 p-2 rounded text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 bg-white dark:bg-gray-700"
                >
                  <option value="">Select Doctor</option>
                  {doctors.filter(d => !formData.department || d.specialization === formData.department).map(doc => (
                    <option key={doc._id} value={doc._id}>Dr. {doc.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
              </div>
              <button 
                type="button" 
                onClick={openDoctorForm}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Add New Doctor"
              >
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 flex items-center font-semibold">
              <span className="text-red-500 mr-1">*</span> Date
            </label>
            <div className="relative">
              <input 
                type="date" 
                name="appointmentDate" 
                value={formData.appointmentDate} 
                onChange={handleChange} 
                required 
                min={new Date().toISOString().split('T')[0]} 
                className="w-full border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 pl-8 bg-white dark:bg-gray-700" 
              />
              <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Available Slots */}
        <div className="pt-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2 block">Available Slots</label>
          <div className="min-h-[60px]">
            {isFetchingSlots ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading slots...</div>
            ) : formData.doctor && formData.appointmentDate ? (
              availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {availableSlots.map(slot => {
                    const slotTime = typeof slot === 'object' ? slot.time : slot;
                    const isBooked = typeof slot === 'object' ? slot.isBooked : false;
                    const isPast = typeof slot === 'object' ? slot.isPast : false;
                    
                    return (
                      <button 
                        key={slotTime} 
                        type="button" 
                        disabled={isBooked || isPast}
                        onClick={() => setFormData(prev => ({ ...prev, appointmentTime: slotTime }))}
                        className={`py-1.5 px-1 rounded border text-[11px] font-medium transition-all ${
                          formData.appointmentTime === slotTime 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                            : isPast || isBooked
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {slotTime}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-orange-500 py-2 font-medium">{slotError || 'No slots available for this selection'}</div>
              )
            ) : (
              <div className="text-sm text-gray-400 italic py-2">Select doctor and date to view availability</div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="submit"
            disabled={isLoading || !formData.appointmentTime}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center disabled:opacity-50 disabled:shadow-none"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Book Appointment
          </button>
        </div>
      </form>
    </div>
  );
}
