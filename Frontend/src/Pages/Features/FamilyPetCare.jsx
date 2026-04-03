import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Users, 
  Dog, 
  Zap, 
  ShieldCheck, 
  Video, 
  ChevronRight, 
  Grid, 
  PhoneCall, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import PublicHeader from '../../components/Shared/PublicHeader';
import PublicFooter from '../../components/Shared/PublicFooter';
import { Link } from 'react-router-dom';

const FamilyPetCare = () => {
  const [activeTab, setActiveTab] = useState('human');

  const scenarios = [
    { title: "Child Fever at Night", desc: "Immediate doctor advice for worried parents.", img: "case_child_fever.png" },
    { title: "Elderly Consult", desc: "Easy access to specialists for routine checkups.", img: "case_elderly_consult.png" },
    { title: "Sudden Pet Illness", desc: "Consult a vet before rushing to the clinic.", img: "case_dog_sick.png" },
    { title: "Emergency Guidance", desc: "Instant help during critical household accidents.", img: "family_pet_emergency.png" },
    { title: "Pet Injury", desc: "First-aid guidance for minor paw injuries or wounds.", img: "family_pet_hero.png" } // Fallback to hero for injury due to quota
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      <PublicHeader />

      {/* SECTION 1: HERO */}
      <section className="relative pt-40 pb-20 overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="lg:w-1/2 space-y-10 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-100 text-blue-700 rounded-full font-black text-xs uppercase tracking-widest border border-blue-200"
              >
                <Heart size={14} className="text-red-500 fill-red-500" />
                Trusted by 50,000+ Families
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight">
                One Platform for Your Entire Family — <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent italic">Including Your Pets</span>.
              </h1>
              
              <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                From pediatric consults to veterinary care and instant emergency guidance. Everything your loved ones need, human or furry, is now in one smart place.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 pt-4">
                <Link 
                  to="/register-organization"
                  className="px-10 py-5 bg-slate-900 text-white font-black text-xl rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
                >
                  Get Started for Free
                  <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/features/tele-emergency"
                  className="px-10 py-5 bg-white border-2 border-slate-100 text-red-600 font-black text-xl rounded-3xl hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  🚨 Emergency Help
                </Link>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-1/2 relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/10 to-emerald-600/10 rounded-[4rem] blur-3xl -z-10 animate-pulse" />
              <img 
                src="/assets/images/family_pet_hero.png" 
                alt="Family and pet healthcare" 
                className="rounded-[4rem] shadow-2xl border-8 border-white w-full object-cover aspect-[4/3] relative z-10 hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-3 hidden md:block z-20 animate-bounce-subtle">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                       <CheckCircle2 size={24} />
                    </div>
                    <p className="font-black text-slate-800">Verified Pro Connect</p>
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 2: The Problem */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-20">
          <div className="md:w-1/2">
             <img src="/assets/images/family_pet_problem.png" alt="Healthcare stress" className="rounded-[3rem] shadow-xl w-full grayscale-[0.2] hover:grayscale-0 transition-all duration-700" />
          </div>
          <div className="md:w-1/2 space-y-8">
             <div className="inline-block px-4 py-1 bg-slate-100 text-slate-500 rounded-md font-bold text-xs uppercase tracking-widest italic">The Challenge</div>
             <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight">Healthcare is Scattered & Stressful.</h2>
             <p className="text-xl text-slate-500 font-medium leading-relaxed">
               Managing health for your family and pets means juggling multiple apps, physical clinics, and different emergency numbers — especially when time matters most. 
               <span className="block mt-4 text-slate-900 font-black italic">It's time for one unified solution.</span>
             </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: The Solution */}
      <section className="py-24 bg-slate-50 overflow-hidden px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
           <div className="lg:w-1/2 space-y-8">
             <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight tracking-tighter italic">Everything in One <br/>Smart Platform.</h2>
             <div className="space-y-6">
               {[
                 { title: "Human Doctor", desc: "Book appointments instantly with top-tier physicians.", icon: <Users className="text-blue-600" /> },
                 { title: "Veterinary Care", desc: "Consult verified vets online for your pets.", icon: <Dog className="text-emerald-600" /> },
                 { title: "TeleEmergency", desc: "Instant guidance anytime life gets critical.", icon: <Zap className="text-red-500" /> },
                 { title: "Secure Records", desc: "All medical history for everyone in one place.", icon: <ShieldCheck className="text-slate-700" /> }
               ].map((item, idx) => (
                 <motion.div 
                  key={idx}
                  whileHover={{ x: 10 }}
                  className="flex gap-6 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm"
                 >
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                       {React.cloneElement(item.icon, { size: 28 })}
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900">{item.title}</h3>
                       <p className="text-slate-500 font-medium">{item.desc}</p>
                    </div>
                 </motion.div>
               ))}
             </div>
           </div>
           <div className="lg:w-1/2">
              <img src="/assets/images/family_pet_solution.png" alt="App interface" className="w-full drop-shadow-[0_35px_35px_rgba(0,0,0,0.15)]" />
           </div>
        </div>
      </section>

      {/* SECTION 4: Dual Experience (Functional Toggle) */}
      <section className="py-24 bg-white px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-12">
           <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-black text-slate-900">Built for Humans. <br/><span className="text-emerald-600 italic">Designed for Pets Too.</span></h2>
              <p className="text-xl text-slate-600 font-medium">Switch seamlessly between human and pet care with a unified interface.</p>
           </div>

           <div className="flex justify-center">
              <div className="bg-slate-100 p-2 rounded-3xl flex gap-2">
                 <button 
                  onClick={() => setActiveTab('human')}
                  className={`px-8 py-4 rounded-2xl font-black text-lg flex items-center gap-2 transition-all ${activeTab === 'human' ? 'bg-white shadow-xl scale-105 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                    <Users size={20} /> Human Care
                 </button>
                 <button 
                  onClick={() => setActiveTab('pet')}
                  className={`px-8 py-4 rounded-2xl font-black text-lg flex items-center gap-2 transition-all ${activeTab === 'pet' ? 'bg-white shadow-xl scale-105 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                    <Dog size={20} /> Pet Care
                 </button>
              </div>
           </div>

           <div className="relative mt-12 bg-slate-50 p-8 rounded-[4rem] border border-slate-100 min-h-[500px] flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                 <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className="flex flex-col lg:flex-row items-center gap-12 text-left"
                 >
                    <div className="lg:w-1/2 space-y-6">
                       <h3 className="text-4xl font-black text-slate-900 italic tracking-tight">
                          {activeTab === 'human' ? "Expert Doctors, Any Time." : "Certified Vets, In Your Pocket."}
                       </h3>
                       <p className="text-lg text-slate-500 leading-relaxed font-medium">
                          {activeTab === 'human' 
                            ? "Access 500+ specialists including pediatricians, therapists, and cardiologists. Built for your complete wellness." 
                            : "From sudden lethargy to nutrition advice, talk to verified veterinary professionals without the stress of travel."}
                       </p>
                       <ul className="space-y-4">
                          {activeTab === 'human' ? (
                            ["Instant video consults", "Chronic disease tracking", "Mental health support"].map((t, i) => (
                              <li key={i} className="flex items-center gap-3 font-bold text-blue-600">
                                 <CheckCircle2 size={18} /> {t}
                              </li>
                            ))
                          ) : (
                            ["Post-surgery guidance", "Diet & Allergies advice", "Sudden sickness triage"].map((t, i) => (
                              <li key={i} className="flex items-center gap-3 font-bold text-emerald-600">
                                 <CheckCircle2 size={18} /> {t}
                              </li>
                            ))
                          )}
                       </ul>
                    </div>
                    <div className="lg:w-1/2">
                       <img 
                        src={activeTab === 'human' ? "/assets/images/family_pet_hero.png" : "/assets/images/case_dog_sick.png"} 
                        alt="Care preview" 
                        className="rounded-[3rem] shadow-2xl border-4 border-white w-full aspect-square object-cover"
                       />
                    </div>
                 </motion.div>
              </AnimatePresence>
           </div>
        </div>
      </section>

      {/* SECTION 5: Real-Life Use Cases */}
      <section className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
           <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 italic tracking-tighter">Ready for Every Situation.</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Modern care for modern life</p>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {scenarios.map((item, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={{ y: -10 }}
                  className="bg-white rounded-[2.5rem] overflow-hidden shadow-lg border border-slate-100 transition-all p-4"
                >
                   <div className="h-48 rounded-[2rem] overflow-hidden mb-6">
                      <img src={`/assets/images/${item.img}`} alt={item.title} className="w-full h-full object-cover" />
                   </div>
                   <div className="px-4 pb-4">
                      <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 italic tracking-tight">{item.title}</h3>
                      <p className="text-slate-500 text-xs font-medium leading-relaxed">{item.desc}</p>
                   </div>
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* SECTION 6: Emergency Feature Highlight */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto bg-gradient-to-br from-red-600 to-rose-700 rounded-[4rem] p-12 lg:p-20 relative overflow-hidden flex flex-col lg:flex-row items-center gap-16 shadow-2xl shadow-red-600/20">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50" />
           
           <div className="lg:w-1/2 space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white font-black text-xs uppercase tracking-widest">
                 <AlertCircle size={14} className="animate-pulse" /> Critical Lifeline
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tighter italic">Emergency Help When Every Second Matters.</h2>
              <p className="text-xl text-red-50 font-medium leading-relaxed opacity-90">
                 Get immediate guidance via call or video while waiting for medical assistance. Reduce panic and take the right steps during a life-critical crisis.
              </p>
              <Link 
                to="/features/tele-emergency"
                className="inline-flex items-center gap-3 px-10 py-5 bg-white text-red-600 font-black text-xl rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all italic tracking-tight"
              >
                  🚨 Use TeleEmergency 24×7
                  <ChevronRight size={24} />
              </Link>
           </div>
           
           <div className="lg:w-1/2 relative z-10">
              <img src="/assets/images/family_pet_emergency.png" alt="Emergency help" className="rounded-[3rem] shadow-2xl border-4 border-white/20 w-full object-cover aspect-[4/3]" />
           </div>
        </div>
      </section>

      {/* SECTION 7: Trust & Reassurance */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-20">
           <div className="order-2 lg:order-1">
              <img src="/assets/images/family_pet_trust.png" alt="Trust and care" className="rounded-[4rem] shadow-2xl w-full object-cover aspect-[4/3] -rotate-1 hover:rotate-0 transition-transform duration-700" />
           </div>
           <div className="space-y-8 order-1 lg:order-2">
              <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter italic leading-tight">Care You Can <br/><span className="text-blue-600">Trust.</span></h2>
              <p className="text-2xl text-slate-500 font-medium leading-relaxed">
                 Connect with verified professionals who are here to help you and your pets when it matters most. 
              </p>
              <div className="grid grid-cols-2 gap-8 pt-4">
                 <div>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">500+</p>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">Verified Human Doctors</p>
                 </div>
                 <div>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">200+</p>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">Specialized Veterinarians</p>
                 </div>
              </div>
              <div className="pt-6">
                <Link to="/register-organization" className="text-blue-600 font-black text-xl flex items-center gap-2 group">
                  Join the Slotify Family today <ChevronRight className="group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
           </div>
        </div>
      </section>

      {/* FOOTER DISCLAIMER */}
      <section className="py-12 border-t border-slate-100 text-center px-6">
         <p className="max-w-3xl mx-auto text-slate-400 text-sm font-bold leading-relaxed italic">
           *TeleEmergency is not a replacement for ambulance or hospital care. In critical situations, please call emergency services (108 in India). Pet consultations are for guidance and triage only; in emergencies, please visit your local 24/7 veterinary clinic.
         </p>
      </section>

      <PublicFooter />
    </div>
  );
};

export default FamilyPetCare;
