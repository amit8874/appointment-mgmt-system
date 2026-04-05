import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin, Youtube, Github } from 'lucide-react';

const PublicFooter = () => {
  return (
    <footer className="bg-[#1C2C5E] text-white py-12 px-4">

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 mb-10">

          <div>
            <h4 className="font-black mb-3 text-slate-200">
Slotify</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
For patients</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><a href="#" className="hover:text-white transition-colors">Search for doctors</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Search for clinics</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Search for hospitals</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
For doctors</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><a href="#" className="hover:text-white transition-colors">Slotify Profile</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
For clinics</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><a href="#" className="hover:text-white transition-colors">Ray by Slotify</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Slotify Reach</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
More</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-3 text-slate-200">
Social</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-300">
              <li><a href="#" className="flex items-center gap-2 hover:text-white transition-colors"><Facebook size={16}/> Facebook</a></li>
              <li><a href="#" className="flex items-center gap-2 hover:text-white transition-colors"><Twitter size={16}/> Twitter</a></li>
              <li><a href="#" className="flex items-center gap-2 hover:text-white transition-colors"><Linkedin size={16}/> LinkedIn</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center border-t border-slate-700 pt-8">
          <div className="flex items-center gap-2 mb-4">
             <img src="/logo.png" alt="Slotify Logo" className="h-20 w-auto mb-2" />
          </div>
          <p className="text-sm text-slate-400 font-bold">Copyright © 2026, Slotify. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
