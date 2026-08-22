import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, Building2, Settings, Activity, 
  CreditCard, LayoutDashboard, ChevronRight, Upload, LogOut,
  CheckCircle, AlertCircle, Info, MapPin, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserById, updateUser as updateUserData, updatePassword } from '../../api/userApi';
import organizationApi from '../../api/organizationApi';
import subscriptionApi from '../../api/subscriptionApi';
import { analyticsApi, commonApi, centralDoctorApi } from '../../services/api';

// Sub-components
              
import StatsCard from './Profile/StatsCard';
import PersonalInfoTab from './Profile/PersonalInfoTab';
import ClinicInfoTab from './Profile/ClinicInfoTab';
import BillingSubscriptionTab from './Profile/BillingSubscriptionTab';
import ActivityLogsTab from './Profile/ActivityLogsTab';
import WhatsAppCreditsTab from './Profile/WhatsAppCreditsTab';
import PrescriptionTemplateTab from './Profile/PrescriptionTemplateTab';
import DoctorPublicProfileTab from './Profile/DoctorPublicProfileTab';
import ClinicProfileTab from './Profile/ClinicProfileTab';
import MyClinicsTab from './Profile/MyClinicsTab';
import { Stethoscope, Sparkles } from 'lucide-react';

const ProfilePage = () => {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('personal');
    const [profile, setProfile] = useState({});
    const [organization, setOrganization] = useState({});
    const [subscription, setSubscription] = useState({});
    const [stats, setStats] = useState({ patients: 0, appointments: 0, revenue: 0 });
    const [activityLogs, setActivityLogs] = useState([]);
    const [activeSessions, setActiveSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '', visible: false });
    const [doctorProfile, setDoctorProfile] = useState({});

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type, visible: true });
        setTimeout(() => setNotification({ message: '', type: '', visible: false }), 4000);
    };

    const getDashboardPath = () => {
        const role = user?.role;
        if (role === 'receptionist') return '/receptionist/appointments';
        if (role === 'pharmacy') return '/pharmacy/dashboard';
        if (role === 'patient') return '/patient-dashboard';
        return '/admin-dashboard';
    };

    // Helper to get full image URL
    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('data:') || path.startsWith('http')) return path; 
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const serverUrl = baseUrl.replace(/\/api$/, '') || 'http://localhost:5000';
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${serverUrl}${cleanPath}`;
    };

    const fetchData = async () => {
        const userId = user?.id || user?._id;
        
        // Safety timeout: If everything hangs, stop loading after 3 seconds anyway
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 3000);

        if (!userId) {
            // If no user ID, we might be waiting for AuthContext
            return;
        }
        
        try {
            const orgId = user?.organizationId?._id || user?.organizationId || user?.organization?._id;
            
            // Load user data first
            let userData;
            try {
                userData = await getUserById(userId);
            } catch (err) {
                console.warn("User fetch failed, using fallback", err);
                userData = user; // Fallback to context user
            }

            // Load organization data
            let orgData = {};
            if (orgId) {
                try {
                    orgData = await organizationApi.getById(orgId);
                } catch (err) {
                    console.warn("Org fetch failed, using fallback", err);
                    orgData = user?.organization || {};
                }
            }

            if (userData) {
                const nameParts = userData.name ? userData.name.split(' ') : ['', ''];
                setProfile({
                    ...userData,
                    firstName: nameParts[0],
                    lastName: nameParts.slice(1).join(' '),
                    phone: userData.mobile || userData.phone,
                });
            }

            if (orgData) setOrganization(orgData);
            
            if (user?.role === 'doctor') {
                try {
                    const docProfile = await centralDoctorApi.getProfileMe();
                    setDoctorProfile(docProfile || {});
                } catch (err) {
                    console.warn("Failed to fetch doctor profile:", err);
                }
            }

            // Clear timer and stop loading
            clearTimeout(safetyTimer);
            setLoading(false);

            // Fetch secondary data in background (non-blocking)
            if (user?.role !== 'doctor') {
                fetchBackgroundData(orgId);
            }
            
        } catch (error) {
            console.error('Profile fetch error:', error);
            clearTimeout(safetyTimer);
            setLoading(false);
        }
    };

    const fetchBackgroundData = async (orgId) => {
        try {
            const [subData, statsData, logsData, sessionsData] = await Promise.all([
                subscriptionApi.getMySubscription().catch(() => null),
                analyticsApi.getDashboard().catch(() => null),
                analyticsApi.getActivityLogs().catch(() => ({ logs: [] })),
                organizationApi.getMySessions().catch(() => [])
            ]);

            if (subData) setSubscription(subData);
            if (logsData) setActivityLogs(logsData.logs || []);
            if (sessionsData) setActiveSessions(sessionsData);
            if (statsData) {
                setStats({
                    patients: statsData.overview?.totalPatients || 0,
                    appointments: statsData.overview?.appointmentsThisMonth || 0,
                    revenue: statsData.overview?.revenueThisMonth || 0
                });
            }
        } catch (error) {
            console.warn('Background data fetch partially failed', error);
        }
    };

    useEffect(() => {
        fetchData();
        
        // Handle tab from URL
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [user?.id, user?._id, location.search]);

    const handleUpdateProfile = async (formData) => {
        setActionLoading(true);
        try {
            const updateData = {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                mobile: formData.phone,
                street: formData.street,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                postalCode: formData.postalCode,
            };
            await updateUserData(user.id, updateData);
            setProfile(prev => ({ ...prev, ...formData }));
            showNotification('Personal information updated successfully');
        } catch (error) {
            showNotification('Failed to update profile', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateDoctorProfile = async (formData) => {
        setActionLoading(true);
        try {
            const updated = await centralDoctorApi.updateProfileMe(formData);
            setDoctorProfile(updated || {});
            showNotification('Public profile updated successfully');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to update public profile', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateOrganization = async (orgData) => {
        setActionLoading(true);
        try {
            const orgId = organization._id;
            await organizationApi.update(orgId, orgData);
            setOrganization(prev => ({ ...prev, ...orgData }));
            
            // Sync with global AuthContext so other pages see the update immediately
            if (user) {
                updateUser({
                    organization: { ...user.organization, ...orgData },
                    // Support both nested and flat structures
                    organizationId: typeof user.organizationId === 'object' 
                        ? { ...user.organizationId, ...orgData }
                        : user.organizationId
                });
            }
            
            showNotification('Clinic information updated successfully');
        } catch (error) {
            showNotification('Failed to update clinic info', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdatePassword = async (passwordData) => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        setActionLoading(true);
        try {
            await updatePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            showNotification('Password updated successfully');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to update password', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevokeSession = async (sessionId) => {
        try {
            setActionLoading(true);
            await organizationApi.revokeSession(sessionId);
            setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
            showNotification('Session revoked successfully', 'success');
        } catch (error) {
            console.error('Revoke session error:', error);
            showNotification('Failed to revoke session', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setActionLoading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const { imageUrl } = await commonApi.uploadImage(formData);
            await organizationApi.update(organization._id, { branding: { ...organization.branding, logo: imageUrl } });
            setOrganization(prev => ({ ...prev, branding: { ...prev.branding, logo: imageUrl } }));
            showNotification('Logo updated successfully');
        } catch (error) {
            showNotification('Failed to upload logo', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const profileCompletion = useMemo(() => {
        const fields = [
            profile.firstName, profile.lastName, profile.email, profile.phone,
            organization.name, organization.clinicType, organization.registrationNumber, organization.consultationFee,
            organization.address?.street, organization.address?.city
        ];
        const completed = fields.filter(f => f && f !== '' && f !== 0).length;
        return Math.round((completed / fields.length) * 100);
    }, [profile, organization]);

    const tabs = useMemo(() => {
        const list = [
            { id: 'personal', label: 'Personal Info', icon: UserIcon }
        ];

        if (user?.role === 'doctor') {
            list.push({ id: 'public-profile', label: 'Public Profile', icon: Stethoscope });
        }

        if (['admin', 'orgadmin', 'superadmin'].includes(user?.role)) {
            list.push({ id: 'clinic', label: 'Clinic Info', icon: Building2 });
            list.push({ id: 'my-clinics', label: 'My Clinics', icon: Building2 });
            list.push({ id: 'clinic-profile', label: 'Clinic Profile', icon: Sparkles });
            list.push({ id: 'prescription', label: 'Prescription Template', icon: Activity });
            list.push({ id: 'billing', label: 'Billing & Subscription', icon: CreditCard });
            list.push({ id: 'whatsapp', label: 'WhatsApp Credits', icon: MessageSquare });
            list.push({ id: 'activity', label: 'Activity Logs', icon: Activity });
        } else if (user?.role === 'receptionist') {
            list.push({ id: 'whatsapp', label: 'WhatsApp Credits', icon: MessageSquare });
        }

        return list;
    }, [user?.role]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header Section */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {/* Back Navigation Button */}
                        <button
                            onClick={() => navigate(getDashboardPath())}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 transition-all text-xs font-black uppercase tracking-wider active:scale-95 shadow-sm"
                        >
                            <LayoutDashboard size={14} className="text-indigo-600" />
                            Back
                        </button>
                        
                        <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />

                        <div className="relative group">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                {organization.branding?.logo ? (
                                    <img src={getImageUrl(organization.branding.logo)} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Building2 className="text-slate-400" size={32} />
                                )}
                            </div>
                            <label className="absolute -bottom-1 -right-1 p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 transition-all">
                                <Upload size={14} className="text-slate-600" />
                                <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                            </label>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{organization.name}</h1>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                                    {user?.role === 'admin' ? 'Organization Admin' : user?.role || 'Admin'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                                <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5">
                                    <UserIcon size={14} /> {profile.firstName} {profile.lastName}
                                </p>
                                <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                                    <MapPin size={14} /> {organization.address?.city || 'Location not set'}{organization.address?.country ? `, ${organization.address.country}` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-2 mb-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile Completion</span>
                                <span className="text-xs font-black text-indigo-600">{profileCompletion}%</span>
                            </div>
                            <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${profileCompletion}%` }}
                                    className="h-full bg-indigo-600 rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="max-w-7xl mx-auto px-6 overflow-x-auto">
                    <div className="flex items-center gap-8">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`h-16 flex items-center gap-2 px-1 border-b-2 transition-all relative ${
                                    activeTab === tab.id 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <tab.icon size={18} />
                                <span className="text-sm font-bold whitespace-nowrap">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-indigo-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 mt-10">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                    <div className="lg:col-span-3">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 'personal' && (
                                    <PersonalInfoTab 
                                        profile={profile} 
                                        onUpdate={handleUpdateProfile} 
                                        loading={actionLoading} 
                                    />
                                )}
                                {activeTab === 'public-profile' && (
                                    <DoctorPublicProfileTab 
                                        doctor={doctorProfile} 
                                        onUpdate={handleUpdateDoctorProfile} 
                                        loading={actionLoading} 
                                    />
                                )}
                                {activeTab === 'clinic' && (
                                    <ClinicInfoTab 
                                        organization={organization} 
                                        onUpdate={handleUpdateOrganization} 
                                        loading={actionLoading} 
                                    />
                                )}
                                {activeTab === 'my-clinics' && (
                                    <MyClinicsTab 
                                        user={user} 
                                    />
                                )}
                                {activeTab === 'clinic-profile' && (
                                    <ClinicProfileTab 
                                        organization={organization} 
                                        onUpdate={handleUpdateOrganization} 
                                        loading={actionLoading} 
                                    />
                                )}
                                {activeTab === 'prescription' && (
                                    <PrescriptionTemplateTab />
                                )}
                                { activeTab === 'billing' && (
                                    <BillingSubscriptionTab 
                                        subscription={subscription}
                                        onUpgrade={() => navigate('/billing/upgrade')}
                                    />
                                )}
                                {activeTab === 'whatsapp' && (
                                    <WhatsAppCreditsTab />
                                )}
                                {activeTab === 'activity' && (
                                    <ActivityLogsTab 
                                        logs={activityLogs} 
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="hidden lg:block space-y-8">
                        <StatsCard 
                            patients={stats.patients}
                            appointments={stats.appointments}
                            revenue={stats.revenue}
                            loading={loading}
                        />
                        
                        <div className="bg-indigo-600 rounded-2xl p-6 text-white overflow-hidden relative group">
                            <div className="relative z-10">
                                <h4 className="font-black text-lg">Need Assistance?</h4>
                                <p className="text-indigo-100 text-xs mt-2 leading-relaxed">
                                    Our support team is available 24/7 to help you with clinic management.
                                </p>
                                <button 
                                    onClick={() => {
                                        alert("Support Details:\n\nPhone: 8874614138\nEmail: amitmaurya3276@gmail.com");
                                    }}
                                    className="mt-6 w-full py-2.5 bg-white text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl"
                                >
                                    Contact Support
                                </button>
                            </div>
                            <LayoutDashboard className="absolute -bottom-6 -right-6 text-white/10 w-32 h-32 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Banner */}
            <AnimatePresence>
                {notification.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, x: -20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, y: 20, x: -20 }}
                        className="fixed bottom-10 left-10 z-[100] min-w-[320px]"
                    >
                        <div className={`p-4 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 flex items-center space-x-4 ${
                            notification.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-rose-500 text-white'
                        }`}>
                            {notification.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                            <div>
                                <h5 className="font-black text-sm uppercase tracking-tight">{notification.type === 'success' ? 'Success' : 'Attention'}</h5>
                                <p className="text-xs opacity-90 font-bold">{notification.message}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfilePage;
