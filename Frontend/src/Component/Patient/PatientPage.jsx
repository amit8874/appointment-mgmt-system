import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import billimage from '../../assets/img/bill.png'
// import upcomeimage from '../../assets/img/upcoming.png'
import preceptionimage from '../../assets/img/prec.png'
import docimage from '../../assets/img/back.png'
import brainimage from '../../assets/img/brain.png'
import mobileVideo from '../../assets/video/mobilevideo.mp4'
import emergencyImage from '../../assets/img/emergency.jpg'

// --- SCROLL ANIMATION WRAPPER COMPONENT (Straight Card, Content Pop-Up) ---
const AnimatedCard = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const currentRef = domRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Add a slight delay for staggered effect
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          // Stop observing once visible
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px',
      // Trigger when 10% of the card is visible
      threshold: 0.1
    });

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [delay]);

  // The card remains straight (no rotation). It slides up 40px and fades in.
  // The transition uses a bounce cubic-bezier for the desired 'pop-up' feel.
  const animationClasses = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-10';

  return (
    <div
      ref={domRef}
      className={`transform transition-all duration-700 ease-[cubic-bezier(0.175, 0.885, 0.32, 1.275)] ${animationClasses}`}
    >
      {children}
    </div>
  );
};



// Main component, renamed to App for platform compatibility
const PaitentPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState({
    name: 'Guest User',
    age: 0,
    gender: 'Not specified',
    patientId: 'Not available',
    bloodGroup: 'Not available',
    allergies: 'Not available',
    vitals: {
      bloodPressure: 'Not available',
      heartRate: 'Not available',
      temperature: 'Not available'
    }
  });
  const [nextAppointment, setNextAppointment] = useState({
    date: 'No upcoming',
    time: 'appointments',
    doctor: 'Dr. Available',
    department: 'General Medicine',
    type: 'Consultation'
  });

  // Background image slideshow state
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const bgImages = [docimage, brainimage];

  // Auto-cycle background images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prevIndex) => (prevIndex + 1) % bgImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Load user data from sessionStorage on component mount
  useEffect(() => {
    // Check patientUser first, then userData (for regular login with password)
    let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
    if (!storedUser) {
      storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
    }
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(prevUser => ({
          ...prevUser,
          name: userData.name || userData.fullName || 'Guest User',
          age: userData.age || 0,
          gender: userData.gender || 'Not specified',
          patientId: userData.patientId || 'Not available',
          bloodGroup: userData.bloodGroup || 'Not available',
          allergies: userData.allergies || 'Not available',
          vitals: {
            bloodPressure: userData.bloodPressure || 'Not available',
            heartRate: userData.heartRate || 'Not available',
            temperature: userData.temperature || 'Not available'
          }
        }));
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }
  }, []);

  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  // Load appointments from API on component mount
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        // Check for user data in both possible storage locations
        let storedUser = sessionStorage.getItem('patientUser') || localStorage.getItem('patientUser');
        if (!storedUser) {
          storedUser = sessionStorage.getItem('userData') || localStorage.getItem('userData');
        }
        if (!storedUser) return;

        const userData = JSON.parse(storedUser);
        const patientId = userData._id || userData.id;

        if (!patientId) return;

        const response = await api.get(`/appointments/patient/${patientId}`);
        const data = response.data;

        // Sort all appointments by date descending (most recent first)
        const allAppointments = data.sort((a, b) => new Date(b.date) - new Date(a.date));

        setAppointments(allAppointments);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchAppointments();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEditProfile = () => {
    // Navigate to the edit profile page
    navigate('/patient-edit-profile');
  };

  const handlePaymentDetails = () => {
    navigate('/payment-dashboard');
  }

  // Conditional background styling based on theme
  const backgroundClass = 'bg-gradient-to-b from-gray-900 to-white';


  return (

    <div
      className={`min-h-screen relative p-4 sm:p-8 font-['Inter'] transition-colors duration-300 ${backgroundClass}`}
      style={{ backgroundAttachment: 'fixed' }}
    >
      {/* Logout Button - Top Right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${theme === 'light'
            ? 'bg-red-100 text-red-700 hover:bg-red-500'
            : 'bg-red-900/30 text-red-300 hover:bg-red-800/50'
            }`}
        >
          Logout
        </button>
      </div>
      {/* Content Container (z-index ensures it sits above the background animation) */}
      <div className="max-w-6xl mx-auto relative z-20">

        {/* --- Personalized Patient Dashboard Header (Very Top) --- */}
        <div className="mb-12">
          {/* Welcome Message and Next Appointment */}
          <div
            className={`p-6 rounded-2xl shadow-lg mb-6 transition duration-300 relative overflow-hidden
              ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-600'}`}
            style={{
              backgroundImage: `url(${bgImages[currentBgIndex]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'right center',
              backgroundRepeat: 'no-repeat'
            }}
          >

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              {/* Welcome Message */}
              <div className="mb-4 lg:mb-0">
                <h2 className={`text-2xl lg:text-3xl font-bold mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  👋 Welcome, {user.name}
                </h2>
              </div>


              {/* Quick Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => navigate('/appointment-detail')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-300 shadow-lg"
                >
                  Book Appointment
                </button>
                <button
                  onClick={() => navigate('/lab-test-booking')}
                  className={`px-6 py-3 font-semibold rounded-lg transition duration-300 shadow-lg border-2
                    ${theme === 'light'
                      ? 'bg-white hover:bg-gray-50 text-blue-600 border-blue-200'
                      : 'bg-gray-700 hover:bg-gray-600 text-blue-400 border-gray-500'}`}>
                  Book Lab Test
                </button>
                <button
                  onClick={() => navigate('/patient/orders')}
                  className={`px-6 py-3 font-semibold rounded-lg transition duration-300 shadow-lg
                    ${theme === 'light'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                >
                  My Orders
                </button>
                <button
                  onClick={handleEditProfile}
                  className={`px-6 py-3 font-semibold rounded-lg transition duration-300 shadow-lg
                    ${theme === 'light'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-purple-500 hover:bg-purple-600 text-white'}`}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Main Dashboard Cards - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Left Column - Appointments & Reports */}
            <div className={`p-6 rounded-2xl shadow-lg transition duration-300
              ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-600'}`}
              style={{
                // backgroundImage: `url(${upcomeimage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >

              {/* Appointments Section */}
              <div className="mb-6">
                <h3 className={`text-xl font-bold mb-4 flex items-center ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  📅 Appointment History
                </h3>
                <div className="space-y-3">
                  {loadingAppointments ? (
                    <div className={`p-4 rounded-lg text-center transition duration-300
                      ${theme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-gray-800 border border-gray-600'}`}>
                      <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                        Loading appointments...
                      </p>
                    </div>
                  ) : appointments.length > 0 ? (
                    appointments.slice(0, 3).map((appointment, index) => (
                      <div key={appointment._id || index} className={`p-3 rounded-lg border-l-4 transition duration-300
                        ${theme === 'light' ? 'bg-green-50 border-green-800' : 'bg-green-900/50 border-green-600'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                              {appointment.date ? new Date(appointment.date).toLocaleDateString('en-GB') : 'TBD'} at {appointment.time}
                            </p>
                            <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                              {appointment.doctorName} - {appointment.specialty}
                            </p>
                            {appointment.reason && (
                              <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Reason: {appointment.reason}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                              {appointment.status || 'Confirmed'}
                            </span>
                            <button className={`text-sm mt-1 block ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`p-4 rounded-lg text-center transition duration-300
                      ${theme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-gray-800 border border-gray-600'}`}>
                      <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                        No upcoming appointments. Book your first appointment!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reports Section */}
              <div>
                <h3 className={`text-xl font-bold mb-4 flex items-center ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  📋 Recent Reports
                </h3>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg border-l-4 transition duration-300
                    ${theme === 'light' ? 'bg-blue-50 border-blue-400' : 'bg-blue-900/50 border-blue-400'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>15 Oct</p>
                        <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>Blood Test</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Completed</span>
                        <button className={`text-sm mt-1 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>PDF</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Prescriptions & Health Summary */}
            <div className={`p-6 rounded-2xl shadow-lg transition duration-300
              ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-600'}`}
              style={{
                backgroundImage: `url(${preceptionimage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >

              {/* Prescriptions Section */}
              <div className="mb-6">
                <h3 className={`text-xl font-bold mb-4 flex items-center ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  💊 Prescriptions
                </h3>
                <div className={`p-3 rounded-lg transition duration-300
                  ${theme === 'light' ? 'bg-orange-50 border border-orange-200' : 'bg-orange-900/50 border border-orange-400'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Metformin</p>
                      <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>1 tab/day</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm ${theme === 'light' ? 'text-orange-600' : 'text-orange-400'}`}>Refill: 3 days left</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Summary */}
              <div>
                <h3 className={`text-xl font-bold mb-4 flex items-center ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  ❤️ Health Summary
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-lg text-center transition duration-300
                    ${theme === 'light' ? 'bg-red-50' : 'bg-red-900/50'}`}>
                    <p className={`text-sm ${theme === 'light' ? 'text-white' : 'text-white'}`}>BP</p>
                    <p className={`text-lg font-semibold ${theme === 'light' ? 'text-red-600' : 'text-red-400'}`}>
                      120/80
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg text-center transition duration-300
                    ${theme === 'light' ? 'bg-purple-50' : 'bg-purple-900/70'}`}>
                    <p className={`text-sm ${theme === 'light' ? 'text-white' : 'text-white'}`}>Sugar</p>
                    <p className={`text-lg font-semibold ${theme === 'light' ? 'text-purple-900' : 'text-purple-400'}`}>
                      115
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg text-center transition duration-300
                    ${theme === 'light' ? 'bg-green-50' : 'bg-green-900/60'}`}>
                    <p className={`text-sm ${theme === 'light' ? 'text-white' : 'text-white'}`}>BMI</p>
                    <p className={`text-lg font-semibold ${theme === 'light' ? 'text-green-600' : 'text-green-400'}`}>
                      22.4
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row - Bills & Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Bills & Payments */}
            <div className={`p-6 rounded-2xl shadow-lg transition duration-300
              ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-600'}`}
              style={{

                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >

              <h3 className={`text-xl font-bold mb-4 flex items-center ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}             >
                💳 Bills & Payments
              </h3>

              <div className={`p-4 rounded-lg mb-4 transition duration-300 backdrop-blur
                ${theme === 'light' ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-400'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Pending Amount</p>
                    <p className={`text-2xl font-bold text-white`}>₹2,400</p>
                  </div>
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition duration-300" onClick={handlePaymentDetails}>
                    Pay Now
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className={`p-6 rounded-2xl shadow-lg transition duration-300
              ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-600'}`}>

              <h3 className={`text-xl font-bold mb-4 flex items-center ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                🔔 Notifications
              </h3>

              <div className="space-y-3">
                <div className={`p-3 rounded-lg transition duration-300
                  ${theme === 'light' ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-blue-900/20 border-l-4 border-blue-400'}`}>
                  <p className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>New Message from Dr. Meera Singh</p>
                </div>
                <div className={`p-3 rounded-lg transition duration-300
                  ${theme === 'light' ? 'bg-green-50 border-l-4 border-green-400' : 'bg-green-900/20 border-l-4 border-green-400'}`}>
                  <p className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Your X-ray report is ready</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className={`p-6 rounded-2xl shadow-lg transition duration-300
            ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-600'}`}>

            <h3 className={`text-xl font-bold mb-4 flex items-center ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              ⚡ Quick Actions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <button className={`p-4 rounded-lg font-semibold transition duration-300
                ${theme === 'light'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                onClick={() => navigate('/health-checkup')}>
                Health Checkup
              </button>
              <button className={`p-4 rounded-lg font-semibold transition duration-300
                ${theme === 'light'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'}`}
                onClick={() => navigate('/lab-test-booking')}>
                Book Lab Test
              </button>
              <button className={`p-4 rounded-lg font-semibold transition duration-300
                ${theme === 'light'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'}`}
                onClick={() => navigate('/medicine-ordering')}>
                Order Medicines
              </button>
              <button className={`p-4 rounded-lg font-semibold transition duration-300
                ${theme === 'light'
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
                onClick={() => navigate('/medical-records')}>
                View Records
              </button>
            </div>
          </div>

          {/* Profile Card (moved to bottom) */}
          <div className={`p-6 rounded-2xl shadow-lg transition duration-300 mt-6
            ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-600'}`}>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              {/* Profile Info */}
              <div className="flex items-center space-x-4 sm:space-x-6 mb-6 sm:mb-0">
                {/* Avatar */}
                <div className="relative">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      className="w-20 h-20 rounded-full border-4 border-gray-200 shadow-lg"
                      style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg
                      ${theme === 'light' ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'}`}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center
                    ${theme === 'light' ? 'bg-green-500' : 'bg-green-400'}`}>
                    <span className="text-white text-xs">●</span>
                  </div>
                </div>

                {/* Personal Info */}
                <div>
                  <h3 className={`text-2xl font-bold mb-1 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    {user.name}
                  </h3>
                  <div className={`space-y-1 text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                    <p>Age: {user.age} | Gender: {user.gender}</p>
                    <p>Patient ID: <span className="font-semibold text-blue-600">{user.patientId}</span></p>
                  </div>
                </div>
              </div>

              {/* Health Summary */}
              <div className="flex-1 mx-0 md:mx-8 mb-6 md:mb-0">
                <h4 className={`text-lg font-semibold mb-3 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  Health Summary
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg ${theme === 'light' ? 'bg-blue-50' : 'bg-blue-900/20'}`}>
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Blood Group</p>
                    <p className={`text-lg font-semibold ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>
                      {user.bloodGroup}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${theme === 'light' ? 'bg-green-50' : 'bg-green-900/20'}`}>
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Allergies</p>
                    <p className={`text-lg font-semibold ${theme === 'light' ? 'text-green-600' : 'text-green-400'}`}>
                      {user.allergies}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${theme === 'light' ? 'bg-purple-50' : 'bg-purple-900/20'}`}>
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Blood Pressure</p>
                    <p className={`text-lg font-semibold ${theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`}>
                      {user.vitals.bloodPressure}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${theme === 'light' ? 'bg-orange-50' : 'bg-orange-900/20'}`}>
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Heart Rate</p>
                    <p className={`text-lg font-semibold ${theme === 'light' ? 'text-orange-600' : 'text-orange-400'}`}>
                      {user.vitals.heartRate}
                    </p>
                  </div>
                </div>
              </div>


            </div>
          </div>

          {/* Emergency Section */}
          <div className={`p-4 rounded-2xl h-50 relative`}>

            {/* Background Image */}
            <img
              src={emergencyImage}
              alt="Emergency"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Header Section - Gradient and Shadow Enhanced */}
        <header className={`relative text-center mb-12 p-8 sm:p-12 rounded-2xl shadow-2xl transition-all duration-500 text-white z-10 overflow-hidden`}
        >
          {/* Background Video */}
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src={mobileVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-opacity-40"></div>

          <div className="relative z-10">
            <h1 className="text-4xl sm:text-6xl font-extrabold mb-2 flex items-center justify-center space-x-3 drop-shadow-lg"
            >
              <span className="text-5xl sm:text-7xl">🩺</span>
              <span>EASYSCRIPT</span>
            </h1>
            <p className="text-left text-base sm:text-lg font-semibold ml-0 sm:ml-4">
              Book your doctor's<br />
              appointment online quickly!
            </p>
            <button
              onClick={() => navigate('/appointment-detail')}
              className="mt-6 px-10 py-4 bg-yellow-400 text-blue-800 font-extrabold rounded-full shadow-xl hover:bg-yellow-300 transition duration-300 text-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-500 focus:ring-opacity-50">
              Start Booking Now →
            </button>
          </div>
        </header>

        <AnimatedCard delay={100}>
          <div className={`text-center p-6 my-10 rounded-xl shadow-inner border-l-8 border-yellow-400 transition duration-300
            ${theme === 'light' ? 'bg-yellow-50' : 'bg-gray-900 bg-opacity-90 z-10'}`}>
            <p className={`text-2xl font-semibold ${theme === 'light' ? 'text-yellow-800' : 'text-yellow-400'}`}>
              Fast. Secure. Confirmed.
            </p>
          </div>
        </AnimatedCard>


        {/* --- Other Facilities Section --- */}
      </div>
    </div>
  );
};

export default PaitentPage;
