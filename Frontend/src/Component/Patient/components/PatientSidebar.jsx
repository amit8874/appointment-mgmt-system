import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, LayoutDashboard, Calendar, FileText, CreditCard, User, Stethoscope } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const PatientSidebar = ({ navigation, sidebarOpen, setSidebarOpen, onLogout }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <>
            {/* Sidebar backdrop */}
            <div
                className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-20 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
                initial={{ x: -256 }}
                animate={{ x: sidebarOpen ? 0 : -256 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-xl transform lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-200 ease-in-out"
            >
                <div className="flex flex-col h-full">
                    {/* Logo / Branding */}
                    <div 
                        className="flex items-center justify-center h-16 px-4 border-b border-gray-100"
                    >
                        {user?.organization?.branding?.logo ? (
                            <img 
                                src={user.organization.branding.logo} 
                                alt={user.organization.name || 'Clinic Logo'} 
                                className="h-10 w-auto max-w-[180px] object-contain"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = ''; // Fallback to text if image fails
                                }}
                            />
                        ) : (
                            <div className="flex items-center">
                                <Stethoscope className="text-blue-600 mr-2 h-6 w-6" />
                                <h1 className="text-gray-900 font-bold truncate max-w-[180px]">
                                    {user?.organization?.name?.toUpperCase() || 'EASYSCRIPT'}
                                </h1>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                        {navigation.map((item) => (
                            <NavLink
                                id={item.id}
                                key={item.name}
                                to={item.href}
                                end={item.href === '/patient-dashboard'}
                                className={({ isActive }) =>
                                    `group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 ${isActive
                                        ? 'bg-blue-50 text-blue-700 dark:bg-gray-700 dark:text-white'
                                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon
                                            className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive
                                                ? 'text-blue-500'
                                                : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                                                }`}
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Profile & Logout */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <img
                                        className="h-9 w-9 rounded-full object-cover"
                                        src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.name || user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Patient')}&background=2563eb&color=fff`}
                                        alt={user?.name || user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Patient')}
                                    />
                                </div>
                                <div className="ml-3 overflow-hidden">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate" title={user?.name || user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Patient')}>
                                        {user?.name || user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Patient')}
                                    </p>
                                    <button
                                        type="button"
                                        className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                        onClick={() => navigate('/patient-dashboard/profile')}
                                    >
                                        View profile
                                    </button>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onLogout}
                                className="ml-4 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <span className="sr-only">Logout</span>
                                <LogOut className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default PatientSidebar;
