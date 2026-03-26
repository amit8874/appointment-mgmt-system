import React, { useState, useEffect } from 'react';
import { Stethoscope, Calendar, Clock, Phone, MapPin, Search, ArrowRight, X, Filter, CheckCircle, Eye, CalendarDays, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import nurseImage from '../../assets/img/nurse.png';
import AppointmentSelector from './AppointmentSelector';
import LoginModal from './LoginModal';
import OTPModal from './OTPModal';
import UserDetailsPage from './UserDetailsPage';
import AppointmentReviewPage from './AppointmentReviewPage';
import BookingConfirmationPage from './BookingConfirmationPage';

// Utility function to get days string from availability
const getDaysString = (availability) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const availableDays = days.filter(day => availability[day]);
  if (availableDays.length === 7) return 'Mon - Sun';
  if (availableDays.length === 6 && !availableDays.includes('sunday')) return 'Mon - Sat';
  if (availableDays.length === 5 && !availableDays.includes('saturday') && !availableDays.includes('sunday')) return 'Mon - Fri';
  // Default to Mon - Sat if not matching
  return 'Mon - Sat';
};

// Utility function to get timing string from working hours
const getTimingString = (workingHours) => {
  return `${workingHours.start} - ${workingHours.end}`;
};

// --- Utility Components ---

// A simple utility to replicate the custom radio/checkbox style from the screenshot
const CustomCheckbox = ({ id, label, checked, onChange }) => (
  <div className="flex items-center space-x-2 py-1">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="hidden" // Hide the default checkbox
    />
    <label htmlFor={id} className="flex items-center cursor-pointer text-gray-700 text-sm">
      <div className={`w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center transition-all duration-150 ${checked ? 'bg-indigo-700 border-indigo-700' : 'bg-white'}`}>
        {checked && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
      </div>
      <span className="ml-2">{label}</span>
    </label>
  </div>
);


const specialties = [
  { id: 'Any', label: 'Any' },
  { id: 'Anaesthesiology', label: 'Anaesthesiology' },
  { id: 'Bariatrics', label: 'Bariatrics' },
  { id: 'CardiacSciences', label: 'Cardiac Sciences' },
  { id: 'Cosmetology', label: 'Cosmetology & Plastic Surgery' },
];




// --- Booking Modal Component ---

const BookingModal = ({ doctor, isOpen, onClose, onBookingSuccess, initialSelectedDate, initialSelectedSlot, isLoggedIn, onRequireLogin, initialStep = 1, userDetails }) => {
  const [step, setStep] = useState(initialStep);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate || new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(initialSelectedSlot || '');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (!selectedDate || !selectedSlot) {
        setError('Please select a date and time slot.');
        return;
      }
      if (!isLoggedIn) {
        onRequireLogin({ doctor, date: selectedDate, time: selectedSlot });
        onClose();
        return;
      }
    }
    if (step === 2 && !reason.trim()) {
      setError('Please provide a reason for the appointment.');
      return;
    }
    setError('');
    setStep(step + 1);
  };

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

  const handleBookAppointment = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Check both sessionStorage and localStorage for user data
      // Check patientUser first, then userData (for regular login with password)
      let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
      if (!storedUser) {
        storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
      }

      if (!storedUser) {
        throw new Error('Please log in to book an appointment.');
      }

      let userData;
      try {
        userData = JSON.parse(storedUser);
      } catch (e) {
        throw new Error('Invalid user data. Please log in again.');
      }

      // Extract patient ID from different possible locations in the user object
      const patientId = userData._id || userData.id || (userData.user ? userData.user._id : null);

      if (!patientId) {
        throw new Error('Unable to verify your account. Please log in again.');
      }

      const time24h = convertTo24Hour(selectedSlot);

      const response = await api.post('/appointments', {
        patientId,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        date: selectedDate,
        time: time24h,
        reason,
        symptoms,
      });

      if (response.status !== 201 && response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.message || 'Failed to book appointment');
      }

      const appointment = response.data;
      // Format the appointment details for the success message
      const formattedAppointment = {
        ...appointment,
        doctorName: doctor.name,
        date: selectedDate,
        time: selectedSlot,
        specialty: doctor.specialty
      };
      onBookingSuccess(formattedAppointment);
      setStep(4); // Success step
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep(initialStep || 1);
    setSelectedDate(initialSelectedDate || new Date().toISOString().split('T')[0]);
    setSelectedSlot(initialSelectedSlot || '');
    setReason('');
    setSymptoms('');
    setError('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

};

