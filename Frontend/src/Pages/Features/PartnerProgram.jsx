import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  Smartphone, 
  Globe, 
  ShieldCheck, 
  Zap, 
  HelpCircle,
  IndianRupee,
  Briefcase,
  GraduationCap,
  Users2
} from 'lucide-react';
import PublicHeader from '../../components/Shared/PublicHeader';
import PublicFooter from '../../components/Shared/PublicFooter';
import { Link } from 'react-router-dom';

const PartnerProgram = () => {
  const steps = [
    { 
      title: "Join the Partner Program", 
      desc: "Sign up as a Slotify partner in less than 2 minutes. No hidden fees or complex requirements.",
      icon: <Users className="text-blue-600" />
    },
    { 
      title: "Share Your Referral Link", 
      desc: "Connect with clinics and pet clinics. Use your unique link to track your success.",
      icon: <Globe className="text-emerald-600" />
    },
    { 
      title: "Clinic Registers on Slotify", 
      desc: "Once a clinic signs up using your link, our team verifies their registration.",
      icon: <CheckCircle2 className="text-orange-500" />
    },
    { 
      title: "Earn Rewards", 
      desc: "Get ₹50 per verified signup + recurring commissions on their subscriptions.",
      icon: <TrendingUp className="text-green-600" />
    }
  ];

  const earnings = [
    { title: "Signup Reward", value: "₹50", desc: "For every verified clinic registration." },
    { title: "Subscription Bonus", value: "Variable", desc: "Earn additional rewards when they subscribe." },
    { title: "Recurring Commission", value: "Monthly", desc: "Get a percentage of their subscription fee." }
  ];

  const useCases = [
    { title: "Students", desc: "Perfect for students looking for a rewarding side income.", icon: <GraduationCap size={32} /> },
    { title: "Medical Reps", desc: "Leverage your existing clinic network to earn more.", icon: <Briefcase size={32} /> },
    { title: "Local Agents", desc: "Turn your community connections into a business.", icon: <Users2 size={32} /> },
    { title: "Tech Enthusiasts", desc: "Help clinics go digital while earning from it.", icon: <Zap size={32} /> }
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
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-100 text-blue-800 rounded-full font-black text-xs uppercase tracking-widest border border-blue-200"
              >
                <TrendingUp size={14} className="text-emerald-600" />
                Slotify Partner Program
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-black text-[#00386a] leading-[1.05] tracking-tight">
                Earn by Helping Clinics <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent italic">Go Digital</span>.
              </h1>
              
              <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                Join the Slotify Partner Program and earn rewards by connecting clinics and pet clinics to modern healthcare solutions. Turn your network into income.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 pt-4">
                <Link 
                  to="/register-organization"
                  className="px-10 py-5 bg-[#00386a] text-white font-black text-xl rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
                >
                  Join as Partner
                  <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <button 
                  className="px-10 py-5 bg-white border-2 border-slate-100 text-[#00386a] font-black text-xl rounded-3xl hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  Start Earning Today
                </button>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-1/2 relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/10 to-emerald-600/10 rounded-[4rem] blur-3xl -z-10 animate-pulse" />
              {/* Image generation placeholder: partner_hero.png replaced with a high-quality stylized image if available */}
              <img 
                src="/assets/images/family_pet_hero.png" 
                alt="Partner program opportunity" 
                className="rounded-[4rem] shadow-2xl border-8 border-white w-full object-cover aspect-[4/3] relative z-10 hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-3 hidden md:block z-20 animate-bounce-subtle">
                 <div className="flex items-center gap-3 text-emerald-600">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                       <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800">Verified Earnings</p>
                      <p className="text-xs text-slate-400 font-bold">Paid on time, every time</p>
                    </div>
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
             <img src="/assets/images/family_pet_problem.png" alt="Stressed clinic" className="rounded-[3rem] shadow-xl w-full grayscale-[0.2] hover:grayscale-0 transition-all duration-700" />
          </div>
          <div className="md:w-1/2 space-y-8">
             <div className="inline-block px-4 py-1 bg-slate-100 text-slate-500 rounded-md font-bold text-xs uppercase tracking-widest italic font-sans">The Reality</div>
             <h2 className="text-4xl md:text-6xl font-black text-[#00386a] leading-tight">Many Clinics Still Struggle <br/>with Old Systems.</h2>
             <p className="text-xl text-slate-500 font-medium leading-relaxed">
               Thousands of clinics still manage appointments manually. They need better tools — but they don’t know where to start. This is where <span className="text-[#00386a] font-black italic underline decoration-emerald-400">you</span> come in.
             </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: The Opportunity */}
      <section className="py-24 bg-slate-50 overflow-hidden px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
           <div className="lg:w-1/2 space-y-8">
             <h2 className="text-4xl md:text-6xl font-black text-[#00386a] leading-tight tracking-tighter italic">Be the Bridge — <br/>And Get Rewarded.</h2>
             <p className="text-xl text-slate-600 font-medium font-sans">Help clinics discover Slotify and earn rewards for every successful referral.</p>
             <div className="space-y-4">
                {[
                  "Refer clinics or pet clinics in your area",
                  "Help them register on Slotify in minutes",
                  "Earn base rewards and recurring commissions"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 group cursor-default">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={18} />
                    </div>
                    <p className="text-lg font-bold text-slate-700">{item}</p>
                  </div>
                ))}
             </div>
             <button className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-orange-600 transition-colors">
                Join the Opportunity
             </button>
           </div>
           <div className="lg:w-1/2">
              <img src="/assets/images/family_pet_solution.png" alt="Digital clinics" className="w-full drop-shadow-[0_35px_35px_rgba(0,0,0,0.15)]" />
           </div>
        </div>
      </section>

      {/* SECTION 4: How It Works */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto space-y-16">
           <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-6xl font-black text-[#00386a] italic tracking-tighter">How It Works</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Simple path to earning</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={{ y: -10 }}
                  className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100/50 space-y-6 relative overflow-hidden"
                >
                   <div className="absolute -top-4 -right-4 text-slate-50 font-black text-9xl opacity-20 pointer-events-none select-none">
                     {idx + 1}
                   </div>
                   <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center shadow-inner relative z-10">
                      {React.cloneElement(step.icon, { size: 32 })}
                   </div>
                   <div className="space-y-3 relative z-10">
                      <h3 className="text-xl font-black text-slate-900 leading-tight italic tracking-tight">{step.title}</h3>
                      <p className="text-slate-500 text-sm font-medium leading-relaxed">{step.desc}</p>
                   </div>
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* SECTION 5: Earnings & Rewards */}
      <section className="py-24 bg-[#00386a] px-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900 via-transparent to-transparent opacity-50" />
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20 relative z-10">
           <div className="lg:w-1/2 space-y-10">
              <h2 className="text-4xl md:text-6xl font-black text-white leading-tight italic tracking-tighter">Simple & <br/><span className="text-emerald-400">Transparent</span> Earnings.</h2>
              
              <div className="flex flex-col gap-6">
                 {earnings.map((earning, idx) => (
                   <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex justify-between items-center bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 group cursor-default hover:bg-white/20 transition-all"
                   >
                     <div className="space-y-1">
                       <h3 className="text-white font-black text-lg">{earning.title}</h3>
                       <p className="text-blue-100 text-sm font-medium opacity-80">{earning.desc}</p>
                     </div>
                     <div className="text-emerald-400 font-black text-3xl italic tracking-tighter group-hover:scale-110 transition-transform">
                        {earning.value}
                     </div>
                   </motion.div>
                 ))}
              </div>

              <div className="p-4 bg-blue-900/50 rounded-2xl border border-white/5 inline-flex items-center gap-3">
                 <HelpCircle size={18} className="text-blue-300" />
                 <p className="text-blue-200 text-xs font-bold italic uppercase tracking-widest">Rewards are credited after verification</p>
              </div>
           </div>

           <div className="lg:w-1/2">
              <img 
                src="/assets/images/earnings_growth_chart.png" 
                alt="Earnings visualization" 
                className="w-full rounded-[4rem] shadow-2xl border-4 border-white/10 hover:scale-[1.02] transition-transform duration-700" 
              />
           </div>
        </div>
      </section>

      {/* SECTION 6: Use Cases */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto space-y-16">
           <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-6xl font-black text-[#00386a] italic tracking-tighter">Anyone Can Become a Partner</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">A platform for every goal</p>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((useCase, idx) => (
                <div 
                  key={idx}
                  className="p-10 bg-slate-50 rounded-[3rem] text-center space-y-6 hover:bg-white hover:shadow-2xl transition-all duration-500 group border border-transparent hover:border-slate-100"
                >
                   <div className="w-20 h-20 bg-white text-[#00386a] rounded-full mx-auto flex items-center justify-center shadow-lg group-hover:bg-[#00386a] group-hover:text-white transition-all duration-500">
                      {useCase.icon}
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900 italic tracking-tight">{useCase.title}</h3>
                      <p className="text-slate-500 font-medium leading-relaxed">{useCase.desc}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* SECTION 7: Trust & Credibility */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-20">
           <div className="order-2 lg:order-1">
              <img 
                src="/assets/images/tele_emergency_solution.png" 
                alt="Clinic management software" 
                className="rounded-[4rem] shadow-2xl w-full object-cover aspect-[4/3] -rotate-1 hover:rotate-0 transition-transform duration-700" 
              />
           </div>
           <div className="space-y-8 order-1 lg:order-2">
              <h2 className="text-4xl md:text-7xl font-black text-[#00386a] tracking-tighter italic leading-tight">A Platform <br/><span className="text-emerald-600">Clinics Trust.</span></h2>
              <p className="text-2xl text-slate-500 font-medium leading-relaxed">
                Slotify helps clinics manage appointments, patients, pharmacy, and even emergency care — all in one unified, cloud-based platform. 
              </p>
              <div className="flex items-center gap-6 pt-4">
                 <div className="flex -space-x-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-200" />
                    ))}
                 </div>
                 <p className="text-slate-500 font-black italic">Join 1,000+ Partners Nationwide</p>
              </div>
           </div>
        </div>
      </section>

      {/* SECTION 8: Final CTA */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto bg-gradient-to-br from-[#00386a] to-blue-900 rounded-[4rem] p-12 lg:p-20 relative overflow-hidden flex flex-col lg:flex-row items-center gap-16 shadow-2xl shadow-blue-900/20">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50" />
           
           <div className="lg:w-1/2 space-y-8 relative z-10 text-center lg:text-left">
              <h2 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter italic">Start Earning Today.</h2>
              <p className="text-xl text-blue-100 font-medium leading-relaxed opacity-90">
                 Join the Slotify Partner Program and turn your network into income. Help us revolutionize clinic management across the globe.
              </p>
              <Link 
                to="/register-organization"
                className="inline-flex items-center gap-3 px-12 py-6 bg-emerald-500 text-white font-black text-2xl rounded-3xl shadow-xl hover:scale-105 active:scale-95 transition-all italic tracking-tight"
              >
                  Join Now
                  <ArrowRight size={28} />
              </Link>
           </div>
           
           <div className="lg:w-1/2 relative z-10">
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-6">
                 <h4 className="text-white font-black text-xl italic underline decoration-emerald-400">Important Notes</h4>
                 <ul className="space-y-4">
                    {[
                      "Rewards provided only for verified and genuine clinic registrations.",
                      "Fake or duplicate referrals will not be rewarded.",
                      "Verification process takes 2-5 business days."
                    ].map((note, idx) => (
                      <li key={idx} className="flex gap-3 text-blue-100 text-sm font-medium opacity-80 italic">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                        {note}
                      </li>
                    ))}
                 </ul>
              </div>
           </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default PartnerProgram;
