import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- import useNavigate
import { FiMenu, FiGlobe, FiMessageSquare, FiChevronDown } from 'react-icons/fi';
import { FaHospital, FaUserCircle } from 'react-icons/fa';

const Header = ({ onMenuClick }) => {
  const [isHealthEaseOpen, setIsHealthEaseOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const navigate = useNavigate(); // <-- initialize navigate

  const handleLogout = () => {
    // Optional: clear any auth tokens here
    // localStorage.removeItem("token");
    navigate("/login"); // <-- redirect to login page
  };

  return (
    <header className="bg-white shadow-sm h-16 flex items-center px-6 justify-between">
      <div className="flex items-center gap-6">
        <button onClick={onMenuClick} className="text-gray-600 hover:text-gray-800">
          <FiMenu size={24} />
        </button>

        <a
          href="https://health-ease-gamma.vercel.app/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <FiGlobe size={18} />
          <span className="text-sm font-medium hidden sm:inline">Go To Website</span>
        </a>
      </div>

      <div className="flex items-center gap-6">
        <a href="/chat-with-us" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <FiMessageSquare size={18} />
          <span className="text-sm font-medium hidden sm:inline">Chat With Us</span>
        </a>

        {/* HealthEase Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsHealthEaseOpen(!isHealthEaseOpen)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            <FaHospital size={18} className="text-teal-600" />
            <span className="text-sm font-medium hidden md:inline">HealthEase</span>
            <FiChevronDown size={16} />
          </button>
          {isHealthEaseOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">HealthEase</a>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Item 1</a>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Item 2</a>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 focus:outline-none"
          >
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <FaUserCircle className="h-6 w-6 text-gray-500" />
            </div>
            <span className="text-sm font-medium text-gray-700 hidden md:inline">Mr Patient</span>
            <FiChevronDown size={16} className="text-gray-600" />
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
              {/* Updated Logout */}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Language Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            <span className="text-sm font-medium">🇬🇧</span>
            <span className="text-sm font-medium hidden sm:inline">EN</span>
            <FiChevronDown size={16} />
          </button>
          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg py-1 z-50">
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🇬🇧 EN</a>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🇧🇩 BD</a>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🇮🇳 IN</a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
