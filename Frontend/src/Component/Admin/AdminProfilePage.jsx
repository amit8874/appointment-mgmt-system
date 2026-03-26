import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User as UserIcon, Shield, Settings, Activity, Mail, Phone,
    MapPin, Calendar, ChevronRight, Trash2, Lock, CheckCircle,
    AlertCircle, Info, Globe, ArrowLeft, Key, Bell, CreditCard, LogOut,
    Eye, EyeOff, Upload, X, Image
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updatePassword, getUserById, updateUser } from '../../api/userApi';
import { commonApi } from '../../services/api';
import organizationApi from '../../api/organizationApi';

// Main component representing the Admin Profile page content
function ProfilePage() {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState({});
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isReceptionist = user?.role === 'receptionist';

    // --- NEW STATES AND MOCK DATA ---
    const [is2FAEnabled, setIs2FAEnabled] = useState(true);
    // Removed: const [theme, setTheme] = useState('Light');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [language, setLanguage] = useState('English (UK)');

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    const [notification, setNotification] = useState({ message: '', type: '', visible: false });
    const [logoutCountdown, setLogoutCountdown] = useState(null);

    // Password visibility states
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Logo upload states
    const [logoUploading, setLogoUploading] = useState(false);

    // Fetch profile data on mount
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const profileData = await getUserById(user.id);
                // Map backend data to frontend format
                const mappedProfile = {
                    firstName: profileData.name ? profileData.name.split(' ')[0] : '',
                    lastName: profileData.name ? profileData.name.split(' ').slice(1).join(' ') : '',
                    email: profileData.email || '',
                    phone: profileData.mobile || '',
                    userRole: profileData.role ? profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1) : 'Admin',
                    country: profileData.country || '',
                    city: profileData.city || '',
                    postalCode: profileData.postalCode || '',
                    profilePic: profileData.profilePicture || 'https://via.placeholder.com/150/FF8C00/FFFFFF?text=NK',
                    logo: profileData.organizationId?.branding?.logo || null,
                    organizationName: profileData.organizationId?.name || '',
                    passwordLastChanged: profileData.passwordLastChanged,
                };
                setProfile(mappedProfile);
                setForm(mappedProfile);

                // Sync global organization branding to ensure header etc. are updated
                if (profileData.organizationId) {
                    updateUser({
                        organization: {
                            id: profileData.organizationId._id,
                            name: profileData.organizationId.name,
                            slug: profileData.organizationId.slug,
                            branding: profileData.organizationId.branding,
                            status: profileData.organizationId.status
                        }
                    });
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError('Failed to load profile data');
                showNotification('Failed to load profile data', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user?.id]);

    // Format "Last changed" string
    const formatPasswordLastChanged = (dateString) => {
        if (!dateString) return 'Never';
        const now = new Date();
        const changedDate = new Date(dateString);
        const diffInTime = now.getTime() - changedDate.getTime();
        const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));

        if (diffInDays === 0) return 'Changed today';
        if (diffInDays === 1) return 'Changed 1 day ago';
        return `Changed ${diffInDays} days ago`;
    };

    // Mock Data for new sections
    const permissions = useMemo(() => [
        'User Account Management',
        'Full Database Read/Write',
        'Deployment Authority',
        'View Audit Logs',
        'System Configuration Access',
    ], []);

    const activeSessions = useMemo(() => [
        { id: 1, device: 'Chrome on Mac (Current)', ip: '203.0.113.45', time: 'Active Now', current: true },
        { id: 2, device: 'Safari on iPhone', ip: '198.51.100.10', time: '1 hour ago' },
        { id: 3, device: 'Firefox on Linux', ip: '192.0.2.20', time: '3 days ago' },
    ], []);

    const activityLog = useMemo(() => [
        { id: 1, action: 'Updated Personal Information', time: '2025-11-03 10:30 AM' },
        { id: 2, action: 'Revoked Session (IP: 10.0.0.5)', time: '2025-11-02 04:15 PM' },
        { id: 3, action: 'Accessed Configuration Files', time: '2025-11-01 09:00 AM' },
    ], []);
    // ---------------------------------

    // Helper to show the notification banner (replaces alert())
    const showNotification = (message, type = 'success') => {
        setNotification({ message, type, visible: true });
        setTimeout(() => setNotification({ message: '', type: '', visible: false }), 4000);
    };

    const handleEditClick = () => {
        setForm(profile); // Populate modal form with current profile data
        setIsEditModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveChanges = async () => {
        if (!user || !user.id) return;
        try {
            const updateData = {
                name: `${form.firstName} ${form.lastName}`,
                email: form.email,
                mobile: form.phone,
                city: form.city,
                country: form.country,
                postalCode: form.postalCode,
                profilePicture: form.profilePic,
            };

            await updateUserService(user.id, updateData);
            
            // Update organization name if changed
            const organizationId = user?.organizationId?._id || user?.organizationId || user?.organization?._id;
            if (organizationId && form.organizationName !== profile.organizationName) {
                await organizationApi.update(organizationId, { name: form.organizationName });
                
                // Sync global state for organization name
                updateUser({
                    organization: {
                        ...(user.organization || {}),
                        name: form.organizationName
                    }
                });
            }

            setProfile(form); // Update local state
            setIsEditModalOpen(false);
            showNotification("Profile details updated successfully!", "success");
        } catch (err) {
            console.error('Error saving profile:', err);
            showNotification("Failed to save profile", "error");
        }
    };

    // Logo upload handler
    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showNotification("Please select a valid image file (JPEG, PNG, GIF, or WebP)", "error");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification("Image size must be less than 5MB", "error");
            return;
        }

        // Get organization ID
        const organizationId = user?.organizationId || user?.organization?._id;
        if (!organizationId) {
            showNotification("Organization not found. Please contact support.", "error");
            return;
        }

        setLogoUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('image', file);

            const result = await commonApi.uploadImage(formDataUpload);
            if (result.imageUrl) {
                const newLogo = result.imageUrl;
                // Update local state
                setProfile(prev => ({ ...prev, logo: newLogo }));
                setForm(prev => ({ ...prev, logo: newLogo }));
                
                // Save to organization database
                await organizationApi.update(organizationId, { branding: { logo: newLogo } });

                // Sync global state
                updateUser({
                    organization: {
                        ...user.organization,
                        branding: {
                            ...(user.organization?.branding || {}),
                            logo: newLogo
                        }
                    }
                });

                showNotification("Logo uploaded successfully!", "success");
            }
        } catch (error) {
            console.error('Logo upload failed:', error);
            showNotification("Logo upload failed. Please try again.", "error");
        } finally {
            setLogoUploading(false);
        }
    };

    // Logo delete handler
    const handleLogoDelete = async () => {
        if (!profile.logo) return;

        // Get organization ID
        const organizationId = user?.organizationId || user?.organization?._id;
        if (!organizationId) {
            showNotification("Organization not found. Please contact support.", "error");
            return;
        }

        try {
            // Update local state
            setProfile(prev => ({ ...prev, logo: null }));
            setForm(prev => ({ ...prev, logo: null }));
            
            // Save to organization database
            await organizationApi.update(organizationId, { branding: { logo: null } });

            // Sync global state
            updateUser({
                organization: {
                    ...user.organization,
                    branding: {
                        ...(user.organization?.branding || {}),
                        logo: null
                    }
                }
            });

            showNotification("Logo deleted successfully!", "success");
        } catch (error) {
            console.error('Logo delete failed:', error);
            showNotification("Logo delete failed. Please try again.", "error");
        }
    };

    // --- NEW HANDLERS ---
    const handlePasswordChangeForm = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitPassword = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
            showNotification("New passwords do not match!", "error");
            return;
        }
        if (!user || !user.id) return;
        try {
            await updatePassword(user.id, {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });

            showNotification("Password updated successfully! Automatic logout in 5 seconds...", "success");
            setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });

            // Start 5-second countdown for automatic logout
            let secondsLeft = 5;
            setLogoutCountdown(secondsLeft);

            const timer = setInterval(() => {
                secondsLeft -= 1;
                setLogoutCountdown(secondsLeft);
                if (secondsLeft <= 0) {
                    clearInterval(timer);
                    logout();
                    navigate('/login');
                }
            }, 1000);

        } catch (err) {
            console.error('Error updating password:', err);
            const errorMsg = err.response?.data?.message || "Failed to update password";
            showNotification(errorMsg, "error");
        }
    };

    const handleRevokeSession = (sessionId) => {
        // Simulate API call to revoke session
        console.log(`Revoking session ID: ${sessionId}`);
        showNotification(`Session ID ${sessionId} revoked.`, "warning");
        // In a real app, you would update the activeSessions state here.
    };

    // Handler for back button
    const handleGoBack = () => {
        navigate('/admin-dashboard')
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full"
                    />
                    <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans selection:bg-orange-100 selection:text-orange-900">
            <NotificationBanner {...notification} />

            {/* Logout Countdown Overlay */}
            <AnimatePresence>
                {logoutCountdown !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl"
                    >
                        <div className="text-center space-y-8 p-10">
                            <motion.div
                                initial={{ scale: 0.5, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="w-32 h-32 bg-orange-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(249,115,22,0.5)]"
                            >
                                <Lock className="w-16 h-16 text-white" />
                            </motion.div>
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black text-white tracking-tight">Security Update</h2>
                                <p className="text-slate-400 text-lg">Password successfully changed. Re-authenticating all sessions...</p>
                            </div>
                            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="45"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="6"
                                    />
                                    <motion.circle
                                        cx="48"
                                        cy="48"
                                        r="45"
                                        fill="none"
                                        stroke="#f97316"
                                        strokeWidth="6"
                                        strokeDasharray="282.7"
                                        animate={{ strokeDashoffset: [0, 282.7] }}
                                        transition={{ duration: 5, ease: "linear" }}
                                    />
                                </svg>
                                <span className="text-4xl font-black text-white">{logoutCountdown}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Hero Section */}
            <div className="relative h-64 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-orange-900 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                <div className="max-w-6xl mx-auto px-6 h-full flex items-end pb-12">
                    <div className="flex items-center space-x-6 z-10">

                        {/* Organization Logo Section */}
                        <div className="flex flex-col items-start space-y-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Organization Logo</span>
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    {profile.logo ? (
                                        <div className="relative group">
                                            <img
                                                src={profile.logo}
                                                alt="Organization Logo"
                                                className="w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-white/20 shadow-xl object-contain bg-white/10"
                                            />
                                            <button
                                                onClick={handleLogoDelete}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                title="Delete Logo"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-dashed border-slate-500/30 bg-slate-800/50 flex items-center justify-center">
                                            <Image className="w-6 h-6 text-slate-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <label
                                        htmlFor="logo-upload"
                                        className={`cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${logoUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {logoUploading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={16} />
                                                {profile.logo ? 'Change Logo' : 'Upload Logo'}
                                            </>
                                        )}
                                    </label>
                                    <input
                                        id="logo-upload"
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        onChange={handleLogoUpload}
                                        disabled={logoUploading}
                                        className="hidden"
                                    />
                                    <p className="text-xs text-slate-400">Max 5MB (PNG, JPG, GIF)</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-white">
                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-3xl md:text-4xl font-extrabold tracking-tight"
                            >
                                {profile.firstName} {profile.lastName}
                            </motion.h1>
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="flex flex-wrap items-center gap-3 mt-2 text-slate-300"
                            >
                                <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                    {profile.userRole}
                                </span>
                                <div className="flex items-center text-sm font-medium">
                                    <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                                    {profile.city}, {profile.country}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            </div>

            <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-20">
                {/* Glassmorphic Navigation */}
                <div className="bg-white/80 backdrop-blur-xl border border-white shadow-xl rounded-2xl mb-8 flex overflow-x-auto no-scrollbar">
                    <TabButton id="profile" label="Personal Info" icon={UserIcon} activeTab={activeTab} setActiveTab={setActiveTab} />
                    {!isReceptionist && <TabButton id="security" label="Security & Privacy" icon={Shield} activeTab={activeTab} setActiveTab={setActiveTab} />}
                    {!isReceptionist && <TabButton id="settings" label="Preferences" icon={Settings} activeTab={activeTab} setActiveTab={setActiveTab} />}
                    {!isReceptionist && <TabButton id="activity" label="Activity Logs" icon={Activity} activeTab={activeTab} setActiveTab={setActiveTab} />}
                </div>

                {/* Tab Content with Framer Motion */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'profile' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-8">
                                    {/* Personal Info Card */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8">
                                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-3 bg-orange-50 rounded-2xl">
                                                    <UserIcon className="w-6 h-6 text-orange-600" />
                                                </div>
                                                <h2 className="text-xl font-bold text-slate-800">Account Details</h2>
                                            </div>
                                            <button
                                                onClick={handleEditClick}
                                                className="group flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl hover:bg-orange-600 transition-all duration-300 shadow-md hover:shadow-orange-200"
                                            >
                                                <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                                                <span className="text-sm font-bold">Edit Profile</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                            {[
                                                { label: 'Full Name', value: `${profile.firstName} ${profile.lastName}`, icon: UserIcon },
                                                { label: 'Organization Name', value: profile.organizationName, icon: Globe },
                                                { label: 'Email Address', value: profile.email, icon: Mail },
                                                { label: 'Mobile Number', value: profile.phone, icon: Phone },
                                                { label: 'Location', value: `${profile.city}, ${profile.country}`, icon: MapPin },
                                                { label: 'Postal Code', value: profile.postalCode, icon: Globe },
                                            ].map((item, idx) => (
                                                <div key={idx} className="group">
                                                    <div className="flex items-center space-x-2 mb-1.5">
                                                        <item.icon className="w-3.5 h-3.5 text-slate-400" />
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                                                    </div>
                                                    <p className="text-slate-800 font-semibold text-lg">{item.value || 'Not provided'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Administrative Access Card */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8">
                                        <div className="flex items-center space-x-3 mb-8">
                                            <div className="p-3 bg-indigo-50 rounded-2xl">
                                                <Shield className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-800">Administrative Access</h2>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {permissions.map((p, index) => (
                                                <div key={index} className="flex items-center space-x-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white hover:border-orange-200 transition-all duration-300">
                                                    <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-orange-50 transition-colors">
                                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">{p}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* Security Status Card */}
                                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                                        <Shield className="absolute -bottom-8 -right-8 w-40 h-40 text-white/5" />
                                        <h3 className="text-lg font-bold mb-6 flex items-center">
                                            <Lock className="w-5 h-5 mr-2" />
                                            Security Status
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <span className="text-indigo-200 text-sm">Account Status</span>
                                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-lg border border-emerald-500/30">Verified</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-indigo-200 text-sm">2FA Security</span>
                                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-lg border border-emerald-500/30">Active</span>
                                            </div>
                                            <div className="pt-4 border-t border-white/10">
                                                <p className="text-indigo-100 text-xs leading-relaxed opacity-80">
                                                    Your account is protected by enterprise-grade encryption and two-factor authentication.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions Card */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8">
                                        <h3 className="text-lg font-bold text-slate-800 mb-6">Quick Actions</h3>
                                        <div className="space-y-3">
                                            {!isReceptionist && (
                                            <button
                                                onClick={() => setActiveTab('security')}
                                                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                                                        <Key className="w-4 h-4 text-orange-600" />
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">Change Password</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
                                            </button>
                                            )}
                                            {!isReceptionist && (
                                            <button
                                                onClick={() => showNotification("Session logs requested", "info")}
                                                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                                        <Activity className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">Audit Requests</span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                            </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-8">
                                    {/* Change Password Card - hidden for receptionist */}
                                    {!isReceptionist && (
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8">
                                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-3 bg-red-50 rounded-2xl">
                                                    <Lock className="w-6 h-6 text-red-600" />
                                                </div>
                                                <h2 className="text-xl font-bold text-slate-800">Authentication</h2>
                                            </div>
                                            <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                                {formatPasswordLastChanged(profile.passwordLastChanged)}
                                            </div>
                                        </div>
                                        <form onSubmit={handleSubmitPassword} className="space-y-6">
                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Current Password</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input
                                                            type={showCurrentPassword ? "text" : "password"}
                                                            name="currentPassword"
                                                            value={passwordForm.currentPassword}
                                                            onChange={handlePasswordChangeForm}
                                                            className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white focus:border-orange-500 transition-all font-medium"
                                                            placeholder="••••••••"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors"
                                                        >
                                                            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">New Password</label>
                                                        <div className="relative">
                                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            <input
                                                                type={showNewPassword ? "text" : "password"}
                                                                name="newPassword"
                                                                value={passwordForm.newPassword}
                                                                onChange={handlePasswordChangeForm}
                                                                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white focus:border-orange-500 transition-all font-medium"
                                                                placeholder="Min. 8 characters"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors"
                                                            >
                                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Confirm New Password</label>
                                                            {passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword && (
                                                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter pr-1 animate-pulse">unmatch</span>
                                                            )}
                                                        </div>
                                                        <div className="relative">
                                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            <input
                                                                type={showConfirmPassword ? "text" : "password"}
                                                                name="confirmNewPassword"
                                                                value={passwordForm.confirmNewPassword}
                                                                onChange={handlePasswordChangeForm}
                                                                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white focus:border-orange-500 transition-all font-medium"
                                                                placeholder="••••••••"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors"
                                                            >
                                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all duration-300 shadow-lg shadow-orange-100 flex items-center justify-center space-x-2"
                                            >
                                                <span>Update Authentication</span>
                                            </button>
                                        </form>
                                    </div>
                                    )}

                                    {/* Active Sessions Card */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-3 bg-blue-50 rounded-2xl">
                                                    <Activity className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <h2 className="text-xl font-bold text-slate-800">Active Sessions</h2>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {activeSessions.map((session) => (
                                                <div key={session.id} className={`flex justify-between items-center p-5 border rounded-2xl transition-all duration-300 ${session.current ? 'bg-orange-50/50 border-orange-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                                    <div className="flex items-center space-x-4">
                                                        <div className={`p-3 rounded-xl ${session.current ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                            {session.device.includes('iPhone') ? <Settings className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="font-bold text-slate-800">{session.device}</span>
                                                                {session.current && <span className="px-2 py-0.5 bg-orange-500 text-white text-[8px] font-black uppercase rounded-lg">Current</span>}
                                                            </div>
                                                            <span className="text-slate-400 text-xs font-medium">IP: {session.ip} • {session.time}</span>
                                                        </div>
                                                    </div>
                                                    {!session.current && (
                                                        <button
                                                            onClick={() => handleRevokeSession(session.id)}
                                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                                            title="Revoke Session"
                                                        >
                                                            <LogOut className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* 2FA Card */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8">
                                        <div className="p-4 bg-emerald-50 rounded-2xl mb-6 inline-block">
                                            <Shield className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">Two-Factor Security</h3>
                                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                            Protect your account by requiring a security code whenever you log in from an unknown device.
                                        </p>
                                        <ToggleSwitch
                                            label="2FA Authentication"
                                            description="Active on mobile & desktop"
                                            isChecked={is2FAEnabled}
                                            onToggle={() => {
                                                const nextState = !is2FAEnabled;
                                                setIs2FAEnabled(nextState);
                                                showNotification(`2FA security ${nextState ? 'Enabled' : 'Disabled'}`, "info");
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="max-w-2xl mx-auto space-y-8">
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8">
                                    <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-slate-100">
                                        <div className="p-3 bg-orange-50 rounded-2xl">
                                            <Bell className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-800">Notification Preferences</h2>
                                    </div>
                                    <div className="space-y-2">
                                        <ToggleSwitch
                                            label="Security Alerts"
                                            description="Get notified about login attempts and password changes."
                                            isChecked={emailNotifications}
                                            onToggle={() => setEmailNotifications(!emailNotifications)}
                                        />
                                        <ToggleSwitch
                                            label="System Updates"
                                            description="Stay informed about platform maintenance and new features."
                                            isChecked={true}
                                            onToggle={() => { }}
                                        />
                                        <ToggleSwitch
                                            label="Activity Summaries"
                                            description="Receive a weekly report of your administrative activities."
                                            isChecked={false}
                                            onToggle={() => { }}
                                        />
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8">
                                    <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-slate-100">
                                        <div className="p-3 bg-indigo-50 rounded-2xl">
                                            <Globe className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-800">Language & Region</h2>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Display Language</label>
                                            <select
                                                value={language}
                                                onChange={(e) => setLanguage(e.target.value)}
                                                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white focus:border-orange-500 transition-all font-bold text-slate-700"
                                            >
                                                <option>English (UK)</option>
                                                <option>English (US)</option>
                                                <option>Español</option>
                                                <option>Français</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="max-w-4xl mx-auto">
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
                                    <div className="p-8 border-b border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-3 bg-blue-50 rounded-2xl">
                                                    <Activity className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <h2 className="text-xl font-bold text-slate-800">Activity History</h2>
                                            </div>
                                            <button className="text-sm font-bold text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-xl transition-all">
                                                Download Audit Log
                                            </button>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {activityLog.map((log, index) => (
                                            <div key={log.id || index} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                                                    <p className="text-slate-800 font-bold group-hover:text-orange-600 transition-colors">{log.action}</p>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{log.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-6 bg-slate-50/50 border-t border-slate-100 text-center">
                                        <button className="text-sm font-black text-slate-400 uppercase tracking-widest hover:text-orange-600 transition-colors">
                                            Load More History
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Modals remain mostly the same but styled */}
            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                form={form}
                onFormChange={handleFormChange}
                onSave={handleSaveChanges}
            />
        </div>
    );
}

// --- SUB-COMPONENTS (Defined outside to prevent focus loss on re-render) ---

const EditProfileModal = ({ isOpen, onClose, form, onFormChange, onSave }) => (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 40 }}
                    className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white/20 flex flex-col"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-indigo-600"></div>

                    <div className="p-10 pb-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Edit Profile</h2>
                                <p className="text-slate-400 font-medium text-sm mt-1">Update your personal and address details.</p>
                            </div>
                            <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                                <ArrowLeft className="w-6 h-6 text-slate-400 rotate-90" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
                        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="First Name" name="firstName" value={form.firstName} onChange={onFormChange} icon={UserIcon} />
                                <InputField label="Last Name" name="lastName" value={form.lastName} onChange={onFormChange} icon={UserIcon} />
                                <InputField label="Organization Name" name="organizationName" value={form.organizationName} onChange={onFormChange} icon={Globe} />
                                <InputField label="Email Address" name="email" value={form.email} onChange={onFormChange} type="email" icon={Mail} />
                                <InputField label="Phone Number" name="phone" value={form.phone} onChange={onFormChange} type="tel" icon={Phone} />
                                <InputField label="User Role" name="userRole" value={form.userRole} readOnly icon={Shield} />
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Location Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Country" name="country" value={form.country} onChange={onFormChange} icon={Globe} />
                                    <InputField label="City" name="city" value={form.city} onChange={onFormChange} icon={MapPin} />
                                    <InputField label="Postal Code" name="postalCode" value={form.postalCode} onChange={onFormChange} icon={MapPin} />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                            </div>
                        </form>
                    </div>

                    <div className="p-10 pt-5 border-t border-slate-50 bg-slate-50/50 flex space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 px-6 bg-white text-slate-500 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-100"
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            className="flex-[2] py-4 px-6 bg-slate-900 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center space-x-2"
                        >
                            <span>Apply Updates</span>
                            <CheckCircle className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

const InputField = ({ label, name, value, onChange, type = "text", readOnly = false, icon: Icon }) => (
    <div className="space-y-1.5 group">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] pl-1 group-focus-within:text-orange-500 transition-colors">
            {label}
        </label>
        <div className={`relative flex items-center transition-all duration-300 ${readOnly ? 'opacity-60' : 'group-focus-within:scale-[1.01]'}`}>
            {Icon && (
                <div className="absolute left-4 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                    <Icon size={18} />
                </div>
            )}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                className={`w-full py-4 ${Icon ? 'pl-12' : 'pl-4'} pr-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:bg-white focus:border-orange-500 transition-all font-semibold text-slate-700 disabled:bg-slate-100`}
            />
        </div>
    </div>
);

const NotificationBanner = ({ message, type, visible }) => {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, x: 20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: -20, x: 20 }}
                    className="fixed top-6 right-6 z-[60] min-w-[300px]"
                >
                    <div className={`p-4 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 flex items-center space-x-3 ${type === 'success' ? 'bg-emerald-500/90 text-white' :
                        type === 'error' ? 'bg-rose-500/90 text-white' :
                            type === 'warning' ? 'bg-amber-500/90 text-white' :
                                'bg-sky-500/90 text-white'
                        }`}>
                        {type === 'success' && <CheckCircle className="w-5 h-5" />}
                        {type === 'error' && <AlertCircle className="w-5 h-5" />}
                        {type === 'warning' && <AlertCircle className="w-5 h-5" />}
                        {type === 'info' && <Info className="w-5 h-5" />}
                        <p className="font-medium text-sm">{message}</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ToggleSwitch = ({ label, isChecked, onToggle, description }) => (
    <div className="flex flex-col py-4 first:pt-0 border-b border-gray-100 last:border-b-0">
        <div className="flex justify-between items-center group">
            <div className="flex flex-col pr-8">
                <span className="text-gray-900 font-semibold group-hover:text-orange-600 transition-colors">{label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${isChecked ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-gray-200'
                    }`}
            >
                <motion.span
                    animate={{ x: isChecked ? 24 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
                />
            </button>
        </div>
    </div>
);

const TabButton = ({ id, label, icon: Icon, activeTab, setActiveTab }) => (
    <button
        onClick={() => setActiveTab(id)}
        className={`flex items-center space-x-2 px-6 py-4 text-sm font-semibold transition-all duration-300 border-b-2 relative ${activeTab === id
            ? 'text-orange-600 border-orange-600'
            : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-200'
            }`}
    >
        <Icon className={`w-4 h-4 ${activeTab === id ? 'animate-bounce' : ''}`} />
        <span>{label}</span>
        {activeTab === id && (
            <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"
            />
        )}
    </button>
);

export default ProfilePage;
