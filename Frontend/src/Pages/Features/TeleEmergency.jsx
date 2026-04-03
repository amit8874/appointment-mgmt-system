import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Video, Heart, ChevronRight, Zap, ShieldCheck, AlertTriangle } from 'lucide-react';
import PublicHeader from '../../components/Shared/PublicHeader';
import PublicFooter from '../../components/Shared/PublicFooter';
import { Link } from 'react-router-dom';

const Section = ({ children, className = "" }) => (
  <motion.section
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className={`py-20 px-6 ${className}`}
  >
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </motion.section>
);

const TeleEmergency = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      <PublicHeader />

      {/* SECTION 1: Hero */}
      <section className="relative pt-40 pb-20 overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-red-50/50 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-full font-black text-xs uppercase tracking-widest border border-red-200"
              >
                <Zap size={14} className="animate-pulse" />
                Expert Medical Guidance When Available
              </motion.div>
              
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.1]">
                Critical Guidance — <span className="text-red-600">During</span> the First Minutes.
              </h1>
              
              <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-xl">
                When every second matters, get professional guidance from medical experts via call or video. Real-time support in your palm during life's most critical moments.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link 
                  to="/login"
                  className="px-10 py-5 bg-red-600 text-white font-black text-xl rounded-2xl shadow-2xl shadow-red-600/30 hover:bg-red-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                  🚨 Use TeleEmergency 24×7
                  <ChevronRight size={24} />
                </Link>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-1/2"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-red-600/10 rounded-[3rem] blur-3xl -z-10 transform rotate-6" />
                <img 
                  src="/assets/images/tele_emergency_hero.png" 
                  alt="Emergency help at home" 
                  className="rounded-[3rem] shadow-2xl border-8 border-white w-full object-cover aspect-[4/3]"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Problem */}
      <Section className="bg-white">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
             <img 
              src="/assets/images/tele_emergency_problem.png" 
              alt="Chaotic emergency at home" 
              className="rounded-[3rem] shadow-xl w-full object-cover aspect-[4/3]"
            />
          </div>
          <div className="lg:w-1/2 space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
               What Happens Before Help Arrives?
            </h2>
            <div className="w-20 h-2 bg-red-600 rounded-full" />
            <p className="text-xl text-slate-500 font-medium leading-relaxed">
              In emergencies like heart attacks, injuries, or sudden illness, the first **10–15 minutes** are critical. Most people panic and don’t know the right steps to take. Without guidance, those precious minutes can be lost.
            </p>
            <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-4">
               <AlertTriangle className="text-red-600 shrink-0 mt-1" />
               <p className="text-red-900 font-bold italic">"Chaos and uncertainty are the biggest enemies in an emergency. TeleEmergency replaces panic with professional guidance."</p>
            </div>
          </div>
        </div>
      </Section>

      {/* NEW: How it Works Mini-Section */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
             {/* Connector lines for desktop */}
             <div className="hidden md:block absolute top-1/2 left-1/4 w-1/2 h-0.5 bg-white/10 -z-10" />
             
             {[
               { step: 1, title: "Tap Emergency", icon: <Zap />, color: "bg-red-600" },
               { step: 2, title: "Connect to Expert", icon: <Video />, color: "bg-blue-600" },
               { step: 3, title: "Get Guidance", icon: <ShieldCheck />, color: "bg-emerald-600" }
             ].map((item, idx) => (
               <div key={idx} className="flex flex-col items-center text-center space-y-4 group">
                  <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                     {React.cloneElement(item.icon, { size: 32 })}
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Step 0{item.step}</span>
                    <h3 className="text-xl font-bold">{item.title}</h3>
                  </div>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* SECTION 3: Solution */}
      <Section className="bg-slate-50">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-black text-xs uppercase tracking-widest">
              Slotify AI Augmented
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
               Expert Medical Guidance and Support.
            </h2>
            <p className="text-xl text-slate-600 font-medium leading-relaxed">
              Connect with trained professionals who guide you step-by-step through clinical best practices — whether it's performing CPR, stopping bleeding, or stabilizing the patient until help arrives.
            </p>
            <ul className="space-y-4">
               {[
                 "Step-by-step CPR coaching via video",
                 "Immediate trauma stabilization advice",
                 "Vitals assessment via smartphone camera",
                 "Direct relay to arriving paramedics"
               ].map((text, i) => (
                 <li key={i} className="flex items-center gap-3 font-bold text-slate-700">
                    <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                       <Zap size={14} />
                    </div>
                    {text}
                 </li>
               ))}
            </ul>
          </div>
          <div className="lg:w-1/2">
             <img 
              src="/assets/images/tele_emergency_solution.png" 
              alt="Doctor guiding family over phone" 
              className="rounded-[3rem] shadow-2xl border-4 border-white w-full object-cover"
            />
          </div>
        </div>
      </Section>

      {/* SECTION 4: Use Cases */}
      <Section>
        <div className="text-center mb-16 space-y-4">
           <h2 className="text-4xl md:text-5xl font-black text-slate-900 italic tracking-tighter">Built for Real Emergencies.</h2>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-sm italic">Immediate help for life's most critical moments</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { title: "Elderly Care", desc: "For falls, weakness, or sudden disorientation.", image: "case_elderly.png" },
             { title: "Child Injury", desc: "For domestic accidents, choking, or high fever.", image: "case_child.png" },
             { title: "Road Accidents", desc: "First-responder guidance at the scene of crash.", image: "case_accident.png" },
             { title: "Breathing Issues", desc: "Asthma, allergic reactions, or breathless distress.", image: "case_breathless.png" }
           ].map((item, idx) => (
             <motion.div 
               key={idx}
               whileHover={{ y: -10 }}
               className="bg-white rounded-[2.5rem] overflow-hidden shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-300"
             >
                <div className="h-64 relative overflow-hidden">
                   <img src={`/assets/images/${item.image}`} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-8 text-center">
                   <h3 className="text-2xl font-black text-slate-900 mb-2 italic tracking-tight">{item.title}</h3>
                   <p className="text-slate-500 font-medium text-sm leading-relaxed">{item.desc}</p>
                </div>
             </motion.div>
           ))}
        </div>
      </Section>

      {/* SECTION 5: Trust + CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-900 skew-y-3 translate-y-32 -z-10" />
        
        <div className="max-w-7xl mx-auto">
           <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row items-stretch">
              <div className="md:w-1/2 p-8 md:p-16 space-y-8 flex flex-col justify-center">
                 <div className="space-y-4">
                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 italic tracking-tighter">You're Not Alone in Emergencies.</h2>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed">
                       TeleEmergency 24×7 ensures you get immediate, calm, and professional support when you need it the most. We stay on the line until help arrives.
                    </p>
                 </div>

                 <div className="space-y-4 pt-4">
                   <Link 
                    to="/login"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-blue-900 text-white font-black text-2xl rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-center italic tracking-tight"
                   >
                      Get Emergency Help Now
                      <ChevronRight size={28} />
                   </Link>
                   <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-sm ml-2">
                     *TeleEmergency is not a replacement for ambulance or hospital care. In critical situations, please call emergency services (108 in India).
                   </p>
                 </div>
              </div>

              <div className="md:w-1/2 relative bg-slate-100">
                 <img 
                  src="/assets/images/tele_emergency_trust.png" 
                  alt="Doctor reassuring family" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-8 right-8 bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30 flex items-center gap-3">
                   <div className="w-3 h-3 bg-blue-600 rounded-full" />
                   <span className="text-white font-black text-sm uppercase tracking-widest drop-shadow-md">Professional Care Support</span>
                </div>
              </div>
           </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default TeleEmergency;
