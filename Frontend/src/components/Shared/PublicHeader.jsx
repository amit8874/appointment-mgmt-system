import React from 'react';
import { Link } from 'react-router-dom';

const PublicHeader = () => {
  return (
    <div className="fixed top-6 left-0 right-0 z-[100] px-4">
      <header className="max-w-5xl mx-auto bg-white/90 backdrop-blur-md border-[1.5px] border-slate-900 rounded-full shadow-xl px-6 h-16 flex items-center justify-between">
        
        {/* Left Section: Logo + Pricing */}
        <div className="flex items-center gap-10">
           <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg italic shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                P
              </div>
              <span className="text-xl font-black tracking-tighter text-slate-900 italic">clicnic</span>
           </Link>

            <nav className="hidden md:flex items-center gap-4">
              <a 
                href="/#pricing" 
                className="px-4 py-1.5 text-sm font-extrabold text-blue-600 bg-blue-50 border border-blue-100 rounded-full hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
              >
                Pricing
              </a>
              <Link 
                to="/order-online-medicine"
                className="px-4 py-1.5 text-sm font-extrabold text-orange-600 bg-orange-50 border border-orange-100 rounded-full hover:bg-orange-100 transition-all shadow-sm"
              >
                Order Medicine
              </Link>
            </nav>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-3">
          <Link 
            to="/login" 
            className="px-5 py-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition-all border border-slate-200 rounded-full hover:border-blue-200 hover:bg-blue-50/50"
          >
            Log in
          </Link>
          <Link 
            to="/register-organization" 
            className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-500/20 active:scale-95"
          >
            Try for free
          </Link>
        </div>

      </header>
    </div>
  );
};

export default PublicHeader;
