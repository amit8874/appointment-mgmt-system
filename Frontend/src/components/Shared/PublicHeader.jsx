import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Tag, ShoppingBag } from 'lucide-react';

const PublicHeader = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="fixed top-6 left-0 right-0 z-[100] px-4">
        <header className="max-w-5xl mx-auto bg-white/90 backdrop-blur-md border-[1.5px] border-slate-900 rounded-full shadow-xl px-6 h-16 flex items-center justify-between">
          
          {/* Left Section: Logo + Pricing (desktop) */}
          <div className="flex items-center gap-10">
              <Link to="/" className="flex items-center gap-2 group">
                 <img src="/logo.png" alt="Slotify Logo" className="h-20 w-auto group-hover:scale-105 transition-transform" />
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

          {/* Right Section: Action Buttons + Mobile Hamburger */}
          <div className="flex items-center gap-3">
            <Link 
              to="/login" 
              className="hidden sm:inline-flex px-5 py-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition-all border border-slate-200 rounded-full hover:border-blue-200 hover:bg-blue-50/50"
            >
              Log in
            </Link>
            <Link 
              to="/register-organization" 
              className="hidden sm:inline-flex px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Try for free
            </Link>

            {/* Mobile Hamburger — visible only on mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              aria-label="Open menu"
            >
              <Menu size={20} className="text-slate-700" />
            </button>
          </div>

        </header>
      </div>

      {/* ── Mobile Right Sidebar ── */}
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-[210] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <img src="/logo.png" alt="Logo" className="h-14 w-auto" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
          >
            <X size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Drawer Nav Links */}
        <nav className="flex flex-col gap-3 px-5 py-6">
          <a
            href="/#pricing"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-4 px-5 py-4 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-all group active:scale-95"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Tag size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm tracking-tight">Pricing</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">View our plans</p>
            </div>
          </a>

          <Link
            to="/order-online-medicine"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-4 px-5 py-4 bg-orange-50 border border-orange-100 rounded-2xl hover:bg-orange-100 transition-all group active:scale-95"
          >
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm tracking-tight">Order Medicine</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Fast delivery nearby</p>
            </div>
          </Link>
        </nav>

        {/* Auth Buttons at bottom */}
        <div className="mt-auto px-5 pb-8 space-y-3">
          <Link
            to="/login"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center justify-center py-3.5 border-2 border-slate-200 rounded-2xl font-black text-sm text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
          >
            Log in
          </Link>
          <Link
            to="/register-organization"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center justify-center py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
          >
            Try for free
          </Link>
        </div>
      </div>
    </>
  );
};

export default PublicHeader;
