import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Youtube, Github } from 'lucide-react';

const PublicFooter = () => {
  return (
    <footer className="bg-[#1C2C5E] text-white py-12 px-4">

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 mb-10">

          <div>
            <h4 className="font-black mb-3 text-slate-200">
{import.meta.env.VITE_APP_NAME || 'Oviaan'}</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>

              <li><Link to="/press" className="hover:text-white transition-colors">Press</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
For patients</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><Link to="/find-doctors" className="hover:text-white transition-colors">Search for doctors</Link></li>
              <li><Link to="/find-doctors?location=all&speciality=clinic" className="hover:text-white transition-colors">Search for clinics</Link></li>
              <li><Link to="/find-doctors?location=all&speciality=hospital" className="hover:text-white transition-colors">Search for hospitals</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
For doctors</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><Link to="/services/doctor-profile" className="hover:text-white transition-colors">Oviaan Profile</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
For clinics</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">

              <li><Link to="/services/reach" className="hover:text-white transition-colors">{import.meta.env.VITE_APP_NAME || 'Oviaan'} Reach</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
More</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-conditions" className="hover:text-white transition-colors">Terms and Conditions</Link></li>
              <li><Link to="/cancellation-policy" className="hover:text-white transition-colors">Cancellation Policy</Link></li>
            </ul>
          </div>

        </div>

        {/* SEO Keyword & Solutions Showcase Section */}
        <div className="border-t border-slate-700/80 pt-8 pb-4 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
              Popular Searches
            </span>
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Top Medical & Practice Management Solutions
            </h5>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Category 1: Core Systems */}
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
              <h6 className="text-xs font-black text-slate-200 uppercase mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Clinic & Hospital Systems
              </h6>
              <div className="flex flex-wrap gap-2">
                {[
                  "Clinic Management Software",
                  "Best Clinic Management Software",
                  "Hospital Management Software",
                  "#1 Clinic Management Software",
                  "Cloud EHR & EMR Platform",
                  "OPD Patient Management System"
                ].map((kw, i) => (
                  <Link 
                    to="/register-organization" 
                    key={i} 
                    className="text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-blue-600/30 border border-slate-700/80 hover:border-blue-500/40 px-2.5 py-1 rounded-lg transition-all duration-200 font-medium"
                  >
                    {kw}
                  </Link>
                ))}
              </div>
            </div>

            {/* Category 2: Specialty Practices */}
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
              <h6 className="text-xs font-black text-slate-200 uppercase mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Specialty Practice Software
              </h6>
              <div className="flex flex-wrap gap-2">
                {[
                  "Dental Clinic Software",
                  "Dermatology Practice Software",
                  "Pediatric Clinic Management",
                  "Gynecology EHR System",
                  "Eye & Optical Clinic Software",
                  "Physiotherapy Management"
                ].map((kw, i) => (
                  <Link 
                    to="/register-organization" 
                    key={i} 
                    className="text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-emerald-600/30 border border-slate-700/80 hover:border-emerald-500/40 px-2.5 py-1 rounded-lg transition-all duration-200 font-medium"
                  >
                    {kw}
                  </Link>
                ))}
              </div>
            </div>

            {/* Category 3: Operations & Features */}
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
              <h6 className="text-xs font-black text-slate-200 uppercase mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                Clinical Operations & Billing
              </h6>
              <div className="flex flex-wrap gap-2">
                {[
                  "Doctor Appointment Booking",
                  "Digital Prescription Software",
                  "Medical Billing & Invoicing",
                  "Pharmacy Inventory Software",
                  "Lab Report Management",
                  "WhatsApp Patient Messaging"
                ].map((kw, i) => (
                  <Link 
                    to="/register-organization" 
                    key={i} 
                    className="text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-purple-600/30 border border-slate-700/80 hover:border-purple-500/40 px-2.5 py-1 rounded-lg transition-all duration-200 font-medium"
                  >
                    {kw}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Keyword SEO Bar */}
          <div className="text-[11px] text-slate-400 font-medium leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold text-slate-300 uppercase text-[10px] tracking-wider">Top Keywords:</span>
            <span>#1 Clinic Management Software</span>
            <span className="text-slate-600">•</span>
            <span>Best Clinic Management Software</span>
            <span className="text-slate-600">•</span>
            <span>Hospital Management Software</span>
            <span className="text-slate-600">•</span>
            <span>Online Doctor Consultation</span>
            <span className="text-slate-600">•</span>
            <span>E-Prescription & EHR Platform</span>
            <span className="text-slate-600">•</span>
            <span>Patient Queue Management</span>
            <span className="text-slate-600">•</span>
            <span>Diagnostic Lab Reporting</span>
            <span className="text-slate-600">•</span>
            <span>Smart Oviaan Clinic Software</span>
          </div>
        </div>

        <div className="flex flex-col items-center border-t border-slate-700 pt-8">
          <div className="flex items-center gap-2 mb-4">
             <img src="/logo.png" alt={`${import.meta.env.VITE_APP_NAME || 'Oviaan'} Logo`} className="h-20 w-auto mb-2" />
          </div>
          <p className="text-sm text-slate-400 font-bold">Copyright © 2026, {import.meta.env.VITE_APP_NAME || 'Oviaan'}. All rights reserved.</p>

        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
