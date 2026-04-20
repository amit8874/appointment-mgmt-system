import React from 'react';
import CompanyLayout from './CompanyLayout';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowRight } from 'lucide-react';

const Blog = () => {
  const posts = [
    {
      title: "How AI is Reducing Physician Burnout in 2026",
      category: "Healthcare Technology",
      author: "Dr. Sarah Chen",
      date: "Oct 12, 2026",
      image: "https://images.unsplash.com/photo-1576091160550-217359f4ecf8?auto=format&fit=crop&q=80&w=400"
    },
    {
      title: "The Future of Patient Experience in Digital Clinics",
      category: "Patient Care",
      author: "Mark Stephenson",
      date: "Oct 08, 2026",
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=400"
    },
    {
      title: "Data Security in SaaS: What Clinic Owners Need to Know",
      category: "Security & Privacy",
      author: "Elena Rodriguez",
      date: "Oct 05, 2026",
      image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=400"
    }
  ];

  return (
    <CompanyLayout 
      title="Oviaan Blog" 
      subtitle="Latest insights, industry news, and expert perspectives on healthcare and technology."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {posts.map((post, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -8 }}
            className="group cursor-pointer bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500"
          >
            <div className="h-56 overflow-hidden">
               <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
            <div className="p-8 space-y-4">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{post.category}</span>
              <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{post.title}</h3>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <Calendar size={12} /> {post.date}
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-600 font-black uppercase tracking-widest group-hover:gap-2 transition-all">
                  Read More <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Newsletter Subscription */}
      <div className="mt-32 max-w-4xl mx-auto bg-slate-900 rounded-[3rem] p-12 text-center space-y-8 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 pointer-events-none" />
         <h2 className="text-3xl font-black text-white tracking-tight relative z-10">Subscribe for Healthcare Insights</h2>
         <p className="text-slate-400 font-medium relative z-10">Join 10,000+ professionals receiving our weekly newsletter.</p>
         <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto relative z-10">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-1 px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white outline-none focus:border-blue-500 transition-colors font-bold"
            />
            <button className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
              Subscribe
            </button>
         </div>
      </div>
    </CompanyLayout>
  );
};

export default Blog;
