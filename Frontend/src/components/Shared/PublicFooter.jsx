import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Youtube, Github } from 'lucide-react';

const PublicFooter = () => {
  return (
    <footer className="bg-[#1C2C5E] text-white py-12 px-4">

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 mb-10">

          <div>
            <h4 className="font-black mb-3 text-slate-200">
{import.meta.env.VITE_APP_NAME || 'Oviaan'}</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
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
              <li><Link to="/services/ray" className="hover:text-white transition-colors">Ray by {import.meta.env.VITE_APP_NAME || 'Oviaan'}</Link></li>
              <li><Link to="/services/reach" className="hover:text-white transition-colors">{import.meta.env.VITE_APP_NAME || 'Oviaan'} Reach</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
More</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-conditions" className="hover:text-white transition-colors">Terms and Conditions</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
Social</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><Link to="https://facebook.com/oviaan" target="_blank" className="flex items-center gap-2 hover:text-white transition-colors"><Facebook size={16}/> Facebook</Link></li>
              <li><Link to="https://twitter.com/oviaan" target="_blank" className="flex items-center gap-2 hover:text-white transition-colors"><Twitter size={16}/> Twitter</Link></li>
              <li><Link to="https://linkedin.com/company/oviaan" target="_blank" className="flex items-center gap-2 hover:text-white transition-colors"><Linkedin size={16}/> LinkedIn</Link></li>
            </ul>
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
