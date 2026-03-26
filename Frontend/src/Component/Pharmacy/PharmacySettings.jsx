import React, { useState, useEffect } from 'react';
import { Settings, User, MapPin, Store, Phone, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const PharmacySettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pharmacy, setPharmacy] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            zip: ''
        }
    });

    useEffect(() => {
        const fetchPharmacy = async () => {
            try {
                const { data } = await api.get('/pharmacy/profile'); // Assuming this endpoint exists based on usual patterns
                setPharmacy(data);
                setFormData({
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: {
                        street: data.address?.street || '',
                        city: data.address?.city || '',
                        state: data.address?.state || '',
                        zip: data.address?.zip || ''
                    }
                });
            } catch (err) {
                console.error("Error fetching pharmacy profile:", err);
                toast.error("Failed to load profile details");
            } finally {
                setLoading(false);
            }
        };
        fetchPharmacy();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/pharmacy/profile', formData); // Assuming this endpoint exists
            toast.success("Profile updated successfully! Refreshing broadcasts...");
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            console.error("Error updating profile:", err);
            toast.error(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={40} className="text-orange-600 animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Settings...</p>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto pb-20">
            <div className="mb-10">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pharmacy Settings</h1>
                <p className="text-slate-500 font-medium">Manage your digital store profile and location</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-8 md:p-12">
                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Store Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
                                <Store className="text-orange-600" size={20} />
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Store Information</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Pharmacy Name</label>
                                    <input 
                                        type="text"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Phone Number</label>
                                    <input 
                                        type="tel"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
                                <MapPin className="text-orange-600" size={20} />
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Location & Broadcasts</h2>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Street Address</label>
                                    <textarea 
                                        rows="2"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900 resize-none"
                                        value={formData.address.street}
                                        onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">City</label>
                                        <input 
                                            type="text"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                                            value={formData.address.city}
                                            onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">State</label>
                                        <input 
                                            type="text"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-bold text-slate-900"
                                            value={formData.address.state}
                                            onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black text-slate-600 border-b-2 border-orange-500 inline-block uppercase tracking-[0.2em] pl-1 mb-1">ZIP / PIN Code (Required for Broadcasts)</label>
                                        <input 
                                            type="text"
                                            maxLength="6"
                                            placeholder="6 Digit PIN"
                                            className="w-full px-6 py-4 bg-orange-50/30 border border-orange-100 rounded-2xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all font-black text-slate-900"
                                            value={formData.address.zip}
                                            onChange={(e) => setFormData({...formData, address: {...formData.address, zip: e.target.value.replace(/\D/g, '')}})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8">
                            <button 
                                disabled={saving}
                                type="submit"
                                className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white font-black text-lg rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 disabled:opacity-70 font-semibold"
                            >
                                {saving ? <Loader2 size={24} className="animate-spin" /> : "Save Profile Details"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div className="mt-12 p-8 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex items-start gap-4">
                <div className="p-3 bg-white text-blue-500 rounded-xl shadow-sm">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <h4 className="font-black text-blue-900 uppercase text-xs tracking-widest mb-1">Broadcast Optimization</h4>
                    <p className="text-sm text-blue-700 font-medium leading-relaxed">Ensure your PIN code is accurate to receive prescriptions from patients within your immediate delivery radius.</p>
                </div>
            </div>
        </div>
    );
};

export default PharmacySettings;