// --- Doctor Card Component ---

const DoctorCard = ({ doctor, onBookAppointment }) => {
  return (
    <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg mb-4 overflow-hidden border border-gray-200">
      {/* Left Section: Image and Details */}
      <div className="p-4 flex flex-col md:flex-row w-full">
        {/* Doctor Image and Call Button */}
        <div className="flex flex-col items-center w-full md:w-1/4 mb-4 md:mb-0">
          <img
            src={doctor.image}
            alt={doctor.name}
            className="w-32 h-40 object-cover rounded-md shadow-inner mb-3"
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/120x160/F0F0F0/555555?text=DR+PROFILE'; }}
          />
          <button
            className="w-full py-2 text-center text-white font-medium rounded-full transition-colors duration-200 flex items-center justify-center"
            style={{ backgroundColor: '#004A7B', maxWidth: '140px' }} // Dark blue/teal from image
          >
            <Phone className="h-4 w-4 mr-2" /> CALL
          </button>
        </div>

        {/* Doctor Info */}
        <div className="md:w-3/4 md:pl-6">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{doctor.name}</h3>
          <p className="text-sm font-semibold text-gray-700 mb-1">{doctor.specialty}</p>
          <p className="text-sm text-gray-500 mb-2">{doctor.experience}</p>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">{doctor.awards}</p>

          <div className="flex items-center space-x-3 text-sm mb-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="text-gray-700">{doctor.timing} - {doctor.days}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <MapPin className="h-4 w-4 text-gray-600" />
            <span className="text-blue-700 font-medium">{doctor.hospital}</span>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            {doctor.languages.join(' • ')}
          </p>
        </div>
      </div>

      {/* Right Section: Booking Button */}
      <div className="w-full md:w-1/3 p-4 flex flex-col justify-center items-center md:border-l border-gray-200">
        <button
          onClick={() => onBookAppointment(doctor)}
          className="w-full py-4 px-6 text-center text-gray-900 font-bold rounded-lg shadow-lg transition-all duration-200"
          style={{ backgroundColor: '#FFD740' }} // Exact yellow color from image
        >
          BOOK APPOINTMENT
        </button>
      </div>
    </div>
  );
};

// --- Request Callback Section Component ---

const RequestCallbackSection = () => {
  return (
    <div className="bg-blue-500 p-6 rounded-lg shadow-lg mb-6 border border-gray-200 flex flex-col md:flex-row items-center">
      <div className="md:w-2/3">
        <h2 className="text-2xl font-bold text-white mb-2">Request a Call Back</h2>
        <p className="text-sm text-white mb-6">
          Fill in your details and our team will get back to you shortly.
        </p>

        <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              placeholder="Enter your name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-white mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              placeholder="Enter your phone number"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          {/* Submit Button */}
          <div className="md:col-span-2 mt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 text-center text-gray-900 font-bold rounded-lg shadow-lg transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: '#FFD740' }} // Exact yellow color from image
            >
              REQUEST CALL BACK
            </button>
          </div>
        </form>
      </div>
      <div className="md:w-1/3 mt-6 md:mt-0 md:ml-6 flex justify-center">
        <img
          src={nurseImage}
          alt="Nurse"
          className="w-64 h-64 object-cover rounded-lg shadow-md"
        />
      </div>
    </div>
  );
};

// --- Filter Sidebar Component ---

