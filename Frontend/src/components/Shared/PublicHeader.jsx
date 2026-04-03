import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Tag, ShoppingBag, ChevronDown, Calendar, FileText, User, ShieldPlus, ClipboardList, Lock, MessageSquare, CreditCard, Video, PenTool, Layout, Sparkles, Check, AlertCircle, Heart, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PublicHeader = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);

  const features = [
    { title: "Scheduling", icon: <Calendar size={18} className="text-indigo-500" />, desc: "Appointment management", to: "/features/scheduling" },
    { title: "Documentation", icon: <FileText size={18} className="text-blue-500" />, desc: "Clinical records", to: "/features/documentation" },
    { title: "Patient Portal", icon: <User size={18} className="text-purple-500" />, desc: "Client self-service", to: "/features/patient-portal" },
    { title: "Health Records", icon: <ShieldPlus size={18} className="text-emerald-500" />, desc: "Secure vitals tracking", to: "/features/health-records" },
    { title: "Billing", icon: <ClipboardList size={18} className="text-orange-500" />, desc: "Invoicing & revenue", to: "/features/billing" },
    { title: "Compliance", icon: <Lock size={18} className="text-slate-500" />, desc: "HIPAA & security", to: "/features/compliance" },
    { title: "TeleEmergency 24*7", icon: <AlertCircle size={18} className="text-red-500" />, desc: "Immediate online care", to: "/features/tele-emergency" },
    { title: "Communications", icon: <MessageSquare size={18} className="text-sky-500" />, desc: "Secure messaging", to: "/features/communications" },
    { title: "Payments", icon: <CreditCard size={18} className="text-violet-500" />, desc: "Online collection", to: "/features/payments" },
    { title: "Telehealth", icon: <Video size={18} className="text-rose-500" />, desc: "Remote consultations", to: "/features/telehealth" },
    { title: "Clinical Notes", icon: <PenTool size={18} className="text-amber-500" />, desc: "Smart note taking", to: "/features/clinical-notes" },
    { title: "Family & Pet Care", icon: <Heart size={18} className="text-rose-500" />, desc: "One platform for everyone", to: "/features/family-pet-care" },
    { title: "Partner Program", icon: <TrendingUp size={18} className="text-emerald-500" />, desc: "Earn by referring clinics", to: "/features/partner-program" }
  ];

  return (
    <>
      <div className="fixed top-6 left-0 right-0 z-[100] px-4">
        <header className="relative max-w-5xl mx-auto bg-white/90 backdrop-blur-md border-[1.5px] border-slate-900 rounded-full shadow-xl px-6 h-16 flex items-center justify-between">
          
          {/* Left Section: Logo + Pricing (desktop) */}
          <div className="flex items-center gap-10">
              <Link to="/" className="flex items-center gap-2 group">
                 <img src="/logo.png" alt="Slotify Logo" className="h-20 w-auto group-hover:scale-105 transition-transform" />
              </Link>

              <nav className="hidden md:flex items-center gap-6">
                <div 
                  className="group py-4"
                  onMouseEnter={() => setProductMenuOpen(true)}
                  onMouseLeave={() => setProductMenuOpen(false)}
                >
                  <button className="flex items-center gap-1 text-sm font-bold text-slate-700 hover:text-blue-600 transition-all">
                    Product <ChevronDown size={14} className={`transition-transform duration-300 ${productMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {productMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-[850px] z-[110]"
                      >
                        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex">
                          {/* Left Side: Features */}
                          <div className="flex-1 p-8">
                            <h3 className="text-sm font-black text-slate-900 mb-8 uppercase tracking-widest px-2">Features</h3>
                            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                              {features.map((f, i) => (
                                <Link 
                                  key={i} 
                                  to={f.to} 
                                  className="group/item flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover/item:shadow-md transition-all">
                                    {f.icon}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800 group-hover/item:text-blue-600 transition-colors">{f.title}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{f.desc}</p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>

                          {/* Right Side: Slotify AI */}
                          <div className="w-[280px] bg-slate-50/50 border-l border-slate-100 p-8 flex flex-col relative overflow-hidden">
                            {/* Decorative Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-[40px] -mr-16 -mt-16" />
                            <div className="absolute bottom-0 right-0 w-24 h-24 bg-purple-400/10 rounded-full blur-[40px] -mr-12 -mb-12" />

                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                  <Sparkles size={20} className="text-white animate-pulse" />
                                </div>
                                <div className="leading-tight">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by</p>
                                  <p className="text-lg font-black text-indigo-950">Slotify AI</p>
                                </div>
                              </div>

                              <ul className="space-y-4 mb-8">
                                {[
                                  "Get Instant Answers",
                                  "Generate perfect notes",
                                  "Draft responses"
                                ].map((point, i) => (
                                  <li key={i} className="flex items-center gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                      <Check size={10} className="text-emerald-600 stroke-[3]" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{point}</span>
                                  </li>
                                ))}
                              </ul>

                              <div className="mt-auto">
                                <Link 
                                  to="#"
                                  className="block w-full text-center py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 hover:text-indigo-600 transition-all active:scale-95"
                                >
                                  Learn more
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <a 
                  href="/#pricing" 
                  className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-all"
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
