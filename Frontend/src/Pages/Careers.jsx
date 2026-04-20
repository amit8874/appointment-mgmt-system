import React from 'react';
import CompanyLayout from './CompanyLayout';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, DollarSign, Clock } from 'lucide-react';

const Careers = () => {
  const jobs = [
    {
      title: "Senior Full Stack Engineer",
      team: "Engineering",
      location: "Remote / Lucknow",
      type: "Full-time"
    },
    {
      title: "Product Designer",
      team: "Product",
      location: "Remote",
      type: "Full-time"
    },
    {
      title: "Customer Success Lead",
      team: "Operations",
      location: "Ahmedabad / On-site",
      type: "Full-time"
    }
  ];

  return (
    <CompanyLayout 
      title="Join Our Team" 
      subtitle="Help us build the operating system for modern healthcare providers. We're looking for passionate problem solvers."
    >
      <div className="space-y-24">
        {/* Culture Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
             <img 
               src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800" 
               alt="Team Culture" 
               className="rounded-[3rem] shadow-2xl"
             />
          </div>
          <div className="space-y-8 order-1 lg:order-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Why Work at Oviaan?</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2.5 shrink-0" />
                 <p className="text-lg text-slate-600 font-medium">Work on problems that have a real impact on people's health and wellbeing.</p>
              </div>
              <div className="flex gap-4">
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2.5 shrink-0" />
                 <p className="text-lg text-slate-600 font-medium">A high-autonomy environment where innovative ideas are encouraged and rewarded.</p>
              </div>
              <div className="flex gap-4">
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2.5 shrink-0" />
                 <p className="text-lg text-slate-600 font-medium">Competitive compensation, health benefits, and flexible work arrangements.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Job Listings */}
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-12">Open Opportunities</h2>
          <div className="space-y-4">
            {jobs.map((job, i) => (
              <motion.div 
                key={i}
                whileHover={{ x: 10 }}
                className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-100 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 text-blue-600/60"><Briefcase size={14} /> {job.team}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={14} /> {job.location}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {job.type}</span>
                  </div>
                </div>
                <button className="px-8 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all">
                  Apply Now
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
};

export default Careers;
