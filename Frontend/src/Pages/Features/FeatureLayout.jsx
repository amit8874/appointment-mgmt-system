import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import PublicHeader from '../../components/Shared/PublicHeader';
import PublicFooter from '../../components/Shared/PublicFooter';
import { Link } from 'react-router-dom';

const FeatureLayout = ({ 
  title, 
  subtitle, 
  description, 
  icon: Icon, 
  color = "blue",
  benefits = [],
  aiHighlight = ""
}) => {
  const colorMap = {
    blue: "from-blue-600 to-indigo-700 bg-blue-50 text-blue-600",
    purple: "from-purple-600 to-violet-700 bg-purple-50 text-purple-600",
    emerald: "from-emerald-600 to-teal-700 bg-emerald-50 text-emerald-600",
    orange: "from-orange-500 to-red-600 bg-orange-50 text-orange-600",
    rose: "from-rose-500 to-pink-600 bg-rose-50 text-rose-600",
    amber: "from-amber-500 to-orange-600 bg-amber-50 text-amber-600",
    indigo: "from-indigo-600 to-blue-700 bg-indigo-50 text-indigo-600",
    cyan: "from-cyan-500 to-blue-600 bg-cyan-50 text-cyan-600",
    slate: "from-slate-600 to-slate-800 bg-slate-50 text-slate-600"
  };

  const selectedColor = colorMap[color] || colorMap.blue;
  const components = selectedColor.split(' ');
  const gradient = components[0] + ' ' + components[1];
  const lightBg = components[2];
  const textColor = components[3];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative pt-44 pb-24 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br ${gradient} opacity-[0.03] rounded-full blur-3xl -mr-64 -mt-32`} />
        <div className={`absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr ${gradient} opacity-[0.02] rounded-full blur-3xl -ml-32 -mb-16`} />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-3/5 space-y-8 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`inline-flex items-center gap-2 px-4 py-2 ${lightBg} ${textColor} rounded-full font-black text-xs uppercase tracking-widest border border-current/10`}
              >
                <Sparkles size={14} />
                Featured Module
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.05]"
              >
                {title} <br />
                <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{subtitle}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl leading-relaxed"
              >
                {description}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-4"
              >
                <Link 
                  to="/register-organization"
                  className={`px-8 py-4 bg-gradient-to-r ${gradient} text-white font-black text-lg rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group`}
                >
                  Start Free Trial Now
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 font-black text-lg rounded-2xl hover:bg-slate-50 transition-all">
                  Watch Demo
                </button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
              className="lg:w-2/5 flex justify-center lg:justify-end"
            >
              <div className={`w-64 h-64 md:w-80 md:h-80 rounded-[3rem] bg-gradient-to-br ${gradient} flex items-center justify-center p-12 shadow-2xl relative`}>
                <Icon size={120} className="text-white drop-shadow-lg" />
                {/* Floating Elements Mockup */}
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center animate-bounce duration-[3000ms]">
                   <Sparkles className={textColor} />
                </div>
                <div className="absolute -bottom-10 -left-10 p-4 bg-white rounded-3xl shadow-2xl border border-slate-50 space-y-2 w-48 hidden md:block">
                   <div className="h-2 w-full bg-slate-100 rounded-full" />
                   <div className="h-2 w-3/4 bg-slate-100 rounded-full" />
                   <div className={`h-2 w-1/2 bg-gradient-to-r ${gradient} rounded-full`} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Why Choose Slotify {title}?</h2>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Industry Leading Features & Support</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {benefits.map((benefit, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -5 }}
                  className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <div className={`w-12 h-12 ${lightBg} ${textColor} rounded-xl flex items-center justify-center mb-6`}>
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3">{benefit.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{benefit.desc}</p>
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* AI Spotlight Section */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto bg-slate-900 rounded-[3rem] p-8 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center gap-12">
           <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -mr-48 -mt-48" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[80px] -ml-32 -mb-32" />

           <div className="relative z-10 md:w-1/2 space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
                    <Sparkles size={24} className="text-white animate-pulse" />
                 </div>
                 <h2 className="text-2xl font-black text-white uppercase tracking-wider italic">Powered by Slotify AI</h2>
              </div>
              <p className="text-3xl md:text-5xl font-black text-white leading-tight">
                Self-Optimizing {title} Workflow.
              </p>
              <p className="text-slate-400 text-lg leading-relaxed">
                {aiHighlight}
              </p>
              <div className="pt-4">
                 <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 backdrop-blur-md transition-all font-bold">
                   Learn more about Slotify AI
                 </button>
              </div>
           </div>

           <div className="relative z-10 md:w-1/2">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-4">
                 {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                       <div className="w-10 h-10 bg-white/10 rounded-lg" />
                       <div className="flex-1 space-y-2 py-1">
                          <div className="h-2 bg-white/10 rounded w-1/2" />
                          <div className="h-2 bg-white/10 rounded w-full" />
                       </div>
                    </div>
                 ))}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40 text-center space-y-2 pointer-events-none">
                    <Sparkles size={48} className="mx-auto opacity-20" />
                    <p className="font-black tracking-widest text-[10px] uppercase">AI Processing Insight</p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 px-6">
        <div className={`max-w-5xl mx-auto bg-gradient-to-r ${gradient} rounded-[2.5rem] p-12 text-center text-white space-y-8 shadow-2xl shadow-blue-600/20`}>
           <h2 className="text-4xl md:text-5xl font-black">Ready to modernize your {title.toLowerCase()}?</h2>
           <p className="text-xl font-bold opacity-90">Join 500+ practices already using Slotify to grow.</p>
           <div className="pt-4">
             <Link 
              to="/register-organization"
              className="inline-flex items-center gap-2 px-10 py-5 bg-white text-slate-900 font-black text-xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
             >
                Start Your 14-Day Free Trial
                <ChevronRight size={22} className="text-slate-400" />
             </Link>
           </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default FeatureLayout;
