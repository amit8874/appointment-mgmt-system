import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, X, Menu as MenuIcon, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const PatientTopNav = ({ sidebarOpen, setSidebarOpen, notifications, unreadCount, onNotificationClick, onLogout }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    return (
        <header className="bg-white shadow-sm z-10">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                {/* Mobile menu button */}
                <button
                    type="button"
                    className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    <span className="sr-only">Open sidebar</span>
                    {sidebarOpen ? (
                        <X className="h-6 w-6" aria-hidden="true" />
                    ) : (
                        <MenuIcon className="h-6 w-6" aria-hidden="true" />
                    )}
                </button>

                {/* Brand / Page Title */}
                <div className="flex-1 lg:ml-0 ml-4 flex items-center">
                    <h2 className="text-lg font-semibold text-gray-800 truncate">
                        Patient Dashboard
                    </h2>
                </div>

                {/* Right side icons */}
                <div className="flex items-center space-x-4">
                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative"
                        >
                            <span className="sr-only">View notifications</span>
                            <Bell className="h-5 w-5" aria-hidden="true" />
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification dropdown */}
                        {showNotifications && (
                            <div
                                className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                            >
                                <div className="py-1">
                                    <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={() => {
                                                    notifications.filter(n => !n.read).forEach(n => onNotificationClick(n.id));
                                                }}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Mark all as read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications && notifications.length > 0 ? (
                                            notifications.map((notification) => (
                                                <div
                                                    key={notification.id}
                                                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                                                    onClick={() => onNotificationClick(notification.id)}
                                                >
                                                    <div className="flex items-start">
                                                        <div className="flex-shrink-0 pt-0.5">
                                                            <div className={`h-2 w-2 rounded-full ${notification.read ? 'invisible' : 'bg-blue-500'}`}></div>
                                                        </div>
                                                        <div className="ml-3 flex-1">
                                                            <p className={`text-sm ${notification.read ? 'text-gray-700' : 'font-medium text-gray-900'}`}>
                                                                {notification.message}
                                                            </p>
                                                            <p className="mt-1 text-xs text-gray-500">{notification.time}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-8 text-center">
                                                <Bell className="mx-auto h-8 w-8 text-gray-400" />
                                                <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                                                <p className="mt-1 text-sm text-gray-500">You're all caught up!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile dropdown */}
                    <div className="relative ml-3">
                        <div>
                            <button
                                type="button"
                                className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                <span className="sr-only">Open user menu</span>
                                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden">
                                    {user?.profilePicture ? (
                                        <img src={user.profilePicture} alt={user.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <User className="h-5 w-5" />
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Profile dropdown menu */}
                        {userMenuOpen && (
                            <div
                                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                            >
                                <div className="py-1">
                                    <button 
                                        onClick={() => { 
                                            setUserMenuOpen(false);
                                            navigate('/patient-dashboard/profile');
                                        }} 
                                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Your Profile
                                    </button>
                                    <button
                                        className="w-full block text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            onLogout();
                                        }}
                                    >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default PatientTopNav;
