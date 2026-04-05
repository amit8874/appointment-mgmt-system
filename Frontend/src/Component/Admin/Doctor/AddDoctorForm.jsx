import React, { useState, useEffect, useRef } from 'react';
import {
    User, Mail, Phone, Calendar, Briefcase, MapPin,
    Clock, Award, GraduationCap, FileText, Globe,
    Droplet, Users, Image as ImageIcon, Plus, Trash2,
    Save, X, Check, ChevronRight, Upload, ShieldCheck,
    Stethoscope, Building2, CreditCard, ChevronLeft, AlertCircle,
    UserCircle, Fingerprint, Search, Loader2, Map, CheckCircle2
} from 'lucide-react';
import { centralDoctorApi, commonApi, centralSpecializationApi, centralCouncilApi, centralPracticeApi } from '../../../services/api';
import { AnimatePresence, motion } from 'framer-motion';

const SectionTitle = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 pb-2 mb-4 border-b border-gray-100 dark:border-gray-700">
        <Icon size={16} className="text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">{title}</h2>
    </div>
);

const InputField = ({ label, name, type = "text", placeholder, value, onChange, required = false, section = null, index = null, icon: Icon, error }) => (
    <div className="flex flex-col group">
        <label className={`text-[10px] font-bold ${error ? 'text-red-500' : 'text-gray-400 group-focus-within:text-indigo-500'} uppercase mb-1.5 ml-0.5 tracking-tight transition-colors`}>
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {Icon && <Icon size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : 'text-gray-400 group-focus-within:text-indigo-500'} transition-colors`} />}
            <input
                type={type}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e, section, index)}
                required={required}
                className={`w-full ${Icon ? 'pl-9' : 'px-3'} py-2 bg-gray-50 dark:bg-gray-800/50 border ${error ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500/10 focus:border-indigo-500'} rounded-lg text-sm font-medium transition-all outline-none text-gray-700 dark:text-gray-200`}
            />
            {error && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />}
        </div>
        {error && <span className="text-[10px] text-red-500 font-bold mt-1 ml-1">{error}</span>}
    </div>
);

const AddDoctorForm = ({ isOpen, onClose, onSave, doctor }) => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('basic'); // basic, professional, registration, identity, location, availability
    const [errors, setErrors] = useState({});
    const [completedSteps, setCompletedSteps] = useState([]);

    const specDropdownRef = useRef(null);
    const councilDropdownRef = useRef(null);
    const practiceDropdownRef = useRef(null);

    // Dynamic Taxonomy States
    const [specializationsList, setSpecializationsList] = useState([]);
    const [showSpecDropdown, setShowSpecDropdown] = useState(false);
    const [isAddingSpec, setIsAddingSpec] = useState(false);
    const [specSearch, setSpecSearch] = useState('');

    const [councilsList, setCouncilsList] = useState([]);
    const [showCouncilDropdown, setShowCouncilDropdown] = useState(false);
    const [isAddingCouncil, setIsAddingCouncil] = useState(false);
    const [councilSearch, setCouncilSearch] = useState('');

    const [practicesList, setPracticesList] = useState([]);
    const [showPracticeDropdown, setShowPracticeDropdown] = useState(false);
    const [isAddingPractice, setIsAddingPractice] = useState(false);
    const [practiceSearch, setPracticeSearch] = useState('');
    const [showNewPracticeForm, setShowNewPracticeForm] = useState(false);

    const idTypes = [
        'Aadhar Card', 'PAN Card', 'Driving License', 'Voter Card', 'Other'
    ];

    const tabsOrder = ['basic', 'professional', 'registration', 'identity', 'location', 'availability'];
    
    // Initialize form data
    const getInitialFormData = () => ({
        name: doctor?.name || '',
        phone: doctor?.phone || '',
        email: doctor?.email || '',
        experience: doctor?.experience || '',
        specialization: doctor?.specialization || '',
        designation: doctor?.designation || '',
        registrationNumber: doctor?.registrationNumber || '',
        registrationCouncil: doctor?.registrationCouncil || '',
        registrationYear: doctor?.registrationYear || '',
        idType: doctor?.idType || idTypes[0],
        idNumber: doctor?.idNumber || '',
        idDocumentUrl: doctor?.idDocumentUrl || '',
        serviceLocation: doctor?.serviceLocation || {
            type: 'clinic',
            practiceId: null,
            practiceName: '',
            address: { street: '', city: '', state: '', pincode: '' }
        },
        gender: doctor?.gender || 'Male',
        about: doctor?.about || doctor?.bio || '',
        featured: doctor?.featured || false,
        photo: doctor?.photo || doctor?.profilePhoto || '',
        workingHours: Array.isArray(doctor?.workingHours) && doctor.workingHours.length > 0 
            ? doctor.workingHours 
            : [{ start: '09:00', end: '13:00' }],
        availability: doctor?.availability || {
            monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false
        },
        qualification: doctor?.qualification || '',
        fee: doctor?.fee || doctor?.consultationFee || ''
    });
    
    const [formData, setFormData] = useState(getInitialFormData);
    
    useEffect(() => {
        if (doctor) {
            setFormData(getInitialFormData());
            setCompletedSteps(['basic', 'professional', 'registration', 'identity', 'location']);
        }
    }, [doctor]);

    // Fetch Taxonomy Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [specsRes, councilsRes, practicesRes] = await Promise.all([
                    centralSpecializationApi.getAll(),
                    centralCouncilApi.getAll(),
                    centralPracticeApi.getAll()
                ]);
                setSpecializationsList(specsRes.data);
                setCouncilsList(councilsRes.data);
                setPracticesList(practicesRes.data);
            } catch (err) {
                console.error("Error fetching taxonomy data:", err);
            }
        };
        if (isOpen) fetchData();
    }, [isOpen]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (specDropdownRef.current && !specDropdownRef.current.contains(event.target)) setShowSpecDropdown(false);
            if (councilDropdownRef.current && !councilDropdownRef.current.contains(event.target)) setShowCouncilDropdown(false);
            if (practiceDropdownRef.current && !practiceDropdownRef.current.contains(event.target)) setShowPracticeDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e, section = null, index = null) => {
        const { name, value, type, checked } = e.target;

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        if (section === 'workingHours' && index !== null) {
            setFormData(prev => {
                const updated = [...prev.workingHours];
                updated[index] = { ...updated[index], [name]: value };
                return { ...prev, workingHours: updated };
            });
        } else if (section === 'availability') {
            setFormData(prev => ({
                ...prev,
                availability: { ...prev.availability, [name]: checked }
            }));
        } else if (section === 'serviceLocation') {
            setFormData(prev => ({
                ...prev,
                serviceLocation: {
                    ...prev.serviceLocation,
                    address: { ...prev.serviceLocation.address, [name]: value }
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };

    const handleAddSpecialization = async () => {
        if (!specSearch.trim()) return;
        setIsAddingSpec(true);
        try {
            const response = await centralSpecializationApi.create({ name: specSearch.trim() });
            setSpecializationsList(prev => [...prev, response.data]);
            setFormData(prev => ({ ...prev, specialization: response.data.name }));
            setShowSpecDropdown(false);
            setSpecSearch('');
        } catch (err) { console.error(err); } finally { setIsAddingSpec(false); }
    };

    const handleAddCouncil = async () => {
        if (!councilSearch.trim()) return;
        setIsAddingCouncil(true);
        try {
            const response = await centralCouncilApi.create({ name: councilSearch.trim() });
            setCouncilsList(prev => [...prev, response.data]);
            setFormData(prev => ({ ...prev, registrationCouncil: response.data.name }));
            setShowCouncilDropdown(false);
            setCouncilSearch('');
        } catch (err) { console.error(err); } finally { setIsAddingCouncil(false); }
    };

    const handleAddPractice = async () => {
        const { serviceLocation } = formData;
        if (!serviceLocation.practiceName || !serviceLocation.address.city) {
            alert("Clinic name and city are required.");
            return;
        }
        
        setIsAddingPractice(true);
        try {
            const response = await centralPracticeApi.create({
                name: serviceLocation.practiceName,
                ...serviceLocation.address
            });
            const newPractice = response.data;
            setPracticesList(prev => [...prev, newPractice]);
            setFormData(prev => ({
                ...prev,
                serviceLocation: {
                    ...prev.serviceLocation,
                    practiceId: newPractice._id,
                    practiceName: newPractice.name,
                    address: { ...newPractice }
                }
            }));
            setShowNewPracticeForm(false);
            setShowPracticeDropdown(false);
        } catch (err) { console.error(err); } finally { setIsAddingPractice(false); }
    };

    const validateTab = (tabId) => {
        const newErrors = {};
        if (tabId === 'basic') {
            if (!formData.name.trim()) newErrors.name = "Full Name is required";
            if (!formData.phone.trim()) newErrors.phone = "Mobile Number is required";
            if (!formData.email.trim()) newErrors.email = "Email is required";
        }
        if (tabId === 'professional') {
            if (!formData.specialization) newErrors.specialization = "Specialization is required";
            if (!formData.qualification.trim()) newErrors.qualification = "Qualification is required";
            if (!formData.experience) newErrors.experience = "Experience is required";
            if (!formData.fee) newErrors.fee = "Consultation fee is required";
        }
        if (tabId === 'registration') {
            if (!formData.registrationNumber.trim()) newErrors.registrationNumber = "Registration number is required";
            if (!formData.registrationCouncil) newErrors.registrationCouncil = "Registration council is required";
            if (!formData.registrationYear.trim()) newErrors.registrationYear = "Registration year is required";
        }
        if (tabId === 'identity') {
            if (!formData.idNumber.trim()) newErrors.idNumber = "Identity ID Number is required";
            if (!formData.idDocumentUrl.trim()) newErrors.idDocumentUrl = "Identity document upload is required";
        }
        if (tabId === 'location') {
            if (formData.serviceLocation.type === 'other' && !formData.serviceLocation.practiceName) {
                newErrors.practiceName = "Please select or add a practice location";
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateTab(activeTab)) {
            const nextIdx = tabsOrder.indexOf(activeTab) + 1;
            if (nextIdx < tabsOrder.length) {
                setCompletedSteps(prev => [...new Set([...prev, activeTab])]);
                setActiveTab(tabsOrder[nextIdx]);
            }
        }
    };

    const handleBack = () => {
        const prevIdx = tabsOrder.indexOf(activeTab) - 1;
        if (prevIdx >= 0) setActiveTab(tabsOrder[prevIdx]);
    };

    const handleTabClick = (tabId) => {
        const targetIdx = tabsOrder.indexOf(tabId);
        const currentIdx = tabsOrder.indexOf(activeTab);
        if (targetIdx <= currentIdx || (targetIdx > 0 && completedSteps.includes(tabsOrder[targetIdx - 1]))) {
            setActiveTab(tabId);
        }
    };

    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('image', file);
            const result = await commonApi.uploadImage(formDataUpload);
            if (result.imageUrl) setFormData(prev => ({ ...prev, [field]: result.imageUrl }));
        } catch (error) { console.error(error); } finally { setUploading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isAllValid = tabsOrder.every(tab => validateTab(tab));
        if (!isAllValid) {
            for (const tab of tabsOrder) { if (!validateTab(tab)) { setActiveTab(tab); break; } }
            return;
        }
        setLoading(true);
        try {
            if (onSave) await onSave(formData, doctor?.id);
            onClose();
        } catch (error) { alert('Failed to save doctor.'); } finally { setLoading(false); }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: User },
        { id: 'professional', label: 'Professional', icon: Stethoscope },
        { id: 'registration', label: 'Registration', icon: FileText },
        { id: 'identity', label: 'Identity Proof', icon: Fingerprint },
        { id: 'location', label: 'Practice Location', icon: MapPin },
        { id: 'availability', label: 'Availability', icon: Clock }
    ];

    const currentIdx = tabsOrder.indexOf(activeTab);
    const filteredSpecs = specializationsList.filter(s => s.name.toLowerCase().includes(specSearch.toLowerCase()));
    const filteredCouncils = councilsList.filter(c => c.name.toLowerCase().includes(councilSearch.toLowerCase()));
    const filteredPractices = practicesList.filter(p => p.name.toLowerCase().includes(practiceSearch.toLowerCase()));

    return (
        <AnimatePresence>
            <div className="fixed inset-0 backdrop-blur-md bg-slate-900/40 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.98 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: 20, scale: 0.98 }} 
                    className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
                >
                    <div className="px-8 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-900 dark:to-slate-900 flex justify-between items-center text-white">
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tight">{doctor ? 'Edit Doctor Profile' : 'Register New Doctor'}</h1>
                            <p className="text-indigo-100/70 text-xs font-medium mt-0.5">Section {currentIdx + 1} of 6: {tabs.find(t=>t.id===activeTab).label}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"><X size={20} /></button>
                    </div>

                    <div className="flex flex-1 min-h-0">
                        <div className="w-56 bg-slate-50 dark:bg-slate-800/30 border-r border-slate-100 dark:border-slate-800 p-4 space-y-1.5 overflow-y-auto">
                            {tabs.map((tab, idx) => {
                                const isUnlocked = idx === 0 || completedSteps.includes(tabsOrder[idx - 1]);
                                return (
                                    <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 translate-x-1' : !isUnlocked ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600'}`}>
                                        <tab.icon size={18} /> {tab.label}
                                        {completedSteps.includes(tab.id) && activeTab !== tab.id && <div className="ml-auto bg-emerald-500 text-white p-0.5 rounded-full"><Check size={10} /></div>}
                                        {activeTab === tab.id && <ChevronRight size={14} className="ml-auto" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                {activeTab === 'basic' && (
                                    <motion.div key="basic" className="space-y-6">
                                        <SectionTitle title="Identity & Contact" icon={User} />
                                        <div className="flex gap-8 items-start">
                                            <div className="relative group">
                                                <div className={`w-28 h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed ${errors.photo ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400`}>
                                                    {uploading ? <Loader2 className="animate-spin text-indigo-600" /> : formData.photo ? <img src={formData.photo} alt="Doc" className="w-full h-full object-cover" /> : <div className="text-center p-2"><ImageIcon size={24} className="text-slate-300 mx-auto mb-2" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Upload Photo</span></div>}
                                                </div>
                                                <input type="file" onChange={(e) => handleFileUpload(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                            </div>
                                            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4">
                                                <InputField label="Full Name" name="name" value={formData.name} onChange={handleInputChange} required icon={User} error={errors.name} />
                                                <InputField label="Mobile Number" name="phone" value={formData.phone} onChange={handleInputChange} required icon={Phone} error={errors.phone} />
                                                <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} required icon={Mail} error={errors.email} />
                                                <div className="flex flex-col">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-0.5">Gender *</label>
                                                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                                        {['Male', 'Female', 'Other'].map(g => (
                                                            <button key={g} type="button" onClick={() => setFormData(p=>({...p, gender: g}))} className={`py-1.5 rounded-md text-[11px] font-bold transition-all ${formData.gender === g ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{g}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'professional' && (
                                    <motion.div key="prof" className="space-y-6">
                                        <SectionTitle title="Professional Details" icon={Stethoscope} />
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                            <div className="flex flex-col relative" ref={specDropdownRef}>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-0.5">Specialization *</label>
                                                <div className="relative group">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input type="text" placeholder="Search specialization..." value={showSpecDropdown ? specSearch : (formData.specialization || '')} onChange={(e) => { setSpecSearch(e.target.value); setShowSpecDropdown(true); }} onFocus={() => { setSpecSearch(formData.specialization || ''); setShowSpecDropdown(true); }} className={`w-full pl-9 pr-3 py-2 bg-gray-50 border ${errors.specialization ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm font-medium outline-none focus:border-indigo-500`} />
                                                </div>
                                                <AnimatePresence>
                                                    {showSpecDropdown && (
                                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                                            {filteredSpecs.length > 0 ? filteredSpecs.map(spec => (
                                                                <button key={spec._id} onClick={() => { setFormData(p => ({ ...p, specialization: spec.name })); setShowSpecDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50">{spec.name}</button>
                                                            )) : <div className="p-4 text-center"><button onClick={handleAddSpecialization} className="text-xs font-bold text-indigo-600">+ Add "{specSearch}"</button></div>}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <InputField label="Qualification" name="qualification" value={formData.qualification} onChange={handleInputChange} required icon={GraduationCap} placeholder="e.g. MBBS, MD" error={errors.qualification} />
                                            <InputField label="Experience" name="experience" type="number" value={formData.experience} onChange={handleInputChange} required icon={Award} error={errors.experience} />
                                            <InputField label="Consultation Fee (₹)" name="fee" type="number" value={formData.fee} onChange={handleInputChange} required icon={CreditCard} error={errors.fee} />
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'registration' && (
                                    <motion.div key="reg" className="space-y-6">
                                        <SectionTitle title="Medical Registration" icon={Award} />
                                        <div className="grid grid-cols-1 gap-5">
                                            <InputField label="Registration Number" name="registrationNumber" value={formData.registrationNumber} onChange={handleInputChange} icon={FileText} error={errors.registrationNumber} />
                                            <div className="flex flex-col relative" ref={councilDropdownRef}>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-0.5">Registration Council *</label>
                                                <div className="relative group">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input type="text" placeholder="Search council..." value={showCouncilDropdown ? councilSearch : (formData.registrationCouncil || '')} onChange={(e)=> {setCouncilSearch(e.target.value); setShowCouncilDropdown(true);}} onFocus={()=>setShowCouncilDropdown(true)} className={`w-full pl-9 py-2 bg-gray-50 border ${errors.registrationCouncil ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm font-medium outline-none focus:border-indigo-500`} />
                                                </div>
                                                <AnimatePresence>
                                                    {showCouncilDropdown && (
                                                        <motion.div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-auto">
                                                            {filteredCouncils.length > 0 ? filteredCouncils.map(c => (
                                                                <button key={c._id} onClick={()=>{setFormData(p=>({...p, registrationCouncil: c.name})); setShowCouncilDropdown(false);}} className="w-full text-left px-4 py-2 hover:bg-slate-50">{c.name}</button>
                                                            )) : <div className="p-3 text-center"><button onClick={handleAddCouncil} className="text-xs font-bold text-indigo-600">+ Add "{councilSearch}"</button></div>}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <InputField label="Registration Year" name="registrationYear" value={formData.registrationYear} onChange={handleInputChange} icon={Calendar} error={errors.registrationYear} />
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'identity' && (
                                    <motion.div key="id" className="space-y-6">
                                        <SectionTitle title="Identity Verification" icon={Fingerprint} />
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                            <div className="flex flex-col">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-0.5">ID Type</label>
                                                <select name="idType" value={formData.idType} onChange={handleInputChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold">
                                                    {idTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <InputField label="ID Number" name="idNumber" value={formData.idNumber} onChange={handleInputChange} icon={Fingerprint} error={errors.idNumber} />
                                        </div>
                                        <div className="mt-4">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Upload ID Document</label>
                                            <div className="relative w-full h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden">
                                                {formData.idDocumentUrl ? <div className="text-indigo-600 font-bold flex items-center gap-2"><FileText /> Document Uploaded</div> : <div className="text-slate-300 text-center"><Upload className="mx-auto mb-2" /> <span className="text-[10px] font-black uppercase">Click to Upload</span></div>}
                                                <input type="file" onChange={(e)=>handleFileUpload(e, 'idDocumentUrl')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'location' && (
                                    <motion.div key="loc" className="space-y-6">
                                        <SectionTitle title="Service & Practice Location" icon={MapPin} />
                                        
                                        <div className="space-y-4">
                                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800 space-y-4">
                                                <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest">Where do you provide your service?</h4>
                                                <div className="flex gap-4">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setFormData(p => ({ ...p, serviceLocation: { ...p.serviceLocation, type: 'clinic', practiceName: '', practiceId: null } }))}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${formData.serviceLocation.type === 'clinic' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}
                                                    >
                                                        <Building2 size={16} /> <span className="text-[10px] font-black uppercase">Current Own Clinic</span>
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setFormData(p => ({ ...p, serviceLocation: { ...p.serviceLocation, type: 'other' } }))}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${formData.serviceLocation.type === 'other' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}
                                                    >
                                                        <MapPin size={16} /> <span className="text-[10px] font-black uppercase">Other Hospital / Clinic</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {(formData.serviceLocation.type === 'clinic' || (formData.serviceLocation.type === 'other' && (showNewPracticeForm || (!formData.serviceLocation.practiceId && formData.serviceLocation.practiceName)))) && (
                                                <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                                                    <div className="col-span-2 flex items-center gap-2 mb-2">
                                                        <div className="h-1 flex-1 bg-indigo-100 dark:bg-indigo-900 rounded-full" />
                                                        <span className="text-[10px] font-black text-indigo-600 uppercase">
                                                            {formData.serviceLocation.type === 'clinic' ? 'Your Clinic Address' : 'New Practice Details'}
                                                        </span>
                                                        <div className="h-1 flex-1 bg-indigo-100 dark:bg-indigo-900 rounded-full" />
                                                    </div>
                                                    
                                                    {formData.serviceLocation.type === 'clinic' && (
                                                        <div className="col-span-2">
                                                            <InputField label="Clinic Display Name (Optional)" name="practiceName" value={formData.serviceLocation.practiceName} onChange={(e) => setFormData(p => ({ ...p, serviceLocation: { ...p.serviceLocation, practiceName: e.target.value } }))} icon={Building2} placeholder="e.g. Main Branch, City Center" />
                                                        </div>
                                                    )}

                                                    <InputField label="City *" name="city" section="serviceLocation" value={formData.serviceLocation.address.city} onChange={handleInputChange} icon={MapPin} />
                                                    <InputField label="State" name="state" section="serviceLocation" value={formData.serviceLocation.address.state} onChange={handleInputChange} />
                                                    <InputField label="Full Address / Street" name="street" section="serviceLocation" value={formData.serviceLocation.address.street} onChange={handleInputChange} className="col-span-2" />
                                                    
                                                    {formData.serviceLocation.type === 'other' && !formData.serviceLocation.practiceId && (
                                                        <div className="col-span-2 pt-2">
                                                            <button type="button" onClick={handleAddPractice} disabled={isAddingPractice} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                                                                {isAddingPractice ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                                Save & Link Practice Location
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {formData.serviceLocation.type === 'other' && (
                                                <div className="space-y-5 animate-in fade-in slide-in-from-top-2">
                                                    <div className="flex flex-col relative" ref={practiceDropdownRef}>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-0.5">Search Consulting Hospital/Clinic *</label>
                                                        <div className="relative group">
                                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                            <input 
                                                                type="text" 
                                                                placeholder="e.g. Apollo Hospital, City Care Clinic..." 
                                                                value={showPracticeDropdown ? practiceSearch : (formData.serviceLocation.practiceName || '')} 
                                                                onChange={(e) => { setPracticeSearch(e.target.value); setShowPracticeDropdown(true); }}
                                                                onFocus={() => setShowPracticeDropdown(true)}
                                                                className={`w-full pl-9 py-2.5 bg-gray-50 border ${errors.practiceName ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm font-bold outline-none focus:border-indigo-500`} 
                                                            />
                                                        </div>
                                                        <AnimatePresence>
                                                            {showPracticeDropdown && (
                                                                <motion.div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-56 overflow-auto custom-scrollbar">
                                                                    {filteredPractices.length > 0 ? (
                                                                        <div className="p-1">
                                                                            {filteredPractices.map(p => (
                                                                                <button key={p._id} onClick={() => { setFormData(prev => ({ ...prev, serviceLocation: { ...prev.serviceLocation, practiceId: p._id, practiceName: p.name, address: { ...p } } })); setShowPracticeDropdown(false); setShowNewPracticeForm(false); }} className="w-full text-left px-4 py-3 hover:bg-indigo-50 rounded-xl flex items-center justify-between group">
                                                                                    <div>
                                                                                        <p className="text-sm font-bold text-slate-700">{p.name}</p>
                                                                                        <p className="text-[10px] font-medium text-slate-400 uppercase">{p.city}, {p.state}</p>
                                                                                    </div>
                                                                                    <Check size={16} className="text-emerald-500 opacity-0 group-hover:opacity-100" />
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="p-5 text-center">
                                                                            <p className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-widest">"{practiceSearch}" not found</p>
                                                                            <button type="button" onClick={() => { setFormData(p => ({ ...p, serviceLocation: { ...p.serviceLocation, practiceName: practiceSearch, address: { street: '', city: '', state: '', pincode: '' } } })); setShowNewPracticeForm(true); setShowPracticeDropdown(false); }} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">+ Add New Practice Location</button>
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>

                                                    {(showNewPracticeForm || (formData.serviceLocation.type === 'other' && !formData.serviceLocation.practiceId && formData.serviceLocation.practiceName)) && (
                                                        <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                                                            <div className="col-span-2 flex items-center gap-2 mb-2">
                                                                <div className="h-1 flex-1 bg-indigo-100 dark:bg-indigo-900 rounded-full" />
                                                                <span className="text-[10px] font-black text-indigo-600 uppercase">New Location Details</span>
                                                                <div className="h-1 flex-1 bg-indigo-100 dark:bg-indigo-900 rounded-full" />
                                                            </div>
                                                            <InputField label="Clinic/Hospital Name" name="practiceName" value={formData.serviceLocation.practiceName} onChange={(e) => setFormData(p => ({ ...p, serviceLocation: { ...p.serviceLocation, practiceName: e.target.value } }))} icon={Building2} />
                                                            <InputField label="City *" name="city" section="serviceLocation" value={formData.serviceLocation.address.city} onChange={handleInputChange} icon={MapPin} />
                                                            <InputField label="State" name="state" section="serviceLocation" value={formData.serviceLocation.address.state} onChange={handleInputChange} />
                                                            <InputField label="Full Address / Street" name="street" section="serviceLocation" value={formData.serviceLocation.address.street} onChange={handleInputChange} className="col-span-2" />
                                                            <div className="col-span-2 pt-2">
                                                                <button type="button" onClick={handleAddPractice} disabled={isAddingPractice} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                                                                    {isAddingPractice ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                                    Save & Link Practice Location
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'availability' && (
                                    <motion.div key="avail" className="space-y-6">
                                        <SectionTitle title="Availability" icon={Clock} />
                                        <div className="grid grid-cols-7 gap-2">
                                            {Object.keys(formData.availability).map(day => (
                                                <label key={day} className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all cursor-pointer ${formData.availability[day] ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                                                    <input type="checkbox" name={day} checked={formData.availability[day]} onChange={(e)=>handleInputChange(e, 'availability')} className="hidden" />
                                                    <span className="text-[10px] font-bold uppercase">{day.slice(0,3)}</span>
                                                    <div className={`mt-1 h-1 w-4 rounded-full ${formData.availability[day] ? 'bg-white' : 'bg-slate-200'}`} />
                                                </label>
                                            ))}
                                        </div>

                                        <div className="mt-8 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultation Timings</h4>
                                                <button type="button" onClick={() => setFormData(p => ({ ...p, workingHours: [...p.workingHours, { start: '09:00', end: '13:00' }] }))} className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase hover:text-indigo-700 transition-colors">
                                                    <Plus size={14} /> Add Shift
                                                </button>
                                            </div>
                                            
                                            {formData.workingHours.map((slot, index) => (
                                                <div key={index} className="flex items-center gap-4 animate-in slide-in-from-left-2" style={{ animationDelay: `${index * 50}ms` }}>
                                                    <div className="flex-1">
                                                        <InputField label={`Shift ${index + 1} Start`} name="start" type="time" section="workingHours" index={index} value={slot.start} onChange={handleInputChange} icon={Clock} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <InputField label={`Shift ${index + 1} End`} name="end" type="time" section="workingHours" index={index} value={slot.end} onChange={handleInputChange} icon={Clock} />
                                                    </div>
                                                    {formData.workingHours.length > 1 && (
                                                        <button type="button" onClick={() => setFormData(p => ({ ...p, workingHours: p.workingHours.filter((_, i) => i !== index) }))} className="mt-5 p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                        <div>{activeTab !== 'basic' && <button onClick={handleBack} className="flex items-center gap-2 px-6 py-2 text-slate-500 font-bold text-xs uppercase"><ChevronLeft size={18} /> Back</button>}</div>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="px-6 py-2 text-slate-400 font-bold text-xs uppercase">Cancel</button>
                            {activeTab !== 'availability' ? <button onClick={handleNext} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl text-xs uppercase shadow-xl shadow-indigo-600/20">Next Section <ChevronRight size={18} /></button> : <button onClick={handleSubmit} disabled={loading} className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl text-xs uppercase shadow-xl shadow-emerald-600/20 flex items-center gap-2">{loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={18} />} Finish Registration</button>}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AddDoctorForm;
