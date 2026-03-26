import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  ChevronRight, 
  Zap,
  Activity,
  Shield,
  Heart,
  ChevronDown,
  Navigation,
  Loader,
  User,
  FileText,
  List,
  QrCode,
  Barcode,
  TableProperties,
  PenTool,
  Check,
  Plus,
  Crown,
  Sparkles,
  Store
} from 'lucide-react';

import api from '../services/api';
import PublicHeader from '../components/Shared/PublicHeader';
import PublicFooter from '../components/Shared/PublicFooter';

import TrialModal from '../Component/Shared/TrialModal';
import ChatBot from '../Component/Shared/ChatBot';

const SpecialtyCard = ({ image, name, onClick }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="flex flex-col items-center cursor-pointer group"
    onClick={onClick}
  >
    <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 mb-3 border-2 border-transparent group-hover:border-blue-400 transition-all p-2">
      <img src={image} alt={name} className="w-full h-full object-contain" />
    </div>
    <span className="text-slate-800 font-bold text-sm text-center line-clamp-2">{name}</span>
    <span className="text-blue-500 text-xs font-bold mt-1 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-wider">Consult Now</span>
  </motion.div>
);

const StakeholderCard = ({ title, description, delay = 0, content }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col h-full group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500"
  >
    <div className="mb-6">
       <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
       <p className="text-sm font-medium text-slate-500 leading-relaxed">{description}</p>
    </div>
    <div className="flex-1 bg-[#f8fafc] rounded-2xl p-4 border border-slate-100 overflow-hidden relative min-h-[300px]">
       {content}
    </div>
  </motion.div>
);


const ServiceCard = ({ image, title, description, color, link = "/login" }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-100 group transition-all"
  >
    <div className={`h-40 ${color} flex items-center justify-center p-4 overflow-hidden`}>
      <img src={image} alt={title} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
    </div>
    <div className="p-6">
      <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-4 leading-relaxed">{description}</p>
      <Link to={link} className="text-blue-600 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
        Book Now <ChevronRight size={16} />
      </Link>
    </div>
  </motion.div>
);

