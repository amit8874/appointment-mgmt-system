import React, { useState, useEffect } from 'react';
import {
    User, Mail, Phone, Calendar, Briefcase, MapPin,
    Clock, Award, GraduationCap, FileText, Globe,
    Droplet, Users, Image as ImageIcon, Plus, Trash2,
    Save, X, Check, ChevronRight, Upload
} from 'lucide-react';
import { centralDoctorApi, commonApi } from '../../../services/api';
import { AnimatePresence, motion } from 'framer-motion';

const SectionTitle = ({ title }) => (
    <div className="flex items-center gap-2 pb-1 mb-3 border-b border-gray-100">
        <h2 className="text-[12px] font-extrabold text-indigo-600 uppercase tracking-tight">{title}</h2>
    </div>
);

const InputField = ({ label, name, type = "text", placeholder, value, onChange, required = false, section = null, index = null }) => (
    <div className="flex flex-col">
        <label className="text-xs font-bold text-gray-500 uppercase mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e, section, index)}
            required={required}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-none text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
        />
    </div>
);

const AddDoctorForm = ({ isOpen, onClose, onSave, doctor }) => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    // Helper to format date for input[type="date"]
    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
    };

    // Initialize form data - separate function to handle both new and edit cases
    const getInitialFormData = () => ({
        name: doctor?.name || '',
        phone: doctor?.phone || '',
        email: doctor?.email || '',
        experience: doctor?.experience || '',
        department: doctor?.department || doctor?.specialization || '',
        designation: doctor?.designation || '',
        licenseNumber: doctor?.licenseNumber || '',
        languages: Array.isArray(doctor?.languages) ? doctor.languages.join(', ') : doctor?.languages || 'English',
        gender: doctor?.gender || 'Male',
        about: doctor?.about || doctor?.bio || '',
        featured: doctor?.featured || false,
        photo: doctor?.photo || doctor?.profilePhoto || '',
        addressInfo: {
            address1: doctor?.addressInfo?.address1 || doctor?.address || '',
            address2: doctor?.addressInfo?.address2 || '',
            country: doctor?.addressInfo?.country || '',
            city: doctor?.addressInfo?.city || '',
            state: doctor?.addressInfo?.state || '',
            pincode: doctor?.addressInfo?.pincode || ''
        },
        workingHours: doctor?.workingHours || {
            start: '09:00',
            end: '17:00'
        },
        appointmentInfo: {
            type: doctor?.appointmentInfo?.type || 'Accept bookings (in Advance)',
            advanceBooking: doctor?.appointmentInfo?.advanceBooking ?? true,
            duration: doctor?.appointmentInfo?.duration ?? doctor?.duration ?? 30,
            fee: doctor?.appointmentInfo?.fee ?? doctor?.fee ?? doctor?.consultationFee ?? '',
            maxBookings: doctor?.appointmentInfo?.maxBookings ?? doctor?.maxBookings ?? 10,
            displayOnBooking: doctor?.appointmentInfo?.displayOnBooking ?? doctor?.displayOnBooking ?? true
        },
        availability: doctor?.availability || {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false
        },
        qualification: doctor?.qualification || doctor?.education?.[0]?.degree || ''
    });
    
    const [formData, setFormData] = useState(getInitialFormData);
    
    // Update form data when doctor prop changes (for edit mode)
    useEffect(() => {
        if (doctor) {
            setFormData(getInitialFormData());
        }
    }, [doctor]);

    const handleInputChange = (e, section = null, index = null) => {
        const { name, value, type, checked } = e.target;

        if (section && index !== null) {
            setFormData(prev => {
                const updatedSection = [...prev[section]];
                updatedSection[index] = { ...updatedSection[index], [name]: value };
                return { ...prev, [section]: updatedSection };
            });
        } else if (section) {
            setFormData(prev => ({
                ...prev,
                [section]: { ...prev[section], [name]: type === 'checkbox' ? checked : value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };

    const addItem = (section, initialObj) => {
        setFormData(prev => ({
            ...prev,
            [section]: [...prev[section], initialObj]
        }));
    };

    const removeItem = (section, index) => {
        setFormData(prev => ({
            ...prev,
            [section]: prev[section].filter((_, i) => i !== index)
        }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('image', file);

            const result = await commonApi.uploadImage(formDataUpload);
            if (result.imageUrl) {
                setFormData(prev => ({ ...prev, photo: result.imageUrl }));
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Image upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Format data for backend - map to what backend expects
            const submittedData = {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                specialization: formData.department, // Backend expects 'specialization'
                qualification: formData.qualification,
                experience: parseInt(formData.experience) || 0,
                department: formData.department,
                designation: formData.designation,
                licenseNumber: formData.licenseNumber,
                languages: typeof formData.languages === 'string' ? formData.languages.split(',').map(l => l.trim()) : formData.languages,
                gender: formData.gender,
                about: formData.about,
                featured: formData.featured,
                photo: formData.photo,
                address: formData.addressInfo.city ? `${formData.addressInfo.city}${formData.addressInfo.state ? ', ' + formData.addressInfo.state : ''}` : formData.addressInfo.address1,
                fee: parseFloat(formData.appointmentInfo?.fee) || 0,
                consultationFee: parseFloat(formData.appointmentInfo?.fee) || 0,
                workingHours: formData.workingHours,
                availability: formData.availability
            };

            if (onSave) {
                await onSave(submittedData);
            }
            
            onClose();
        } catch (error) {
            console.error('Error saving doctor:', error);
            alert('Failed to save doctor. ' + (error.response?.data?.message || 'Check console for details.'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/40 bg-opacity-50 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-none shadow-xl w-full max-w-5xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 py-3 bg-indigo-600 text-white flex justify-between items-center">
                        <h1 className="text-base font-bold uppercase tracking-wider">{doctor ? 'Edit Doctor' : 'Add New Doctor'}</h1>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-none transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Left Column: Basics */}
                                <div className="space-y-5">
                                    <div className="flex gap-4">
                                        <div className="w-20 h-20 rounded-none bg-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group">
                                            {uploading ? <div className="animate-spin h-5 w-5 border-b-2 border-indigo-600 rounded-none" /> : 
                                             formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : 
                                             <div className="text-center"><Upload size={18} className="text-gray-400" /><div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Photo</div></div>}
                                            <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                        </div>
                                        <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2">
                                            <InputField label="Name" name="name" value={formData.name} onChange={handleInputChange} required />
                                            <InputField label="Phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
                                            <InputField label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                                            <InputField label="Experience (Y)" name="experience" type="number" value={formData.experience} onChange={handleInputChange} required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label="Department" name="department" value={formData.department} onChange={handleInputChange} required />
                                        <InputField label="Designation" name="designation" value={formData.designation} onChange={handleInputChange} required />
                                        <InputField label="License" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange} required />
                                        <InputField label="Qualification" name="qualification" value={formData.qualification} onChange={handleInputChange} required />
                                    </div>

                                    <div className="flex items-end gap-3">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Gender <span className="text-red-500">*</span></label>
                                            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-50 border border-gray-200 rounded-none">
                                                {['Male', 'Female', 'Other'].map(g => (
                                                    <label key={g} className={`flex items-center justify-center gap-1.5 py-1.5 rounded cursor-pointer transition-all ${formData.gender === g ? 'bg-white shadow-sm ring-1 ring-gray-100 text-indigo-600' : 'text-gray-500'}`}>
                                                        <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleInputChange} className="hidden" />
                                                        <span className="text-[11px] font-bold uppercase">{g}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <InputField label="Languages" name="languages" value={formData.languages} onChange={handleInputChange} />
                                        <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-none">
                                            <input type="checkbox" name="featured" id="featured" checked={formData.featured} onChange={handleInputChange} className="w-4 h-4 accent-indigo-600" />
                                            <label htmlFor="featured" className="text-xs font-bold text-indigo-900 uppercase">Featured</label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">About Doctor</label>
                                        <textarea name="about" value={formData.about} onChange={handleInputChange} placeholder="Brief bio..." className="w-full h-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-none text-sm font-medium outline-none resize-none transition-all focus:border-indigo-500"></textarea>
                                    </div>
                                </div>

                                {/* Right Column: Details */}
                                <div className="space-y-5 pl-8 border-l border-gray-100">
                                    <section className="space-y-2">
                                        <SectionTitle title="Address" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <InputField label="Street" name="address1" section="addressInfo" value={formData.addressInfo.address1} onChange={handleInputChange} />
                                            <InputField label="City" name="city" section="addressInfo" value={formData.addressInfo.city} onChange={handleInputChange} required />
                                            <InputField label="State" name="state" section="addressInfo" value={formData.addressInfo.state} onChange={handleInputChange} />
                                            <InputField label="Pin" name="pincode" section="addressInfo" value={formData.addressInfo.pincode} onChange={handleInputChange} />
                                        </div>
                                    </section>

                                    <section>
                                        <SectionTitle title="Availability" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                                    <label key={day} className={`flex h-8 items-center justify-center rounded-none border cursor-pointer transition-all ${formData.availability[day.toLowerCase()] ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200'}`}>
                                                        <input type="checkbox" name={day.toLowerCase()} checked={formData.availability[day.toLowerCase()] || false} onChange={(e) => handleInputChange(e, 'availability')} className="hidden" />
                                                        <span className="text-[10px] font-bold uppercase">{day.slice(0, 3)}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <InputField label="From" name="start" type="time" section="workingHours" value={formData.workingHours.start} onChange={handleInputChange} />
                                                <InputField label="To" name="end" type="time" section="workingHours" value={formData.workingHours.end} onChange={handleInputChange} />
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <SectionTitle title="Settings" />
                                        <div className="grid grid-cols-4 gap-3 items-end">
                                            <div className="flex flex-col">
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                                <select name="type" section="appointmentInfo" value={formData.appointmentInfo.type} onChange={handleInputChange} className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-none text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                    <option>Advance</option><option>On-site</option>
                                                </select>
                                            </div>
                                            <InputField label="Dur (m)" name="duration" type="number" section="appointmentInfo" value={formData.appointmentInfo.duration} onChange={handleInputChange} required />
                                            <InputField label="Fee" name="fee" type="number" section="appointmentInfo" value={formData.appointmentInfo.fee} onChange={handleInputChange} />
                                            <div className="flex items-center gap-2 pb-2">
                                                <input type="checkbox" name="displayOnBooking" id="show" section="appointmentInfo" checked={formData.appointmentInfo.displayOnBooking} onChange={(e) => handleInputChange(e, 'appointmentInfo')} className="w-4 h-4 accent-indigo-600" />
                                                <label htmlFor="show" className="text-xs font-bold text-indigo-900 uppercase">Visible</label>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-3 pt-3 border-t border-gray-50">
                                <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-600 font-bold rounded-none hover:bg-gray-50 transition-all text-xs uppercase tracking-wider">
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading || uploading} className="min-w-[140px] px-6 py-2 bg-indigo-600 text-white font-extrabold rounded-none shadow-md hover:bg-indigo-700 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-70">
                                    {loading ? <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-none" /> : <><Save size={16} /> {doctor ? 'Save' : 'Add Doctor'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AddDoctorForm;
