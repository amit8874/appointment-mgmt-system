import React from 'react';
import CompanyLayout from './CompanyLayout';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, Download } from 'lucide-react';

const Press = () => {
  const releases = [
    {
      title: "Oviaan Announces Series A Funding to Accelerate AI Innovation",
      date: "August 15, 2026",
      source: "TechCrunch"
    },
    {
      title: "Oviaan Partners with National Health Federation for Rural Clinic Digitalization",
      date: "July 22, 2026",
      source: "Health It News"
    },
    {
      title: "Oviaan Reach Platform Hits Milestone of 500 Active Clinics",
      date: "June 30, 2026",
      source: "Oviaan Newsroom"
    }
  ];

  return (
    <CompanyLayout 
      title="Press Room" 
      subtitle="The latest news, announcements, and media assets from Oviaan's journey."
    >
      <div className="space-y-24">
        {/* Latest Releases */}
        <div className="space-y-8">
           <h2 className="text-3xl font-black text-slate-900 tracking-tight italic flex items-center gap-3">
             <Newspaper className="text-blue-600" /> Recent News
           </h2>
           <div className="divide-y divide-slate-100">
             {releases.map((item, i) => (
               <div key={i} className="py-10 first:pt-0 group cursor-pointer hover:bg-slate-50/50 transition-colors px-4 -mx-4 rounded-2xl">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="space-y-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.date}</span>
                     <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                       {item.title}
                     </h3>
                     <span className="text-sm font-bold text-slate-500 italic">Via {item.source}</span>
                   </div>
                   <button className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest border-2 border-slate-100 px-6 py-3 rounded-xl hover:bg-white transition-all">
                     View Release <ExternalLink size={14} />
                   </button>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Media Kit */}
        <div className="bg-[#f8fafc] rounded-[3rem] p-12 lg:p-16 border border-slate-200">
          <div className="max-w-3xl space-y-8">
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">Media Kit & Assets</h2>
             <p className="text-lg text-slate-500 font-medium leading-relaxed">
               Need our logo, brand guidelines, or founder headshots? Our media kit contains high-resolution assets for press and publication use.
             </p>
             <button className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white font-black text-lg rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 group">
               Download Media Kit <Download size={20} className="group-hover:translate-y-1 transition-transform" />
             </button>
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
};

export default Press;
