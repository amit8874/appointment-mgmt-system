import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Search, MapPin, Star, Clock, Heart, 
  Filter, ChevronDown, ChevronRight, Stethoscope, 
  Award, Languages, Calendar, Phone,
  ThumbsUp, Smartphone, CheckCircle, Shield
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../services/api";
import PublicHeader from "../components/Shared/PublicHeader";
import PublicFooter from "../components/Shared/PublicFooter";
import { ChevronLeft } from "lucide-react";

const SlotSelector = ({ doctorId, onSelect }) => {
  const [availabilitySummary, setAvailabilitySummary] = useState([]);
  const [categorizedSlots, setCategorizedSlots] = useState({ morning: [], afternoon: [], evening: [] });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [activeDate, setActiveDate] = useState(null);
  const scrollContainerRef = React.useRef(null);

  useEffect(() => {
    fetchAvailabilitySummary();
  }, [doctorId]);

  const fetchAvailabilitySummary = async () => {
    try {
      const res = await api.get(`/doctors/${doctorId}/availability-summary`);
      setAvailabilitySummary(res.data);
      if (res.data.length > 0) {
        setActiveDate(res.data[0].date);
      }
    } catch (err) {
      console.error("Error fetching availability summary:", err);
    }
  };

  useEffect(() => {
    if (activeDate) {
      fetchSlots(activeDate);
    }
  }, [activeDate]);

  const fetchSlots = async (date) => {
    try {
      setLoadingSlots(true);
      const res = await api.get(`/doctors/${doctorId}/slots`, {
        params: { date }
      });
      setCategorizedSlots(res.data.categorizedSlots || { morning: [], afternoon: [], evening: [] });
    } catch (err) {
      console.error("Error fetching slots:", err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth / 2;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (availabilitySummary.length === 0) return (
    <div className="py-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="border-t border-slate-100 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">

      {/* Date Carousel */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => scroll('left')}
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
        >
          <ChevronLeft size={20} className="text-slate-400" />
        </button>
        
        <div className="flex-1 flex overflow-hidden scroll-smooth" ref={scrollContainerRef}>
          <div className="flex">
            {availabilitySummary.map((item, idx) => (
              <button
                key={item.id || item._id || item.date || `date-${idx}`}
                onClick={() => {
                  setActiveDate(item.date);
                }}
                className={`flex flex-col items-center py-3 border-b-2 transition-all min-w-[120px] shrink-0 ${
                  activeDate === item.date 
                  ? "border-blue-500 text-blue-600 bg-blue-50/30" 
                  : "border-transparent text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className="text-sm font-bold">{item.day}</span>
                <span className={`text-[11px] font-bold ${item.slotsAvailable > 0 ? "text-green-600" : "text-slate-400"}`}>
                  {item.slotsAvailable > 0 ? `${item.slotsAvailable} Slots Available` : "No Slots Available"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => scroll('right')}
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
        >
          <ChevronRight size={20} className="text-slate-400" />
        </button>
      </div>


      {/* Slots by Period */}
      <div className="space-y-8">
        {loadingSlots ? (
          <div className="py-12 flex justify-center">
             <div className="w-8 h-8 border-4 border-[#14bef0] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {categorizedSlots.morning.length === 0 && categorizedSlots.afternoon.length === 0 && categorizedSlots.evening.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                No slots available on this date. Please try another date.
              </div>
            ) : (
              <>
                <SlotGroup title="Morning" slots={categorizedSlots.morning} icon={<Clock size={16} />} onSelect={(slotTime) => onSelect(activeDate, slotTime)} />
                <SlotGroup title="Afternoon" slots={categorizedSlots.afternoon} icon={<Star size={16} />} onSelect={(slotTime) => onSelect(activeDate, slotTime)} />
                <SlotGroup title="Evening" slots={categorizedSlots.evening} icon={<Heart size={16} />} onSelect={(slotTime) => onSelect(activeDate, slotTime)} />

              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};


const SlotGroup = ({ title, slots, icon, onSelect }) => {
  if (slots.length === 0) return null;
  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <div className="w-32 flex items-center gap-2 text-slate-500 font-bold text-sm shrink-0 uppercase tracking-wider pt-2">
        {icon} {title}
      </div>
      <div className="flex-1 flex flex-wrap gap-3">
        {slots.map((slot, idx) => {
          const isBooked = typeof slot === 'object' ? slot.isBooked : false;
          const isPast = typeof slot === 'object' ? slot.isPast : false;
          const slotTime = typeof slot === 'object' ? slot.time : slot;
          
          return (
            <button
              key={`${slotTime}-${idx}`}
              disabled={isBooked}
              onClick={() => !isBooked && onSelect(slotTime)}
              className={`px-6 py-2 border font-bold rounded-lg transition-all text-sm active:scale-95 flex flex-col items-center justify-center ${
                isPast 
                ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-40"
                : isBooked 
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60" 
                : "border-blue-400 text-blue-600 hover:bg-blue-600 hover:text-white"
              }`}
              title={isPast ? "Time slot expired" : isBooked ? "Already Booked" : "Click to select"}
            >
              <span>{slotTime}</span>
              {isPast && <span className="text-[8px] uppercase tracking-tighter">Expired</span>}
              {isBooked && !isPast && <span className="text-[8px] uppercase tracking-tighter">Locked</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};


const ContactClinic = ({ phone }) => {
  return (
    <div className="mt-1 border-t border-slate-100 pt-5 pb-2 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm font-bold text-slate-500">Phone number</span>
        <span className="text-2xl font-black text-[#14bef0] tracking-tight">{phone || "No phone number available"}</span>
      </div>
      <p className="mt-4 text-[13px] text-slate-500 leading-relaxed font-medium">
        By calling this number, you agree to the <span className="text-blue-600 hover:underline cursor-pointer">Terms & Conditions</span>. If you could not connect with the center, please write to <span className="text-blue-600 hover:underline cursor-pointer">support@practo.com</span>
      </p>
    </div>
  );
};

const FindDoctors = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  const initialQuery = queryParams.get("query") || "";
  const initialSpeciality = queryParams.get("speciality") || "";
  const initialLocation = queryParams.get("location") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery || initialSpeciality);
  const [city, setCity] = useState(initialLocation);

  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filters, setFilters] = useState({
    gender: "Any",
    stories: "Any",
    experience: "Any",
    sortBy: "Relevance"
  });

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [expandedDoctorId, setExpandedDoctorId] = useState(null);
  const [expandedContactId, setExpandedContactId] = useState(null);

  // Location Autocomplete States
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isFetchingLocations, setIsFetchingLocations] = useState(false);



  useEffect(() => {
    // Only auto-detect location when user explicitly searches (has query or has manually set location)
    const hasSearchQuery = initialQuery || initialSpeciality;
    const hasManualLocation = queryParams.get('location') && queryParams.get('location') !== '';
    
    // Auto-detect only when user has searched for something or manually entered location
    if (!initialLocation && hasSearchQuery && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
            );
            const data = await response.json();
            const detectedCity = data.address.city || data.address.town || data.address.village || data.address.state || "";
            if (detectedCity) {
              setCity(detectedCity);
              const params = new URLSearchParams(location.search);
              params.set("location", detectedCity);
              navigate(`/find-doctors?${params.toString()}`, { replace: true });
            }
          } catch (error) {
            console.error("Error fetching location:", error);
          }
        }
      );
    }
    fetchDoctors();
  }, [location.search]);

  // Handle Location Autocomplete
  useEffect(() => {
    if (!city || city.length < 3) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsFetchingLocations(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${city}&format=json&addressdetails=1&limit=5&countrycodes=in`
        );
        const data = await response.json();
        const suggestions = data.map(item => ({
          display: item.display_name,
          city: item.address.city || item.address.town || item.address.village || item.address.state || ""
        })).filter(s => s.city);
        
        setLocationSuggestions(suggestions);
        setShowLocationDropdown(true);
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
      } finally {
        setIsFetchingLocations(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [city]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeDropdown && !e.target.closest('.filter-container')) {
        setActiveDropdown(null);
      }
      if (showLocationDropdown && !e.target.closest('.location-container')) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown, showLocationDropdown]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/doctors/public/search`, {
        params: {
          query: initialQuery || "",
          speciality: initialSpeciality || "Any",
          city: initialLocation || "Any"
        }
      });

      setDoctors(res.data);
      setFilteredDoctors(res.data);
    } catch (err) {
      console.error("Error fetching doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...doctors];

    // Apply Gender Filter
    if (filters.gender !== "Any") {
      result = result.filter(d => d.gender === filters.gender);
    }

    // Apply Experience Filter
    if (filters.experience !== "Any") {
      const minExp = parseInt(filters.experience);
      result = result.filter(d => (d.experience || 0) >= minExp);
    }

    // Sort Result
    if (filters.sortBy === "Fee: Low to High") {
        result.sort((a, b) => (a.fee || 0) - (b.fee || 0));
    } else if (filters.sortBy === "Fee: High to Low") {
        result.sort((a, b) => (b.fee || 0) - (a.fee || 0));
    } else if (filters.sortBy === "Experience") {
        result.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    }

    setFilteredDoctors(result);
  }, [filters, doctors]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("query", searchQuery);
    if (city) params.append("location", city);
    navigate(`/find-doctors?${params.toString()}`);
  };


  const FilterDropdown = ({ label, options, field }) => {
    const isOpen = activeDropdown === label;
    return (
        <div className="relative">
            <button 
                onClick={() => setActiveDropdown(isOpen ? null : label)}
                className={`flex items-center gap-2 px-4 py-1.5 border rounded text-xs font-bold transition-all shadow-sm ${
                    isOpen || filters[field] !== "Any" && filters[field] !== "Relevance" 
                    ? "bg-white text-[#28328c] border-white" 
                    : "border-white/20 text-white hover:bg-white/10"
                }`}
            >
                {filters[field] !== "Any" && filters[field] !== "Relevance" ? `${label}: ${filters[field]}` : label} 
                <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => {
                                setFilters(prev => ({ ...prev, [field]: opt }));
                                setActiveDropdown(null);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors ${
                                filters[field] === opt ? "text-blue-600 bg-blue-50/50" : "text-slate-600"
                            }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#414146] overflow-x-hidden">
      <PublicHeader />
      
      {/* 1. White Search Row */}
      <div className="bg-white border-b border-slate-200 pt-32">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-0 items-center">
            <div className="flex-1 w-full flex items-center px-4 py-2 border-r border-slate-200 relative location-container">
                <MapPin size={16} className="text-slate-400 mr-2" />
                <input 
                    type="text" 
                    className="w-full bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-400"
                    placeholder="Location"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setShowLocationDropdown(true);
                    }}
                    onFocus={() => city && city.length >= 3 && setShowLocationDropdown(true)}
                />
                
                {/* Location Suggestions Dropdown */}
                {showLocationDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200 max-h-80 overflow-y-auto">
                    {/* Detect Location Option */}
                    <button
                      onClick={() => {
                        // Trigger the existing auto-detect logic
                        if ("geolocation" in navigator) {
                          navigator.geolocation.getCurrentPosition(async (position) => {
                            const { latitude, longitude } = position.coords;
                            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
                            const data = await res.json();
                            const detected = data.address.city || data.address.town || data.address.village || data.address.state || "";
                            if (detected) {
                              setCity(detected);
                              const params = new URLSearchParams(location.search);
                              params.set("location", detected);
                              navigate(`/find-doctors?${params.toString()}`);
                            }
                          });
                        }
                        setShowLocationDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 border-b border-slate-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <MapPin size={14} fill="currentColor" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-blue-600">Detect my location</span>
                        <span className="text-[10px] text-slate-400 font-medium">Using GPS</span>
                      </div>
                    </button>

                    {isFetchingLocations ? (
                      <div className="px-4 py-6 flex flex-col items-center justify-center gap-2">
                         <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Searching...</span>
                      </div>
                    ) : locationSuggestions.length > 0 ? (
                      locationSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCity(suggestion.city);
                            setShowLocationDropdown(false);
                            const params = new URLSearchParams(location.search);
                            params.set("location", suggestion.city);
                            navigate(`/find-doctors?${params.toString()}`);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex flex-col gap-0.5"
                        >
                          <span className="text-sm font-bold text-slate-700">{suggestion.city}</span>
                          <span className="text-[10px] text-slate-400 font-medium truncate">{suggestion.display}</span>
                        </button>
                      ))
                    ) : city && city.length >= 3 ? (
                      <div className="px-4 py-6 text-center">
                        <span className="text-xs font-bold text-slate-400">No matching locations found</span>
                      </div>
                    ) : null}
                  </div>
                )}
            </div>
            <div className="flex-[2] w-full flex items-center px-4 py-2">
                <Search size={16} className="text-slate-400 mr-2" />
                <input 
                    type="text" 
                    className="w-full bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-400"
                    placeholder="Search doctors, clinics, hospitals, etc."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
            </div>
            <div className="text-xs text-slate-400 italic px-4 hidden lg:block">
                Fed up of endless wait? <br/>
                <span className="text-[#7800ff] font-bold">Look for clinic with Prime</span>
            </div>
        </div>
      </div>

      {/* 2. Dark Blue Filter Bar */}
      <div className="bg-[#28328c] py-2 relative filter-container">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center gap-2">
            <FilterDropdown 
                label="Gender" 
                field="gender" 
                options={["Any", "Male", "Female"]} 
            />
            <FilterDropdown 
                label="Experience" 
                field="experience" 
                options={["Any", "5+ Years", "10+ Years", "15+ Years"]} 
            />
            <FilterDropdown 
                label="Patient Stories" 
                field="stories" 
                options={["Any", "1+ Story", "5+ Stories", "10+ Stories"]} 
            />
            
            <button className="flex items-center gap-2 px-4 py-1.5 border border-white/20 rounded text-xs font-bold text-white hover:bg-white/10 transition-all">
                All Filters <ChevronDown size={14} />
            </button>

            <div className="ml-auto flex items-center gap-3">
                <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Sort By</span>
                <FilterDropdown 
                    label="Relevance" 
                    field="sortBy" 
                    options={["Relevance", "Experience", "Fee: Low to High", "Fee: High to Low"]} 
                />
            </div>
        </div>
      </div>

      {/* 3. Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Results */}
        <div className="flex-1 min-w-0">
          <div className="mb-8 border-b border-slate-100 pb-4">
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              {loading ? "Searching..." : `${filteredDoctors.length} doctors available in ${initialLocation || "your location"}`}
              {filters.gender !== "Any" && <span className="text-[#14bef0] ml-2">({filters.gender})</span>}
            </h1>
            <div className="flex items-center text-sm text-slate-500 font-medium">
              <CheckCircle size={16} className="text-slate-400 mr-2" />
              Book appointments with minimum wait-time & verified doctor details
            </div>
          </div>

          <div className="space-y-8">
            {loading ? (
              <div className="space-y-10">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-8 animate-pulse">
                     <div className="w-40 h-40 bg-slate-100 rounded-full"></div>
                     <div className="flex-1 space-y-4 pt-4">
                        <div className="h-6 bg-slate-100 w-1/3 rounded"></div>
                        <div className="h-4 bg-slate-100 w-1/4 rounded"></div>
                        <div className="h-4 bg-slate-100 w-2/3 rounded"></div>
                     </div>
                  </div>
                ))}
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                 <h2 className="text-lg font-bold text-slate-800">No matching doctors found for selected filters</h2>
                 <p className="text-slate-400 mt-2">Try clearing some filters or searching for something else</p>
                 <button 
                  onClick={() => setFilters({ gender: "Any", stories: "Any", experience: "Any", sortBy: "Relevance" })}
                  className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                 >
                  Clear all filters
                 </button>
              </div>
            ) : (
              filteredDoctors.map((doctor) => (
                <div key={doctor._id} className="group/card animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className={`flex flex-col md:flex-row gap-4 border-b border-slate-100 last:border-0 ${
                    (expandedDoctorId === doctor._id || expandedContactId === doctor._id) ? "pb-4" : "pb-6"
                  }`}>


                  {/* Doctor Image & Badge */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-50 shadow-sm relative group">
                      <img 
                        src={doctor.photo || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200"} 
                        alt={doctor.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="flex-1">
                    <h2 className="text-[#14bef0] text-lg font-bold hover:underline cursor-pointer transition-all">
                      {doctor.name}
                    </h2>
                    <p className="text-slate-500 font-medium text-sm mt-0.5">{doctor.specialization}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{doctor.experience || 10} years experience overall</p>
                    
                    <div className="mt-2 text-sm font-bold text-slate-800">
                      <div className="flex items-center gap-1 text-xs">
                        {doctor.address || "Gomtinagar Vistar, Lucknow"} <span className="text-slate-300 font-normal">•</span> {doctor.clinicName || "Vistaar Ortho Clinic"} + 5 more
                      </div>
                      <div className="text-slate-500 font-medium mt-0.5 text-xs">₹{doctor.fee || 500} Consultation fee at clinic</div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                       <div className="flex items-center gap-1.5 px-2 py-1 bg-green-600 text-white rounded text-xs font-bold uppercase tracking-tighter">
                          <ThumbsUp size={12} fill="white" /> 89%
                       </div>
                       <div className="text-slate-600 text-sm font-bold border-b border-dotted border-slate-400 cursor-pointer hover:text-slate-900">
                          19 Patient Stories
                       </div>
                    </div>
                  </div>

                  {/* Booking Area Right */}
                  <div className="md:w-44 shrink-0 flex flex-col items-end md:items-start justify-end gap-2 text-right md:text-left">
                     <div className="flex items-center gap-2 text-green-600 text-xs font-bold mb-1">
                        <Calendar size={14} className="fill-green-600/10" />
                        Available Today
                     </div>
                     <button 
                      onClick={() => {
                        setExpandedDoctorId(expandedDoctorId === doctor._id ? null : doctor._id);
                        setExpandedContactId(null);
                      }}
                      className={`w-full py-2.5 font-bold rounded text-sm transition-all shadow-md active:scale-95 ${
                        expandedDoctorId === doctor._id 
                        ? "bg-slate-100 text-slate-600 border border-slate-200" 
                        : "bg-[#14bef0] text-white hover:bg-[#079cc7]"
                      }`}
                     >
                        {expandedDoctorId === doctor._id ? "Close Slots" : "Book Clinic Visit"}
                        <div className="text-[10px] font-normal opacity-80 -mt-0.5">No Booking Fee</div>
                     </button>
                     <button 
                      onClick={() => {
                        setExpandedContactId(expandedContactId === doctor._id ? null : doctor._id);
                        setExpandedDoctorId(null);
                      }}
                      className={`w-full py-2.5 border font-bold rounded text-sm transition-all flex items-center justify-center gap-2 ${
                        expandedContactId === doctor._id
                        ? "bg-slate-100 text-slate-600 border-slate-200"
                        : "border-[#14bef0] text-[#14bef0] hover:bg-blue-50"
                      }`}
                     >
                        <Phone size={14} />
                        {expandedContactId === doctor._id ? "Close Contact" : "Contact Clinic"}
                     </button>
                  </div>
                </div>

                {/* Expanded Slot Selector */}
                <motion.div
                  initial={false}
                  animate={{ height: expandedDoctorId === doctor._id ? "auto" : 0, opacity: expandedDoctorId === doctor._id ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <SlotSelector 
                    doctorId={doctor._id} 
                    onSelect={(date, slot) => {
                      navigate(`/booking/checkout/${doctor._id}?date=${date}&slot=${slot}`);
                    }} 
                  />

                </motion.div>

                {/* Expanded Contact Clinic */}
                <motion.div
                  initial={false}
                  animate={{ height: expandedContactId === doctor._id ? "auto" : 0, opacity: expandedContactId === doctor._id ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <ContactClinic phone={doctor.phone} />
                </motion.div>
              </div>


            ))
          )}
        </div>
      </div>

        {/* Right Side: Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
            {/* 1. Safety Section */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Safety of your data</h3>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <Shield className="text-blue-600 shrink-0" size={24} />
                    <p className="text-xs font-medium text-slate-600 leading-tight">Your data privacy is our top priority. All our clinics are COVID-19 safe.</p>
                </div>
            </div>



            {/* 4. Stats Card */}
            <div className="relative bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-[100px] -mr-8 -mt-8"></div>
                <div className="flex items-center gap-3 mb-6 relative">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Star size={16} className="text-blue-600 fill-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 text-sm">Slotify</h4>
                        <p className="text-[10px] font-bold text-slate-500">India's #1 healthcare platform</p>
                    </div>
                </div>
                <ul className="space-y-3 relative">
                    {[
                        { label: '2 lakh+ Doctors', val: '' },
                        { label: '50 lakh+ Users', val: '' },
                        { label: '30 lakh+ Appointments monthly', val: '' }
                    ].map(item => (
                        <li key={item.label} className="text-xs font-bold text-slate-600 flex items-center">
                           <div className="w-1 h-1 bg-slate-300 rounded-full mr-2"></div>
                           {item.label}
                        </li>
                    ))}
                </ul>
            </div>
        </aside>

      </div>

      <PublicFooter />
    </div>
  );
};

const VerifiedIcon = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default FindDoctors;