const PricingFeature = ({ text, isPlus = false }) => (
  <li className="flex items-start gap-2.5 group/item">
    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPlus ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400 border border-slate-200 group-hover/item:border-blue-200 group-hover/item:bg-blue-50 transition-colors'}`}>
      {isPlus ? <Plus size={10} className="font-black" /> : <Check size={12} className="stroke-[3]" />}
    </div>
    <span className={`text-sm font-medium ${isPlus ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>{text}</span>
  </li>
);

const LandingPage = () => {
  const [locationName, setLocationName] = useState("Fetching location...");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  // City autocomplete state
  const [cityInput, setCityInput] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isGpsDetected, setIsGpsDetected] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    // Show trial modal after a delay on every page refresh/load
    // Use sessionStorage to track if modal was shown in this browser session
    // Clear the flag on page load to allow showing on every refresh
    sessionStorage.removeItem('trialModalShown');
    
    const timer = setTimeout(() => {
      setShowTrialModal(true);
      sessionStorage.setItem('trialModalShown', 'true');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Geolocation and Reverse Geocoding
  const detectLocation = async () => {
    if (!('geolocation' in navigator)) {
      setLocationName('Select Location');
      setCityInput('Select Location');
      return;
    }
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
          );
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.state || 'Your Location';
          setLocationName(city);
          setCityInput(city);
          setIsGpsDetected(true);
        } catch (error) {
          console.error('Error fetching location name:', error);
          setLocationName('Select Location');
          setCityInput('');
          setIsGpsDetected(false);
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationName('Select Location');
        setCityInput('');
        setIsGpsDetected(false);
        setIsDetecting(false);
      },
      { timeout: 7000, enableHighAccuracy: false }
    );
  };

  useEffect(() => {
    detectLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await api.get(`/doctors/public/suggestions?q=${searchQuery}`);
        setSuggestions(res.data);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-container')) {
        setShowSuggestions(false);
      }
      if (!e.target.closest('.location-container')) {
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced city search via Nominatim
  useEffect(() => {
    if (cityInput.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityInput)}&countrycodes=in&addressdetails=1&limit=7&format=json`
        );
        const data = await res.json();
        // Extract unique city names
        const cities = [];
        const seen = new Set();
        data.forEach(item => {
          const city =
            item.address?.city ||
            item.address?.town ||
            item.address?.village ||
            item.address?.county ||
            item.address?.state_district;
          if (city && !seen.has(city.toLowerCase())) {
            seen.add(city.toLowerCase());
            cities.push(city);
          }
        });
        setCitySuggestions(cities.slice(0, 6));
      } catch (err) {
        console.error('City search error:', err);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [cityInput]);



  // Sync: only run once on mount – geolocation now drives cityInput directly
  // cityInput is the single source of truth for location in searches

  const handleSpecialityClick = (name) => {
    const params = new URLSearchParams();
    params.append("speciality", name);
    const loc = cityInput || locationName;
    if (loc && loc !== "Fetching location..." && loc !== "Select Location") {
      params.append("location", loc);
    }
    navigate(`/find-doctors?${params.toString()}`);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("query", searchQuery);
    const loc = cityInput || locationName;
    if (loc && loc !== "Fetching location..." && loc !== "Select Location") {
      params.append("location", loc);
    }
    navigate(`/find-doctors?${params.toString()}`);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    const params = new URLSearchParams();
    params.append("query", suggestion);
    const loc = cityInput || locationName;
    if (loc && loc !== "Fetching location..." && loc !== "Select Location") {
      params.append("location", loc);
    }
    navigate(`/find-doctors?${params.toString()}`);
  };

  const handleCitySelect = (city) => {
    setCityInput(city);
    setLocationName(city);
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };


  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      <PublicHeader />

      {/* Appointment Hero */}
      <section className="relative z-[60]">
        <div className="relative pt-60 pb-16 px-4 text-center"
          style={{ background: 'linear-gradient(180deg, #c5ceff 0%, #dce3ff 60%, #ffffff 100%)' }}>
          
          {/* Curved bottom dipping down - Moved before content for better stacking */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10">
            <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-24" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,0 C360,60 1080,60 1440,0 L1440,60 L0,60 Z" fill="white"/>
            </svg>
          </div>

          <div className="max-w-6xl mx-auto px-4 relative z-20 search-container">
            <h1 className="text-5xl font-bold text-[#1a2563] mb-12 tracking-tight text-center">Book an Appointment</h1>
            <div className="bg-white p-7 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col lg:flex-row items-stretch gap-4">

            <div className="flex-1 relative group">
              <div className="flex items-center px-5 py-4 border border-slate-400 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 transition-all bg-white">
                <Search size={22} className="text-[#00386a] mr-3 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search for Doctor or Speciality"
                  className="w-full bg-transparent text-slate-800 font-bold outline-none placeholder:text-slate-500"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-[#00386a] flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                    >
                      <Search size={14} className="text-slate-300" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* City Autocomplete */}
            <div className="flex-1 relative location-container">
              <div className="flex items-center px-5 py-4 border border-slate-400 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 transition-all bg-white">
                <MapPin size={22} className={`mr-3 shrink-0 ${isGpsDetected ? 'text-emerald-500' : 'text-[#00386a]'}`} />
                <div className="flex-1 min-w-0">
                  {/* Removed "Live Location" label as per user request */}
                  <input
                    type="text"
                    placeholder="Search city or area..."
                    className="w-full bg-transparent text-slate-800 font-bold outline-none placeholder:text-slate-400 text-sm"
                    value={cityInput}
                    onChange={(e) => {
                      setCityInput(e.target.value);
                      setShowCitySuggestions(true);
                      setIsGpsDetected(false); // user is manually overriding
                    }}
                    onFocus={() => setShowCitySuggestions(true)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                {/* Re-detect GPS button */}
                <button
                  type="button"
                  onClick={detectLocation}
                  title="Detect my location"
                  className={`ml-2 shrink-0 transition-colors ${
                    isDetecting ? 'text-blue-400 animate-pulse cursor-wait' : 'text-slate-400 hover:text-emerald-500'
                  }`}
                >
                  {isDetecting ? <Loader size={18} className="animate-spin" /> : <Navigation size={18} />}
                </button>
              </div>

              {/* City Suggestions Dropdown */}
              {showCitySuggestions && citySuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[100]">
                  {citySuggestions.map((city, idx) => (
                    <button
                      key={idx}
                      onMouseDown={() => handleCitySelect(city)}
                      className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-[#00386a] flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                    >
                      <MapPin size={14} className="text-slate-300 shrink-0" />
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={handleSearch}
              className="lg:w-auto px-10 py-4 bg-[#00386a] text-white font-bold text-lg rounded-lg hover:bg-[#002b52] transition-colors shrink-0 shadow-lg shadow-blue-900/20"
            >
              Book an Appointment
            </button>
          </div>
          
          </div>
        </div>

        {/* Faint Decorative Icons Background */}
        <div className="absolute left-0 right-0 h-40 bottom-0 opacity-5 pointer-events-none -z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] overflow-hidden flex justify-around items-center px-10">
           {/* This simulates the background icons in the screenshot */}
        </div>
      </section>

      {/* AI-Powered Section */}
      <section className="py-0 px-4 relative overflow-hidden bg-white">

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full mb-8"
          >
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Zap size={14} className="fill-current" />
            </div>
            <span className="text-sm font-bold text-slate-700 tracking-tight">AI-Powered Management Software</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-[1.2]"
          >
            AI-Powered Smart Clinic Management Software
          </motion.h2>


          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl font-normal text-slate-500 mb-10"
          >
            Trusted by Leading Healthcare Professionals.
          </motion.p>


          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link 
              to="/register-organization"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold text-lg rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 group tracking-tight"
            >
              Start 14 Days Free Trial Now!
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>

          </motion.div>
        </div>

        {/* Decorative elements to match the requested style */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-blue-400/5 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-indigo-400/5 rounded-full blur-[80px]" />
      </section>

      {/* Stakeholders Section */}
      <section className="py-16 px-4 bg-[#f8fafc]">

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">One Platform for Every Stakeholder</h2>
          </div>

          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <StakeholderCard 
              title="Organization Login"
              description="Referral doctors can view reports and receive alerts for critical values."
              delay={0.1}
              content={
                <div className="space-y-4">
                  <motion.div 
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm border border-slate-50"
                  >
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 font-bold">V</div>
                    <div>
                      <div className="text-[10px] font-black text-slate-800">Dr Vaidya Acharya</div>
                      <div className="text-[8px] text-slate-400 font-medium">@ All Medical Lab</div>
                    </div>
                  </motion.div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase">This Month Analytics</span>
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Search size={10} className="text-slate-300" />
                      </motion.div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="p-3 bg-white rounded-xl border border-slate-100 relative overflow-hidden">
                          <motion.div 
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/50 to-transparent w-1/2 skew-x-12"
                          />
                          <div className="text-[14px] font-black text-slate-900">₹12,450</div>
                          <div className="text-[8px] text-slate-400 font-bold uppercase">Total Amount</div>
                       </div>
                       <motion.div 
                         whileHover={{ scale: 1.02 }}
                         animate={{ backgroundColor: ["#2563eb", "#1d4ed8", "#2563eb"] }}
                         transition={{ duration: 3, repeat: Infinity }}
                         className="p-3 bg-blue-600 rounded-xl text-white flex flex-col justify-center items-center cursor-pointer"
                       >
                          <div className="text-[8px] font-bold">Export Excel</div>
                       </motion.div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                          <motion.div
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-[12px] font-black text-slate-900"
                          >₹7,320</motion.div>
                          <div className="text-[8px] text-slate-500 font-bold uppercase">Amount Paid</div>
                       </div>
                       <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                          <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-[12px] font-black text-slate-900"
                          >₹1,630</motion.div>
                          <div className="text-[8px] text-slate-500 font-bold uppercase">Amount Due</div>
                       </div>
                    </div>
                  </div>
                </div>
              }
            />


            <StakeholderCard 
              title="Receptionist Login"
              description="Each patient gets a personal profile with 24/7 access to their reports."
              delay={0.2}
              content={
                <div className="space-y-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-xs font-black text-slate-800">Adarsh Sharma</div>
                        <div className="text-[8px] text-slate-400 font-medium">Male | 22 yrs</div>
                      </div>
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }} 
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-green-500" 
                      />
                    </div>
                    <div className="space-y-4 relative max-h-[180px] overflow-hidden">
                      <motion.div 
                        animate={{ y: [0, -40, 0] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="space-y-4"
                      >
                        {[
                          { status: 'Booking', time: '18 Dec 2023 07:24 PM', color: 'bg-green-500' },
                          { status: 'Process Done', time: '18 Dec 2023 08:15 PM', color: 'bg-green-500' },
                          { status: 'Result Added', time: '19 Dec 2023 10:30 AM', color: 'bg-green-500' },
                          { status: 'Result Check', time: '19 Dec 2023 11:00 AM', color: 'bg-green-500' },
                          { status: 'Delivered', time: '19 Dec 2023 12:45 PM', color: 'bg-blue-500' }
                        ].map((item, i) => (
                          <div key={i} className="flex gap-3 relative">
                            <div className={`w-3.5 h-3.5 rounded-full ${item.color} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
                              <div className="w-1 h-1 bg-white rounded-full"/>
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-800">{item.status}</div>
                              <div className="text-[8px] text-slate-400 font-medium">{item.time}</div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    </div>
                  </div>
                </div>
              }
            />


            <StakeholderCard 
              title="Doctor Login"
              description="Corporate clients can track and download reports transparently."
              delay={0.3}
              content={
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm border border-slate-50">
                    <Shield size={12} className="text-slate-400" />
                    <div className="text-[10px] font-black text-slate-800">Google Employee List</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                     <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                           <tr>
                              <th className="text-[8px] font-black text-slate-400 text-left p-2 uppercase">Employee</th>
                              <th className="text-[8px] font-black text-slate-400 text-left p-2 uppercase">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {[
                             { name: 'Ajay Singh', status: 'Pending', color: 'text-blue-500 bg-blue-50', delay: 0 },
                             { name: 'Bheem Jain', status: 'Partial', color: 'text-purple-500 bg-purple-50', delay: 1 },
                             { name: 'Clea Joy', status: 'Completed', color: 'text-green-500 bg-green-50', delay: 2 },
                             { name: 'Divya Kohli', status: 'Delivered', color: 'text-teal-500 bg-teal-50', delay: 3 }
                           ].map((emp, i) => (
                             <motion.tr 
                               key={i}
                               animate={{ backgroundColor: ["#ffffff", "#f0f9ff", "#ffffff"] }}
                               transition={{ duration: 4, repeat: Infinity, delay: emp.delay }}
                             >
                               <td className="p-2 text-[9px] font-black text-slate-700">{emp.name}</td>
                               <td className="p-2">
                                 <span className={`px-2 py-0.5 rounded-full text-[7px] font-black ${emp.color}`}>{emp.status}</span>
                               </td>
                             </motion.tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  <motion.div 
                    initial={{ width: "30%" }}
                    animate={{ width: ["30%", "100%", "30%"] }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="h-1 bg-blue-500 rounded-full" 
                  />
                </div>
              }
            />


            <StakeholderCard 
              title="Patient Login"
              description="Manages doctors, B2B partners, and all your business."
              delay={0.4}
              content={
                <div className="space-y-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-[10px] font-black text-slate-800">Stats</span>
                       <div className="flex items-center gap-1">
                          <span className="text-[8px] font-bold text-slate-400">Daily</span>
                          <ChevronDown size={10} className="text-slate-300" />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                       <div className="p-2 bg-slate-50 rounded-lg">
                          <motion.div 
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-xs font-black text-slate-900"
                          >120</motion.div>
                          <div className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Registration</div>
                       </div>
                       <div className="p-2 bg-slate-50 rounded-lg">
                          <motion.div 
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="text-xs font-black text-slate-900"
                          >108</motion.div>
                          <div className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Tests</div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-2 bg-slate-50 rounded-lg border-l-2 border-blue-500">
                          <div className="text-xs font-black text-slate-900">₹7,320</div>
                          <div className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Billing</div>
                       </div>
                       <div className="p-2 bg-slate-50 rounded-lg border-l-2 border-green-500">
                          <div className="text-xs font-black text-slate-900">₹1,320</div>
                          <div className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Paid</div>
                       </div>
                    </div>
                  </div>
                  <div className="flex items-end justify-between h-12 gap-1 px-2">
                    {[30, 60, 45, 90, 65, 80, 40].map((h, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ height: 0 }}
                        animate={{ height: [`${h}%`, `${h+10}%`, `${h}%`] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                        className="flex-1 bg-blue-500 rounded-t-sm" 
                      />
                    ))}
                  </div>
                </div>
              }
            />

            <StakeholderCard 
              title="Pharmacy Login"
              description="Manage medicine orders, inventory, and track settlements."
              delay={0.5}
              content={
                <div className="space-y-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                       <Store size={12} className="text-orange-200" />
                    </div>
                    <div className="text-[10px] font-black text-slate-800 mb-3 uppercase tracking-tighter">Live Orders</div>
                    <div className="space-y-2">
                       {[
                         { id: '#OR-52', amount: '₹450', status: 'Preparing' },
                         { id: '#OR-51', amount: '₹1,200', status: 'Ready' }
                       ].map((order, i) => (
                         <div key={i} className="flex justify-between items-center p-2 bg-orange-50/50 rounded-lg border border-orange-100/50">
                           <span className="text-[9px] font-black text-slate-700">{order.id}</span>
                           <span className="text-[9px] font-black text-orange-600">{order.amount}</span>
                           <motion.span 
                             animate={{ opacity: [1, 0.6, 1] }}
                             transition={{ duration: 1.5, repeat: Infinity }}
                             className="text-[7px] font-black uppercase text-orange-500"
                           >{order.status}</motion.span>
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div className="p-3 bg-white rounded-xl border border-slate-100">
                        <div className="text-[14px] font-black text-slate-900">₹45,200</div>
                        <div className="text-[8px] text-slate-400 font-bold uppercase">Settlements</div>
                     </div>
                     <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="text-[14px] font-black text-emerald-600">32</div>
                        <div className="text-[8px] text-emerald-500 font-bold uppercase">New Presc.</div>
                     </div>
                  </div>
                  <motion.div 
                    animate={{ scaleX: [0.4, 1, 0.4] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="h-1 bg-orange-500 rounded-full origin-left" 
                  />
                </div>
              }
            />

          </div>
        </div>
      </section>

      {/* Pharmacy Partner Section */}
      <section className="py-24 px-4 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2 space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-100 rounded-full">
                <Store size={16} className="text-orange-600" />
                <span className="text-sm font-bold text-orange-700 uppercase tracking-wider">Pharmacy Partnership</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1]">
                Grow Your Pharmacy Business with <span className="text-orange-600">Clicnic</span>
              </h2>
              <div className="space-y-4">
                {[
                  "Get more orders from patients in your locality",
                  "Digital inventory management for your store",
                  "Direct integration with doctor prescriptions",
                  "Automated billing and commission tracking",
                  "Real-time analytics for your sales growth"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                      <Check size={14} className="stroke-[3]" />
                    </div>
                    <span className="text-slate-600 font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <Link 
                to="/register-pharmacy"
                className="inline-flex items-center gap-2 px-10 py-5 bg-orange-600 text-white font-black text-xl rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 group"
              >
                Register Your Pharmacy
                <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="lg:w-1/2 relative"
            >
              <div className="relative z-10 bg-[#f8fafc] rounded-[3rem] p-8 border border-slate-200 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=800" 
                  alt="Pharmacy Partner" 
                  className="rounded-[2rem] shadow-lg mb-8"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100">
                    <p className="text-3xl font-black text-slate-900">100+</p>
                    <p className="text-sm font-bold text-slate-500 uppercase">Pharmacy Partners</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100">
                    <p className="text-3xl font-black text-slate-900">25k+</p>
                    <p className="text-sm font-bold text-slate-500 uppercase">Monthly Orders</p>
                  </div>
                </div>
              </div>
              {/* Abstract decorations */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-100/50 rounded-full blur-[120px] -z-10" />
            </motion.div>
          </div>
        </div>
      </section>


      {/* Specialties */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8">

            <div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Consult top doctors online for any health concern</h2>
              <p className="text-slate-500 font-medium">Private online consultations with verified doctors in all specialties</p>
            </div>
            <button 
              onClick={() => navigate("/find-doctors")}
              className="px-6 py-2.5 border border-blue-500 text-blue-500 font-bold rounded hover:bg-blue-50 transition-all hidden sm:block"
            >
              View All Specialties
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
            <SpecialtyCard onClick={() => handleSpecialityClick("Dentist")} image="/landing/pregnancy.png" name="Period doubts or Pregnancy" />
            <SpecialtyCard onClick={() => handleSpecialityClick("Dermatologist")} image="/landing/skin.png" name="Acne, pimple or skin issues" />
            <SpecialtyCard onClick={() => handleSpecialityClick("Pediatrician")} image="/landing/child.png" name="Child not feeling well" />
            <SpecialtyCard onClick={() => handleSpecialityClick("General Physician")} image="/landing/fever.png" name="Cold, cough or fever" />
            <SpecialtyCard onClick={() => handleSpecialityClick("Psychiatrist")} image="/landing/mental_health.png" name="Depression or anxiety" />
            <SpecialtyCard onClick={() => handleSpecialityClick("Urologist")} image="/landing/surgeries.png" name="Performance issues in bed" />
          </div>
        </div>
      </section>

      {/* NEW: Customizable Lab Report Section */}
      <section className="py-24 px-4 bg-[#f8fafc] overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
              Easily Customise 100+ Medical Report Features
            </h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto text-lg">
              Empower your clinic with professional reports that reflect your brand. Fully customisable headers, patient summaries, test results, and security features.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 items-start lg:px-4">
            
            {/* Left Column - 3 Features (Spread out to match image) */}
            <div className="lg:col-span-3 flex flex-col justify-between h-[750px] py-12">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mb-4 text-slate-400 group-hover:text-blue-600 transition-colors">
                  <User size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Patients Details</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Customise the patient details according to your clinic's specific needs.
                </p>
                {/* Points to Top Info Header */}
                <div className="hidden lg:block absolute top-[60%] -right-12 w-12 h-[1px] bg-slate-200"></div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mb-4 text-slate-400 group-hover:text-blue-600 transition-colors">
                   <FileText size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Test Results</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Personalize test parameters with custom fonts and styling.
                </p>
                {/* Points to Table Middle */}
                <div className="hidden lg:block absolute top-1/2 -right-12 w-12 h-[1px] bg-slate-200"></div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mb-4 text-slate-400 group-hover:text-blue-600 transition-colors">
                  <List size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Note/Comment</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                   Add notes or comments to any report instantly.
                </p>
                {/* Points to Bottom Remarks */}
                <div className="hidden lg:block absolute top-[40%] -right-12 w-12 h-[1px] bg-slate-200"></div>
              </motion.div>
            </div>

            {/* Center - Featured Image (Anchor for height) */}
            <div className="lg:col-span-6 flex justify-center h-[750px] items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative bg-white p-2 rounded-2xl shadow-2xl border border-slate-200"
              >
                <img 
                  src="/landing/medicore_report.png" 
                  alt="Professional Lab Report Mockup" 
                  className="w-full max-w-xl h-auto rounded-xl"
                />
              </motion.div>
            </div>

            {/* Right Column - 4 Features (Spread out to match image) */}
            <div className="lg:col-span-3 flex flex-col justify-between h-[750px] py-12">
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mb-4 text-slate-400 group-hover:text-blue-600 transition-colors">
                  <QrCode size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Dynamic QR Code</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  QR-coded reports for instant soft copy download.
                </p>
                {/* Points to Top Right Barcode area */}
                <div className="hidden lg:block absolute top-[60%] -left-12 w-12 h-[1px] bg-slate-200"></div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mb-4 text-slate-400 group-hover:text-blue-600 transition-colors">
                  <Barcode size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Bar Code</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Add barcodes to reports for instant tracking.
                </p>
                {/* Points to Middle Table area */}
                <div className="hidden lg:block absolute top-1/2 -left-12 w-12 h-[1px] bg-slate-200"></div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mb-4 text-slate-400 group-hover:text-blue-600 transition-colors">
                  <TableProperties size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Interpretations</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Personalise report interpretations to match your clinical standards.
                </p>
                {/* Points to Table Right */}
                <div className="hidden lg:block absolute top-[40%] -left-12 w-12 h-[1px] bg-slate-200"></div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative group"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mb-4 text-slate-400 group-hover:text-blue-600 transition-colors">
                   <PenTool size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Signature</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Add multiple doctors digital signatures roles wise.
                </p>
                {/* Points to Bottom Right QR / Signatures */}
                <div className="hidden lg:block absolute top-[30%] -left-12 w-12 h-[1px] bg-slate-200"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Are you a Doctor? Section */}
      <section className="py-16 px-4 bg-slate-900 overflow-hidden relative">

        {/* Background decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] -ml-48 -mb-48" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Are you a Doctor?</h2>
            <p className="text-slate-400 text-lg md:text-xl mb-10 leading-relaxed font-medium max-w-2xl mx-auto">
              Join the future of healthcare. Empower your practice with our AI-driven management tools and reach thousands of patients seamlessly.
            </p>
            <Link 
              to="/register-organization" 
              className="inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-600 font-bold text-lg rounded-2xl hover:bg-slate-50 transition-all shadow-xl shadow-black/20"
            >
              Partner with Clicnic
              <ChevronRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Logo Slider / Ticker Section */}
      <section className="py-12 bg-white border-b border-slate-100 overflow-hidden">

        <div className="max-w-7xl mx-auto px-4 mb-12 text-center">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em]">Trusted by 2000+ Healthcare Providers</h3>
        </div>

        
        <div className="relative flex">
          {/* Faded edges for better premium look */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
          
          <motion.div 
            className="flex whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              duration: 30, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          >
            {[
              { name: "MediCare Labs", icon: <Activity className="text-blue-500" /> },
              { name: "City Diagnostics", icon: <Shield className="text-teal-500" /> },
              { name: "Wellness Point", icon: <Heart className="text-red-500" /> },
              { name: "SmartClinix", icon: <Zap className="text-yellow-500" /> },
              { name: "BioGenix", icon: <Activity className="text-indigo-500" /> },
              { name: "PrimeHealth", icon: <Shield className="text-blue-600" /> },
              { name: "CureHub", icon: <Heart className="text-pink-500" /> },
              { name: "Elite Labs", icon: <Zap className="text-amber-500" /> },
              { name: "MediCare Labs", icon: <Activity className="text-blue-500" /> },
              { name: "City Diagnostics", icon: <Shield className="text-teal-500" /> },
              { name: "Wellness Point", icon: <Heart className="text-red-500" /> },
              { name: "SmartClinix", icon: <Zap className="text-yellow-500" /> },
              { name: "BioGenix", icon: <Activity className="text-indigo-500" /> },
              { name: "PrimeHealth", icon: <Shield className="text-blue-600" /> },
              { name: "CureHub", icon: <Heart className="text-pink-500" /> },
              { name: "Elite Labs", icon: <Zap className="text-amber-500" /> },
            ].map((logo, idx) => (
              <div key={idx} className="flex items-center gap-3 mx-16 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-default">
                 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shadow-sm">
                   {logo.icon}
                 </div>
                 <span className="text-2xl font-black tracking-tighter text-slate-700 italic">{logo.name}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>


      {/* Pricing Plans Section */}
      <section id="pricing" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">Pricing Plans</h2>
            <p className="text-xl text-slate-500 font-medium">Choose the plan that fits your clinic's needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Starter Plan */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col"
            >
              <div className="mb-8">
                <span className="text-emerald-500 font-black text-sm uppercase tracking-widest block mb-1">Starter</span>
                <span className="text-slate-900 font-bold text-lg">15,000 Annual Appointments</span>
              </div>
              
              <div className="border-t border-dashed border-slate-200 pt-8 mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₹500</span>
                  <span className="text-slate-400 font-medium font-sm">per month + GST</span>
                </div>
              </div>

              <button onClick={() => navigate('/register-organization')} className="w-full py-3 px-6 rounded-full border-2 border-slate-100 text-slate-700 font-bold hover:bg-slate-50 transition-colors mb-8">
                 Start for Free
              </button>

              <ul className="space-y-4 flex-1">
                <PricingFeature text="Custom Billing" />
                <PricingFeature text="Custom Reporting" />
                <PricingFeature text="Financial Analysis" />
                <PricingFeature text="Business Analysis" />
                <PricingFeature text="User Management" />
                <PricingFeature text="Package Module" />
                <PricingFeature text="Referral Doctor Login" />
                <PricingFeature text="Dr. Referral Management" />
                <PricingFeature text="QR-Verified Reports" />
                <PricingFeature text="Phone Access" />
                <PricingFeature text="Ticket Support" />
                <PricingFeature text="Call Support" />
              </ul>
            </motion.div>

            {/* Growth Plan (Most Popular) */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.1 }}
               className="bg-white rounded-3xl p-8 border-2 border-blue-500 shadow-2xl shadow-blue-500/10 relative flex flex-col scale-[1.02] transform"
            >
              <div className="absolute -top-4 right-8 bg-blue-100/80 backdrop-blur-sm text-blue-600 px-4 py-1.5 rounded-full text-xs font-black shadow-lg border border-blue-200 flex items-center gap-1.5">
                <Sparkles size={12} className="fill-blue-500" /> Most Popular
              </div>

              <div className="mb-8">
                <span className="text-blue-600 font-black text-sm uppercase tracking-widest block mb-1">Growth</span>
                <span className="text-slate-900 font-bold text-lg">15,000 Annual Appointments</span>
              </div>
              
              <div className="border-t border-dashed border-blue-200 pt-8 mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₹750</span>
                  <span className="text-slate-400 font-medium font-sm">per month + GST</span>
                </div>
              </div>

              <button onClick={() => navigate('/register-organization')} className="w-full py-3 px-6 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 mb-8">
                 Start for Free
              </button>

              <ul className="space-y-4 flex-1">
                <PricingFeature text="All Starter Features" isPlus />
                <PricingFeature text="Digital Prescriptions" />
                <PricingFeature text="QR Code on Bill" />
                <PricingFeature text="Login Tracker" />
                <PricingFeature text="Free Letterhead Design" />
                <PricingFeature text="Quotation Module" />
                <PricingFeature text="Activity Tracking" />
                <PricingFeature text="Clinic Mobile App" />
                <PricingFeature text="Department Wise Signature" />
              </ul>
            </motion.div>

            {/* Leader Plan (Most Valuable) */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.2 }}
               className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col relative"
            >
               <div className="absolute -top-4 right-8 bg-orange-100/80 backdrop-blur-sm text-orange-600 px-4 py-1.5 rounded-full text-xs font-black shadow-lg border border-orange-200 flex items-center gap-1.5">
                <Crown size={12} className="fill-orange-500" /> Most Valuable
              </div>

              <div className="mb-8">
                <span className="text-orange-500 font-black text-sm uppercase tracking-widest block mb-1">Leader</span>
                <span className="text-slate-900 font-bold text-lg">20,000 Annual Appointments</span>
              </div>
              
              <div className="border-t border-dashed border-slate-200 pt-8 mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₹1000</span>
                  <span className="text-slate-400 font-medium font-sm">per month + GST</span>
                </div>
              </div>

              <button onClick={() => navigate('/register-organization')} className="w-full py-3 px-6 rounded-full border-2 border-slate-100 text-slate-700 font-bold hover:bg-slate-50 transition-colors mb-8">
                 Start for Free
              </button>

              <ul className="space-y-4 flex-1">
                <PricingFeature text="All Growth Plan Features" isPlus />
                <PricingFeature text="WhatsApp Integration" />
                <PricingFeature text="Inventory Management" />
                <PricingFeature text="Telemedicine Module" />
                <PricingFeature text="Health Records Graph" />
                <PricingFeature text="Follow-up Tracking" />
                <PricingFeature text="Patient Loyalty Module" />
                <PricingFeature text="Promotion Templates" />
                <PricingFeature text="Advanced Analytics" />
                <PricingFeature text="Bulk Operations" />
              </ul>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.3 }}
               className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col"
            >
              <div className="mb-8">
                <span className="text-slate-900 font-black text-sm uppercase tracking-widest block mb-1">Enterprise</span>
                <span className="text-slate-900 font-bold text-lg">20,000+ / Chain of Clinics</span>
              </div>
              
              <div className="border-t border-dashed border-slate-200 pt-8 mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">Custom</span>
                </div>
              </div>

              <button className="w-full py-3 px-6 rounded-full border-2 border-slate-100 text-slate-700 font-bold hover:bg-slate-50 transition-colors mb-8">
                 Contact Sales
              </button>

              <ul className="space-y-4 flex-1">
                <PricingFeature text="All Leader Plan Features" isPlus />
                <PricingFeature text="20,000+ Annual Appointments" />
                <PricingFeature text="Chain of Clinics Management" />
                <PricingFeature text="B2B Module" />
                <PricingFeature text="Corporate Module" />
                <PricingFeature text="Multi-Clinic Interfacing" />
                <PricingFeature text="Marketing Team Management" />
                <PricingFeature text="Dedicated Account Manager" />
                <PricingFeature text="Priority Support" />
                <PricingFeature text="And Many More..." />
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <PublicFooter />

      <TrialModal 
        isOpen={showTrialModal} 
        onClose={() => setShowTrialModal(false)} 
      />

      <ChatBot />
    </div>
  );
};

export default LandingPage;
