import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  MapPin, Star, Clock, Heart, Award, Languages, Calendar, Phone, 
  ThumbsUp, Shield, X, Sparkles, ChevronLeft, ChevronRight, MessageSquare, BookOpen, Stethoscope, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import PublicHeader from "../components/Shared/PublicHeader";
import PublicFooter from "../components/Shared/PublicFooter";
import { SlotSelectorSkeleton } from "../components/Shared/DoctorSkeletons";

// Sub-component: SlotSelector (replicated from FindDoctors for standalone page use)
const SlotSelector = ({ doctorId, onSelect }) => {
  const [availabilitySummary, setAvailabilitySummary] = useState([]);
  const [categorizedSlots, setCategorizedSlots] = useState({ morning: [], afternoon: [], evening: [] });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [activeDate, setActiveDate] = useState(null);
  const scrollContainerRef = useRef(null);

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

  if (availabilitySummary.length === 0) return <SlotSelectorSkeleton />;

  return (
    <div className="border border-slate-100 rounded-2xl p-6 bg-white shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
      <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
        <Calendar size={18} className="text-indigo-600" />
        Select Date & Time Slot
      </h3>

      {/* Date Carousel */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-2">
        <button 
          onClick={() => scroll('left')}
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
        >
          <ChevronLeft size={16} className="text-slate-400" />
        </button>
        
        <div className="flex-1 flex overflow-hidden scroll-smooth no-scrollbar" ref={scrollContainerRef}>
          <div className="flex">
            {availabilitySummary.map((item, idx) => (
              <button
                key={item.id || item._id || item.date || `date-${idx}`}
                onClick={() => setActiveDate(item.date)}
                className={`flex flex-col items-center py-2 px-4 transition-all min-w-[100px] shrink-0 rounded-xl ${
                  activeDate === item.date 
                  ? "bg-indigo-50 text-indigo-700 font-bold" 
                  : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className="text-xs font-bold">{item.day}</span>
                <span className={`text-[9px] font-bold ${item.slotsAvailable > 0 ? "text-green-600" : "text-slate-400"}`}>
                  {item.slotsAvailable > 0 ? `${item.slotsAvailable} Slots` : "None"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => scroll('right')}
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
        >
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Slots List */}
      <div className="space-y-4">
        {loadingSlots ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
          </div>
        ) : (
          <>
            {categorizedSlots.morning.length === 0 && categorizedSlots.afternoon.length === 0 && categorizedSlots.evening.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                No slots available on this date.
              </div>
            ) : (
              <>
                <SlotGroup title="Morning" slots={categorizedSlots.morning} icon={<Clock size={14} />} onSelect={(slotTime) => onSelect(activeDate, slotTime)} />
                <SlotGroup title="Afternoon" slots={categorizedSlots.afternoon} icon={<Star size={14} />} onSelect={(slotTime) => onSelect(activeDate, slotTime)} />
                <SlotGroup title="Evening" slots={categorizedSlots.evening} icon={<Heart size={14} />} onSelect={(slotTime) => onSelect(activeDate, slotTime)} />
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">
        {icon} {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot, idx) => {
          const isBooked = typeof slot === 'object' ? slot.isBooked : false;
          const isPast = typeof slot === 'object' ? slot.isPast : false;
          const slotTime = typeof slot === 'object' ? slot.time : slot;
          
          return (
            <button
              key={`${slotTime}-${idx}`}
              disabled={isBooked}
              onClick={() => !isBooked && onSelect(slotTime)}
              className={`px-4 py-1.5 border font-bold rounded-lg transition-all text-xs active:scale-95 flex items-center justify-center ${
                isPast 
                ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-40"
                : isBooked 
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60" 
                : "border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white"
              }`}
            >
              <span>{slotTime}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Loader2 = ({ className, size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-loader-2 ${className}`}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const DoctorPublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, login: authLogin } = useAuth();
  
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Review state
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    fetchDoctorData();
  }, [id]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setMobile(user.mobile || "");
    }
  }, [user]);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/doctors/public/profile/${id}`);
      setDoctor(res.data);
      if (res.data?._id) {
        fetchReviews(res.data._id);
      }
    } catch (err) {
      console.error("Error fetching public doctor details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (docId) => {
    try {
      const targetId = docId || doctor?._id || id;
      const res = await api.get(`/doctors/${targetId}/reviews`);
      setReviews(res.data || []);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setReviewError("Please agree to the Terms and Conditions to submit review.");
      return;
    }
    if (!doctor?._id) {
      setReviewError("Doctor details not fully loaded.");
      return;
    }
    setIsSubmitting(true);
    setReviewError("");

    try {
      let currentUser = user;
      
      // Auto register patient if not authenticated
      if (!isAuthenticated) {
        const normalizedMobile = mobile.replace(/\D/g, '');
        if (normalizedMobile.length !== 10) {
          setReviewError("Please enter a valid 10-digit mobile number.");
          setIsSubmitting(false);
          return;
        }

        const loginRes = await api.post('/auth/quick-login', {
          name: name.trim(),
          mobile: normalizedMobile
        });
        
        if (loginRes.data.success) {
          currentUser = loginRes.data.user;
          authLogin(loginRes.data);
        }
      }

      await api.post(`/doctors/${doctor._id}/reviews`, {
        rating,
        comment: comment.trim()
      });

      // Reset
      setComment("");
      setAgreed(false);
      fetchReviews(doctor._id);
      fetchDoctorData(); // Refresh overall likes counts
      alert("Review submitted successfully! Thank you.");
    } catch (error) {
      console.error("Submit review error:", error);
      setReviewError(error.response?.data?.message || "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl max-w-md shadow-sm">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Profile Not Found</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">The doctor profile you are searching for is unavailable or has been deactivated.</p>
          <Link to="/find-doctors" className="mt-6 inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Back to search</Link>
        </div>
      </div>
    );
  }

  const clinicName = doctor.organizationId?.name || doctor.clinicName || "Oviaan Clinic";
  const clinicImages = (doctor.organizationId?.clinicImages && doctor.organizationId.clinicImages.length > 0)
    ? doctor.organizationId.clinicImages
    : (doctor.clinicImages || []);
  const clinicAbout = doctor.organizationId?.about || doctor.bio || doctor.about || "No biography available.";
  const clinicFacilities = doctor.organizationId?.facilities || [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700">
      <PublicHeader />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-24">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
          <Link to="/find-doctors" className="hover:text-indigo-600 transition-colors">Find Doctors</Link>
          <span>/</span>
          <span className="text-slate-400">{clinicName}</span>
          <span>/</span>
          <span className="text-slate-600">{doctor.name}</span>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column: Doctor Identity & Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Card */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-[100px] -z-10" />

              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 shadow shrink-0 relative group">
                <img 
                  src={doctor.photo || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=300"} 
                  alt={doctor.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{clinicName}</h1>
                    <span className="self-center px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                      Verified Clinic
                    </span>
                  </div>
                  <p className="text-[#28328c] font-black text-sm mt-1">Consulting Doctor: {doctor.name}</p>
                  <p className="text-indigo-600 font-bold text-xs mt-0.5">{doctor.specialization}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{doctor.qualification}</p>
                  <p className="text-slate-500 font-medium text-xs mt-1">{doctor.experience || 10} Years Experience Overall</p>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-800">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Clinic Location</span>
                    <span className="flex items-center justify-center sm:justify-start gap-1 text-slate-600">
                      <MapPin size={14} className="text-slate-400" />
                      {clinicName}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Consultation Fee</span>
                    <span className="text-slate-600 font-black">₹{doctor.fee || 500}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-4 text-xs mt-2">
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded font-bold uppercase tracking-tighter shadow-sm">
                    <ThumbsUp size={12} fill="white" /> {doctor.likesPercentage || 89}%
                  </div>
                  <span className="text-slate-500 font-bold border-b border-dotted border-slate-300">
                    {doctor.totalStories || 0} Patient Stories
                  </span>
                </div>
              </div>
            </div>

            {/* Bio / About */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase tracking-wider">
                <BookOpen size={20} className="text-indigo-600" />
                About Our Clinic
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line font-medium">
                {clinicAbout}
              </p>
            </div>

            {/* Clinic Facilities */}
            {clinicFacilities.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 tracking-tight uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={20} className="text-indigo-600" />
                  Clinic Facilities & Services
                </h3>
                <div className="flex flex-wrap gap-2 pt-2">
                  {clinicFacilities.map((fac, idx) => (
                    <span key={idx} className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-sm hover:border-indigo-200 hover:text-indigo-600 transition-colors">
                      {fac}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Clinic Gallery (Only render if there are clinicImages) */}
            {clinicImages.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase tracking-wider">
                    <ImageIcon size={20} className="text-indigo-600" />
                    Clinic Gallery
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Take a look inside the treatment rooms and infrastructure.</p>
                </div>

                {/* Main Image View */}
                <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-100 bg-slate-100 group shadow-sm flex items-center justify-center">
                  <img 
                    src={clinicImages[activeImageIndex]} 
                    alt={`Clinic View ${activeImageIndex + 1}`} 
                    className="w-full h-full object-cover" 
                  />
                  {clinicImages.length > 1 && (
                    <>
                      <button 
                        onClick={() => setActiveImageIndex(prev => prev === 0 ? clinicImages.length - 1 : prev - 1)}
                        className="absolute left-4 p-2 bg-white/95 rounded-full hover:bg-white text-slate-800 transition-colors shadow active:scale-95 group-hover:translate-x-1 duration-300"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button 
                        onClick={() => setActiveImageIndex(prev => prev === clinicImages.length - 1 ? 0 : prev + 1)}
                        className="absolute right-4 p-2 bg-white/95 rounded-full hover:bg-white text-slate-800 transition-colors shadow active:scale-95 group-hover:-translate-x-1 duration-300"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails grid */}
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                  {clinicImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIndex === idx ? 'border-indigo-600 scale-95 shadow-md' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Patient Stories & Review Form */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase tracking-wider border-b border-slate-100 pb-4">
                <MessageSquare size={20} className="text-indigo-600" />
                Verified Patient Stories ({reviews.length})
              </h3>

              {/* Reviews List */}
              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm font-medium">
                    No reviews published yet. Be the first to share your experience!
                  </div>
                ) : (
                  reviews.map((rev, idx) => (
                    <div key={rev._id || idx} className="space-y-3 pb-6 border-b border-slate-100 last:border-0">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-sm uppercase">{rev.patientName || "Anonymous Patient"}</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded text-xs font-bold">
                          <ThumbsUp size={10} fill="currentColor" /> {rev.isLike ? "Likes Doctor" : "Neutral"}
                        </div>
                      </div>
                      <p className="text-slate-600 text-xs font-medium leading-relaxed italic">
                        "{rev.comment}"
                      </p>
                      <span className="text-[10px] text-slate-400 font-bold block">{new Date(rev.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Write Review Form */}
              <form onSubmit={handleSubmitReview} className="pt-8 border-t border-slate-100 space-y-6">
                <div>
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider">Share Your Consultation Story</h4>
                  <p className="text-xs text-slate-400 mt-1">Help other patients find the best guidance by describing your clinic experience.</p>
                </div>

                {reviewError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2 animate-pulse">
                    <AlertCircle size={16} />
                    {reviewError}
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-xs font-bold text-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mobile Number</label>
                      <input 
                        type="tel" 
                        required
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="10-digit number"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-xs font-bold text-slate-700"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRating(val)}
                        className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                          rating >= val ? 'bg-amber-50 border-amber-300 text-amber-500' : 'bg-white border-slate-200 text-slate-300'
                        }`}
                      >
                        <Star size={20} fill={rating >= val ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Your Feedback</label>
                  <textarea
                    required
                    rows="3"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe your consultation, wait times, treatment explanation, etc..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-xs font-medium text-slate-700 resize-none"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 font-medium">
                    I agree to the <span className="text-indigo-600 hover:underline">Terms & Conditions</span> and verify that this feedback is an honest statement of my treatment experience.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-[#28328c] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#1f2771] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={14} />}
                  Submit Story
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Slot Selector Card */}
          <div className="space-y-8">
            <SlotSelector 
              doctorId={doctor._id}
              onSelect={(date, slot) => {
                navigate(`/booking/checkout/${doctor._id}?date=${date}&slot=${slot}`);
              }}
            />

            {/* Quick Contact Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">Clinic Address</h4>
              <div className="flex items-start gap-2.5 text-xs text-slate-600 font-bold">
                <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-800 font-bold">{clinicName}</p>
                  <p className="text-slate-500 font-medium mt-1 leading-relaxed">
                    {doctor.organizationId?.address
                      ? `${doctor.organizationId.address.street || ''}${doctor.organizationId.address.street ? ', ' : ''}${doctor.organizationId.address.city || ''}${doctor.organizationId.address.city ? ', ' : ''}${doctor.organizationId.address.state || ''}${doctor.organizationId.address.state ? ' ' : ''}${doctor.organizationId.address.zipCode || ''}`.trim()
                      : (doctor.address || 'Street details not specified.')}
                  </p>
                </div>
              </div>

              {doctor.phone && (
                <>
                  <div className="h-px bg-slate-100" />
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Direct Phone</span>
                    <a href={`tel:${doctor.phone}`} className="text-lg font-black text-[#14bef0] flex items-center gap-1.5 hover:underline">
                      <Phone size={16} className="shrink-0" />
                      {doctor.phone}
                    </a>
                  </div>
                </>
              )}
            </div>

            {/* Safety badge */}
            <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 text-xs font-medium text-slate-600 leading-tight">
              <Shield className="text-blue-600 shrink-0" size={24} />
              <span>Oviaan verified clinic status. Cleanliness, sanitization, and mask-up guidelines strictly enforced.</span>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

// Replicated AlertCircle icon to keep file completely self-contained
const AlertCircle = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export default DoctorPublicProfile;
