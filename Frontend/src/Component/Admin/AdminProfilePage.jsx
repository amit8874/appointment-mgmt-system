import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, Building2, ShieldCheck, Settings, Activity, 
  CreditCard, LayoutDashboard, ChevronRight, Upload, LogOut,
  CheckCircle, AlertCircle, Info, MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserById, updateUser as updateUserData, updatePassword } from '../../api/userApi';
import organizationApi from '../../api/organizationApi';
import subscriptionApi from '../../api/subscriptionApi';
import { analyticsApi, commonApi } from '../../services/api';

// Sub-components
              
import StatsCard from './Profile/StatsCard';
import PersonalInfoTab from './Profile/PersonalInfoTab';
import ClinicInfoTab from './Profile/ClinicInfoTab';
import SecurityPrivacyTab from './Profile/SecurityPrivacyTab';
import PreferencesTab from './Profile/PreferencesTab';
import BillingSubscriptionTab from './Profile/BillingSubscriptionTab';
import ActivityLogsTab from './Profile/ActivityLogsTab';

const ProfilePage = () => {
    const { user, logout, updateUser } = useAuth();
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

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type, visible: true });
        setTimeout(() => setNotification({ message: '', type: '', visible: false }), 4000);
    };

    const fetchData = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const orgId = user?.organizationId?._id || user?.organizationId || user?.organization?._id;
            
            const [userData, orgData, subData, statsData, logsData, sessionsData] = await Promise.all([
                getUserById(user.id),
                orgId ? organizationApi.getById(orgId) : Promise.resolve(null),
                subscriptionApi.getMySubscription().catch(() => null),
                analyticsApi.getDashboard().catch(() => null),
                analyticsApi.getActivityLogs().catch(() => ({ logs: [] })),
                organizationApi.getMySessions().catch(() => [])
            ]);

            const nameParts = userData.name ? userData.name.split(' ') : ['', ''];
            setProfile({
                ...userData,
                firstName: nameParts[0],
                lastName: nameParts.slice(1).join(' '),
                phone: userData.mobile,
            });

            if (orgData) setOrganization(orgData);
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
            console.error('Error fetching profile data:', error);
            showNotification('Failed to load profile data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.id]);

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

    const handleUpdateOrganization = async (orgData) => {
        setActionLoading(true);
        try {
            const orgId = organization._id;
            await organizationApi.update(orgId, orgData);
            setOrganization(prev => ({ ...prev, ...orgData }));
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

    const tabs = [
        { id: 'personal', label: 'Personal Info', icon: UserIcon },
        { id: 'clinic', label: 'Clinic Info', icon: Building2 },
        { id: 'security', label: 'Security & Privacy', icon: ShieldCheck },
        { id: 'preferences', label: 'Preferences', icon: Settings },
        { id: 'billing', label: 'Billing & Subscription', icon: CreditCard },
        { id: 'activity', label: 'Activity Logs', icon: Activity },
    ];

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
                        <div className="relative group">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                {organization.branding?.logo ? (
                                    <img src={organization.branding.logo} alt="Logo" className="w-full h-full object-contain p-2" />
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
                                    <MapPin size={14} /> {organization.address?.city}, {organization.address?.country}
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
                                {activeTab === 'clinic' && (
                                    <ClinicInfoTab 
                                        organization={organization} 
                                        onUpdate={handleUpdateOrganization} 
                                        loading={actionLoading} 
                                    />
                                )}
                                {activeTab === 'security' && (
                                    <SecurityPrivacyTab 
                                        sessions={activeSessions}
                                        onRevokeSession={handleRevokeSession}
                                        onPasswordUpdate={handleUpdatePassword}
                                        onToggle2FA={() => showNotification("2FA settings updated", "info")}
                                        is2FAEnabled={true}
                                        loading={actionLoading}
                                    />
                                )}
                                {activeTab === 'preferences' && (
                                    <PreferencesTab 
                                        notifications={{ securityAlerts: true, systemUpdates: true, weeklyReports: false }}
                                        onToggleNotification={(type) => showNotification(`${type} changed`, "info")}
                                        whatsapp={{ connected: true }}
                                        onToggleWhatsapp={() => showNotification("WhatsApp toggled", "info")}
                                    />
                                )}
                                {activeTab === 'billing' && (
                                    <BillingSubscriptionTab 
                                        subscription={subscription}
                                        onUpgrade={() => navigate('/billing/upgrade')}
                                    />
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
                                <button className="mt-6 w-full py-2.5 bg-white text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl">
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
