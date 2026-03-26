import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { pharmacyApi, commonApi } from '../services/api';
import {
  Search,
  MapPin,
  ShoppingCart,
  Smartphone,
  User,
  ChevronDown,
  Phone,
  Upload,
  Plus,
  Navigation,
  Star,
  Settings,
  Package,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
  Store,
  X
} from 'lucide-react';
import promoBanner from '../assets/promo_banner.png';

const OrderOnline = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [location, setLocation] = useState("Deliver to");
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [pinCode, setPinCode] = useState("");
    
    // Search & Matching States
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [matchingStep, setMatchingStep] = useState(0); // 0: nearby, 1: stock, 2: rating
    const [bestMatch, setBestMatch] = useState(null);
    const [error, setError] = useState(null);

    // Broadcast States
    const [isUploading, setIsUploading] = useState(false);
    const [broadcastStatus, setBroadcastStatus] = useState(null); // 'uploading', 'broadcasting', 'success', 'accepted'
    const [broadcastedOrderId, setBroadcastedOrderId] = useState(null);
    const [acceptedPharmacy, setAcceptedPharmacy] = useState(null);
    const [isPinValid, setIsPinValid] = useState(true);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    
    // Prescription Detail Modal States
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [detailStep, setDetailStep] = useState(1); // 1: Mobile, 2: Method, 3: Address
    const [tempDetails, setTempDetails] = useState({
        imageUrl: '',
        mobile: '',
        method: '', // 'home', 'office', 'pickup'
        address: ''
    });

    const [prescriptions, setPrescriptions] = useState([]);

    const fetchPresCount = async () => {
        const hasToken = localStorage.getItem('token') || sessionStorage.getItem('token') || 
                         localStorage.getItem('patientUser') || sessionStorage.getItem('patientUser');
        
        const guestOrderId = sessionStorage.getItem('guestOrderId');
        if (broadcastedOrderId || guestOrderId) {
            setPrescriptions([{ _id: broadcastedOrderId || guestOrderId, status: 'broadcast' }]);
        }

        if (!hasToken) return;
        try {
            const data = await pharmacyApi.getPatientPrescriptions();
            setPrescriptions(data);
        } catch (err) {}
    };

    // Debounced Search logic
    useEffect(() => {
        // Fetch prescriptions initially for the cart count
        fetchPresCount();
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 3) {
                setIsSearching(true);
                setShowResults(true);
                try {
                    const results = await pharmacyApi.searchMedicines(searchQuery);
                    setSearchResults(results);
                } catch (err) {
                    console.error("Search failed:", err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // PIN Code Location Fetch Logic
    useEffect(() => {
        if (pinCode.length === 6) {
            const fetchLocation = async () => {
                try {
                    // Try Zippopotam first
                    const response = await fetch(`https://api.zippopotam.us/IN/${pinCode}`);
                    if (response.ok) {
                        const data = await response.json();
                        const place = data.places[0];
                        setLocation(`${place['place name']}, ${place['state abbreviation']}`);
                        setIsPinValid(true);
                        setTimeout(() => setShowLocationDropdown(false), 2000);
                        return;
                    }

                    // Fallback to Indian Post PIN API (if Zippo fails)
                    const fallbackRes = await fetch(`https://api.postalpincode.in/pincode/${pinCode}`);
                    const fallbackData = await fallbackRes.json();
                    
                    if (fallbackData[0]?.Status === "Success") {
                        const place = fallbackData[0].PostOffice[0];
                        setLocation(`${place.Name}, ${place.State}`);
                        setIsPinValid(true);
                        setTimeout(() => setShowLocationDropdown(false), 2000);
                    } else {
                        // If both APIs fail but it's 6 digits, we accept it as a valid PIN format
                        setLocation(`Pincode: ${pinCode}`);
                        setIsPinValid(true); // Accept as valid format
                    }
                } catch (err) {
                    console.error("Location fetch failed:", err);
                    // On complete error (network etc), still accept 6-digit PIN but use generic label
                    setLocation(`Pincode: ${pinCode}`);
                    setIsPinValid(true);
                }
            };
            fetchLocation();
        } else if (pinCode.length > 0 && pinCode.length < 6) {
            setIsPinValid(false);
        } else {
            setIsPinValid(true);
        }
    }, [pinCode]);

    // Poll for Prescription Acceptance
    useEffect(() => {
        let interval;
        // Only poll if we have an active broadcast
        if (broadcastedOrderId && broadcastStatus === 'success') {
            interval = setInterval(async () => {
                try {
                    // Only call if user is logged in, OR we need a public endpoint for guest status
                    const hasToken = localStorage.getItem('token') || sessionStorage.getItem('token') || 
                                     localStorage.getItem('patientUser') || sessionStorage.getItem('patientUser');
                    
                    if (hasToken) {
                        const response = await pharmacyApi.getPatientPrescriptions();
                        const currentOrder = response.find(p => p._id === broadcastedOrderId);
                        if (currentOrder && currentOrder.status !== 'broadcast') {
                            setAcceptedPharmacy(currentOrder.pharmacyId?.name);
                            setBroadcastStatus('accepted');
                            clearInterval(interval);
                        }
                    } else {
                        // For guest users, we need a public status check endpoint
                        // For now, we'll keep the broadcastStatus as 'success' until refresh
                        // or we could implement a public getOrderById endpoint
                    }
                } catch (err) {
                    console.error("Polling for acceptance failed:", err);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [broadcastedOrderId, broadcastStatus]);

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setIsFetchingLocation(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
                try {
                    // Reverse geocode to get PIN code using BigDataCloud (Free, No Auth)
                    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                    const data = await response.json();
                    
                    let detectedPin = data.postcode;
                    
                    // Fallback to Nominatim if BigDataCloud doesn't provide a postcode
                    if (!detectedPin) {
                        try {
                            const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
                                headers: { 'Accept-Language': 'en' }
                            });
                            const osmData = await osmRes.json();
                            detectedPin = osmData.address?.postcode;
                        } catch (osmErr) {
                            console.warn("Nominatim fallback failed:", osmErr);
                        }
                    }
                    
                    if (detectedPin) {
                        setPinCode(detectedPin);
                        setLocation(`${data.city || data.locality || 'Unknown City'} (${detectedPin})`);
                        setIsPinValid(true);
                    } else {
                        setLocation(`${data.city || data.locality || 'Unknown Location'}`);
                        setIsPinValid(true);
                    }
                } catch (err) {
                console.error("Reverse geocoding failed:", err);
                alert("Could not detect PIN code from your location. Please enter it manually.");
            } finally {
                setIsFetchingLocation(false);
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            setIsFetchingLocation(false);
            alert("Location access denied. Please enter your PIN code manually.");
        });
    };

    const handleSelectMedicine = async (medicine) => {
        setShowResults(false);
        setSearchQuery(medicine.name);
        setIsMatching(true);
        setMatchingStep(0);
        setBestMatch(null);
        setError(null);

        // Simulated steps for "System decides automatically" effect
        try {
            // Step 1: Nearby check
            await new Promise(r => setTimeout(r, 800));
            setMatchingStep(1);
            
            // Step 2: Stock check
            await new Promise(r => setTimeout(r, 800));
            setMatchingStep(2);
            
            // Step 3: API Call for Best Match
            const response = await pharmacyApi.autoAssign({
                productId: medicine._id,
                pinCode: pinCode,
                quantity: 1
            });

            if (response.success) {
                await new Promise(r => setTimeout(r, 800));
                setBestMatch(response.pharmacy);
            }
        } catch (err) {
            setError(err.response?.data?.message || "No matching pharmacy found");
        } finally {
            // Keep matching state for a bit for the "Wow" effect
            setTimeout(() => {
                // setIsMatching(false); // We want to keep the result visible
            }, 1000);
        }
    };

    const handlePrescriptionUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Allow upload if either pinCode is set OR location is detected (not the default 'Deliver to')
        if (!pinCode && location === "Deliver to") {
            console.warn("Upload aborted: No location or PIN code.");
            alert("Please enter a PIN code or use current location first.");
            return;
        }

        setIsMatching(false); // Close smart matching if it was open
        setBroadcastStatus('uploading');
        setIsUploading(true);

        try {
            console.log("Starting prescription upload...");
            // 1. Upload Image
            const formData = new FormData();
            formData.append('image', file);
            const uploadRes = await commonApi.uploadImage(formData);
            console.log("Upload result:", uploadRes);
            const imageUrl = uploadRes.imageUrl;

            // 2. Open Details Modal instead of broadcasting immediately
            setTempDetails(prev => ({ ...prev, imageUrl }));
            setShowDetailsModal(true);
            setDetailStep(1);
            setIsUploading(false);
            setBroadcastStatus(null);
        } catch (err) {
            console.error("Upload failed in component:", err);
            alert("Failed to upload prescription. Please try again.");
            setBroadcastStatus(null);
            setIsUploading(false);
        } finally {
            // Reset input so selecting the same file triggers onChange again
            e.target.value = null;
        }
    };

    const handleFinalBroadcast = async () => {
        setBroadcastStatus('broadcasting');
        setShowDetailsModal(false);
        try {
            const response = await pharmacyApi.broadcastPrescription({
                prescriptionUrl: tempDetails.imageUrl,
                pinCode: pinCode,
                mobileNumber: tempDetails.mobile,
                deliveryMethod: tempDetails.method,
                deliveryAddress: tempDetails.address
            });

            if (response.success && response.order) {
                setBroadcastedOrderId(response.order._id);
                // Persist for session so cart count survives refresh
                sessionStorage.setItem('guestOrderId', response.order._id);
            }
            setBroadcastStatus('success');
            
            // Refresh prescription count for the cart
            fetchPresCount();
        } catch (err) {
            console.error("Broadcast failed:", err);
            alert("Failed to broadcast prescription. Please try again.");
            setBroadcastStatus(null);
        }
    };

    const categories = [
        "Medicines", "Personal Care", "Health Conditions", "Vitamins & Supplements", 
        "Diabetes Care", "Healthcare Devices", "Homeopathic Medicine", "Health Guide"
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-slate-800">
            {/* Top Header */}
            <header className="fixed top-0 left-0 right-0 bg-white z-[100] border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <img src="/logo.png" alt="Slotify Logo" className="h-20 w-auto group-hover:scale-105 transition-transform" />
                    </Link>

                    <div className="flex items-center gap-8">
                        <div 
                            onClick={() => navigate('/patient/orders')}
                            className="flex items-center gap-2 text-blue-600 font-bold text-sm cursor-pointer border-l border-slate-200 pl-8 group"
                        >
                            <div className="relative">
                                <ShoppingCart size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] flex items-center justify-center rounded-full font-black border-2 border-white">
                                    {(prescriptions.filter(p => ['broadcast', 'accepted', 'quoted'].includes(p.status)).length)}
                                </span>
                            </div>
                            <span>Orders</span>
                        </div>
                    </div>
                </div>

            </header>

            {/* Hero Section */}
            <main className="pt-16 overflow-hidden">
                <section className="bg-[#eef5fd] relative min-h-[380px] pt-4">
                    <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center relative z-10 text-center lg:text-left lg:items-start lg:pl-40 pt-10">
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight"
                        >
                            Say GoodBye to high medicine prices
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-lg md:text-xl text-slate-500 font-bold mb-10 flex items-center gap-2"
                        >
                            Compare prices and save up to <span className="text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-lg">51%</span>
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="w-full max-w-2xl bg-white p-1 rounded-full shadow-2xl flex items-center border border-slate-100 group relative"
                        >
                            <div 
                                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                                className="flex items-center gap-2 pl-4 pr-3 py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-50 rounded-l-full transition-colors shrink-0"
                            >
                                <MapPin size={18} className="text-blue-500" />
                                <span className="text-sm font-black text-slate-700">{location}</span>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                            </div>

                            {/* Location Dropdown */}
                            {showLocationDropdown && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className="absolute top-full left-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-[110] text-left overflow-hidden"
                                >
                                    <h3 className="text-lg font-black text-slate-800 mb-6">Choose your location</h3>
                                    
                                    <div className="relative mb-6">
                                        <input 
                                            type="text" 
                                            placeholder="Enter your 6 digit PIN code"
                                            className={`w-full px-5 py-3.5 bg-white border ${!isPinValid && pinCode.length > 0 ? 'border-red-500 ring-4 ring-red-50/50' : 'border-blue-200'} rounded-full text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 transition-all`}
                                            maxLength={6}
                                            value={pinCode}
                                            onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                                        />
                                        <div className={`absolute right-2 top-1.5 w-11 h-11 ${!isPinValid && pinCode.length > 0 ? 'bg-red-500' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center transition-colors shadow-md`}>
                                            {pinCode.length === 6 && isPinValid ? <CheckCircle2 size={18} /> : <MapPin size={18} />}
                                        </div>
                                        {!isPinValid && pinCode.length > 0 && (
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-3 ml-4 animate-pulse">Enter Valid pin code</p>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-slate-50">
                                        <button 
                                            onClick={handleGetCurrentLocation}
                                            disabled={isFetchingLocation}
                                            className="w-full flex items-center justify-between py-3 px-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors group disabled:opacity-50"
                                        >
                                            <span className="font-black text-sm">
                                                {isFetchingLocation ? 'Detecting...' : 'Use current location'}
                                            </span>
                                            {isFetchingLocation ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <Navigation size={18} className="group-hover:scale-110 transition-transform" />
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                            <div className="flex-1 flex items-center px-4 relative">
                                <Search size={20} className="text-slate-300 mr-3" />
                                <input 
                                    type="text" 
                                    placeholder="Search for Medicines (e.g. Paracetamol)"
                                    className="w-full bg-transparent outline-none font-bold text-slate-800 placeholder:text-slate-300"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => searchQuery.length >= 3 && setShowResults(true)}
                                />

                                {/* Search Results Dropdown */}
                                <AnimatePresence>
                                    {showResults && (searchResults.length > 0 || isSearching) && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-[110] max-h-[400px] overflow-y-auto"
                                        >
                                            {isSearching ? (
                                                <div className="p-8 text-center text-slate-400">
                                                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                                                    <p className="text-sm font-bold">Searching pharmacies...</p>
                                                </div>
                                            ) : (
                                                searchResults.map((med) => (
                                                    <div 
                                                        key={med._id}
                                                        onClick={() => handleSelectMedicine(med)}
                                                        className="px-6 py-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 group transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h4 className="font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{med.name}</h4>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{med.manufacturer || "Generic"}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-blue-600">₹{med.price}</p>
                                                                <p className="text-[10px] font-black text-emerald-500 uppercase">Available</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <button className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all shrink-0 m-1 shadow-lg shadow-blue-500/40">
                                <Search size={22} />
                            </button>
                        </motion.div>
                    </div>

                    {/* Hero Representative Image */}
                    <div className="hidden lg:block absolute bottom-0 right-40 w-[420px] h-[480px] z-0 overflow-visible">
                        <motion.img 
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            src="/doctor_hero.png" 
                            alt="Representative" 
                            className="w-full h-full object-contain object-bottom drop-shadow-2xl"
                        />
                    </div>
                </section>

                {/* Smart Matching UI */}
                <AnimatePresence>
                    {isMatching && (
                        <section className="max-w-4xl mx-auto px-4 -mt-10 mb-10 relative z-20">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-[2rem] shadow-2xl border border-blue-50 p-8 overflow-hidden relative"
                            >
                                {/* Animated Header */}
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                            <Star size={24} className="fill-current" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">AUTO-ASSIGN <span className="text-blue-600">(Smart Matching)</span></h2>
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">System is deciding the BEST pharmacy automatically</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsMatching(false)}
                                        className="text-slate-300 hover:text-slate-800 transition-colors"
                                    >
                                        <AlertCircle size={20} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* 📍 Logic 1: Nearby */}
                                    <div className={`p-6 rounded-2xl border transition-all duration-500 ${matchingStep >= 0 ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <MapPin size={20} className={matchingStep >= 0 ? 'text-blue-600' : 'text-slate-400'} />
                                            <span className="font-black text-xs uppercase tracking-widest">Nearby 📍</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-600">Location Check: {pinCode || "Global"}</p>
                                        {matchingStep > 0 && <CheckCircle2 size={16} className="text-emerald-500 mt-2" />}
                                    </div>

                                    {/* 📦 Logic 2: Stock */}
                                    <div className={`p-6 rounded-2xl border transition-all duration-500 ${matchingStep >= 1 ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <Package size={20} className={matchingStep >= 1 ? 'text-blue-600' : 'text-slate-400'} />
                                            <span className="font-black text-xs uppercase tracking-widest">Stock 📦</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-600">Availability Check</p>
                                        {matchingStep > 1 && <CheckCircle2 size={16} className="text-emerald-500 mt-2" />}
                                    </div>

                                    {/* ⭐ Logic 3: Rating/Priority */}
                                    <div className={`p-6 rounded-2xl border transition-all duration-500 ${matchingStep >= 2 ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-transparent opacity-50'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <Star size={20} className={matchingStep >= 2 ? 'text-blue-600' : 'text-slate-400'} />
                                            <span className="font-black text-xs uppercase tracking-widest">Priority ⭐</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-600">Best Match Logic</p>
                                        {matchingStep >= 2 && !bestMatch && !error && <Loader2 size={16} className="text-blue-600 animate-spin mt-2" />}
                                        {bestMatch && <CheckCircle2 size={16} className="text-emerald-500 mt-2" />}
                                    </div>
                                </div>

                                {/* Result Area */}
                                <AnimatePresence>
                                    {bestMatch && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">BEST MATCH FOUND</span>
                                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{bestMatch.name}</h3>
                                                    <p className="text-sm font-bold text-slate-500 uppercase">{bestMatch.address?.city || "Local Pharmacy"}</p>
                                                </div>
                                            </div>
                                            <button className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-200">
                                                Order Now
                                            </button>
                                        </motion.div>
                                    )}

                                    {error && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-8 p-6 bg-orange-50 border border-orange-100 rounded-3xl text-center"
                                        >
                                            <AlertCircle size={32} className="text-orange-500 mx-auto mb-3" />
                                            <p className="text-lg font-black text-slate-800">{error}</p>
                                            <p className="text-sm font-bold text-slate-500">Please try a different medicine or location.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </section>
                    )}
                </AnimatePresence>

                {/* Order Options Section */}
                <section className="py-10 px-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest px-4">Place Your Order Via</span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto text-center lg:text-left">
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="bg-[#eef5fd] p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-center gap-6 group cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-500/5"
                        >
                            <div className="w-14 h-14 bg-white text-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform text-2xl font-bold">
                                <Phone size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight">Call 09240250346</h3>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">to place order</p>
                            </div>
                        </motion.div>

                        <motion.div 
                            whileHover={{ y: -5 }}
                            onClick={() => document.getElementById('prescription-upload').click()}
                            className="bg-[#eef5fd] p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-center gap-6 group cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-500/5"
                        >
                            <input 
                                type="file" 
                                id="prescription-upload" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handlePrescriptionUpload}
                            />
                            <div className="w-14 h-14 bg-white text-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                {isUploading ? <Loader2 size={28} className="animate-spin" /> : <Upload size={28} />}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight">Upload a prescription</h3>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider font-semibold">
                                    {broadcastStatus === 'uploading' ? 'Uploading...' : 
                                     broadcastStatus === 'broadcasting' ? 'Broadcasting...' : 
                                     broadcastStatus === 'success' ? 'Broadcasted! ✅' :
                                     broadcastStatus === 'accepted' ? `Assigned to ${acceptedPharmacy} ✅` :
                                     'fast & hassle-free'}
                                </p>
                                {(broadcastStatus === 'success' || broadcastStatus === 'accepted') && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/patient/orders');
                                        }}
                                        className="text-[10px] font-black text-blue-600 uppercase mt-1.5 flex items-center gap-1 hover:underline cursor-pointer"
                                    >
                                        Track in History 
                                        <ChevronRight size={10} />
                                    </button>
                                )}
                                {broadcastStatus === 'accepted' && (
                                    <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">They will contact you soon!</p>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    <div className="mt-20 text-center">
                        <p className="text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                            Order from top brands and verified pharmacies. Fast delivery, genuine medicines, and great savings at your doorstep.
                        </p>
                    </div>
                </section>
            </main>

            {/* Simple Footer */}
            <footer className="border-t border-slate-100 py-12 px-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <Link to="/" className="flex items-center gap-2 group opacity-80 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                        <img src="/logo.png" alt="Slotify Logo" className="h-20 w-auto" />
                    </Link>
                    <div className="flex gap-8 text-sm font-bold text-slate-400">
                        <a href="#" className="hover:text-emerald-600 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-emerald-600 transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-emerald-600 transition-colors">Help Center</a>
                    </div>
                    <p className="text-sm text-slate-400 font-medium">© 2026 Slotify Health. All rights reserved.</p>
                </div>
            </footer>
            {/* Prescription Details Modal */}
            <AnimatePresence>
                {showDetailsModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDetailsModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[520px]"
                        >
                            {/* Left Side: Promotional Banner (Target Style) */}
                            <div className="hidden md:block md:w-[48%] relative bg-[#2667e0]">
                                <img 
                                    src={promoBanner} 
                                    alt="Promo" 
                                    className="w-full h-full object-contain object-bottom"
                                />
                                {/* Subtle overlay not needed if bgColor matches perfectly */}
                            </div>

                            {/* Right Side: Form (Target Style) */}
                            <div className="flex-1 p-10 md:p-14 flex flex-col justify-center relative bg-white">
                                <button 
                                    onClick={() => setShowDetailsModal(false)} 
                                    className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-600 transition-all z-10"
                                >
                                    <X size={24} />
                                </button>

                                <div className="mb-0">
                                    <div className="flex items-center gap-2 mb-10">
                                        <img src="/logo.png" alt="Slotify Logo" className="h-20 w-auto" />
                                    </div>
                                </div>

                                {detailStep === 1 && (
                                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                                        <div className="mb-6">
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Login / Sign up</h3>
                                            <p className="text-slate-400 font-bold text-sm">Please provide your details to continue</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="relative group">
                                                <input 
                                                    type="tel" 
                                                    placeholder="Enter your 10-digit mobile number"
                                                    className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold text-slate-900 text-lg placeholder:text-slate-300 shadow-sm"
                                                    value={tempDetails.mobile}
                                                    maxLength={10}
                                                    onChange={(e) => setTempDetails({...tempDetails, mobile: e.target.value.replace(/\D/g, '')})}
                                                />
                                            </div>

                                            <button 
                                                disabled={tempDetails.mobile.length < 10}
                                                onClick={() => setDetailStep(2)}
                                                className="w-full py-5 bg-[#2667e0] text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50"
                                            >
                                                Continue
                                            </button>

                                            <div className="flex items-start gap-3 px-2">
                                                <div className="mt-1">
                                                    <input type="checkbox" id="terms" className="w-4 h-4 rounded border-slate-300 text-[#2667e0] focus:ring-[#2667e0]" defaultChecked />
                                                </div>
                                                <label htmlFor="terms" className="text-xs font-bold text-slate-400 leading-normal">
                                                    By signing up, I agree to the <span className="text-[#2667e0] cursor-pointer">Terms and Conditions</span> and <span className="text-[#2667e0] cursor-pointer">Privacy Policy</span>
                                                </label>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Step 2 & 3 content (styled to match) */}
                                {detailStep === 2 && (
                                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Delivery Preference</h3>
                                            <p className="text-slate-400 font-bold text-sm mb-8">How would you like to receive your medicines?</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {[
                                                { id: 'home', label: 'Home Delivery', icon: MapPin, desc: 'Receive at your doorstep' },
                                                { id: 'office', label: 'Office Delivery', icon: Package, desc: 'Deliver to your workplace' },
                                                { id: 'pickup', label: 'Self Pickup', icon: Store, desc: 'Collect from the medical store' }
                                            ].map(item => (
                                                <div 
                                                    key={item.id}
                                                    onClick={() => {
                                                        setTempDetails({...tempDetails, method: item.id});
                                                        if (item.id === 'pickup') {
                                                            setTempDetails(prev => ({ ...prev, address: 'Self Pickup' }));
                                                            handleFinalBroadcast();
                                                        } else {
                                                            setDetailStep(3);
                                                        }
                                                    }}
                                                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 group ${tempDetails.method === item.id ? 'border-blue-600 bg-blue-50' : 'border-slate-50 hover:border-blue-100'}`}
                                                >
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${tempDetails.method === item.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-blue-500'}`}>
                                                        <item.icon size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 tracking-tight leading-none">{item.label}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{item.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => setDetailStep(1)}
                                            className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
                                        >
                                            Back to Login
                                        </button>
                                    </motion.div>
                                )}

                                {detailStep === 3 && (
                                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Address Details</h3>
                                            <p className="text-slate-400 font-bold text-sm mb-8">Complete address for {tempDetails.method.toUpperCase()} delivery</p>
                                        </div>
                                        <div className="relative">
                                            <textarea 
                                                rows="4"
                                                placeholder="Flat/House No, Street, Landmark..."
                                                className="w-full p-6 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:bg-white focus:border-blue-600 transition-all font-bold text-slate-900 resize-none text-lg shadow-sm"
                                                value={tempDetails.address}
                                                onChange={(e) => setTempDetails({...tempDetails, address: e.target.value})}
                                            />
                                        </div>
                                        <button 
                                            disabled={!tempDetails.address.trim()}
                                            onClick={handleFinalBroadcast}
                                            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50"
                                        >
                                            Broadcast Request
                                        </button>
                                        <button 
                                            onClick={() => setDetailStep(2)}
                                            className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
                                        >
                                            Back to Method
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrderOnline;
