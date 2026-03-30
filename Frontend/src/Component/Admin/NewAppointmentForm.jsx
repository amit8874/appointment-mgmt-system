import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Loader2, Plus, Save, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

export default function NewAppointmentForm({ onClose, onSuccess, initialData, isDashboardIntegrated = false }) {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
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

  useEffect(() => {
    fetchDoctors();
    if (initialData && initialData.patientId && initialData.patientId !== 'Loading...') {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    } else {
      fetchPatientId();
      if (initialData) {
        setFormData(prev => ({
          ...prev,
          ...initialData,
          patientId: 'Loading...'
        }));
      }
    }
  }, [initialData]);

  const fetchPatientId = async () => {
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

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      if (Array.isArray(response.data)) {
        setDoctors(response.data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  // Gender auto-selection based on Designation
  useEffect(() => {
    const des = formData.designation.toUpperCase().replace('.', '');
    if (['MR', 'SHRI'].includes(des)) {
      setFormData(prev => ({ ...prev, gender: 'Male' }));
    } else if (['MS', 'MRS', 'MISS', 'SMT'].includes(des)) {
      setFormData(prev => ({ ...prev, gender: 'Female' }));
    }
  }, [formData.designation]);

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
        setIsLoading(false);
        return;
      }

      const selectedDoctor = doctors.find(d => d._id === formData.doctor);
      const appointmentData = {
        organizationId: orgId,
        patientId: formData.patientId,
        doctorId: formData.doctor,
        doctorName: selectedDoctor ? selectedDoctor.name : '',
        specialty: selectedDoctor ? selectedDoctor.specialization : 'General',
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
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        toast.error('Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const departments = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  return (
    <div className={`${isDashboardIntegrated ? 'bg-transparent shadow-none border-none' : 'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800'} overflow-hidden transition-all duration-500`}>
      {!isDashboardIntegrated && (
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold tracking-tight">Assign New Appointment</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${isDashboardIntegrated ? 'p-8 sm:p-10' : 'p-6'} space-y-6`}>
        {/* Row 1: Patient ID, Designation, Name, Age */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">Patient ID</label>
            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{formData.patientId}</span>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
              <span className="text-red-500 mr-1">*</span> Designation
            </label>
            <div className="relative">
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full border border-blue-400 p-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 pr-8 bg-white dark:bg-gray-800"
                required
              >
                <option value="MR.">MR.</option>
                <option value="MS.">MS.</option>
                <option value="MRS.">MRS.</option>
                <option value="MISS">MISS</option>
                <option value="SHRI">SHRI</option>
                <option value="SMT.">SMT.</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col md:col-span-1">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
              <span className="text-red-500 mr-1">*</span> First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First name"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 font-bold">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last name"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
              <span className="text-red-500 mr-1">*</span> Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="Age"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
              <span className="text-red-500 mr-1">*</span> Type
            </label>
            <div className="relative">
              <select
                name="ageType"
                value={formData.ageType}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
                required
              >
                <option value="Year">Year</option>
                <option value="Month">Month</option>
                <option value="Days">Days</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
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
              placeholder="10 digit mobile number"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
              required
            />
          </div>
        </div>

        {/* Row 2: Gender, Dept, Doctor, Date */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div>
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-2.5 flex items-center font-bold italic">
              <span className="text-red-500 mr-1">*</span> Gender
            </label>
            <div className="flex items-center space-x-5">
              {['Male', 'Female', 'Other'].map(option => (
                <label key={option} className="flex items-center cursor-not-allowed group">
                  <div className="relative flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      checked={formData.gender === option}
                      readOnly
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 ${formData.gender === option ? 'border-blue-500 bg-blue-500/10' : 'border-gray-300'} flex items-center justify-center transition-all`}>
                      {formData.gender === option && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />}
                    </div>
                  </div>
                  <span className={`ml-2 text-sm ${formData.gender === option ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-400'}`}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 font-bold">Department</label>
            <div className="relative">
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
              >
                <option value="">All Departments</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
              <span className="text-red-500 mr-1">*</span> Doctor
            </label>
            <div className="relative">
              <select
                name="doctor"
                value={formData.doctor}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-800"
              >
                <option value="">Select Doctor</option>
                {doctors.filter(d => !formData.department || d.specialization === formData.department).map(doc => (
                  <option key={doc._id} value={doc._id}>Dr. {doc.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 flex items-center font-bold">
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
                className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 pl-9 bg-white dark:bg-gray-800" 
              />
              <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Time Slots Section */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Available Slots</label>
          <div className="min-h-[80px]">
            {isFetchingSlots ? (
              <div className="flex items-center gap-2 text-xs text-blue-500 py-4 font-medium"><Loader2 className="w-5 h-5 animate-spin" /> Fetching latest availability...</div>
            ) : formData.doctor && formData.appointmentDate ? (
              availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
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
                        className={`py-2 px-1 rounded-lg border text-[11px] font-bold transition-all ${
                          formData.appointmentTime === slotTime 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
                            : isPast || isBooked
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {slotTime}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-xl text-xs text-orange-600 dark:text-orange-400 font-bold">{slotError || 'No slots found for this selection.'}</div>
              )
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl text-xs text-blue-600 dark:text-blue-400 italic">Please select both a doctor and a date to view current availability.</div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`flex ${isDashboardIntegrated ? 'justify-end' : 'gap-4'} pt-6 border-t border-gray-100 dark:border-gray-800`}>
          {!isDashboardIntegrated && (
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !formData.appointmentTime}
            className={`${isDashboardIntegrated ? 'px-12 w-auto' : 'flex-[2]'} py-3 bg-blue-600 text-white rounded-xl font-extrabold hover:bg-blue-700 shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:shadow-none`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            Book Appointment
          </button>
        </div>
      </form>
    </div>
  );
}