const FilterSidebar = ({ showFilters, specialties = [], languages = [], genders = [], selectedFilters, onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);

  const filteredSpecialties = specialties.filter(s => 
    s.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedSpecialties = showAllSpecialties ? filteredSpecialties : filteredSpecialties.slice(0, 6);

  return (
    <aside className="w-full bg-white p-4 rounded-lg shadow-md sticky top-0 h-fit border border-gray-100">
      <h2 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2">Filters</h2>

      {/* Speciality Filter */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Speciality</h3>
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search Speciality"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm pl-8 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          {displayedSpecialties.map(s => (
            <CustomCheckbox
              key={s}
              id={`spec-${s}`}
              label={s}
              checked={selectedFilters.specialty.includes(s)}
              onChange={() => onFilterChange('specialty', s)}
            />
          ))}
          {filteredSpecialties.length > 6 && (
            <button 
              onClick={() => setShowAllSpecialties(!showAllSpecialties)}
              className="text-sm text-indigo-600 mt-2 block font-medium hover:text-indigo-800 transition-colors"
            >
              {showAllSpecialties ? 'Show Less' : `+${filteredSpecialties.length - 6} More`}
            </button>
          )}
          {filteredSpecialties.length === 0 && (
            <p className="text-xs text-gray-500 py-2">No specialties found matching "{searchTerm}"</p>
          )}
        </div>
      </div>

      {/* Gender Filter */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Gender</h3>
        <div className="space-y-1">
          {genders.map(g => (
            <CustomCheckbox 
              key={g}
              id={`gender-${g}`} 
              label={g} 
              checked={selectedFilters.gender.includes(g)} 
              onChange={() => onFilterChange('gender', g)} 
            />
          ))}
        </div>
      </div>

      {/* Language Filter */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Languages</h3>
        <div className="space-y-1">
          {languages.slice(0, 6).map(l => (
            <CustomCheckbox 
              key={l}
              id={`lang-${l}`} 
              label={l} 
              checked={selectedFilters.language.includes(l)} 
              onChange={() => onFilterChange('language', l)} 
            />
          ))}
          {languages.length > 6 && (
            <button className="text-sm text-indigo-600 mt-2 block font-medium hover:text-indigo-800 transition-colors">+ {languages.length - 6} More</button>
          )}
        </div>
      </div>

      <button 
        onClick={() => {
          // You could add a specific submit logic here, 
          // but our filters are already reactive (instant).
          // Maybe just close mobile sidebar?
          if (window.innerWidth < 1024) {
            // Logic to close sidebar if needed
          }
        }}
        className="w-full py-3 mt-4 text-center font-bold rounded-xl text-gray-900 transition-all duration-200 hover:shadow-lg active:scale-95"
        style={{ backgroundColor: '#FFD740' }}
      >
        Apply Filters
      </button>
      
      <button 
        onClick={() => {
          onFilterChange('specialty', 'Any');
          onFilterChange('gender', 'Any');
          onFilterChange('language', 'Any');
          setSearchTerm('');
        }}
        className="w-full py-2 mt-2 text-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
      >
        Reset All
      </button>
    </aside>
  );
};


// --- Appointment History Component ---

const AppointmentHistory = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointmentHistory();
  }, []);

  const fetchAppointmentHistory = async () => {
    try {
      // Check for user data in both possible storage locations
      let patientUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
      let userData = sessionStorage.getItem('userData') || localStorage.getItem('userData');
      
      let userDataParsed;
      let patientId;
      let token;
      
      if (patientUser) {
        userDataParsed = JSON.parse(patientUser);
        patientId = userDataParsed._id || userDataParsed.id;
        token = userDataParsed.token || '';
      } else if (userData) {
        userDataParsed = JSON.parse(userData);
        patientId = userDataParsed._id || userDataParsed.id;
        token = userDataParsed.token || '';
      } else {
        throw new Error('Patient not logged in. Please log in again.');
      }
      
      if (!patientId) {
        throw new Error('Patient ID not found. Please log in again.');
      }

      // 🔴 Fetch from the new global summary endpoint inside AppointmentHistory
      const response = await api.get(`/appointments/patient/${patientId}/summary`);
      const data = response.data;
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (appointment) => {
    // For now, just log to console. In real app, open a modal with details
    console.log('Appointment details:', appointment);
    alert(`Appointment Details:\nClinic: ${appointment.organizationName}\nID: ${appointment._id}\nDoctor: ${appointment.doctorName}\nDate: ${appointment.date}\nTime: ${appointment.time}\nStatus: ${appointment.status}\nReason: ${appointment.reason}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading appointment history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        Error loading appointments: {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Appointment History</h2>

      {appointments.length === 0 ? (
        <div className="text-center py-8">
          <CalendarDays className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No appointments found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clinic
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <tr key={appointment._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {appointment.organizationName}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.doctorName}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.date} at {appointment.time}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(appointment)}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- Main Application Component (Replicating the entire page structure) ---

const App = () => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' or 'history'
  const [bookingModal, setBookingModal] = useState({ isOpen: false, doctor: null });
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null); // Track selected clinic
  const [loadingOrg, setLoadingOrg] = useState(false); // New state for loading patient's organization

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loginModal, setLoginModal] = useState({ isOpen: false });
  const [otpModal, setOtpModal] = useState({ isOpen: false, phone: '' });
  const [pendingDoctor, setPendingDoctor] = useState(null);
  const [currentView, setCurrentView] = useState('doctors'); // 'doctors', 'userDetails', 'review', 'confirmation'
  const [appointmentData, setAppointmentData] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);

  const { user: authUser, isAuthenticated: authIsAuthenticated } = useAuth();

  // Filter State
  const [selectedSpecialties, setSelectedSpecialties] = useState(['Any']);
  const [selectedGenders, setSelectedGenders] = useState(['Any']);
  const [selectedLanguages, setSelectedLanguages] = useState(['Any']);
  const [specialtySearch, setSpecialtySearch] = useState('');

  // Filter Logic
  const filteredDoctors = doctors.filter(doctor => {
    // 1. Specialty Filter
    const matchesSpecialty = selectedSpecialties.includes('Any') || 
                             selectedSpecialties.includes(doctor.specialty);
    
    // 2. Gender Filter
    const matchesGender = selectedGenders.includes('Any') || 
                          selectedGenders.includes(doctor.gender);
    
    // 3. Language Filter
    const matchesLanguage = selectedLanguages.includes('Any') || 
                            doctor.languages.some(lang => selectedLanguages.includes(lang));

    return matchesSpecialty && matchesGender && matchesLanguage;
  });

  const allSpecialties = ['Any', ...new Set(doctors.map(d => d.specialty))];
  const allLanguages = ['English', 'Hindi', 'Bengali / Bangla', 'Punjabi', 'Gujarati', 'Tamil', 'Telugu'];
  const allGenders = ['Any', 'Male', 'Female', 'Other'];

  const handleFilterChange = (type, value) => {
    const setters = {
      specialty: setSelectedSpecialties,
      gender: setSelectedGenders,
      language: setSelectedLanguages
    };
    
    const setter = setters[type];
    if (!setter) return;

    if (value === 'Any') {
      setter(['Any']);
    } else {
      setter(prev => {
        if (prev.includes(value)) {
          const newState = prev.filter(item => item !== value);
          return newState.length === 0 ? ['Any'] : newState;
        } else {
          return [...prev.filter(item => item !== 'Any'), value];
        }
      });
    }
  };

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setOrgsLoading(true);
        const response = await api.get('/organizations/public');
        const data = response.data;
        setOrganizations(data);
      } catch (err) {
        setOrgsError(err.message);
      } finally {
        setOrgsLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  useEffect(() => {
    if (authIsAuthenticated && authUser) {
      setUser(authUser);
      setIsLoggedIn(true);
      
      // If patient is logged in and has an organization, auto-select it
      if (authUser.role === 'patient' && (authUser.organizationId || authUser.organization)) {
        const orgId = authUser.organizationId?._id || authUser.organizationId || authUser.organization?._id;
        
        if (orgId) {
          const fetchAndSelectOrg = async () => {
             try {
               setLoadingOrg(true);
               const response = await api.get(`/organizations/${orgId}`);
               if (response.data) {
                 setSelectedOrg(response.data);
               }
             } catch (err) {
               console.error('Error auto-selecting organization:', err);
               // If fetch fails, we can try to mock it from user data if available
               if (authUser.organization) {
                  setSelectedOrg({
                    _id: orgId,
                    name: authUser.organization.name || 'Your Clinic',
                    branding: authUser.organization.branding
                  });
               }
             } finally {
               setLoadingOrg(false);
             }
          };
          fetchAndSelectOrg();
        }
      }
    }
  }, [authIsAuthenticated, authUser]);

  useEffect(() => {
    if (!selectedOrg) return;

    const fetchDoctors = async () => {
      try {
        setDoctorsLoading(true);
        const response = await api.get(`/doctors/public/${selectedOrg._id}`);
        const data = response.data;

        // Transform API data to match component expectations
        const transformedDoctors = data.map(doctor => ({
          id: doctor.id, // doctorId from API
          orgId: selectedOrg._id, // Attach org for booking
          name: doctor.name,
          specialty: doctor.specialization,
          experience: `${doctor.experience}+ Years experience`,
          gender: doctor.gender || 'Male',
          languages: doctor.languages && doctor.languages.length > 0 ? doctor.languages : ['English', 'Hindi'],
          awards: doctor.qualification || 'MBBS, MD',
          timing: getTimingString(doctor.workingHours),
          days: getDaysString(doctor.availability),
          hospital: selectedOrg.name || 'Demo Hospitals Lucknow',
          hospitalAddress: selectedOrg.address ? `${selectedOrg.address.street || ''} ${selectedOrg.address.city || ''} ${selectedOrg.address.state || ''}`.trim() || 'Location unavailable' : 'Location unavailable',
          image: doctor.photo || `https://placehold.co/120x160/F0F0F0/555555?text=${doctor.name.split(' ').map(n => n[0]).join('')}`,
          photo: doctor.photo, // Add photo field for consistency
          fee: doctor.fee || 0, // Doctor's consultation fee
          isAvailable: doctor.status === 'Active',
        }));

        setDoctors(transformedDoctors);
      } catch (err) {
        setDoctorsError(err.message);
      } finally {
        setDoctorsLoading(false);
      }
    };

    fetchDoctors();
  }, [selectedOrg]);

  useEffect(() => {
    // Check both sessionStorage and localStorage for user data
    // Check patientUser first, then userData (for regular login), then userData from AuthContext
    let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
    
    // If not found in patientUser, check userData (used by regular login with password)
    if (!storedUser) {
      storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
    }
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsLoggedIn(true);
      } catch (e) {
        sessionStorage.removeItem('patientUser');
        localStorage.removeItem('patientUser');
        sessionStorage.removeItem('userData');
        localStorage.removeItem('userData');
      }
    }
  }, []);

  const handleBookAppointment = (doctor) => {
    if (!isLoggedIn) {
      setPendingDoctor(doctor);
      setLoginModal({ isOpen: true });
    } else {
      setAppointmentData({ doctor });
      setCurrentView('userDetails');
    }
  };

  const handleRequireLogin = (appointmentData) => {
    setPendingDoctor(appointmentData);
    setLoginModal({ isOpen: true });
  };

  const handleOtpSent = (phone) => {
    setLoginModal({ isOpen: false });
    setOtpModal({ isOpen: true, phone });
  };

  const handleOtpVerified = (userData, token) => {
    setOtpModal({ isOpen: false });
    setIsLoggedIn(true);
    setUser({ ...userData, token });
    sessionStorage.setItem('patientUser', JSON.stringify({ ...userData, token }));
    if (pendingDoctor) {
      setAppointmentData(pendingDoctor);
      setPendingDoctor(null);
      setCurrentView('userDetails');
    }
  };

  if (currentView === 'userDetails') {
    return (
      <UserDetailsPage
        user={user}
        doctor={appointmentData?.doctor}
        onGoBack={() => setCurrentView('doctors')}
        onContinue={(userDetails, aptData) => {
          setReviewData({
            userDetails,
            doctor: aptData.doctor,
            selectedDate: aptData.date,
            selectedSlot: aptData.time
          });
          setCurrentView('review');
        }}
      />
    );
  }

  if (currentView === 'review') {
    return (
      <AppointmentReviewPage
        userDetails={reviewData?.userDetails}
        doctor={reviewData?.doctor}
        selectedDate={reviewData?.selectedDate}
        selectedSlot={reviewData?.selectedSlot}
        onGoBack={() => setCurrentView('userDetails')}
        onProceed={(userDetails) => {
          setConfirmationData(userDetails);
          setCurrentView('confirmation');
        }}
      />
    );
  }

  if (currentView === 'confirmation') {
    return (
      <BookingConfirmationPage userDetails={confirmationData} />
    );
  }

  return (
    // Base layout to match the screenshot background
    <div className="pt-2 pb-6">

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('doctors'); setSelectedOrg(null); }}
            className={`py-2 px-4 font-medium text-sm ${activeTab === 'doctors'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Find Clinics & Doctors
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-4 font-medium text-sm ${activeTab === 'history'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Appointment History
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'doctors' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-8 flex flex-col lg:flex-row gap-5">

          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-semibold"
            >
              <Filter className="h-5 w-5 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* 1. Filter Sidebar - Hidden on mobile unless toggled */}
          <div className={`lg:w-1/4 w-full ${showFilters ? 'block' : 'hidden'} lg:block`}>
            <FilterSidebar 
              showFilters={showFilters} 
              specialties={allSpecialties}
              languages={allLanguages}
              genders={allGenders}
              selectedFilters={{
                specialty: selectedSpecialties,
                gender: selectedGenders,
                language: selectedLanguages
              }}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* 2. Clinic/Doctor Listing */}
          <main className="lg:w-3/4 w-full">
            {loadingOrg ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Loading your clinic details...</p>
              </div>
            ) : (!selectedOrg && user?.role !== 'patient') ? (
              // ─── CLINIC LIST (Step 1) ───────────────────────────────────
              <>
                <div className="pb-4 mb-4">
                  <h1 className="text-2xl font-bold text-gray-800">Select a Clinic</h1>
                  <p className="text-sm text-gray-500">Clinics count: {orgsLoading ? 'Loading...' : organizations.length}</p>
                </div>

                <div>
                  {orgsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading clinics...</p>
                    </div>
                  ) : orgsError ? (
                    <div className="text-center py-8 text-red-600">
                      Error loading clinics: {orgsError}
                    </div>
                  ) : organizations.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No clinics available currently.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {organizations.map(org => (
                        <div
                          key={org._id}
                          onClick={() => setSelectedOrg(org)}
                          className="bg-white p-6 rounded-lg shadow-md border border-gray-200 cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all flex flex-col items-center text-center"
                        >
                          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{org.name}</h3>
                          <p className="text-sm text-gray-500 mb-2 truncate max-w-full">
                            {org.address?.city || 'City'} {org.address?.state ? `, ${org.address.state}` : ''}
                          </p>
                          {org.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-1" />
                              {org.phone}
                            </div>
                          )}
                          <button className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 font-semibold rounded-md border border-indigo-100 hover:bg-indigo-100 w-full transition-colors">
                            View Doctors
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : !selectedOrg && user?.role === 'patient' ? (
              // Fallback for patient when selectedOrg is empty (e.g. if fetch failed)
              <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                   <Calendar size={40} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">We couldn't load your clinic</h2>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">Please try refreshing the page or contact support if the issue persists.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  Refresh Page
                </button>
              </div>
            ) : (
              // ─── DOCTOR LIST FOR SELECTED CLINIC (Step 2) ───────────────
              <>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    {user?.role !== 'patient' && (
                      <button
                        onClick={() => setSelectedOrg(null)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center mb-2 font-medium"
                      >
                        <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Back to Clinics
                      </button>
                    )}
                    <h1 className="text-2xl font-bold text-gray-800">Doctors at {selectedOrg.name}</h1>
                    <p className="text-sm text-gray-500">Doctors count: {doctorsLoading ? 'Loading...' : filteredDoctors.length}</p>
                  </div>
                </div>

                <div>
                  {doctorsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading doctors...</p>
                    </div>
                  ) : doctorsError ? (
                    <div className="text-center py-8 text-red-600">
                      Error loading doctors: {doctorsError}
                    </div>
                  ) : doctors.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No doctors available at this clinic yet.</p>
                    </div>
                  ) : filteredDoctors.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
                      <Search className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-gray-800 font-medium text-lg">No doctors found matching your filters.</p>
                      <p className="text-gray-500 mb-6">Try adjusting your filters to find more results.</p>
                      <button 
                        onClick={() => { setSelectedSpecialties(['Any']); setSelectedGenders(['Any']); setSelectedLanguages(['Any']); }}
                        className="px-6 py-2 bg-indigo-50 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        Clear all filters
                      </button>
                    </div>
                  ) : (
                    filteredDoctors.map(doctor => (
                      <DoctorCard key={doctor.id} doctor={doctor} onBookAppointment={() => handleBookAppointment(doctor)} />
                    ))
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      )}

      {/* Appointment History Tab */}
      {activeTab === 'history' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AppointmentHistory />
        </div>
      )}

      {/* Request Callback Section */}
      <RequestCallbackSection />

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModal.isOpen}
        onClose={() => setLoginModal({ isOpen: false })}
        onOtpSent={handleOtpSent}
      />

      {/* OTP Modal */}
      <OTPModal
        isOpen={otpModal.isOpen}
        onClose={() => setOtpModal({ isOpen: false, phone: '' })}
        phone={otpModal.phone}
        onVerified={handleOtpVerified}
      />

      {/* Booking Modal */}
      {bookingModal.isOpen && (
        <BookingModal
          doctor={bookingModal.doctor}
          isOpen={bookingModal.isOpen}
          onClose={() => setBookingModal({ isOpen: false, doctor: null, initialSelectedDate: null, initialSelectedSlot: null })}
          onBookingSuccess={(newAppointment) => {
            setAppointments(prev => [...prev, newAppointment]);
            setBookingModal({ isOpen: false, doctor: null, initialSelectedDate: null, initialSelectedSlot: null });
          }}
          initialSelectedDate={bookingModal.initialSelectedDate}
          initialSelectedSlot={bookingModal.initialSelectedSlot}
          initialStep={bookingModal.initialStep || 1}
          userDetails={bookingModal.userDetails}
          isLoggedIn={isLoggedIn}
          onRequireLogin={handleRequireLogin}
        />
      )}
    </div>
  );
};

export default App;
